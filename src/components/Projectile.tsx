import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Group } from 'three';
import { TrajectoryData, parabolicStrategy } from '../features/shooting';
import { Rocket } from './Rocket';
import { getHeight } from '../utils/noise';

export type ProjectileType = 'ROCKET';

interface ProjectileProps {
    type: ProjectileType;
    trajectory: TrajectoryData;
    onExplode: (position: Vector3) => void;
}

const Projectile = ({ type, trajectory, onExplode }: ProjectileProps) => {
    const groupRef = useRef<Group>(null);
    const progressRef = useRef(0); // 0 to 1
    const hasExploded = useRef(false);

    useFrame((_, delta) => {
        if (!groupRef.current || hasExploded.current) return;

        // 1. Advance Flight
        progressRef.current += delta / trajectory.duration;

        let shouldExplode = false;
        let p = trajectory.points[trajectory.points.length - 1]; // Fallback to last point

        if (progressRef.current >= 1) {
            // End of calculated path
            shouldExplode = true;
            p = trajectory.target;
        } else {
            // Sample position
            p = parabolicStrategy.getPosition(trajectory, progressRef.current);

            // Check ground collision
            const terrainHeight = getHeight(p.x, p.z);
            if (p.y <= terrainHeight) {
                shouldExplode = true;
                p.y = terrainHeight; // Snap to ground for visual consistency
            }
        }

        // Update Position
        groupRef.current.position.copy(p);

        // Update Rotation (Look along velocity vector)
        if (progressRef.current < 1) {
            // Look a bit ahead to determine tanget
            const nextT = Math.min(progressRef.current + 0.01, 1);
            const nextP = parabolicStrategy.getPosition(trajectory, nextT);
            groupRef.current.lookAt(nextP);
        }

        if (shouldExplode) {
            hasExploded.current = true;
            onExplode(p);
        }
    });

    return (
        <group ref={groupRef} position={trajectory.origin}>
            {type === 'ROCKET' && <Rocket />}
        </group>
    );
};

export default Projectile;
