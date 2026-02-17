import { useMemo } from 'react';
import { JSX } from "react";

interface CactusProps {
    seed?: number;
    scale?: [number, number, number];
}

const Cactus = ({ seed = 0, ...props }: CactusProps & JSX.IntrinsicElements['group']) => {
    // Extract height influence from scale if available, otherwise default to 1
    const heightFactor = Array.isArray(props.scale) ? props.scale[1] : 1;

    const arms = useMemo(() => {
        const generatedArms = [];
        // Deterministic random
        const seededRandom = (s: number) => {
            const x = Math.sin(s) * 10000;
            return x - Math.floor(x);
        };

        // Number of arms based on height. Taller = more arms.
        // Base 1 arm, plus chance for more.
        // heightFactor varies 0.8 to 2.5.
        // chance: if height > 1.5, add extra arm.
        const numArms = 1 + Math.floor(seededRandom(seed) * (heightFactor > 1.8 ? 3 : 2));

        for (let i = 0; i < numArms; i++) {
            const armSeed = seed + i * 137; // distinct seed per arm

            // Random height on stem. Main stem is 2 units high (center 1).
            // range: 0.5 to 1.5 (relative to unscaled geometry). 
            // Since we scale the group, we keep relative coords.
            const yPos = 0.8 + seededRandom(armSeed) * 0.8;

            // Random rotation around Y axis
            const rotY = seededRandom(armSeed + 1) * Math.PI * 2;

            generatedArms.push({
                id: i,
                y: yPos,
                rotY: rotY
            });
        }
        return generatedArms;
    }, [seed, heightFactor]);

    return (
        <group {...props}>
            {/* Main stem */}
            <mesh position={[0, 1, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 2, 8]} />
                <meshStandardMaterial color="#2E8B57" />
            </mesh>

            {/* Generated Arms */}
            {arms.map((arm) => (
                <group key={arm.id} position={[0, arm.y, 0]} rotation={[0, arm.rotY, 0]}>
                    {/* Arm Connector (diagonal/horizontal) */}
                    <mesh position={[0.4, 0.2, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                        <cylinderGeometry args={[0.2, 0.2, 0.8, 8]} />
                        <meshStandardMaterial color="#2E8B57" />
                    </mesh>
                    {/* Arm Vertical Part */}
                    <mesh position={[0.65, 0.6, 0]} castShadow>
                        <cylinderGeometry args={[0.2, 0.2, 0.8, 8]} />
                        <meshStandardMaterial color="#2E8B57" />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

export default Cactus;
