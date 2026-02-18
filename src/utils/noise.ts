
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';

const simplex = new SimplexNoise();

export const getHeight = (x: number, z: number): number => {
    // Frequency for dunes
    const freq = 0.015;
    const amplitude = 8;

    // Low frequency noise for major dunes
    let h = simplex.noise(x * freq, z * freq) * amplitude;

    // Add some variation with higher frequency
    h += simplex.noise(x * 0.05, z * 0.05) * 1.5;

    return h;
};

export const getNormal = (x: number, z: number): [number, number, number] => {
    const delta = 0.1;
    const hL = getHeight(x - delta, z);
    const hR = getHeight(x + delta, z);
    const hD = getHeight(x, z - delta);
    const hU = getHeight(x, z + delta);

    // Calculate normal vector
    const normal: [number, number, number] = [
        hL - hR,
        2.0 * delta,
        hD - hU
    ];

    // Normalize
    const len = Math.sqrt(normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2);
    return [normal[0] / len, normal[1] / len, normal[2] / len];
};
