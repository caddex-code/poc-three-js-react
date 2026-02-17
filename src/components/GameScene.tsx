import { useRef, useState } from 'react';
import { Environment } from '@react-three/drei';
import { Vector3 } from 'three';
import Ground from './Ground';
import Tank from './Tank';
import Cactus from './Cactus';
import Rock from './Rock';
import Target from './Target';
import Bullet from './Bullet';
import { useGameContext } from '../context/GameContext';

// Generate some random positions
const OBSTACLES = Array.from({ length: 15 }).map((_, i) => ({
    id: `obs-${i}`,
    position: [
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80,
    ] as [number, number, number],
    type: Math.random() > 0.5 ? 'cactus' : 'rock',
    rotation: [0, Math.random() * Math.PI * 2, 0] as [number, number, number],
}));

const INITIAL_TARGETS = Array.from({ length: 10 }).map((_, i) => ({
    id: `target-${i}`,
    position: [
        (Math.random() - 0.5) * 80,
        0,
        (Math.random() - 0.5) * 80,
    ] as [number, number, number],
}));

const GameScene = () => {
    const [bullets, setBullets] = useState<{ id: number; position: Vector3; rotation: [number, number, number] }[]>([]);
    const [targets, setTargets] = useState(INITIAL_TARGETS);
    const { addScore } = useGameContext();
    const bulletIdCounter = useRef(0);

    const handleShoot = (position: Vector3, rotation: [number, number, number]) => {
        const id = bulletIdCounter.current++;
        setBullets(prev => [...prev, { id, position, rotation }]);
    };

    const handleBulletHit = (targetId: string, bulletId: number) => {
        // Remove target
        setTargets(prev => prev.filter(t => t.id !== targetId));
        // Remove bullet
        setBullets(prev => prev.filter(b => b.id !== bulletId));
        // Add score
        addScore(100);

        // Respawn target elsewhere to keep game going?
        // For PoC, maybe just clear them.
    };

    const handleBulletMiss = (bulletId: number) => {
        setBullets(prev => prev.filter(b => b.id !== bulletId));
    };

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[-30, 60, -30]}
                intensity={1.5}
                castShadow
                shadow-bias={-0.0005}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-left={-60}
                shadow-camera-right={60}
                shadow-camera-top={60}
                shadow-camera-bottom={-60}
                shadow-camera-far={300}
            />

            <Ground />

            <Tank
                onShoot={handleShoot}
                obstacles={[...OBSTACLES, ...targets]}
            />

            {/* Render Obstacles */}
            {OBSTACLES.map(obs => (
                obs.type === 'cactus' ?
                    <Cactus key={obs.id} position={obs.position} rotation={obs.rotation} /> :
                    <Rock key={obs.id} position={obs.position} rotation={obs.rotation} />
            ))}

            {/* Render Targets */}
            {targets.map(target => (
                <Target key={target.id} position={target.position} />
            ))}

            {/* Render Bullets */}
            {bullets.map(bullet => (
                <Bullet
                    key={bullet.id}
                    position={[bullet.position.x, bullet.position.y, bullet.position.z]}
                    rotation={bullet.rotation}
                    targets={targets}
                    onHit={(targetId) => handleBulletHit(targetId, bullet.id)}
                    onMiss={() => handleBulletMiss(bullet.id)}
                />
            ))}

            <Environment preset="sunset" />
        </>
    );
};

export default GameScene;
