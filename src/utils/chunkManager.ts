


export const CHUNK_SIZE = 100;

export interface Obstacle {
    id: string;
    position: [number, number, number];
    type: 'cactus' | 'rock';
    rotation: [number, number, number];
    radius: number;
}

export interface Target {
    id: string;
    position: [number, number, number];
}

export interface ChunkData {
    id: string;
    x: number;
    z: number;
    obstacles: Obstacle[];
    targets: Target[];
}

// Simple pseudo-random number generator for determinism based on seed
const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
};

export const getChunkKey = (x: number, z: number) => `${x},${z}`;

export const generateChunkData = (chunkX: number, chunkZ: number, gameSeed: number = 0): ChunkData => {
    // Ensure unique seeds for negative coordinates and avoid 0 correlation
    const seedBase = (chunkX * 15485863) ^ (chunkZ * 2038074743) ^ gameSeed;

    const obstacles: Obstacle[] = [];
    const targets: Target[] = [];

    // Number of obstacles per chunk (deterministic)
    const numObstacles = Math.floor(seededRandom(seedBase) * 20) + 20; // High density: 20-40

    for (let i = 0; i < numObstacles; i++) {
        const seed = seedBase + i * 1327; // Spreading seeds
        const x = (seededRandom(seed) - 0.5) * CHUNK_SIZE + (chunkX * CHUNK_SIZE);
        const z = (seededRandom(seed + 19) - 0.5) * CHUNK_SIZE + (chunkZ * CHUNK_SIZE);

        // Don't spawn too close to 0,0,0 if it's the start chunk
        if (chunkX === 0 && chunkZ === 0 && Math.sqrt(x * x + z * z) < 6) continue;

        const type = seededRandom(seed + 42) > 0.5 ? 'cactus' : 'rock';
        const rotation: [number, number, number] = [0, seededRandom(seed + 73) * Math.PI * 2, 0];

        obstacles.push({
            id: `obs-${chunkX}-${chunkZ}-${i}`,
            position: [x, 0, z],
            type,
            rotation,
            radius: type === 'rock' ? 1.5 : 1.0,
        });
    }

    // Number of targets per chunk
    const numTargets = Math.floor(seededRandom(seedBase + 9382) * 5) + 3;

    for (let i = 0; i < numTargets; i++) {
        const seed = seedBase + 1000 + i;
        const x = (seededRandom(seed) - 0.5) * CHUNK_SIZE + (chunkX * CHUNK_SIZE);
        const z = (seededRandom(seed + 0.1) - 0.5) * CHUNK_SIZE + (chunkZ * CHUNK_SIZE);

        if (chunkX === 0 && chunkZ === 0 && Math.sqrt(x * x + z * z) < 4) continue; // Reduced safe zone by half

        targets.push({
            id: `target-${chunkX}-${chunkZ}-${i}`,
            position: [x, 0, z],
        });
    }

    return {
        id: getChunkKey(chunkX, chunkZ),
        x: chunkX,
        z: chunkZ,
        obstacles,
        targets,
    };
};
