
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, InstancedMesh, Matrix4, Vector3, Group, Euler } from 'three';

const MAX_MARKS = 100;
const MARK_LIFETIME = 3.0; // Seconds to fade out
const MIN_DISTANCE = 0.6; // Distance between track marks
const TRACK_OFFSET = 0.9; // Offset from center for tracks

const tempObj = new Object3D();
const tempVec = new Vector3();
const tempMat = new Matrix4();

interface TankEffectsProps {
    tankRef: React.MutableRefObject<Group | null>;
}

export const TrackMarks = ({ tankRef }: TankEffectsProps) => {
    const meshRef = useRef<InstancedMesh>(null);
    const lastPos = useRef(new Vector3());
    const markData = useMemo(() => {
        return Array(MAX_MARKS).fill(0).map(() => ({
            active: false,
            startTime: 0,
            position: new Vector3(),
            rotation: new Euler(),
        }));
    }, []);
    const currentIndex = useRef(0);

    useFrame((state) => {
        if (!tankRef.current || !meshRef.current) return;

        const tank = tankRef.current;
        const currentPos = tank.position;

        // Calculate distance moved (XZ plane)
        const dist = Math.sqrt(
            Math.pow(currentPos.x - lastPos.current.x, 2) +
            Math.pow(currentPos.z - lastPos.current.z, 2)
        );

        // Spawn new marks if moved enough
        if (dist > MIN_DISTANCE) {
            lastPos.current.copy(currentPos);

            // Spawn two marks (left and right)
            for (let i = -1; i <= 1; i += 2) {
                const idx = (currentIndex.current + (i === -1 ? 0 : 1)) % MAX_MARKS;
                const offset = i * TRACK_OFFSET;

                // Calculate position relative to tank
                tempVec.set(offset, 0.05, 0.2);
                tempVec.applyAxisAngle(new Vector3(0, 1, 0), tank.rotation.y);
                tempVec.add(currentPos);

                // Store data
                const data = markData[idx];
                data.active = true;
                data.startTime = state.clock.elapsedTime;
                data.position.copy(tempVec);
                // Rotate flat on ground (-PI/2 on X), and match tank's Y rotation
                data.rotation.set(-Math.PI / 2, 0, tank.rotation.y);
            }

            currentIndex.current = (currentIndex.current + 2) % MAX_MARKS;
        }

        // Update all marks
        let hasUpdates = false;
        const time = state.clock.elapsedTime;

        for (let i = 0; i < MAX_MARKS; i++) {
            const data = markData[i];

            if (data.active) {
                const age = time - data.startTime;

                if (age > MARK_LIFETIME) {
                    data.active = false;
                    tempMat.makeScale(0, 0, 0);
                    meshRef.current.setMatrixAt(i, tempMat);
                    hasUpdates = true;
                } else {
                    // Update scale based on age (shrink to disappear)
                    const lifeRatio = 1 - (age / MARK_LIFETIME);
                    const scale = lifeRatio;

                    tempObj.position.copy(data.position);
                    tempObj.rotation.copy(data.rotation);
                    tempObj.scale.set(scale, scale, 1);
                    tempObj.updateMatrix();

                    meshRef.current.setMatrixAt(i, tempObj.matrix);
                    hasUpdates = true;
                }
            }
        }

        if (hasUpdates) {
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_MARKS]} frustumCulled={false}>
            <planeGeometry args={[0.3, 0.6]} />
            <meshStandardMaterial color="#222" transparent opacity={0.6} depthWrite={false} />
        </instancedMesh>
    );
};

// Smoke Constants
const MAX_SMOKE = 50;
const SMOKE_LIFETIME = 1.8; // Longer lifetime for smoother transition

export const SmokeParticles = ({ tankRef }: TankEffectsProps) => {
    const meshRef = useRef<InstancedMesh>(null);
    const particleData = useMemo(() => {
        return Array(MAX_SMOKE).fill(0).map(() => ({
            active: false,
            startTime: 0,
            startPosition: new Vector3(),
            velocity: new Vector3(),
            initialScale: 1
        }));
    }, []);
    const currentIndex = useRef(0);
    const lastTankPos = useRef(new Vector3());
    const isMoving = useRef(false);

    useEffect(() => {
        if (meshRef.current) {
            for (let i = 0; i < MAX_SMOKE; i++) {
                // Initialize all to scale 0
                tempMat.makeScale(0, 0, 0);
                meshRef.current.setMatrixAt(i, tempMat);
            }
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, []);

    useFrame((state, delta) => {
        if (!tankRef.current || !meshRef.current) return;

        const tank = tankRef.current;
        const currentPos = tank.position;

        // Calculate speed
        const speed = currentPos.distanceTo(lastTankPos.current) / delta;
        lastTankPos.current.copy(currentPos);

        const time = state.clock.elapsedTime;

        // Emit only when starting to move (acceleration kick)
        const currentlyMoving = speed > 0.1;
        const wasMoving = isMoving.current;

        if (currentlyMoving && !wasMoving) {
            // Started moving: Emit a burst of smoke
            const burstCount = 10;

            for (let i = 0; i < burstCount; i++) {
                const idx = (currentIndex.current + i) % MAX_SMOKE;
                const data = particleData[idx];

                // Emit from back of tank
                tempVec.set(0, 0.5, -1.8); // Slightly further back
                tempVec.applyAxisAngle(new Vector3(0, 1, 0), tank.rotation.y);
                tempVec.add(currentPos);

                // Increase spread to avoid "clumping"
                const spread = 1.0;
                tempVec.x += (Math.random() - 0.5) * spread;
                tempVec.z += (Math.random() - 0.5) * spread;
                tempVec.y += (Math.random() - 0.5) * 0.5;

                data.active = true;
                data.startTime = time;
                data.startPosition.copy(tempVec);

                // Velocity: Upwards with some horizontal drift
                data.velocity.set(
                    (Math.random() - 0.5) * 1.5,
                    1.5 + Math.random() * 2, // Upward speed
                    (Math.random() - 0.5) * 1.5
                );
                // Smaller initial puffs to look less blocky
                data.initialScale = 0.3 + Math.random() * 0.4;
            }
            currentIndex.current = (currentIndex.current + burstCount) % MAX_SMOKE;
        }

        isMoving.current = currentlyMoving;

        // Update particles
        let hasUpdates = false;
        for (let i = 0; i < MAX_SMOKE; i++) {
            const data = particleData[i];
            if (data.active) {
                const age = time - data.startTime;

                if (age > SMOKE_LIFETIME) {
                    data.active = false;
                    tempMat.makeScale(0, 0, 0);
                    meshRef.current.setMatrixAt(i, tempMat);
                    hasUpdates = true;
                } else {
                    // Update position: start + vel * age
                    tempVec.copy(data.startPosition).addScaledVector(data.velocity, age);

                    // Scale logic: Rapid grow, steady, then smooth shrink to fade
                    const lifeRatio = age / SMOKE_LIFETIME;
                    let scale = 0;

                    if (lifeRatio < 0.2) {
                        // Grow fast (0.2s)
                        scale = data.initialScale * (1 + lifeRatio * 8);
                    } else if (lifeRatio < 0.6) {
                        // Slower expansion/float
                        scale = data.initialScale * 2.6 * (1 + (lifeRatio - 0.2) * 0.5);
                    } else {
                        // Shrink to 0 (Fade out effect)
                        const fadeRatio = (lifeRatio - 0.6) / 0.4; // 0 to 1
                        scale = data.initialScale * 3.5 * (1 - fadeRatio);
                    }

                    tempObj.position.copy(tempVec);
                    tempObj.scale.setScalar(scale);
                    tempObj.rotation.set(0, 0, 0);
                    tempObj.updateMatrix();

                    meshRef.current.setMatrixAt(i, tempObj.matrix);
                    hasUpdates = true;
                }
            }
        }

        if (hasUpdates) {
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_SMOKE]} frustumCulled={false}>
            <sphereGeometry args={[1, 7, 7]} />
            <meshStandardMaterial color="#aaa" transparent opacity={0.3} depthWrite={false} />
        </instancedMesh>
    );
};
