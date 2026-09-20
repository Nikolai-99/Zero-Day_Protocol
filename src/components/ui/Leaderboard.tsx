import React, { useState } from 'react';
import { ScoreData } from '../../types';
import { OperatorRankModal } from './OperatorRankModal';
import { RankVectorIcon } from './Vectors';

interface LeaderboardProps {
  leaderboard: ScoreData[];
  userId: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ leaderboard, userId }) => {
  const [selectedPlayer, setSelectedPlayer] = useState<ScoreData | null>(null);

  return (
    <div className="flex-1 min-h-0 flex flex-col pointer-events-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase">CLASSIFICATION</h3>
        <span className="text-[10px] text-neutral-600 font-mono">CLIC EN NOMBRE PARA RANGO</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 border border-neutral-800 bg-neutral-950/40 p-2 rounded min-h-[220px] max-h-[280px]">
        {leaderboard.length === 0 ? (
          <div className="text-center text-xs text-neutral-600 py-8 uppercase tracking-widest animate-pulse">
            No records found
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {leaderboard.map((entry, index) => {
              const isSelf = entry.user_id === userId;
              let rankColor = 'text-neutral-500';
              if (index === 0) rankColor = 'text-yellow-500';
              else if (index === 1) rankColor = 'text-neutral-300';
              else if (index === 2) rankColor = 'text-amber-600';

              return (
                <div 
                  key={entry.id || index}
                  className={`flex justify-between items-center text-xs py-1 px-1.5 border transition-all ${
                    isSelf 
                      ? 'border-yellow-500 bg-yellow-950/10' 
                      : 'border-transparent hover:border-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className={`font-bold w-4 text-right ${rankColor}`}>
                      {index + 1}.
                    </span>

                    {/* Vector de rango compacto */}
                    <div className="shrink-0 opacity-80" title={entry.rank_name || 'SCRIPT_ROOKIE'}>
                      <RankVectorIcon rankName={entry.rank_name} className="w-3.5 h-3.5" size={14} />
                    </div>

                    {/* Nombre del operador: Clic para abrir ventana emergente de rangos */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlayer(entry)}
                      className={`truncate font-mono text-left cursor-pointer hover:underline transition-colors ${
                        isSelf ? 'text-yellow-400 font-bold hover:text-yellow-300' : 'text-neutral-300 hover:text-cyan-400'
                      }`}
                      title="Ver rango y desglose por modo"
                    >
                      {entry.username || 'Operador'}
                    </button>
                  </div>
                  <div className="flex gap-4 items-center shrink-0 ml-2 font-mono">
                    <span className="text-neutral-500 text-[10px]">W{entry.wave}</span>
                    <span className={`font-bold ${isSelf ? 'text-yellow-400' : 'text-white'}`}>
                      {entry.score.toString().padStart(5, '0')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ventana emergente modal de rangos y modos */}
      {selectedPlayer && (
        <OperatorRankModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
};
