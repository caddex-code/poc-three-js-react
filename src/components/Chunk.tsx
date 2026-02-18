
import React, { memo } from 'react';
import { ChunkData, CHUNK_SIZE } from '../utils/chunkManager';
import Cactus from './Cactus';
import Rock from './Rock';
import Target from './Target';
import Scrap from './Scrap';

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

            {/* Ground Patches - subtle color variations */}
            {data.patches.map(patch => (
                <mesh
                    key={patch.id}
                    position={[patch.position[0], -0.09, patch.position[2]]}
                    rotation={[-Math.PI / 2, 0, patch.rotation[1]]}
                    scale={[patch.scale[0], patch.scale[2], 1]}
                    receiveShadow
                >
                    <circleGeometry args={[1, 6]} />
                    <meshStandardMaterial color="#D1B280" roughness={1} />
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
