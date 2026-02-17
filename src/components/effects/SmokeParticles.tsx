
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, InstancedMesh, Matrix4, Vector3, Group } from 'three';
import { EFFECTS_CONFIG } from '../../config/constants';

const { MAX_PARTICLES, LIFETIME, OPACITY, COLOR, BURST_COUNT, SPREAD } = EFFECTS_CONFIG.SMOKE;

const tempObj = new Object3D();
const tempVec = new Vector3();
const tempMat = new Matrix4();

interface TankEffectsProps {
    tankRef: React.MutableRefObject<Group | null>;
}

export const SmokeParticles = ({ tankRef }: TankEffectsProps) => {
    const meshRef = useRef<InstancedMesh>(null);
    const particleData = useMemo(() => {
        return Array(MAX_PARTICLES).fill(0).map(() => ({
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
            for (let i = 0; i < MAX_PARTICLES; i++) {
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

            for (let i = 0; i < BURST_COUNT; i++) {
                const idx = (currentIndex.current + i) % MAX_PARTICLES;
                const data = particleData[idx];

                // Emit from back of tank
                tempVec.set(0, 0.5, -1.8); // Slightly further back
                tempVec.applyAxisAngle(new Vector3(0, 1, 0), tank.rotation.y);
                tempVec.add(currentPos);

                // Increase spread
                tempVec.x += (Math.random() - 0.5) * SPREAD;
                tempVec.z += (Math.random() - 0.5) * SPREAD;
                tempVec.y += (Math.random() - 0.5) * 0.5;

                data.active = true;
                data.startTime = time;
                data.startPosition.copy(tempVec);

                // Velocity
                data.velocity.set(
                    (Math.random() - 0.5) * 1.5,
                    1.5 + Math.random() * 2, // Upward speed
                    (Math.random() - 0.5) * 1.5
                );
                data.initialScale = 0.3 + Math.random() * 0.4;
            }
            currentIndex.current = (currentIndex.current + BURST_COUNT) % MAX_PARTICLES;
        }

        isMoving.current = currentlyMoving;

        // Update particles
        let hasUpdates = false;
        for (let i = 0; i < MAX_PARTICLES; i++) {
            const data = particleData[i];
            if (data.active) {
                const age = time - data.startTime;

                if (age > LIFETIME) {
                    data.active = false;
                    tempMat.makeScale(0, 0, 0);
                    meshRef.current.setMatrixAt(i, tempMat);
                    hasUpdates = true;
                } else {
                    // Update position
                    tempVec.copy(data.startPosition).addScaledVector(data.velocity, age);

                    // Scale logic
                    const lifeRatio = age / LIFETIME;
                    let scale = 0;

                    if (lifeRatio < 0.2) {
                        scale = data.initialScale * (1 + lifeRatio * 8);
                    } else if (lifeRatio < 0.6) {
                        scale = data.initialScale * 2.6 * (1 + (lifeRatio - 0.2) * 0.5);
                    } else {
                        const fadeRatio = (lifeRatio - 0.6) / 0.4;
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
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
            <sphereGeometry args={[1, 7, 7]} />
            <meshStandardMaterial color={COLOR} transparent opacity={OPACITY} depthWrite={false} />
        </instancedMesh>
    );
};
