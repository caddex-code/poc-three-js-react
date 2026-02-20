import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Mesh } from 'three';
import {
    TrajectoryData,
    ShootingStrategy,
    parabolicStrategy,
} from '../systems/ShootingStrategy';
import { ARTILLERY_CONFIG } from '../config/constants';

interface BulletProps {
    position: [number, number, number];
    trajectory: TrajectoryData;
    strategy?: ShootingStrategy;
    onHit: (id: string) => void;
    onMiss: () => void;
    targets: { id: string; position: [number, number, number] }[];
}

const Bullet = ({
    position,
    trajectory,
    strategy = parabolicStrategy,
    onHit,
    onMiss,
    targets,
}: BulletProps) => {
    const meshRef = useRef<Mesh>(null);
    const progressRef = useRef(0); // normalized time 0 → 1
    const hasFinished = useRef(false);

    useFrame((_, delta) => {
        if (!meshRef.current || hasFinished.current) return;

        // Advance progress
        progressRef.current += delta / trajectory.duration;

        if (progressRef.current >= 1) {
            progressRef.current = 1;
            hasFinished.current = true;

            // Check collision with targets near the landing zone
            const landingPos = trajectory.target;
            for (const target of targets) {
                const targetPos = new Vector3(...target.position);
                const dist = landingPos.distanceTo(targetPos);
                if (dist < ARTILLERY_CONFIG.SPLASH_RADIUS) {
                    onHit(target.id);
                    return;
                }
            }

            // No target hit
            onMiss();
            return;
        }

        // Position bullet along trajectory
        const currentPos = strategy.getPosition(trajectory, progressRef.current);
        meshRef.current.position.copy(currentPos);
    });

    return (
        <mesh ref={meshRef} position={position} castShadow>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="black" />
        </mesh>
    );
};

export default Bullet;
