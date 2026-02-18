import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group, Euler, Mesh, Frustum, Matrix4 } from 'three';
import { EFFECTS_CONFIG, TANK_CONFIG } from '../../config/constants';
import { Obstacle } from '../../utils/chunkManager';

const { MAX_COUNT, COLOR, RADIUS, SPEED, SPAWN_RADIUS } = EFFECTS_CONFIG.TUMBLEWEED;

interface TumbleweedData {
    id: number;
    pos: Vector3;
    rot: Euler;
    active: boolean;
    isDying: boolean;
    deathTimer: number;
    scale: number;
    vel: Vector3;
    hopOffset: number;
    hopSpeed: number;
}

interface TumbleweedsProps {
    tankRef: React.MutableRefObject<Group | null>;
    obstacles: Obstacle[];
}

export const Tumbleweeds = ({ tankRef, obstacles }: TumbleweedsProps) => {
    const { camera } = useThree();
    const frustum = useMemo(() => new Frustum(), []);
    const projScreenMatrix = useMemo(() => new Matrix4(), []);

    const tumbleweeds = useRef<TumbleweedData[]>(
        Array(MAX_COUNT).fill(0).map((_, i) => ({
            id: i,
            pos: new Vector3(0, -10, 0), // Start hidden
            rot: new Euler(),
            active: false,
            isDying: false,
            deathTimer: 0,
            scale: 0,
            vel: new Vector3(),
            hopOffset: Math.random() * Math.PI,
            hopSpeed: 2 + Math.random() * 2
        }))
    );

    const meshRefs = useRef<(Mesh | null)[]>([]);

    const spawn = (data: TumbleweedData, centerPos: Vector3) => {
        // Asegurar que la cámara tiene los datos de resolución/matriz actualizados
        camera.updateMatrixWorld();
        projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);

        // Spawn más lejos para evitar que aparezcan de golpe (40 a 60 unidades)
        const angle = (Math.random() - 0.5) * 2.5; // Arco más amplio
        const dist = 40 + Math.random() * 20;

        // Dirección de la cámara en el plano XZ
        const camDir = new Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();

        const spawnPos = new Vector3().copy(camDir)
            .applyAxisAngle(new Vector3(0, 1, 0), angle)
            .multiplyScalar(dist)
            .add(centerPos);

        data.pos.copy(spawnPos);
        data.pos.y = RADIUS;

        // Dirección de movimiento: hacia el área general del tanque para que crucen la pantalla
        const targetPoint = new Vector3(
            centerPos.x + (Math.random() - 0.5) * 20,
            RADIUS,
            centerPos.z + (Math.random() - 0.5) * 20
        );
        data.vel.subVectors(targetPoint, data.pos).normalize().multiplyScalar(SPEED);

        data.active = true;
        data.isDying = false;
        data.deathTimer = 0;
        data.scale = 1;
    };

    useFrame((state, delta) => {
        if (!tankRef.current) return;
        const tankPos = tankRef.current.position;
        const time = state.clock.elapsedTime;

        tumbleweeds.current.forEach((t, i) => {
            if (!t.active) {
                // Try to spawn if inactive
                if (Math.random() < 0.002) {
                    spawn(t, tankPos);
                }
                return;
            }

            // Animación de muerte (Explosión)
            if (t.isDying) {
                t.deathTimer += delta;
                t.scale = 1 + t.deathTimer * 4; // Se expande
                if (t.deathTimer > 0.3) {
                    t.active = false;
                    t.isDying = false;
                    t.scale = 0;
                }
            } else {
                // 1. Movement
                t.pos.addScaledVector(t.vel, delta);

                // 2. Rolling Rotation
                t.rot.x += delta * 5;
                t.rot.z += delta * 2;

                // 3. Hopping Animation
                const hop = Math.abs(Math.sin(time * t.hopSpeed + t.hopOffset)) * 0.5;
                t.pos.y = RADIUS + hop;

                // 4. Collision Check with Tank
                const distToTank = t.pos.distanceTo(tankPos);
                if (distToTank < TANK_CONFIG.RADIUS + RADIUS) {
                    t.isDying = true;
                    t.vel.multiplyScalar(0.2); // Se frena al estallar
                }

                // 5. Collision Check with Obstacles
                if (!t.isDying) {
                    for (const obs of obstacles) {
                        if (!obs.collidable) continue;
                        const obsPos = new Vector3(...obs.position);
                        if (t.pos.distanceTo(obsPos) < obs.radius + RADIUS) {
                            t.isDying = true;
                            break;
                        }
                    }
                }

                // 6. Out of bounds check
                if (t.pos.distanceTo(tankPos) > SPAWN_RADIUS + 30) {
                    t.active = false;
                    t.scale = 0;
                }
            }

            // 7. Update Mesh
            const mesh = meshRefs.current[i];
            if (mesh) {
                mesh.position.copy(t.pos);
                mesh.rotation.copy(t.rot);
                mesh.scale.setScalar(t.scale);
                // Efecto de desvanecimiento (opcional si el material lo permite, aquí simulado con escala)
                if (t.isDying) {
                    const material = mesh.material as any;
                    if (material.opacity !== undefined) {
                        material.transparent = true;
                        material.opacity = 1 - (t.deathTimer / 0.3);
                    }
                } else {
                    const material = mesh.material as any;
                    if (material.opacity !== undefined) {
                        material.opacity = 1;
                    }
                }
            }
        });
    });

    return (
        <group>
            {tumbleweeds.current.map((t, i) => (
                <mesh
                    key={t.id}
                    ref={el => meshRefs.current[i] = el}
                    castShadow
                >
                    <icosahedronGeometry args={[RADIUS, 1]} />
                    <meshStandardMaterial
                        color={COLOR}
                        wireframe
                        roughness={1}
                    />
                </mesh>
            ))}
        </group>
    );
};
