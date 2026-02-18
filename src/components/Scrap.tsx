import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { JSX } from "react";

interface ScrapProps {
    seed?: number;
}

const Scrap = ({ seed = 0, ...props }: ScrapProps & JSX.IntrinsicElements['group']) => {
    const { geometry, color, roughness } = useMemo(() => {
        // Pseudo-random based on seed
        const seededRandom = (s: number) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };

        const typeSeed = seededRandom(seed);
        let geo: THREE.BufferGeometry;

        // Material variations
        let colorValue = new THREE.Color();
        let rough = 0.8;

        if (typeSeed < 0.33) { // BEAM
            geo = new THREE.BoxGeometry(1, 1, 1);
            // Rusty dark steel
            colorValue.setHSL(0.05, 0.5, 0.2 + seededRandom(seed + 1) * 0.1);
            rough = 0.9;
        } else if (typeSeed < 0.66) { // CONTAINER
            geo = new THREE.BoxGeometry(1, 1, 1);
            // Varying rusty colors (dull reds, oranges, browns)
            const hue = 0.0 + seededRandom(seed + 1) * 0.1; // 0 to 0.1 (red to orange)
            colorValue.setHSL(hue, 0.4, 0.3 + seededRandom(seed + 2) * 0.2);
            rough = 0.85;
        } else { // PIPE
            geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
            // Dark oxidized metal
            const brightness = 0.15 + seededRandom(seed + 1) * 0.1;
            colorValue.setScalar(brightness);
            rough = 0.7;
        }

        return { geometry: geo, color: colorValue, roughness: rough };
    }, [seed]);

    useEffect(() => {
        return () => geometry.dispose();
    }, [geometry]);

    return (
        <group {...props}>
            <mesh castShadow receiveShadow geometry={geometry}>
                <meshStandardMaterial
                    color={color}
                    roughness={roughness}
                    metalness={0.6}
                />
            </mesh>
        </group>
    );
};

export default Scrap;
