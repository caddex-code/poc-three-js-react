


export const CHUNK_SIZE = 100;

export interface Obstacle {
    id: string;
    position: [number, number, number];
    type: 'cactus' | 'rock';
    rotation: [number, number, number];
    radius: number;
    scale: [number, number, number];
    seed: number;
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
        // Retry loop to find valid position
        for (let attempt = 0; attempt < 10; attempt++) {
            const seed = seedBase + i * 1327 + attempt * 7919; // Spreading seeds with attempt variation
            const x = (seededRandom(seed) - 0.5) * CHUNK_SIZE + (chunkX * CHUNK_SIZE);
            const z = (seededRandom(seed + 19) - 0.5) * CHUNK_SIZE + (chunkZ * CHUNK_SIZE);

            // Don't spawn too close to 0,0,0 if it's the start chunk
            if (chunkX === 0 && chunkZ === 0 && Math.sqrt(x * x + z * z) < 8) continue;

            const type = seededRandom(seed + 42) > 0.5 ? 'cactus' : 'rock';
            const rotation: [number, number, number] = [0, seededRandom(seed + 73) * Math.PI * 2, 0];

            // Generate varied scales particularly for rocks
            let scale: [number, number, number] = [1, 1, 1];
            if (type === 'rock') {
                // Base scale 1 to 6, with independent axis variation for shape variety
                const baseScale = 1 + seededRandom(seed + 101) * 5;
                scale = [
                    baseScale * (0.8 + seededRandom(seed + 102) * 0.4),
                    baseScale * (0.6 + seededRandom(seed + 103) * 0.6), // Height can vary more
                    baseScale * (0.8 + seededRandom(seed + 104) * 0.4)
                ];
            } else {
                // Slight variation for cactus
                const s = 0.8 + seededRandom(seed + 105) * 0.4;
                scale = [s, s, s];
            }

            const radius = type === 'rock' ? 1.0 * Math.max(scale[0], scale[2]) : 1.0;

            // Check collision with existing obstacles
            let collision = false;
            for (const existing of obstacles) {
                const dist = Math.sqrt((x - existing.position[0]) ** 2 + (z - existing.position[2]) ** 2);
                const minDist = radius + existing.radius;

                if (dist < minDist) {
                    // Overlap rules:
                    // Rock + Rock = Allowed
                    // Cactus + Rock = Forbidden
                    // Cactus + Cactus = Forbidden
                    if (type === 'rock' && existing.type === 'rock') {
                        continue; // Allow overlap
                    }
                    collision = true;
                    break;
                }
            }

            if (collision) continue; // Try next attempt

            obstacles.push({
                id: `obs-${chunkX}-${chunkZ}-${i}`,
                position: [x, 0, z],
                type,
                rotation,
                radius,
                scale,
                seed: seed + i * 123
            });
            break; // Success, move to next obstacle
        }
    }

    // Number of targets per chunk
    const numTargets = Math.floor(seededRandom(seedBase + 9382) * 5) + 3;

    for (let i = 0; i < numTargets; i++) {
        for (let attempt = 0; attempt < 10; attempt++) {
            const seed = seedBase + 1000 + i + attempt * 997;
            const x = (seededRandom(seed) - 0.5) * CHUNK_SIZE + (chunkX * CHUNK_SIZE);
            const z = (seededRandom(seed + 0.1) - 0.5) * CHUNK_SIZE + (chunkZ * CHUNK_SIZE);

            if (chunkX === 0 && chunkZ === 0 && Math.sqrt(x * x + z * z) < 6) continue;

            const targetRadius = 1.0;
            let collision = false;

            // Check against obstacles
            for (const existing of obstacles) {
                const dist = Math.sqrt((x - existing.position[0]) ** 2 + (z - existing.position[2]) ** 2);
                const minDist = targetRadius + existing.radius + 1.0; // Extra buffer for targets

                if (dist < minDist) {
                    collision = true;
                    break;
                }
            }

            // Check against existing targets
            for (const existing of targets) {
                const dist = Math.sqrt((x - existing.position[0]) ** 2 + (z - existing.position[2]) ** 2);
                if (dist < targetRadius * 2 + 2.0) {
                    collision = true;
                    break;
                }
            }

            if (collision) continue;

            targets.push({
                id: `target-${chunkX}-${chunkZ}-${i}`,
                position: [x, 0, z],
            });
            break; // Success
        }
    }

    return {
        id: getChunkKey(chunkX, chunkZ),
        x: chunkX,
        z: chunkZ,
        obstacles,
        targets,
    };
};
