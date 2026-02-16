import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GameContextType {
    score: number;
    addScore: (points: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [score, setScore] = useState(0);

    const addScore = (points: number) => {
        setScore((prevScore) => prevScore + points);
    };

    return (
        <GameContext.Provider value={{ score, addScore }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGameContext = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};
