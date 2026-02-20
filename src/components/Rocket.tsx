import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, InstancedMesh, Object3D } from 'three';

const SAFETY_ORANGE = '#FF4500';
const DARK_METAL = '#2F4F4F';
const TRAIL_COLOR = '#FF4500'; // Match Safety Orange / Fire

export const Rocket = () => {
    const groupRef = useRef<Group>(null);
    const particlesRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);

    // Trail state: circular buffer of particles
    const MAX_PARTICLES = 30;
    const particles = useRef(
        new Array(MAX_PARTICLES).fill(0).map(() => ({
            position: new Vector3(0, -1000, 0), // Start hidden
            velocity: new Vector3(),
            life: 0,
            maxLife: 0.5 + Math.random() * 0.3, // 0.5 - 0.8s life
            scale: 1,
        }))
    );
    const nextParticleIdx = useRef(0);
    const spawnTimer = useRef(0);

    useFrame((state, delta) => {
        if (groupRef.current && particlesRef.current) {
            // 1. Angular rotation for spin stabilization (visual only)
            groupRef.current.rotation.z += delta * 5;

            // 2. Spawn new trail particles
            // Emit from the back of the rocket transformed to world space
            spawnTimer.current += delta;
            if (spawnTimer.current > 0.03) { // Emit every ~30ms
                spawnTimer.current = 0;

                const idx = nextParticleIdx.current;
                const p = particles.current[idx];

                // Get nozzle position in world space
                // Rocket is -Z forward, so +Z is back
                const nozzlePos = new Vector3(0, 0, 0.6);
                nozzlePos.applyMatrix4(groupRef.current.matrixWorld);

                // Add some randomness to velocity
                const randomVel = new Vector3(
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5
                );

                p.position.copy(nozzlePos);
                p.velocity.copy(randomVel);
                p.life = p.maxLife;
                p.scale = 1;

                nextParticleIdx.current = (nextParticleIdx.current + 1) % MAX_PARTICLES;
            }

            // 3. Update and render particles
            let activeCount = 0;
            for (let i = 0; i < MAX_PARTICLES; i++) {
                const p = particles.current[i];
                if (p.life > 0) {
                    p.life -= delta;

                    // Simple gravity/drag
                    p.velocity.y -= 2 * delta;
                    p.position.addScaledVector(p.velocity, delta);

                    // Scale down as it dies
                    const lifeRatio = p.life / p.maxLife;
                    p.scale = lifeRatio * 0.3; // Starts small (0.3)

                    dummy.position.copy(p.position);
                    dummy.scale.setScalar(p.scale);
                    dummy.updateMatrix();
                    particlesRef.current.setMatrixAt(i, dummy.matrix);
                    activeCount++;
                } else {
                    // Hide dead particles
                    dummy.position.set(0, -1000, 0);
                    dummy.updateMatrix();
                    particlesRef.current.setMatrixAt(i, dummy.matrix);
                }
            }
            particlesRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <>
            <group ref={groupRef} rotation={[0, Math.PI, 0]}>
                {/* Main Body */}
                <mesh castShadow receiveShadow position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.15, 0.15, 0.8, 12]} />
                    <meshStandardMaterial color={DARK_METAL} />
                </mesh>

                {/* Nose Cone */}
                <mesh castShadow receiveShadow position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.15, 0.4, 12]} />
                    <meshStandardMaterial color={SAFETY_ORANGE} />
                </mesh>

                {/* Fins (4x) */}
                {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
                    <mesh key={i} position={[0, 0, 0.3]} rotation={[0, 0, angle]}>
                        <boxGeometry args={[0.05, 0.6, 0.3]} />
                        <meshStandardMaterial color={DARK_METAL} />
                    </mesh>
                ))}
            </group>

            {/* Trail Particles - Round sparks/smoke */}
            <instancedMesh
                ref={particlesRef}
                args={[undefined, undefined, MAX_PARTICLES]}
                frustumCulled={false}
            >
                {/* Low poly sphere instead of box */}
                <sphereGeometry args={[0.2, 5, 5]} />
                <meshBasicMaterial color={TRAIL_COLOR} />
            </instancedMesh>
        </>
    );
};
