import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, InstancedMesh, Vector3, Color } from 'three';

interface ExplosionProps {
    position: Vector3;
    onComplete: () => void;
}

const PARTICLE_COUNT = 30;
const LIFETIME = 1.0; // Seconds

export const Explosion = ({ position, onComplete }: ExplosionProps) => {
    // Two separate meshes for different geometries
    const roundMeshRef = useRef<InstancedMesh>(null); // For Smoke (Grey) and Fire (Orange)
    const debrisMeshRef = useRef<InstancedMesh>(null); // For Debris (Brown cubes)

    const timeRef = useRef(0);
    const dummy = useMemo(() => new Object3D(), []);

    // Generate particle data
    const particles = useMemo(() => {
        return new Array(PARTICLE_COUNT).fill(0).map(() => {
            // Determine type
            const isDebris = Math.random() < 0.3; // 30% Debris
            // Of the remaining 70%, 50/50 smoke vs fire
            const isSmoke = !isDebris && Math.random() > 0.5;

            // Velocity
            const velocity = new Vector3(
                (Math.random() - 0.5) * 8,
                Math.random() * 6 + 2, // Upward burst
                (Math.random() - 0.5) * 8
            );

            let color = new Color();
            let baseScale = 1;
            let type: 'debris' | 'smoke' | 'fire' = 'debris';

            if (isDebris) {
                type = 'debris';
                color.setHex(0x5D4037); // Brown
                baseScale = 0.2 + Math.random() * 0.3;
            } else if (isSmoke) {
                type = 'smoke';
                color.setHex(0x444444); // Dark Grey
                baseScale = 0.8 + Math.random() * 0.6;
            } else {
                type = 'fire';
                color.setHex(0xFF4500); // Orange
                baseScale = 0.5 + Math.random() * 0.5;
            }

            return {
                velocity,
                color,
                baseScale,
                initialPos: position.clone(),
                type
            };
        });
    }, [position]);

    // Pre-calculate indices for each mesh to avoid filtering every frame
    const { roundIndices, debrisIndices } = useMemo(() => {
        const round: number[] = [];
        const debris: number[] = [];
        particles.forEach((p, i) => {
            if (p.type === 'debris') debris.push(i);
            else round.push(i);
        });
        return { roundIndices: round, debrisIndices: debris };
    }, [particles]);

    useLayoutEffect(() => {
        // Initialize colors
        // Note: We need to map the global particle index 'i' to the instance index 'k' in the specific mesh
        // But here we can just set colors at index 'k' where k is 0..count-1

        if (roundMeshRef.current) {
            roundIndices.forEach((pIdx, k) => {
                roundMeshRef.current!.setColorAt(k, particles[pIdx].color);
            });
            roundMeshRef.current.instanceColor!.needsUpdate = true;
        }

        if (debrisMeshRef.current) {
            debrisIndices.forEach((pIdx, k) => {
                debrisMeshRef.current!.setColorAt(k, particles[pIdx].color);
            });
            debrisMeshRef.current.instanceColor!.needsUpdate = true;
        }
    }, [particles, roundIndices, debrisIndices]);

    useFrame((_, delta) => {
        timeRef.current += delta;

        if (timeRef.current >= LIFETIME) {
            onComplete();
            return;
        }

        const t = timeRef.current;
        const progress = t / LIFETIME; // 0 -> 1

        // Update Round Particles (Smoke/Fire)
        if (roundMeshRef.current) {
            roundIndices.forEach((pIdx, k) => {
                const p = particles[pIdx];

                // Physics
                const gravity = p.type === 'smoke' ? 2.0 : -1.0; // Smoke floats up, Fire stays/drifts slightly

                dummy.position.copy(p.initialPos).addScaledVector(p.velocity, t);
                dummy.position.y += 0.5 * gravity * t * t;

                // Scale
                let scale = p.baseScale;
                if (p.type === 'smoke') {
                    // Smoke expands significantly
                    scale *= (1 + progress * 2.5);
                    // Fade size at end (visual hack for opacity)
                    if (progress > 0.8) scale *= (1 - (progress - 0.8) * 5);
                } else {
                    // Fire shrinks
                    scale *= (1 - progress);
                }

                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                roundMeshRef.current!.setMatrixAt(k, dummy.matrix);
            });
            roundMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        // Update Debris Particles (Cubes)
        if (debrisMeshRef.current) {
            debrisIndices.forEach((pIdx, k) => {
                const p = particles[pIdx];
                const gravity = -15.0; // Heavy fall

                dummy.position.copy(p.initialPos).addScaledVector(p.velocity, t);
                dummy.position.y += 0.5 * gravity * t * t;

                // Rotate tumbling
                dummy.rotation.x += delta * 5;
                dummy.rotation.z += delta * 5;

                // Shrink slightly at end
                const scale = p.baseScale * (1 - progress * 0.2);

                dummy.scale.setScalar(scale);
                dummy.updateMatrix();
                debrisMeshRef.current!.setMatrixAt(k, dummy.matrix);
            });
            debrisMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Round Meshes (Smoke/Fire) - Low Poly Sphere */}
            <instancedMesh
                ref={roundMeshRef}
                args={[undefined, undefined, roundIndices.length]}
                frustumCulled={false}
            >
                <sphereGeometry args={[0.3, 7, 7]} />
                <meshStandardMaterial transparent opacity={0.9} depthWrite={false} />
            </instancedMesh>

            {/* Debris Meshes - Cubes */}
            <instancedMesh
                ref={debrisMeshRef}
                args={[undefined, undefined, debrisIndices.length]}
                frustumCulled={false}
            >
                <boxGeometry args={[0.3, 0.3, 0.3]} />
                <meshStandardMaterial color="#5D4037" />
            </instancedMesh>
        </group>
    );
};
