
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
    }
};
