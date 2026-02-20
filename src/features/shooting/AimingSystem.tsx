import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, BufferGeometry, Float32BufferAttribute } from 'three';
import * as THREE from 'three';
import { getHeight, getNormal } from '../../utils/noise';
import { ARTILLERY_CONFIG } from '../../config/constants';
import { parabolicStrategy, ArtilleryConfig } from './ShootingStrategy';

interface AimingSystemProps {
    tankRef: React.RefObject<THREE.Group | null>;
    /** Mutable mouse aim data — updated every frame by useMouseAim */
    mouseAim: {
        clampedPoint: Vector3;
        distance: number;
    };
}

const artilleryConfig: ArtilleryConfig = {
    maxRange: ARTILLERY_CONFIG.MAX_RANGE,
    projectileSpeed: ARTILLERY_CONFIG.PROJECTILE_SPEED,
    gravity: ARTILLERY_CONFIG.GRAVITY,
    arcHeightFactor: ARTILLERY_CONFIG.ARC_HEIGHT_FACTOR,
    trajectoryPoints: ARTILLERY_CONFIG.TRAJECTORY_POINTS,
};

const AimingSystem = ({ tankRef, mouseAim }: AimingSystemProps) => {
    return (
        <group>
            <RangeCircle tankRef={tankRef} />
            <LandingReticle mouseAim={mouseAim} />
            <TrajectoryLine tankRef={tankRef} mouseAim={mouseAim} />
        </group>
    );
};

// ─── Range Circle ────────────────────────────────────────────────────────────

const RangeCircle = ({ tankRef }: { tankRef: React.RefObject<THREE.Group | null> }) => {
    const segments = ARTILLERY_CONFIG.RANGE_CIRCLE_SEGMENTS;

    const lineObj = useMemo(() => {
        const positions = new Float32Array((segments + 1) * 3);
        const geo = new BufferGeometry();
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
        const mat = new THREE.LineDashedMaterial({
            color: ARTILLERY_CONFIG.RANGE_CIRCLE_COLOR,
            transparent: true,
            opacity: ARTILLERY_CONFIG.RANGE_CIRCLE_OPACITY,
            dashSize: 1,
            gapSize: 0.5,
            depthTest: false,
        });
        const line = new THREE.Line(geo, mat);
        line.renderOrder = 1;
        return line;
    }, [segments]);

    useFrame(() => {
        if (!tankRef.current) return;
        const tp = tankRef.current.position;
        const posAttr = lineObj.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;

        // Sample terrain height at each vertex so the circle hugs the terrain
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const wx = tp.x + Math.cos(angle) * ARTILLERY_CONFIG.MAX_RANGE;
            const wz = tp.z + Math.sin(angle) * ARTILLERY_CONFIG.MAX_RANGE;
            const wy = getHeight(wx, wz) + 0.15;
            arr[i * 3] = wx;
            arr[i * 3 + 1] = wy;
            arr[i * 3 + 2] = wz;
        }
        posAttr.needsUpdate = true;

        // Reset position to origin since we're using world coords in vertices
        lineObj.position.set(0, 0, 0);
        lineObj.computeLineDistances();
    });

    return <primitive object={lineObj} />;
};

// ─── Landing Reticle ─────────────────────────────────────────────────────────

const LandingReticle = ({ mouseAim }: { mouseAim: { clampedPoint: Vector3 } }) => {
    const groupRef = useRef<THREE.Group>(null);
    const pulseRef = useRef(0);

    const ringGeo = useMemo(
        () => new THREE.RingGeometry(
            ARTILLERY_CONFIG.RETICLE_RADIUS * 0.7,
            ARTILLERY_CONFIG.RETICLE_RADIUS,
            24
        ),
        []
    );
    const dotGeo = useMemo(
        () => new THREE.CircleGeometry(ARTILLERY_CONFIG.RETICLE_RADIUS * 0.25, 12),
        []
    );

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const cp = mouseAim.clampedPoint;
        // Place slightly above terrain to avoid z-fighting
        groupRef.current.position.set(cp.x, cp.y + 0.08, cp.z);

        // Align to terrain normal so the ring lies flat on the slope
        const n = getNormal(cp.x, cp.z);
        const terrainUp = new THREE.Vector3(n[0], n[1], n[2]);
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            terrainUp
        );
        // We rendered children rotated -90° on X originally to face up,
        // so combine: align to terrain normal, then rotate ring to face forward
        const flatQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        groupRef.current.quaternion.copy(alignQuat.multiply(flatQuat));

        // Subtle pulse
        pulseRef.current += delta * 3;
        const pulse = 1 + Math.sin(pulseRef.current) * 0.1;
        groupRef.current.scale.set(pulse, pulse, pulse);
    });

    return (
        <group ref={groupRef}>
            <mesh geometry={ringGeo} renderOrder={2}>
                <meshBasicMaterial
                    color={ARTILLERY_CONFIG.RETICLE_COLOR}
                    transparent
                    opacity={ARTILLERY_CONFIG.RETICLE_OPACITY}
                    side={THREE.DoubleSide}
                    depthTest={false}
                    depthWrite={false}
                />
            </mesh>
            <mesh geometry={dotGeo} renderOrder={2}>
                <meshBasicMaterial
                    color={ARTILLERY_CONFIG.RETICLE_COLOR}
                    transparent
                    opacity={ARTILLERY_CONFIG.RETICLE_OPACITY * 0.8}
                    side={THREE.DoubleSide}
                    depthTest={false}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
};

// ─── Trajectory Line ─────────────────────────────────────────────────────────

const TrajectoryLine = ({
    tankRef,
    mouseAim,
}: {
    tankRef: React.RefObject<THREE.Group | null>;
    mouseAim: { clampedPoint: Vector3 };
}) => {
    const numPoints = ARTILLERY_CONFIG.TRAJECTORY_POINTS;

    const { lineObj, geometry } = useMemo(() => {
        const geo = new BufferGeometry();
        const positions = new Float32Array((numPoints + 1) * 3);
        geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
        const mat = new THREE.LineDashedMaterial({
            color: ARTILLERY_CONFIG.TRAJECTORY_COLOR,
            transparent: true,
            opacity: ARTILLERY_CONFIG.TRAJECTORY_OPACITY,
            dashSize: 0.5,
            gapSize: 0.3,
        });
        const line = new THREE.Line(geo, mat);
        return { lineObj: line, geometry: geo };
    }, [numPoints]);

    useFrame(() => {
        if (!tankRef.current) return;

        const tp = tankRef.current.position;
        const barrelY = tp.y + 1.0; // barrel tip height
        const origin = new Vector3(tp.x, barrelY, tp.z);
        const target = mouseAim.clampedPoint.clone();
        // Ensure target Y is exactly on terrain surface
        target.y = target.y;

        // Recalculate trajectory every frame
        const trajectory = parabolicStrategy.calculateTrajectory(origin, target, artilleryConfig);

        // Update geometry positions in-place
        const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i <= numPoints; i++) {
            const pt = trajectory.points[i];
            if (pt) {
                arr[i * 3] = pt.x;
                arr[i * 3 + 1] = pt.y;
                arr[i * 3 + 2] = pt.z;
            }
        }
        // Force last point to exactly match the landing reticle position
        const last = numPoints;
        arr[last * 3] = target.x;
        arr[last * 3 + 1] = target.y + 0.08; // same offset as reticle
        arr[last * 3 + 2] = target.z;

        posAttr.needsUpdate = true;
        geometry.computeBoundingSphere();
        lineObj.computeLineDistances();
    });

    return <primitive object={lineObj} />;
};

export default AimingSystem;
