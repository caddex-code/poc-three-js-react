import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { JSX } from "react";

interface RockProps {
    seed?: number;
}

const Rock = ({ seed = 0, ...props }: RockProps & JSX.IntrinsicElements['group']) => {
    const { geometry, color } = useMemo(() => {
        // Create geometry (likely non-indexed or indexed, we handle both via position map)
        const geo = new THREE.DodecahedronGeometry(1, 0);

        const positionAttribute = geo.getAttribute('position');
        const vertex = new THREE.Vector3();

        // Map to store offsets for each unique vertex position to prevent cracks
        const offsets = new Map<string, THREE.Vector3>();

        // Pseudo-random function
        const getHash = (x: number, y: number, z: number) => {
            return Math.sin(x * 12.9898 + y * 78.233 + z * 54.53 + seed) * 43758.5453;
        };

        for (let i = 0; i < positionAttribute.count; i++) {
            vertex.fromBufferAttribute(positionAttribute, i);

            // Create a key for the original position to identify shared vertices
            const key = `${vertex.x.toFixed(4)},${vertex.y.toFixed(4)},${vertex.z.toFixed(4)}`;

            let offsetVec = offsets.get(key);

            if (!offsetVec) {
                // Generate a deterministic random value for this vertex position + rock seed
                const h = getHash(vertex.x, vertex.y, vertex.z);
                const rand = h - Math.floor(h);

                // Random variation
                const distortion = 0.3;
                const offset = (rand - 0.5) * distortion;

                offsetVec = new THREE.Vector3();
                offsetVec.copy(vertex).multiplyScalar(1 + offset);

                // Axis jitter
                const rand2 = (getHash(vertex.x + 1, vertex.y, vertex.z) - Math.floor(getHash(vertex.x + 1, vertex.y, vertex.z)));
                const rand3 = (getHash(vertex.x, vertex.y + 1, vertex.z) - Math.floor(getHash(vertex.x, vertex.y + 1, vertex.z)));
                const rand4 = (getHash(vertex.x, vertex.y, vertex.z + 1) - Math.floor(getHash(vertex.x, vertex.y, vertex.z + 1)));

                offsetVec.x += (rand2 - 0.5) * 0.15;
                offsetVec.y += (rand3 - 0.5) * 0.15;
                offsetVec.z += (rand4 - 0.5) * 0.15;

                offsets.set(key, offsetVec);
            }

            positionAttribute.setXYZ(i, offsetVec.x, offsetVec.y, offsetVec.z);
        }

        geo.computeVertexNormals();

        // Random gray variation based on seed
        const seedRand = Math.sin(seed) * 10000;
        const randVal = seedRand - Math.floor(seedRand);
        const grayValue = 0.4 + randVal * 0.2; // 0.4 to 0.6
        const color = new THREE.Color().setScalar(grayValue);

        return { geometry: geo, color };
    }, [seed]);

    useEffect(() => {
        return () => geometry.dispose();
    }, [geometry]);

    return (
        <group {...props}>
            <mesh castShadow receiveShadow geometry={geometry}>
                <meshStandardMaterial color={color} flatShading roughness={0.9} />
            </mesh>
        </group>
    );
};

export default Rock;
