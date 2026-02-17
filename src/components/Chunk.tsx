
import React, { memo } from 'react';
import { ChunkData, CHUNK_SIZE } from '../utils/chunkManager';
import Cactus from './Cactus';
import Rock from './Rock';
import Target from './Target';

interface ChunkProps {
    data: ChunkData;
}

const Chunk: React.FC<ChunkProps> = memo(({ data }) => {
    return (
        <group>
            {/* Ground for this chunk */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[data.x * CHUNK_SIZE, -0.1, data.z * CHUNK_SIZE]}
                receiveShadow
            >
                <planeGeometry args={[CHUNK_SIZE, CHUNK_SIZE]} />
                <meshStandardMaterial color="#E6C288" />
            </mesh>

            {/* Obstacles */}
            {data.obstacles.map(obs => (
                obs.type === 'cactus' ?
                    <Cactus key={obs.id} position={obs.position} rotation={obs.rotation} scale={obs.scale} /> :
                    <Rock key={obs.id} position={obs.position} rotation={obs.rotation} scale={obs.scale} seed={obs.seed} />
            ))}

            {/* Targets */}
            {data.targets.map(target => (
                <Target key={target.id} position={target.position} />
            ))}
        </group>
    );
});

export default Chunk;
