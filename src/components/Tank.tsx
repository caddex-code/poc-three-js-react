import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { useKeyboard } from '../hooks/useKeyboard';

const SPEED = 5;
const ROTATION_SPEED = 2;

interface TankProps {
    onShoot: (position: Vector3, rotation: [number, number, number]) => void;
    obstacles: { id: string; position: [number, number, number]; radius?: number }[];
}

const Tank = ({ onShoot, obstacles }: TankProps) => {
    const groupRef = useRef<Group>(null);
    const { forward, backward, left, right, shoot } = useKeyboard();
    const lastShootTime = useRef(0);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Rotation
        if (left) groupRef.current.rotation.y += ROTATION_SPEED * delta;
        if (right) groupRef.current.rotation.y -= ROTATION_SPEED * delta;

        // Movement
        const direction = new Vector3(0, 0, 1);
        direction.applyAxisAngle(new Vector3(0, 1, 0), groupRef.current.rotation.y);

        const moveDir = Number(forward) - Number(backward);
        const moveVec = direction.multiplyScalar(moveDir * SPEED * delta);

        // Potential new position
        if (moveDir !== 0) {
            const nextPos = groupRef.current.position.clone().add(moveVec);

            // Collision Check
            const TANK_RADIUS = 1.2;
            const hasCollision = obstacles.some(obs => {
                const obsPos = new Vector3(obs.position[0], 0, obs.position[2]); // Ignore Y for 2D collision on ground
                // Distance in XZ plane
                const dist = new Vector3(nextPos.x, 0, nextPos.z).distanceTo(obsPos);
                const obsRadius = obs.radius || 1.0;
                return dist < (TANK_RADIUS + obsRadius);
            });

            if (!hasCollision) {
                groupRef.current.position.copy(nextPos);
            }
        }

        // Shooting
        if (shoot && state.clock.elapsedTime - lastShootTime.current > 0.5) {
            lastShootTime.current = state.clock.elapsedTime;
            // Calculate barrel position (approximate)
            const barrelOffset = new Vector3(0, 0.75, 1.5).applyAxisAngle(new Vector3(0, 1, 0), groupRef.current.rotation.y);
            const spawnPos = groupRef.current.position.clone().add(barrelOffset);
            // Pass rotation as [x, y, z] tuple
            onShoot(spawnPos, [0, groupRef.current.rotation.y, 0]);
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            {/* Body */}
            <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
                <boxGeometry args={[1.5, 0.5, 2]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>

            {/* Turret */}
            <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
                <boxGeometry args={[1, 0.5, 1]} />
                <meshStandardMaterial color="#654321" />
            </mesh>

            {/* Barrel */}
            <mesh castShadow position={[0, 0.75, 1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {/* Tracks */}
            <mesh position={[0.9, 0.25, 0]}>
                <boxGeometry args={[0.3, 0.5, 2.2]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[-0.9, 0.25, 0]}>
                <boxGeometry args={[0.3, 0.5, 2.2]} />
                <meshStandardMaterial color="#333" />
            </mesh>
        </group>
    );
};

export default Tank;
