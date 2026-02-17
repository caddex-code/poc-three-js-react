import { JSX } from "react";

export type TargetType = 'wood' | 'metal' | 'tire';

// Fix: type definition instead of interface extending a type alias
type TargetProps = JSX.IntrinsicElements['group'] & {
    type?: TargetType;
    hit?: boolean;
};

const Target = ({ type = 'wood', ...props }: TargetProps) => {
    return (
        <group scale={[1.4, 1.4, 1.4]} {...props}>
            {type === 'wood' && (
                <>
                    {/* Wooden Frame - H shape / Sawhorse style */}
                    <mesh position={[-0.4, 0.5, 0]} castShadow>
                        <boxGeometry args={[0.1, 1, 0.1]} />
                        <meshStandardMaterial color="#8B4513" />
                    </mesh>
                    <mesh position={[0.4, 0.5, 0]} castShadow>
                        <boxGeometry args={[0.1, 1, 0.1]} />
                        <meshStandardMaterial color="#8B4513" />
                    </mesh>
                    <mesh position={[0, 0.8, 0]} castShadow>
                        <boxGeometry args={[1, 0.1, 0.1]} />
                        <meshStandardMaterial color="#8B4513" />
                    </mesh>

                    {/* Square Board */}
                    <mesh position={[0, 0.8, 0.06]} castShadow>
                        <boxGeometry args={[0.7, 0.7, 0.05]} />
                        <meshStandardMaterial color="#F5F5DC" />
                    </mesh>

                    {/* Rings - Square painted on wood */}
                    <mesh position={[0, 0.8, 0.09]} rotation={[0, 0, Math.PI / 4]}>
                        <ringGeometry args={[0.2, 0.3, 4]} />
                        <meshStandardMaterial color="red" />
                    </mesh>
                    <mesh position={[0, 0.8, 0.09]} rotation={[0, 0, Math.PI / 4]}>
                        <circleGeometry args={[0.1, 4]} />
                        <meshStandardMaterial color="red" />
                    </mesh>
                </>
            )}

            {type === 'metal' && (
                <>
                    {/* Concrete Base */}
                    <mesh position={[0, 0.1, 0]} castShadow>
                        <boxGeometry args={[0.6, 0.2, 0.4]} />
                        <meshStandardMaterial color="#888" />
                    </mesh>

                    {/* Metal Post */}
                    <mesh position={[0, 0.6, -0.1]} castShadow>
                        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
                        <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
                    </mesh>

                    {/* Steel Plate Target */}
                    <mesh position={[0, 0.9, 0]} rotation={[0, 0, 0]} castShadow>
                        <cylinderGeometry args={[0.3, 0.3, 0.05, 6]} /> {/* Hexagonal plate */}
                        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.1} />
                    </mesh>

                    {/* Painted X */}
                    <mesh position={[0, 0.9, 0.03]} rotation={[0, 0, Math.PI / 4]}>
                        <boxGeometry args={[0.4, 0.05, 0.01]} />
                        <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.5} />
                    </mesh>
                    <mesh position={[0, 0.9, 0.03]} rotation={[0, 0, -Math.PI / 4]}>
                        <boxGeometry args={[0.4, 0.05, 0.01]} />
                        <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.5} />
                    </mesh>
                </>
            )}

            {type === 'tire' && (
                <>
                    {/* Wooden Post with arm */}
                    <mesh position={[0.5, 0.75, 0]} castShadow>
                        <boxGeometry args={[0.1, 1.5, 0.1]} />
                        <meshStandardMaterial color="#5D4037" />
                    </mesh>
                    <mesh position={[0, 1.4, 0]} castShadow>
                        <boxGeometry args={[1.2, 0.1, 0.1]} />
                        <meshStandardMaterial color="#5D4037" />
                    </mesh>

                    {/* Rope */}
                    <mesh position={[0, 1.1, 0]}>
                        <cylinderGeometry args={[0.01, 0.01, 0.6]} />
                        <meshStandardMaterial color="#C2B280" />
                    </mesh>

                    {/* Tire */}
                    <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                        <torusGeometry args={[0.25, 0.1, 8, 24]} />
                        <meshStandardMaterial color="#111" roughness={0.9} />
                    </mesh>

                    {/* Center Plate */}
                    <mesh position={[0, 0.8, 0]}>
                        <circleGeometry args={[0.1, 32]} />
                        <meshStandardMaterial color="#eee" />
                    </mesh>
                </>
            )}
        </group>
    );
};

export default Target;
