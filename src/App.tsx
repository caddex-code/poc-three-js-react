import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import GameScene from './components/GameScene'
import UI from './components/UI'

import { GameProvider } from './context/GameContext';

function App() {
    return (
        <GameProvider>
            <div style={{ width: '100vw', height: '100vh', background: '#87CEEB', position: 'relative' }}>
                <UI />
                <Canvas shadows>
                    <OrthographicCamera
                        makeDefault
                        position={[20, 20, 20]}
                        zoom={40}
                        near={-50}
                        far={200}
                        onUpdate={c => c.lookAt(0, 0, 0)}
                    />
                    <GameScene />
                </Canvas>
            </div>
        </GameProvider>
    )
}

export default App
