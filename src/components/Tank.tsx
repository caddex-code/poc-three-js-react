import { MutableRefObject, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3 } from 'three';
import { useKeyboard } from '../hooks/useKeyboard';
import { Obstacle } from '../utils/chunkManager';
import { getHeight, getNormal } from '../utils/noise';
import * as THREE from 'three';

import { TANK_CONFIG, ARTILLERY_CONFIG } from '../config/constants';

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
    const recoilRef = useRef<Group>(null);

    const { forward, backward, left, right, shoot } = useKeyboard();

    const lastShootTime = useRef(0);
    const currentSpeed = useRef(INITIAL_SPEED);
    const isRecoiling = useRef(false);

    // Store yaw independently so terrain tilt never corrupts it
    const yawRef = useRef(0);
    // Turret horizontal angle (follows mouse)
    const turretYawRef = useRef(0);
    // Barrel vertical angle (auto-calculated from distance)
    const barrelPitchRef = useRef(0);

    // Sync localRef with innerRef if provided
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

            // --- Barrel pitch based on Physics Trajectory ---
            if (barrelRef.current) {
                const distXZ = Math.sqrt(dx * dx + dz * dz);
                const dy = mouseTarget.y - tankPos.y - 1.0; // Target Y relative to barrel pivot (approx height 1.0)

                // Physics params matching ShootingStrategy.ts
                const speed = ARTILLERY_CONFIG.PROJECTILE_SPEED;
                const gravity = ARTILLERY_CONFIG.GRAVITY;
                const arcFactor = ARTILLERY_CONFIG.ARC_HEIGHT_FACTOR;

                // Flight duration
                const duration = Math.max(distXZ / speed, 0.3);

                // Vertical velocity components at launch (t=0)
                // 1. Base parabolic velocity to reach target
                const vyBase = (dy + 0.5 * gravity * duration * duration) / duration;

                // 2. Arc bump velocity (derivative of 4*h*t*(1-t) at t=0 scaled by duration)
                const arcHeight = distXZ * arcFactor;
                const vyArc = (4 * arcHeight) / duration;

                // Total vertical velocity
                const vyTotal = vyBase + vyArc;

                // Constant horizontal velocity
                const vHorizontal = distXZ / duration;

                // Calculate launch angle
                // Negative because three.js rotation X=0 is forward, and we want to rotate "back" (up) which is usually negative X in this setup?
                // Let's test negative.
                const targetPitch = -Math.atan2(vyTotal, vHorizontal);

                barrelPitchRef.current = THREE.MathUtils.lerp(
                    barrelPitchRef.current,
                    targetPitch,
                    0.2
                );
                barrelRef.current.rotation.x = barrelPitchRef.current;
            }
        }

        // --- Recoil Animation ---
        if (recoilRef.current) {
            if (isRecoiling.current) {
                // Kick back fast (on local Z)
                recoilRef.current.position.z = THREE.MathUtils.lerp(recoilRef.current.position.z, 0.5, 0.4);
                if (recoilRef.current.position.z > 0.45) {
                    isRecoiling.current = false;
                }
            } else {
                // Return to rest slowly
                recoilRef.current.position.z = THREE.MathUtils.lerp(recoilRef.current.position.z, 0, 0.1);
            }
        }

        // --- Shooting ---
        if (shoot && mouseTarget && state.clock.elapsedTime - lastShootTime.current > 0.5) {
            lastShootTime.current = state.clock.elapsedTime;
            isRecoiling.current = true;

            const worldTurretYaw = yawRef.current + turretYawRef.current;

            // Adjust spawn pos to be at the tip of the SHORT barrel
            // Barrel length ~1.8, position offset +0.8 base... total ~2.2?
            const barrelOffset = new Vector3(0, 1.2, 2.2).applyAxisAngle(
                new Vector3(0, 1, 0),
                worldTurretYaw
            );

            const spawnPos = localRef.current.position.clone().add(barrelOffset);
            onShoot(spawnPos, [barrelPitchRef.current, worldTurretYaw, 0], mouseTarget.clone());
        }
    });

    // Color Palette
    const OLIVE_DRAB = "#556B2F";
    const DARK_GUNMETAL = "#2F4F4F";
    const SAFETY_ORANGE = "#FF4500";

    return (
        <group ref={localRef} position={[0, 0, 0]}>
            {/* === Chassis Group (Visuals only, transforms applied to localRef) === */}
            <group>
                {/* Main Hull Body - Lower */}
                <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
                    <boxGeometry args={[1.8, 0.6, 2.8]} />
                    <meshStandardMaterial color={OLIVE_DRAB} roughness={0.7} />
                </mesh>

                {/* Engine Block / Rear Detail */}
                <mesh castShadow receiveShadow position={[0, 0.6, -1.1]}>
                    <boxGeometry args={[1.4, 0.4, 0.6]} />
                    <meshStandardMaterial color={DARK_GUNMETAL} roughness={0.8} />
                </mesh>

                {/* Left Track Group */}
                <group position={[1.1, 0.25, 0]}>
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[0.5, 0.5, 3]} />
                        <meshStandardMaterial color={DARK_GUNMETAL} />
                    </mesh>
                    {/* Mudguard */}
                    <mesh position={[0, 0.3, 0]}>
                        <boxGeometry args={[0.55, 0.1, 3.1]} />
                        <meshStandardMaterial color={OLIVE_DRAB} />
                    </mesh>
                    {/* Wheels details (visual only) */}
                    <mesh position={[0.3, -0.1, 1]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.2, 0.2, 0.1]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    <mesh position={[0.3, -0.1, -1]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.2, 0.2, 0.1]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                </group>

                {/* Right Track Group */}
                <group position={[-1.1, 0.25, 0]}>
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[0.5, 0.5, 3]} />
                        <meshStandardMaterial color={DARK_GUNMETAL} />
                    </mesh>
                    {/* Mudguard */}
                    <mesh position={[0, 0.3, 0]}>
                        <boxGeometry args={[0.55, 0.1, 3.1]} />
                        <meshStandardMaterial color={OLIVE_DRAB} />
                    </mesh>
                    {/* Wheels details */}
                    <mesh position={[-0.3, -0.1, 1]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.2, 0.2, 0.1]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    <mesh position={[-0.3, -0.1, -1]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.2, 0.2, 0.1]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                </group>
            </group>

            {/* === Turret Group (Rotates independently) === */}
            <group ref={turretRef} position={[0, 0.7, 0.2]}>
                {/* Turret Ring / Base */}
                <mesh position={[0, 0.05, 0]}>
                    <cylinderGeometry args={[0.9, 1.1, 0.4, 16]} />
                    <meshStandardMaterial color={DARK_GUNMETAL} />
                </mesh>

                {/* Turret Main Housing */}
                <group position={[0, 0.45, -0.2]}>
                    <mesh castShadow receiveShadow>
                        <boxGeometry args={[1.4, 0.8, 1.8]} />
                        <meshStandardMaterial color={OLIVE_DRAB} />
                    </mesh>
                    {/* Visual Accents (Orange Stripes) */}
                    <mesh position={[0.71, 0, 0.4]}>
                        <boxGeometry args={[0.05, 0.6, 0.2]} />
                        <meshStandardMaterial color={SAFETY_ORANGE} emissive={SAFETY_ORANGE} emissiveIntensity={0.5} />
                    </mesh>
                    <mesh position={[-0.71, 0, 0.4]}>
                        <boxGeometry args={[0.05, 0.6, 0.2]} />
                        <meshStandardMaterial color={SAFETY_ORANGE} emissive={SAFETY_ORANGE} emissiveIntensity={0.5} />
                    </mesh>
                </group>

                {/* Commander Hatch */}
                <mesh position={[0.4, 0.9, -0.5]}>
                    <cylinderGeometry args={[0.3, 0.3, 0.2, 8]} />
                    <meshStandardMaterial color={DARK_GUNMETAL} />
                </mesh>

                {/* === Cannon Pivot Group (Rotates on X for pitch) === */}
                <group ref={barrelRef} position={[0, 0.4, 0.8]}>

                    {/* Recoil Group (Moves on Z) */}
                    <group ref={recoilRef}>
                        {/* Main Barrel - SHORTENED (Mortar style) */}
                        <mesh castShadow position={[0, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
                            {/* Thicker (0.3) and Shorter (1.8) */}
                            <cylinderGeometry args={[0.3, 0.35, 1.8, 16]} />
                            <meshStandardMaterial color={DARK_GUNMETAL} roughness={0.5} />
                        </mesh>

                        {/* Barrel Base/Sleeve */}
                        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.4, 0.4, 0.8, 16]} />
                            <meshStandardMaterial color={OLIVE_DRAB} />
                        </mesh>

                        {/* Muzzle Brake */}
                        <mesh position={[0, 0, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.38, 0.3, 0.4, 12]} />
                            <meshStandardMaterial color={DARK_GUNMETAL} />
                        </mesh>

                        {/* Muzzle Accent Ring */}
                        <mesh position={[0, 0, 1.9]} rotation={[Math.PI / 2, 0, 0]}>
                            <torusGeometry args={[0.3, 0.05, 8, 24]} />
                            <meshStandardMaterial color={SAFETY_ORANGE} emissive={SAFETY_ORANGE} />
                        </mesh>
                    </group>
                </group>
            </group>
        </group>
    );
};

export default Tank;
