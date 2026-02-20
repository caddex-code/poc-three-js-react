import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group, DirectionalLight, Object3D } from 'three';
import Tank from './Tank';
import Projectile from './Projectile';
import { Explosion } from './Explosion';
import Chunk from './Chunk';
import { AimingSystem, useMouseAim, parabolicStrategy, TrajectoryData, ArtilleryConfig } from '../features/shooting';
import { TrackMarks } from './effects/TrackMarks';
import { SmokeParticles } from './effects/SmokeParticles';
import { Tumbleweeds } from './effects/Tumbleweeds';
import { useGameContext } from '../context/GameContext';
import { generateChunkData, getChunkKey, ChunkData, CHUNK_SIZE, Obstacle } from '../utils/chunkManager';
import { ARTILLERY_CONFIG } from '../config/constants';

const VIEW_DISTANCE = 1; // 1 chunk radius around the center (3x3 grid)
const EXPLOSION_RADIUS = 3.5; // AoE Radius for damage

const artilleryConfig: ArtilleryConfig = {
    maxRange: ARTILLERY_CONFIG.MAX_RANGE,
    projectileSpeed: ARTILLERY_CONFIG.PROJECTILE_SPEED,
    gravity: ARTILLERY_CONFIG.GRAVITY,
    arcHeightFactor: ARTILLERY_CONFIG.ARC_HEIGHT_FACTOR,
    trajectoryPoints: ARTILLERY_CONFIG.TRAJECTORY_POINTS,
};

const GameScene = () => {
    // State for new Projectile system
    const [projectiles, setProjectiles] = useState<
        { id: number; trajectory: TrajectoryData }[]
    >([]);

    // State for explosions
    const [explosions, setExplosions] = useState<
        { id: number; position: Vector3 }[]
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
    const projectileIdCounter = useRef(0);
    const explosionIdCounter = useRef(0);
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

    // Aggregate targets just for AoE calculation
    const allTargets = useMemo(() => {
        let t: { id: string, position: [number, number, number], type: string }[] = [];
        activeChunks.forEach(chunk => {
            t = t.concat(chunk.targets);
        });
        return t;
    }, [activeChunks]);

    const handleShoot = (position: Vector3, _rotation: [number, number, number], targetPoint: Vector3) => {
        const id = projectileIdCounter.current++;
        const trajectory = parabolicStrategy.calculateTrajectory(
            position,
            targetPoint,
            artilleryConfig
        );
        setProjectiles(prev => [...prev, { id, trajectory }]);
    };

    const handleProjectileExplode = (projectileId: number, position: Vector3) => {
        // 1. Remove Projectile
        setProjectiles(prev => prev.filter(p => p.id !== projectileId));

        // 2. Spawn Explosion Effect
        const explId = explosionIdCounter.current++;
        setExplosions(prev => [...prev, { id: explId, position }]);

        // 3. Calculate AoE Damage
        const targetsToDestroy: string[] = [];
        let scoreToAdd = 0;

        allTargets.forEach(target => {
            const tPos = new Vector3(...target.position);
            const dist = position.distanceTo(tPos);

            if (dist <= EXPLOSION_RADIUS) {
                targetsToDestroy.push(target.id);
                // Score logic
                if (target.type === 'metal') scoreToAdd += 20;
                else if (target.type === 'tire') scoreToAdd += 30;
                else scoreToAdd += 10;
            }
        });

        if (targetsToDestroy.length > 0) {
            addScore(scoreToAdd);
            // Batch remove targets
            setActiveChunks(prev => {
                const newChunks = new Map(prev);
                let changed = false;

                // We need to iterate chunks to find which ones hold the specific targets
                // Since lookup map by ID is hard, we iterate all chunks (few active anyway)
                for (const [key, chunk] of newChunks.entries()) {
                    const originalCount = chunk.targets.length;
                    const newTargets = chunk.targets.filter(t => !targetsToDestroy.includes(t.id));

                    if (newTargets.length !== originalCount) {
                        newChunks.set(key, { ...chunk, targets: newTargets });
                        changed = true;
                    }
                }
                return changed ? newChunks : prev;
            });
        }
    };

    const handleExplosionComplete = (id: number) => {
        setExplosions(prev => prev.filter(e => e.id !== id));
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

            {/* Aiming System */}
            <AimingSystem
                tankRef={tankRef}
                mouseAim={mouseAim}
            />

            {/* Render Projectiles */}
            {projectiles.map(p => (
                <Projectile
                    key={p.id}
                    type="ROCKET"
                    trajectory={p.trajectory}
                    onExplode={(pos) => handleProjectileExplode(p.id, pos)}
                />
            ))}

            {/* Render Explosions */}
            {explosions.map(e => (
                <Explosion
                    key={e.id}
                    position={e.position}
                    onComplete={() => handleExplosionComplete(e.id)}
                />
            ))}
        </>
    );
};

export default GameScene;
