import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group, DirectionalLight, Object3D } from 'three';
import Tank from './Tank';
import Bullet from './Bullet';
import Chunk from './Chunk';
import { AimingSystem, useMouseAim, parabolicStrategy, TrajectoryData, ArtilleryConfig } from '../features/shooting';
import { TrackMarks } from './effects/TrackMarks';
import { SmokeParticles } from './effects/SmokeParticles';
import { Tumbleweeds } from './effects/Tumbleweeds';
import { useGameContext } from '../context/GameContext';
import { generateChunkData, getChunkKey, ChunkData, CHUNK_SIZE, Obstacle } from '../utils/chunkManager';
import { ARTILLERY_CONFIG } from '../config/constants';

const VIEW_DISTANCE = 1; // 1 chunk radius around the center (3x3 grid)

const artilleryConfig: ArtilleryConfig = {
    maxRange: ARTILLERY_CONFIG.MAX_RANGE,
    projectileSpeed: ARTILLERY_CONFIG.PROJECTILE_SPEED,
    gravity: ARTILLERY_CONFIG.GRAVITY,
    arcHeightFactor: ARTILLERY_CONFIG.ARC_HEIGHT_FACTOR,
    trajectoryPoints: ARTILLERY_CONFIG.TRAJECTORY_POINTS,
};

const GameScene = () => {
    const [bullets, setBullets] = useState<
        { id: number; position: Vector3; trajectory: TrajectoryData }[]
    >([]);

    // Chunk Management
    const [gameSeed] = useState(() => Math.floor(Math.random() * 1000000));

    const [activeChunks, setActiveChunks] = useState<Map<string, ChunkData>>(() => {
        const initialChunks = new Map<string, ChunkData>();
        for (let x = -VIEW_DISTANCE; x <= VIEW_DISTANCE; x++) {
            for (let z = -VIEW_DISTANCE; z <= VIEW_DISTANCE; z++) {
                const key = getChunkKey(x, z);
                initialChunks.set(key, generateChunkData(x, z, gameSeed));
            }
        }
        return initialChunks;
    });
    const [currentChunk, setCurrentChunk] = useState<{ x: number, z: number }>({ x: 0, z: 0 });

    const tankRef = useRef<Group | null>(null);
    const { addScore } = useGameContext();
    const bulletIdCounter = useRef(0);
    const { camera, viewport } = useThree();
    const lightRef = useRef<DirectionalLight>(null);
    const lightTarget = useMemo(() => new Object3D(), []);

    // Dynamic shadow frustum size
    const shadowSize = Math.max(viewport.width, viewport.height) * 1.5;
    const halfSize = shadowSize / 2;

    // Mouse aiming — returns a MUTABLE ref updated every frame
    const tankPosition = tankRef.current?.position ?? null;
    const mouseAim = useMouseAim(tankPosition, ARTILLERY_CONFIG.MAX_RANGE);

    // Camera follow and Chunk updates
    useFrame(() => {
        if (!tankRef.current) return;

        // 1. Camera Follow
        const tankPos = tankRef.current.position;
        const targetCamPos = new Vector3(tankPos.x + 20, tankPos.y + 20, tankPos.z + 20);
        camera.position.lerp(targetCamPos, 0.1);

        if (camera.userData.isInitialized !== true) {
            camera.lookAt(tankPos);
            camera.userData.isInitialized = true;
        }

        // 2. Chunk Management
        const newChunkX = Math.floor((tankPos.x + CHUNK_SIZE / 2) / CHUNK_SIZE);
        const newChunkZ = Math.floor((tankPos.z + CHUNK_SIZE / 2) / CHUNK_SIZE);

        if (newChunkX !== currentChunk.x || newChunkZ !== currentChunk.z) {
            setCurrentChunk({ x: newChunkX, z: newChunkZ });

            setActiveChunks(prev => {
                const newChunks = new Map(prev);
                const neededKeys = new Set<string>();
                for (let x = newChunkX - VIEW_DISTANCE; x <= newChunkX + VIEW_DISTANCE; x++) {
                    for (let z = newChunkZ - VIEW_DISTANCE; z <= newChunkZ + VIEW_DISTANCE; z++) {
                        const key = getChunkKey(x, z);
                        neededKeys.add(key);
                        if (!newChunks.has(key)) {
                            newChunks.set(key, generateChunkData(x, z, gameSeed));
                        }
                    }
                }
                for (const key of newChunks.keys()) {
                    if (!neededKeys.has(key)) {
                        newChunks.delete(key);
                    }
                }
                return newChunks;
            });
        }

        // 3. Shadow Follow
        if (lightRef.current) {
            lightRef.current.position.set(tankPos.x - 30, tankPos.y + 60, tankPos.z - 30);
            lightTarget.position.set(tankPos.x, tankPos.y, tankPos.z);
            lightTarget.updateMatrixWorld();
        }
    });

    // Aggregate obstacles for collision detection
    const allObstacles = useMemo(() => {
        let obs: Obstacle[] = [];
        activeChunks.forEach(chunk => {
            obs = obs.concat(chunk.obstacles);
        });
        return obs;
    }, [activeChunks]);

    // Helper to find and remove target
    const removeTarget = (targetId: string) => {
        setActiveChunks(prev => {
            const newChunks = new Map(prev);
            for (const [key, chunk] of newChunks.entries()) {
                if (chunk.targets.some(t => t.id === targetId)) {
                    const newChunk = {
                        ...chunk,
                        targets: chunk.targets.filter(t => t.id !== targetId)
                    };
                    newChunks.set(key, newChunk);
                    break;
                }
            }
            return newChunks;
        });
    };

    // Aggregate targets for Bullet component
    const allTargets = useMemo(() => {
        let t: { id: string, position: [number, number, number] }[] = [];
        activeChunks.forEach(chunk => {
            t = t.concat(chunk.targets);
        });
        return t;
    }, [activeChunks]);

    const handleShoot = (position: Vector3, _rotation: [number, number, number], targetPoint: Vector3) => {
        const id = bulletIdCounter.current++;
        const trajectory = parabolicStrategy.calculateTrajectory(
            position,
            targetPoint,
            artilleryConfig
        );
        setBullets(prev => [...prev, { id, position, trajectory }]);
    };

    const handleBulletHit = (targetId: string, bulletId: number) => {
        let points = 10;
        for (const chunk of activeChunks.values()) {
            const target = chunk.targets.find(t => t.id === targetId);
            if (target) {
                if (target.type === 'metal') points = 20;
                else if (target.type === 'tire') points = 30;
                break;
            }
        }

        removeTarget(targetId);
        setBullets(prev => prev.filter(b => b.id !== bulletId));
        addScore(points);
    };

    const handleBulletMiss = (bulletId: number) => {
        setBullets(prev => prev.filter(b => b.id !== bulletId));
    };

    return (
        <>
            <hemisphereLight
                intensity={0.4}
                color="#87CEEB"
                groundColor="#8b4513"
            />
            <primitive object={lightTarget} />
            <directionalLight
                ref={lightRef}
                position={[-30, 60, -30]}
                intensity={1.5}
                castShadow
                shadow-bias={-0.0001}
                shadow-normalBias={0.05}
                target={lightTarget}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-halfSize}
                shadow-camera-right={halfSize}
                shadow-camera-top={halfSize}
                shadow-camera-bottom={-halfSize}
                shadow-camera-far={250}
                shadow-camera-near={1}
            />

            {/* Render active chunks */}
            {Array.from(activeChunks.values()).map(chunk => (
                <Chunk key={chunk.id} data={chunk} />
            ))}

            <Tank
                onShoot={handleShoot}
                obstacles={allObstacles}
                innerRef={tankRef}
                mouseTarget={mouseAim.clampedPoint}
            />
            <TrackMarks tankRef={tankRef} />
            <SmokeParticles tankRef={tankRef} />
            <Tumbleweeds tankRef={tankRef} obstacles={allObstacles} />

            {/* Aiming System — reads mouseAim mutably each frame */}
            <AimingSystem
                tankRef={tankRef}
                mouseAim={mouseAim}
            />

            {/* Render Bullets */}
            {bullets.map(bullet => (
                <Bullet
                    key={bullet.id}
                    position={[bullet.position.x, bullet.position.y, bullet.position.z]}
                    trajectory={bullet.trajectory}
                    targets={allTargets}
                    onHit={(targetId) => handleBulletHit(targetId, bullet.id)}
                    onMiss={() => handleBulletMiss(bullet.id)}
                />
            ))}
        </>
    );
};

export default GameScene;
