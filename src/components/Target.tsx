import { JSX } from "react";

const Target = (props: JSX.IntrinsicElements['group'] & { hit?: boolean }) => {
    return (
        <group {...props}>
            {/* Stand */}
            <mesh position={[0, 0.5, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
                <meshStandardMaterial color="#555" />
            </mesh>
            {/* Target Board */}
            <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
                <meshStandardMaterial color="white" />
            </mesh>
            {/* Rings */}
            <mesh position={[0, 1, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.3, 0.4, 32]} />
                <meshStandardMaterial color="red" />
            </mesh>
            <mesh position={[0, 1, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.1, 0.2, 32]} />
                <meshStandardMaterial color="red" />
            </mesh>
        </group>
    );
};

export default Target;
