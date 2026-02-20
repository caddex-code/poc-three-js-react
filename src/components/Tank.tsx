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
    onShoot: (position: Vector3, rotation: [number, number, number], targetPoint: Vector3) => void;
    obstacles: Obstacle[];
    innerRef?: MutableRefObject<Group | null>;
    mouseTarget: Vector3 | null;
}

const Tank = ({ onShoot, obstacles, innerRef, mouseTarget }: TankProps) => {
    const localRef = useRef<Group>(null);
    const turretRef = useRef<Group>(null);
    const barrelRef = useRef<Group>(null);
    const { forward, backward, left, right, shoot } = useKeyboard();
    const lastShootTime = useRef(0);
    const currentSpeed = useRef(INITIAL_SPEED);
    // Store yaw independently so terrain tilt never corrupts it
    const yawRef = useRef(0);
    // Turret horizontal angle (follows mouse)
    const turretYawRef = useRef(0);
    // Barrel vertical angle (auto-calculated from distance)
    const barrelPitchRef = useRef(0);

    // Sync local ref with innerRef if provided
    useEffect(() => {
        if (innerRef) {
            innerRef.current = localRef.current;
        }
    }, [innerRef]);

    useFrame((state, delta) => {
        if (!localRef.current) return;

        // --- Steering (completely independent of terrain) ---
        if (left) yawRef.current += ROTATION_SPEED * delta;
        if (right) yawRef.current -= ROTATION_SPEED * delta;

        // Movement direction based on yaw only (flat-plane direction)
        const moveDir = Number(forward) - Number(backward);

        // Update speed
        if (moveDir !== 0) {
            currentSpeed.current = Math.min(currentSpeed.current + ACCELERATION * delta, MAX_SPEED);
        } else {
            currentSpeed.current = INITIAL_SPEED;
        }

        const direction = new Vector3(0, 0, 1);
        direction.applyAxisAngle(new Vector3(0, 1, 0), yawRef.current);

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

        // --- Terrain Height ---
        const targetY = getHeight(localRef.current.position.x, localRef.current.position.z);
        localRef.current.position.y = THREE.MathUtils.lerp(localRef.current.position.y, targetY, 0.2);

        // --- Visual Tilt for Chassis (does NOT affect steering) ---
        const normal = getNormal(localRef.current.position.x, localRef.current.position.z);
        const terrainNormal = new THREE.Vector3(normal[0], normal[1], normal[2]);

        // Build the chassis quaternion: tilt + yaw
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRef.current);
        const tiltQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), terrainNormal);
        const chassisQuat = tiltQuat.multiply(yawQuat);

        // Smooth transition to target orientation
        localRef.current.quaternion.slerp(chassisQuat, 0.15);

        // --- Turret: Independent rotation following mouse ---
        if (turretRef.current && mouseTarget) {
            const tankPos = localRef.current.position;

            // World-space angle from tank to target
            const dx = mouseTarget.x - tankPos.x;
            const dz = mouseTarget.z - tankPos.z;
            const worldTargetYaw = Math.atan2(dx, dz);

            // Smooth the world yaw (single smoothing pass)
            // Handle angle wrapping so lerp doesn't spin the long way
            let diff = worldTargetYaw - turretYawRef.current;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            turretYawRef.current += diff * 0.12;

            // Turret rotation relative to chassis
            const relativeTurretYaw = turretYawRef.current - yawRef.current;

            // Build turret quaternion: relative yaw only (world-space level)
            const turretYawQuat = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0),
                relativeTurretYaw
            );

            // Counter-rotate terrain tilt so turret stays level on slopes
            // Order: inverse-tilt * turret-yaw => apply in parent (chassis) space
            const inverseTilt = tiltQuat.clone().invert();
            turretRef.current.quaternion.copy(inverseTilt.multiply(turretYawQuat));

            // --- Barrel pitch based on distance ---
            if (barrelRef.current) {
                const distXZ = Math.sqrt(dx * dx + dz * dz);
                const maxPitch = Math.PI / 4; // 45° max elevation
                const normalizedDist = Math.min(distXZ / 25, 1);
                const targetPitch = -normalizedDist * maxPitch; // negative = tilt up
                barrelPitchRef.current = THREE.MathUtils.lerp(
                    barrelPitchRef.current,
                    targetPitch,
                    0.1
                );
                barrelRef.current.rotation.x = Math.PI / 2 + barrelPitchRef.current;
            }
        }

        // --- Shooting ---
        if (shoot && mouseTarget && state.clock.elapsedTime - lastShootTime.current > 0.5) {
            lastShootTime.current = state.clock.elapsedTime;

            // Use turret direction for barrel offset
            const worldTurretYaw = yawRef.current + turretYawRef.current;
            const barrelOffset = new Vector3(0, 0.75, 1.5).applyAxisAngle(
                new Vector3(0, 1, 0),
                worldTurretYaw
            );
            const spawnPos = localRef.current.position.clone().add(barrelOffset);
            onShoot(spawnPos, [0, worldTurretYaw, 0], mouseTarget.clone());
        }
    });

    return (
        <group ref={localRef} position={[0, 0, 0]}>
            {/* === Chassis === */}
            {/* Body */}
            <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
                <boxGeometry args={[1.5, 0.5, 2]} />
                <meshStandardMaterial color="#8B4513" />
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

            {/* === Turret (independent rotation) === */}
            <group ref={turretRef} position={[0, 0.5, 0]}>
                {/* Turret block */}
                <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
                    <boxGeometry args={[1, 0.5, 1]} />
                    <meshStandardMaterial color="#654321" />
                </mesh>

                {/* Barrel */}
                <group ref={barrelRef} position={[0, 0.25, 1]} rotation={[Math.PI / 2, 0, 0]}>
                    <mesh castShadow>
                        <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                </group>
            </group>
        </group>
    );
};

export default Tank;
