import { MutableRefObject, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { Obstacle } from '../utils/chunkManager';
import { getHeight, getNormal } from '../utils/noise';
import * as THREE from 'three';

import { TANK_CONFIG } from '../config/constants';

const { INITIAL_SPEED, MAX_SPEED, ACCELERATION, ROTATION_SPEED } = TANK_CONFIG;

interface TankProps {
    onShoot: (position: Vector3, rotation: [number, number, number]) => void;
    obstacles: Obstacle[];
    innerRef?: MutableRefObject<Group | null>;
}

const Tank = ({ onShoot, obstacles, innerRef }: TankProps) => {
    const localRef = useRef<Group>(null);
    const { forward, backward, left, right, shoot } = useKeyboard();
    const lastShootTime = useRef(0);
    const currentSpeed = useRef(INITIAL_SPEED);

    // Sync local ref with innerRef if provided
    useEffect(() => {
        if (innerRef) {
            innerRef.current = localRef.current;
        }
    }, [innerRef]);

    useFrame((state, delta) => {
        if (!localRef.current) return;

        // Rotation
        if (left) localRef.current.rotation.y += ROTATION_SPEED * delta;
        if (right) localRef.current.rotation.y -= ROTATION_SPEED * delta;

        // Movement
        const moveDir = Number(forward) - Number(backward);

        // Update speed
        if (moveDir !== 0) {
            currentSpeed.current = Math.min(currentSpeed.current + ACCELERATION * delta, MAX_SPEED);
        } else {
            currentSpeed.current = INITIAL_SPEED;
        }

        const direction = new Vector3(0, 0, 1);
        direction.applyAxisAngle(new Vector3(0, 1, 0), localRef.current.rotation.y);

        const moveVec = direction.multiplyScalar(moveDir * currentSpeed.current * delta);

        // Potential new position
        if (moveDir !== 0) {
            const nextPos = localRef.current.position.clone().add(moveVec);

            // Collision Check
            const TANK_RADIUS = 1.1;
            const hasCollision = obstacles.some(obs => {
                if (obs.collidable === false) return false;
                const obsPos = new Vector3(obs.position[0], 0, obs.position[2]);
                const dist = new Vector3(nextPos.x, 0, nextPos.z).distanceTo(obsPos);
                const obsRadius = obs.radius;
                return dist < (TANK_RADIUS + obsRadius * 0.9);
            });

            if (!hasCollision) {
                localRef.current.position.copy(nextPos);
            }
        }

        // --- Terrain Height & Tilt ---
        const targetY = getHeight(localRef.current.position.x, localRef.current.position.z);
        // Smooth height transition
        localRef.current.position.y = THREE.MathUtils.lerp(localRef.current.position.y, targetY, 0.2);

        // Calculate tilt
        const normal = getNormal(localRef.current.position.x, localRef.current.position.z);
        const terrainNormal = new THREE.Vector3(normal[0], normal[1], normal[2]);

        // Align tank up-vector with terrain normal
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(up, terrainNormal);

        // We want to combine the Y rotation (steering) with the terrain tilt
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), localRef.current.rotation.y);
        targetQuaternion.premultiply(quaternion);

        // Slerp for smooth rotation
        localRef.current.quaternion.slerp(targetQuaternion, 0.1);

        // Shooting
        if (shoot && state.clock.elapsedTime - lastShootTime.current > 0.5) {
            lastShootTime.current = state.clock.elapsedTime;
            // Calculate barrel position (approximate)
            const barrelOffset = new Vector3(0, 0.75, 1.5).applyAxisAngle(new Vector3(0, 1, 0), localRef.current.rotation.y);
            const spawnPos = localRef.current.position.clone().add(barrelOffset);
            // Pass rotation as [x, y, z] tuple - using current y rotation for projectile direction
            onShoot(spawnPos, [0, localRef.current.rotation.y, 0]);
        }
    });

    return (
        <group ref={localRef} position={[0, 0, 0]}>
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
