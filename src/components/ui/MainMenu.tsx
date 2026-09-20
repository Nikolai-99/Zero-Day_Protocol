import React from 'react';
import { GameMode, ScoreData } from '../../types';
import { OperatorPanel } from './OperatorPanel';
import { Leaderboard } from './Leaderboard';

interface MainMenuProps {
  onStartGame: (mode: GameMode) => void;
  username: string;
  userId: string;
  onRename: (newName: string) => void;
  leaderboard: ScoreData[];
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  username,
  userId,
  onRename,
  leaderboard,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-4xl w-full pointer-events-auto p-4 animate-fadeIn">
      {/* Left Box: Controls and Gamemodes */}
      <div className="flex-1 bg-black/90 border border-white/20 p-10 text-center backdrop-blur-md shadow-2xl flex flex-col justify-between">
        <div>
          <h1 className="text-5xl font-orbitron font-bold text-white mb-1 tracking-tighter">ZERO-DAY PROTOCOL</h1>
          <h2 className="text-sm font-mono text-yellow-500 mb-6 tracking-[0.4em] uppercase">Tactical Combat Protocol</h2>
          
          <p className="text-neutral-400 mb-8 font-mono text-xs max-w-md mx-auto leading-relaxed border-t border-b border-neutral-800 py-3">
            WASD: Move // MOUSE: Aim // CLICK: Fire<br/>
            Neutralize defenses. Breach the core.
          </p>
        </div>
        
        <div className="flex gap-4 justify-center flex-wrap">
          <div className="flex flex-col items-center group">
            <button 
              onClick={() => onStartGame('NORMAL')}
              className="w-32 py-3 border border-neutral-500 text-neutral-300 font-bold font-mono hover:bg-white hover:text-black hover:border-white transition-all uppercase tracking-widest text-[10px]"
            >
              Normal Mode
            </button>
            <span className="text-[9px] text-neutral-500 mt-2 font-mono group-hover:text-white transition-colors">
              +50% Enemy Speed<br/>No Hacking Quiz
            </span>
          </div>

          <div className="flex flex-col items-center group">
            <button 
              onClick={() => onStartGame('HACKING')}
              className="w-32 py-3 border border-yellow-500 text-yellow-500 font-bold font-mono hover:bg-yellow-500 hover:text-black transition-all uppercase tracking-widest text-[10px] shadow-[0_0_15px_rgba(255,200,0,0.1)] hover:shadow-[0_0_25px_rgba(255,200,0,0.3)]"
            >
              Hacking Mode
            </button>
            <span className="text-[9px] text-neutral-500 mt-2 font-mono group-hover:text-yellow-400 transition-colors">
              Shield Stacks<br/>1-Hit Death
            </span>
          </div>

          <div className="flex flex-col items-center group">
            <button 
              onClick={() => onStartGame('IMPOSSIBLE')}
              className="w-32 py-3 border border-red-500 text-red-500 font-bold font-mono hover:bg-red-500 hover:text-black transition-all uppercase tracking-widest text-[10px] shadow-[0_0_15px_rgba(255,0,0,0.1)] hover:shadow-[0_0_25px_rgba(255,0,0,0.3)]"
            >
              Impossible Mode
            </button>
            <span className="text-[9px] text-neutral-500 mt-2 font-mono group-hover:text-red-400 transition-colors">
              Predictive Aim<br/>Graze is Hit // Scarcity
            </span>
          </div>
        </div>
      </div>

      {/* Right Box: Player Profile & Leaderboard */}
      <div className="w-80 bg-black/90 border border-white/20 p-8 backdrop-blur-md shadow-2xl flex flex-col font-mono text-white gap-6">
        <OperatorPanel 
          username={username}
          userId={userId}
          onRename={onRename}
        />
        
        <Leaderboard 
          leaderboard={leaderboard}
          userId={userId}
        />
      </div>
    </div>
  );
};
