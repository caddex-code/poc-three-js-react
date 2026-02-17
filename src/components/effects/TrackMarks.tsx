
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, InstancedMesh, Matrix4, Vector3, Group, Euler } from 'three';
import { EFFECTS_CONFIG } from '../../config/constants';

const { MAX_MARKS, LIFETIME, MIN_DISTANCE, OFFSET, COLOR, OPACITY } = EFFECTS_CONFIG.TRACKS;

const tempObj = new Object3D();
const tempVec = new Vector3();
const tempMat = new Matrix4();

interface TankEffectsProps {
    tankRef: React.MutableRefObject<Group | null>;
}

export const TrackMarks = ({ tankRef }: TankEffectsProps) => {
    const meshRef = useRef<InstancedMesh>(null);
    const lastPos = useRef(new Vector3());
    const markData = useMemo(() => {
        return Array(MAX_MARKS).fill(0).map(() => ({
            active: false,
            startTime: 0,
            position: new Vector3(),
            rotation: new Euler(),
        }));
    }, []);
    const currentIndex = useRef(0);

    useFrame((state) => {
        if (!tankRef.current || !meshRef.current) return;

        const tank = tankRef.current;
        const currentPos = tank.position;

        // Calculate distance moved (XZ plane)
        const dist = Math.sqrt(
            Math.pow(currentPos.x - lastPos.current.x, 2) +
            Math.pow(currentPos.z - lastPos.current.z, 2)
        );

        // Spawn new marks if moved enough
        if (dist > MIN_DISTANCE) {
            lastPos.current.copy(currentPos);

            // Spawn two marks (left and right)
            for (let i = -1; i <= 1; i += 2) {
                const idx = (currentIndex.current + (i === -1 ? 0 : 1)) % MAX_MARKS;
                const offset = i * OFFSET;

                // Calculate position relative to tank
                tempVec.set(offset, 0.05, 0.2);
                tempVec.applyAxisAngle(new Vector3(0, 1, 0), tank.rotation.y);
                tempVec.add(currentPos);

                // Store data
                const data = markData[idx];
                data.active = true;
                data.startTime = state.clock.elapsedTime;
                data.position.copy(tempVec);
                // Rotate flat on ground (-PI/2 on X), and match tank's Y rotation
                data.rotation.set(-Math.PI / 2, 0, tank.rotation.y);
            }

            currentIndex.current = (currentIndex.current + 2) % MAX_MARKS;
        }

        // Update all marks
        let hasUpdates = false;
        const time = state.clock.elapsedTime;

        for (let i = 0; i < MAX_MARKS; i++) {
            const data = markData[i];

            if (data.active) {
                const age = time - data.startTime;

                if (age > LIFETIME) {
                    data.active = false;
                    tempMat.makeScale(0, 0, 0);
                    meshRef.current.setMatrixAt(i, tempMat);
                    hasUpdates = true;
                } else {
                    // Update scale based on age (shrink to disappear)
                    const lifeRatio = 1 - (age / LIFETIME);
                    const scale = lifeRatio;

                    tempObj.position.copy(data.position);
                    tempObj.rotation.copy(data.rotation);
                    tempObj.scale.set(scale, scale, 1);
                    tempObj.updateMatrix();

                    meshRef.current.setMatrixAt(i, tempObj.matrix);
                    hasUpdates = true;
                }
            }
        }

        if (hasUpdates) {
            meshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_MARKS]} frustumCulled={false}>
            <planeGeometry args={[0.3, 0.6]} />
            <meshStandardMaterial color={COLOR} transparent opacity={OPACITY} depthWrite={false} />
        </instancedMesh>
    );
};
