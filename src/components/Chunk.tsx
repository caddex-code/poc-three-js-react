
import React, { memo, useMemo } from 'react';
import * as THREE from 'three';
import { ChunkData, CHUNK_SIZE } from '../utils/chunkManager';
import { getHeight } from '../utils/noise';
import Cactus from './Cactus';
import Rock from './Rock';
import Target from './Target';
import Scrap from './Scrap';

interface ChunkProps {
    data: ChunkData;
}

const Chunk: React.FC<ChunkProps> = memo(({ data }) => {
    // Generate terrain geometry for this chunk
    const terrainGeometry = useMemo(() => {
        const segments = 32;
        const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segments, segments);

        // Rotate to be horizontal
        geometry.rotateX(-Math.PI / 2);

        const positions = geometry.attributes.position;
        const chunkWorldX = data.x * CHUNK_SIZE;
        const chunkWorldZ = data.z * CHUNK_SIZE;

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i) + chunkWorldX;
            const z = positions.getZ(i) + chunkWorldZ;

            // Set Y based on noise
            positions.setY(i, getHeight(x, z));
        }

        // Update normals for flat shading
        geometry.computeVertexNormals();

        return geometry;
    }, [data.x, data.z]);

    return (
        <group>
            {/* Ground for this chunk */}
            <mesh
                geometry={terrainGeometry}
                position={[data.x * CHUNK_SIZE, 0, data.z * CHUNK_SIZE]}
                receiveShadow
            >
                <meshStandardMaterial color="#E6C288" flatShading roughness={1} />
            </mesh>

            {/* Ground Patches - subtle color variations */}
            {data.patches.map(patch => (
                <mesh
                    key={patch.id}
                    position={[patch.position[0], patch.position[1], patch.position[2]]}
                    rotation={[-Math.PI / 2, 0, patch.rotation[1]]}
                    scale={[patch.scale[0], patch.scale[2], 1]}
                    receiveShadow
                >
                    <circleGeometry args={[1, 6]} />
                    <meshStandardMaterial color="#D1B280" roughness={1} transparent opacity={0.6} />
                </mesh>
            ))}


            {/* Obstacles */}
            {data.obstacles.map(obs => {
                if (obs.type === 'cactus') {
                    return <Cactus key={obs.id} position={obs.position} rotation={obs.rotation} scale={obs.scale} seed={obs.seed} />;
                } else if (obs.type === 'rock') {
                    return <Rock key={obs.id} position={obs.position} rotation={obs.rotation} scale={obs.scale} seed={obs.seed} />;
                } else if (obs.type === 'scrap') {
                    return <Scrap key={obs.id} position={obs.position} rotation={obs.rotation} scale={obs.scale} seed={obs.seed} />;
                }
                return null;
            })}

            {/* Targets */}
            {data.targets.map(target => (
                <Target key={target.id} position={target.position} rotation={target.rotation} type={target.type} />
            ))}
        </group>
    );
});

export default Chunk;
