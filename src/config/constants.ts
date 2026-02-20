
export const TANK_CONFIG = {
    INITIAL_SPEED: 5,
    MAX_SPEED: 15,
    ACCELERATION: 10,
    ROTATION_SPEED: 2,
    RADIUS: 1.2,
};

export const WORLD_CONFIG = {
    CHUNK_SIZE: 10, // Assuming this from chunkManager
    VIEW_DISTANCE: 1,
};

export const EFFECTS_CONFIG = {
    SMOKE: {
        MAX_PARTICLES: 50,
        LIFETIME: 1.5,
        OPACITY: 0.3,
        COLOR: '#aaa',
        BURST_COUNT: 10,
        SPREAD: 1.2,
    },
    TRACKS: {
        MAX_MARKS: 100,
        LIFETIME: 3.0,
        MIN_DISTANCE: 0.6,
        OFFSET: 0.9,
        OPACITY: 0.6,
        COLOR: '#222',
    },
    TUMBLEWEED: {
        MAX_COUNT: 2,
        COLOR: '#B8860B', // Dark goldenrod / dry brush color
        RADIUS: 0.6,
        SPEED: 8,
        SPAWN_RADIUS: 30, // Brought in closer
    },
};

export const ARTILLERY_CONFIG = {
    MAX_RANGE: 25,
    PROJECTILE_SPEED: 15,
    GRAVITY: 9.8,
    ARC_HEIGHT_FACTOR: 1.8,
    SPLASH_RADIUS: 1.2,
    TRAJECTORY_POINTS: 30,
    RANGE_CIRCLE_SEGMENTS: 64,
    RANGE_CIRCLE_COLOR: '#ffffff',
    RANGE_CIRCLE_OPACITY: 0.35,
    RETICLE_COLOR: '#ff4444',
    RETICLE_OPACITY: 0.6,
    RETICLE_RADIUS: 0.8,
    TRAJECTORY_COLOR: '#ffffff',
    TRAJECTORY_OPACITY: 0.5,
};
