import { useGameContext } from '../context/GameContext';

const UI = () => {
    const { score } = useGameContext();

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            padding: '20px',
            color: 'black',
            fontSize: '24px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '10px 20px',
                borderRadius: '10px',
                border: '2px solid #333'
            }}>
                SCORE: {score}
            </div>
        </div>
    );
};

export default UI;
