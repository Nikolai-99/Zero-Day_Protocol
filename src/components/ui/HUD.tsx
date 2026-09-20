import React from 'react';
import { GameMode } from '../../types';

interface HUDProps {
  gameMode: GameMode;
  hp: number;
  wave: number;
  maxWaves: number;
  score: number;
  shieldStacks: number;
}

export const HUD: React.FC<HUDProps> = ({
  gameMode,
  hp,
  wave,
  maxWaves,
  score,
  shieldStacks,
}) => {
  return (
    <div className="flex justify-between items-start w-full font-mono animate-fadeIn pointer-events-none">
      <div className="text-white pointer-none">
        <h1 className="text-xl font-bold tracking-widest uppercase mb-1">System Status</h1>
        
        {/* HP BAR (Only in NORMAL mode) */}
        {gameMode === 'NORMAL' && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">HP</span>
            <div className="w-48 h-4 border border-white/30 bg-black/50 p-0.5">
              <div 
                className="h-full bg-white transition-all duration-300" 
                style={{ width: `${Math.max(0, hp)}%` }}
              ></div>
            </div>
            <span className="text-white font-bold">{Math.max(0, Math.ceil(hp))}%</span>
          </div>
        )}
        
        {/* SHIELD BAR (Only in HACKING and IMPOSSIBLE modes) */}
        {(gameMode === 'HACKING' || gameMode === 'IMPOSSIBLE') && (
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${gameMode === 'IMPOSSIBLE' ? 'text-red-400' : 'text-cyan-400'} font-bold tracking-widest uppercase`}>
                {gameMode === 'IMPOSSIBLE' ? 'Impossible Shield Matrix' : 'Shield Matrix'}
              </span>
              <span className={`text-[10px] ${gameMode === 'IMPOSSIBLE' ? 'text-red-500' : 'text-cyan-500'} font-bold`}>[{shieldStacks}/5 STACKS]</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-48 h-4 border ${gameMode === 'IMPOSSIBLE' ? 'border-red-500/40' : 'border-cyan-500/40'} bg-black/60 p-0.5 relative`}>
                <div 
                  className={`h-full ${gameMode === 'IMPOSSIBLE' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]'} transition-all duration-300`} 
                  style={{ width: `${(shieldStacks / 5) * 100}%` }}
                ></div>
              </div>
              {shieldStacks === 0 ? (
                <span className="text-[10px] text-red-500 font-bold animate-pulse uppercase">VULNERABLE (1 HIT)</span>
              ) : (
                <span className={`text-[10px] ${gameMode === 'IMPOSSIBLE' ? 'text-red-400' : 'text-cyan-400'} font-bold uppercase`}>PROTECTED</span>
              )}
            </div>
          </div>
        )}
        
        <div className="text-yellow-400 font-bold tracking-widest text-lg mt-1">
          {(gameMode === 'HACKING' || gameMode === 'IMPOSSIBLE') ? `WAVE ${wave}` : `WAVE ${wave} / ${maxWaves}`}
        </div>
      </div>
      
      <div className="text-right text-white flex flex-col items-end gap-4 mt-20 pr-12">
        <div className="pointer-events-none">
          <h2 className="text-xl font-bold tracking-widest">SCORE</h2>
          <p className="text-4xl font-light">{score.toString().padStart(6, '0')}</p>
        </div>
      </div>
    </div>
  );
};
