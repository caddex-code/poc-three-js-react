import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import * as BufferUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { JSX } from "react";

interface CactusProps {
    seed?: number;
    scale?: [number, number, number];
}

const Cactus = ({ seed = 0, ...props }: CactusProps & JSX.IntrinsicElements['group']) => {
    // Deterministic random
    const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    const { color, geometryData } = useMemo(() => {
        const rand = seededRandom(seed);

        // Species selection
        let speciesType: 'saguaro' | 'barrel' | 'cluster';
        if (rand < 0.5) speciesType = 'saguaro';
        else if (rand < 0.8) speciesType = 'barrel';
        else speciesType = 'cluster';

        // Color selection
        const colors = ['#2E8B57', '#556B2F', '#6B8E23'];
        const colorIdx = Math.floor(seededRandom(seed + 1) * colors.length);
        const baseColor = new THREE.Color(colors[colorIdx]);
        // Subtle shift per instance
        baseColor.multiplyScalar(0.9 + seededRandom(seed + 2) * 0.2);

        // Geometries array
        const geometries: THREE.BufferGeometry[] = [];

        const applyJitter = (geo: THREE.BufferGeometry, amount: number, localSeed: number) => {
            const pos = geo.getAttribute('position');
            const vertex = new THREE.Vector3();
            const offsets = new Map<string, THREE.Vector3>();

            const getHash = (x: number, y: number, z: number) => {
                return Math.sin(x * 12.9898 + y * 78.233 + z * 54.53 + localSeed) * 43758.5453;
            };

            for (let i = 0; i < pos.count; i++) {
                vertex.fromBufferAttribute(pos, i);
                const key = `${vertex.x.toFixed(3)},${vertex.y.toFixed(3)},${vertex.z.toFixed(3)}`;

                let offsetVec = offsets.get(key);
                if (!offsetVec) {
                    const h = getHash(vertex.x, vertex.y, vertex.z);
                    const r = h - Math.floor(h);
                    offsetVec = vertex.clone().multiplyScalar(1 + (r - 0.5) * amount);

                    // Extra axis jitter
                    const r2 = seededRandom(localSeed + i * 0.1);
                    const r3 = seededRandom(localSeed + i * 0.2);
                    const r4 = seededRandom(localSeed + i * 0.3);
                    offsetVec.x += (r2 - 0.5) * amount * 0.5;
                    offsetVec.y += (r3 - 0.5) * amount * 0.5;
                    offsetVec.z += (r4 - 0.5) * amount * 0.5;

                    offsets.set(key, offsetVec);
                }
                pos.setXYZ(i, offsetVec.x, offsetVec.y, offsetVec.z);
            }
            geo.computeVertexNormals();
        };

        if (speciesType === 'saguaro') {
            const mainGeo = new THREE.CylinderGeometry(0.3, 0.35, 2.2, 8, 3);
            applyJitter(mainGeo, 0.15, seed);
            mainGeo.translate(0, 1.1, 0); // Center at base
            geometries.push(mainGeo);

            // Arm logic: 0 arms (50%), 1 arm (35%), 2 arms (15%)
            const armRand = seededRandom(seed + 3);
            const numArms = armRand < 0.5 ? 0 : (armRand < 0.85 ? 1 : 2);

            for (let i = 0; i < numArms; i++) {
                const armSeed = seed + i * 731;
                const armY = 0.8 + seededRandom(armSeed) * 0.8;
                const armRotY = seededRandom(armSeed + 1) * Math.PI * 2;

                // Arm vertical part
                const armGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.9, 8, 2);
                applyJitter(armGeo, 0.1, armSeed + 2);

                // Position relative to trunk
                const angle = armRotY;
                const radius = 0.45;
                const x = Math.cos(angle) * radius;
                const z = -Math.sin(angle) * radius;

                armGeo.translate(x, armY + 0.45, z);
                geometries.push(armGeo);

                // Connector
                const connGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8, 1);
                applyJitter(connGeo, 0.05, armSeed + 3);
                connGeo.rotateZ(Math.PI / 2);
                connGeo.rotateY(armRotY);
                connGeo.translate(Math.cos(angle) * 0.25, armY, -Math.sin(angle) * 0.25);
                geometries.push(connGeo);
            }
        } else if (speciesType === 'barrel') {
            const barrelGeo = new THREE.IcosahedronGeometry(0.7, 1);
            applyJitter(barrelGeo, 0.15, seed);
            barrelGeo.scale(1, 0.8, 1);
            barrelGeo.translate(0, 0.5, 0);
            geometries.push(barrelGeo);
        } else { // cluster
            const numFingers = 3 + Math.floor(seededRandom(seed + 5) * 3);
            for (let i = 0; i < numFingers; i++) {
                const fSeed = seed + i * 123;
                const h = 0.6 + seededRandom(fSeed) * 0.8;
                const r = 0.12 + seededRandom(fSeed + 1) * 0.05;
                const fGeo = new THREE.CylinderGeometry(r, r * 1.1, h, 8, 2);
                applyJitter(fGeo, 0.08, fSeed + 2);

                const angle = (i / numFingers) * Math.PI * 2 + seededRandom(fSeed + 3) * 0.5;
                const tilt = 0.1 + seededRandom(fSeed + 4) * 0.3;
                const dist = 0.15 + seededRandom(fSeed + 5) * 0.1;

                fGeo.rotateX(tilt);
                fGeo.rotateY(angle);
                const x = Math.sin(angle) * dist;
                const z = Math.cos(angle) * dist;
                fGeo.translate(x, h / 2, z);
                geometries.push(fGeo);
            }
        }

        // Merge geometries for performance
        let finalGeo: THREE.BufferGeometry;
        if (geometries.length > 1) {
            finalGeo = BufferUtils.mergeGeometries(geometries);
        } else {
            finalGeo = geometries[0];
        }

        return { color: baseColor, geometryData: finalGeo };
    }, [seed]);

    useEffect(() => {
        return () => geometryData.dispose();
    }, [geometryData]);

    return (
        <group {...props}>
            <mesh geometry={geometryData} castShadow receiveShadow>
                <meshStandardMaterial color={color} flatShading roughness={0.9} />
            </mesh>
        </group>
    );
};

export default Cactus;

