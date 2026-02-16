import { useEffect, useState } from 'react';

export const useKeyboard = () => {
    const [input, setInput] = useState({
        forward: false,
        backward: false,
        left: false,
        right: false,
        shoot: false,
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    setInput((s) => ({ ...s, forward: true }));
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    setInput((s) => ({ ...s, backward: true }));
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    setInput((s) => ({ ...s, left: true }));
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    setInput((s) => ({ ...s, right: true }));
                    break;
                case 'Space':
                    setInput((s) => ({ ...s, shoot: true }));
                    break;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    setInput((s) => ({ ...s, forward: false }));
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    setInput((s) => ({ ...s, backward: false }));
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    setInput((s) => ({ ...s, left: false }));
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    setInput((s) => ({ ...s, right: false }));
                    break;
                case 'Space':
                    setInput((s) => ({ ...s, shoot: false }));
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return input;
};
