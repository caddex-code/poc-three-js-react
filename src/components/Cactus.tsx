import { JSX } from "react";

const Cactus = (props: JSX.IntrinsicElements['group']) => {
    return (
        <group {...props}>
            {/* Main stem */}
            <mesh position={[0, 1, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 2, 8]} />
                <meshStandardMaterial color="#2E8B57" />
            </mesh>
            {/* Arm 1 */}
            <mesh position={[0.4, 1.2, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.8, 8]} />
                <meshStandardMaterial color="#2E8B57" />
            </mesh>
            <mesh position={[0.65, 1.6, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.8, 8]} />
                <meshStandardMaterial color="#2E8B57" />
            </mesh>
        </group>
    );
};

export default Cactus;
