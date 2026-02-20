import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Raycaster, Plane, Vector2 } from 'three';
import { getHeight } from '../../utils/noise';

export interface MouseAimData {
    /** The actual point on the terrain where the mouse intersects */
    rawPoint: Vector3;
    /** The clamped point (within max range) */
    clampedPoint: Vector3;
    /** Whether the raw point is within max range */
    isInRange: boolean;
    /** Distance from tank to clamped point */
    distance: number;
}

const DEFAULT_AIM: MouseAimData = {
    rawPoint: new Vector3(),
    clampedPoint: new Vector3(),
    isInRange: true,
    distance: 0,
};

/**
 * Hook that raycasts from the camera through the mouse position to find the
 * terrain intersection point. Clamps the result to the tank's max range.
 */
export const useMouseAim = (
    tankPosition: Vector3 | null,
    maxRange: number
): MouseAimData => {
    const { camera, gl } = useThree();
    const aimData = useRef<MouseAimData>({ ...DEFAULT_AIM });
    const mouseNDC = useRef(new Vector2(0, 0));
    const raycaster = useRef(new Raycaster());
    // Approximate ground plane for fast intersection
    const groundPlane = useRef(new Plane(new Vector3(0, 1, 0), 0));

    // Track mouse position in NDC (-1 to 1)
    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            const rect = gl.domElement.getBoundingClientRect();
            mouseNDC.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseNDC.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        },
        [gl.domElement]
    );

    // Register/unregister mouse listener
    useFrame(() => {
        const canvas = gl.domElement;
        // Attach once (idempotent via stored ref)
        if (!(canvas as any).__aimListenerAttached) {
            canvas.addEventListener('mousemove', handleMouseMove);
            (canvas as any).__aimListenerAttached = true;
        }

        if (!tankPosition) return;

        // Cast ray from camera through mouse position
        raycaster.current.setFromCamera(mouseNDC.current, camera);

        // Intersect with ground plane (y = tankPosition.y approximation)
        groundPlane.current.constant = -tankPosition.y;
        const intersection = new Vector3();
        const hit = raycaster.current.ray.intersectPlane(
            groundPlane.current,
            intersection
        );

        if (!hit) return;

        // Refine Y using actual terrain height
        intersection.y = getHeight(intersection.x, intersection.z);

        // Store raw point
        aimData.current.rawPoint.copy(intersection);

        // Calculate distance from tank to intersection (XZ plane)
        const dx = intersection.x - tankPosition.x;
        const dz = intersection.z - tankPosition.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);

        aimData.current.isInRange = distXZ <= maxRange;

        if (distXZ <= maxRange) {
            // Within range: use exact point
            aimData.current.clampedPoint.copy(intersection);
            aimData.current.distance = distXZ;
        } else {
            // Outside range: clamp to edge of range circle
            const scale = maxRange / distXZ;
            const clampedX = tankPosition.x + dx * scale;
            const clampedZ = tankPosition.z + dz * scale;
            aimData.current.clampedPoint.set(
                clampedX,
                getHeight(clampedX, clampedZ),
                clampedZ
            );
            aimData.current.distance = maxRange;
        }
    });

    return aimData.current;
};
