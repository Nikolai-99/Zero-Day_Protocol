import React from 'react';

interface GameStatusScreenProps {
  gameState: 'MENU' | 'PLAYING' | 'HACKING' | 'GAMEOVER' | 'VICTORY';
  score: number;
  wave: number;
  onReboot: () => void;
  onReturnToMenu: () => void;
}

export const GameStatusScreen: React.FC<GameStatusScreenProps> = ({
  gameState,
  score,
  wave,
  onReboot,
  onReturnToMenu,
}) => {
  if (gameState !== 'GAMEOVER' && gameState !== 'VICTORY') return null;

  const isVictory = gameState === 'VICTORY';

  return (
    <div className="bg-black/95 border border-white/20 p-12 max-w-md w-full text-center pointer-events-auto backdrop-blur-md shadow-2xl font-mono animate-blurIn">
      <h2 className={`text-4xl font-bold tracking-[0.2em] mb-2 uppercase ${isVictory ? 'text-green-500' : 'text-red-500'}`}>
        {isVictory ? 'SYSTEM CLEARED' : 'CONNECTION LOST'}
      </h2>
      <p className="text-neutral-500 text-xs tracking-widest uppercase mb-8">
        {isVictory ? 'Core breach fully initialized' : 'Intrusion counter-measures active'}
      </p>
      
      <div className="bg-neutral-900/50 border border-neutral-800 p-4 mb-8 flex flex-col gap-2 rounded">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500 uppercase tracking-wider">Final Score</span>
          <span className="text-white font-bold">{score.toString().padStart(6, '0')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500 uppercase tracking-wider">Max Wave</span>
          <span className="text-yellow-500 font-bold">WAVE {wave}</span>
        </div>
      </div>
      
      <div className="flex gap-4 justify-center">
        <button 
          onClick={onReboot}
          className={`w-36 py-3 border font-bold hover:text-black transition-all uppercase tracking-widest text-xs ${
            isVictory 
              ? 'border-green-500 text-green-500 hover:bg-green-500' 
              : 'border-red-500 text-red-500 hover:bg-red-500'
          }`}
        >
          Reboot Game
        </button>
        <button 
          onClick={onReturnToMenu}
          className="w-36 py-3 border border-neutral-600 text-neutral-400 font-bold hover:bg-white hover:text-black hover:border-white transition-all uppercase tracking-widest text-xs"
        >
          Exit System
        </button>
      </div>
    </div>
  );
};
