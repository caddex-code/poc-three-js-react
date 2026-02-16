import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, Mesh } from 'three';

interface BulletProps {
    position: [number, number, number];
    rotation: [number, number, number];
    onHit: (id: string) => void;
    onMiss: () => void;
    targets: { id: string; position: [number, number, number] }[];
}

const BULLET_SPEED = 20;

const Bullet = ({ position, rotation, onHit, onMiss, targets }: BulletProps) => {
    const meshRef = useRef<Mesh>(null);
    const startPos = new Vector3(...position);

    // Calculate direction based on rotation
    const direction = new Vector3(0, 0, 1);
    direction.applyAxisAngle(new Vector3(0, 1, 0), rotation[1]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        // Move bullet
        meshRef.current.position.add(direction.clone().multiplyScalar(BULLET_SPEED * delta));

        // Check collision with targets
        const bulletPos = meshRef.current.position;

        for (const target of targets) {
            const targetPos = new Vector3(...target.position);
            // Simple distance check (radius ~1 for target)
            if (bulletPos.distanceTo(targetPos) < 1.0) {
                onHit(target.id);
                return;
            }
        }

        // Cleanup if too far (lifetime)
        if (bulletPos.distanceTo(startPos) > 100) {
            onMiss();
        }
    });

    return (
        <mesh ref={meshRef} position={position} rotation={rotation}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="black" />
        </mesh>
    );
};

export default Bullet;
