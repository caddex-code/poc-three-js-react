import { JSX } from "react";

const Rock = (props: JSX.IntrinsicElements['group']) => {
    return (
        <group {...props}>
            <mesh castShadow receiveShadow>
                <dodecahedronGeometry args={[0.8, 0]} />
                <meshStandardMaterial color="#808080" flatShading />
            </mesh>
        </group>
    );
};

export default Rock;
