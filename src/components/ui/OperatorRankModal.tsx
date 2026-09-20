import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScoreData, UserStatsData } from '../../types';
import { gameApi } from '../../api/gameApi';
import { GameModeVectorIcon, RankVectorIcon } from './Vectors';

interface OperatorRankModalProps {
  player: ScoreData;
  onClose: () => void;
}

// Configuración de colores y nombres para cada rango militar
const RANK_CONFIG: Record<
  string,
  { title: string; level: number; color: string; border: string; bg: string; badge: string }
> = {
  ELITE_OPERATOR: {
    title: 'ELITE OPERATOR',
    level: 4,
    color: 'text-amber-400',
    border: 'border-amber-500/60',
    bg: 'bg-amber-950/20',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  SECURITY_SPECIALIST: {
    title: 'SECURITY SPECIALIST',
    level: 3,
    color: 'text-purple-400',
    border: 'border-purple-500/60',
    bg: 'bg-purple-950/20',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  VULNERABILITY_HUNTER: {
    title: 'VULNERABILITY HUNTER',
    level: 2,
    color: 'text-cyan-400',
    border: 'border-cyan-500/60',
    bg: 'bg-cyan-950/20',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  SCRIPT_ROOKIE: {
    title: 'SCRIPT ROOKIE',
    level: 1,
    color: 'text-emerald-400',
    border: 'border-emerald-500/60',
    bg: 'bg-emerald-950/20',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
};

export const OperatorRankModal: React.FC<OperatorRankModalProps> = ({ player, onClose }) => {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showRankConditions, setShowRankConditions] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchStats = async () => {
      if (!player.user_id) {
        setLoading(false);
        return;
      }
      const data = await gameApi.getUserStats(player.user_id);
      if (isMounted) {
        if (data) {
          setStats(data);
        }
        setLoading(false);
      }
    };

    fetchStats();

    // Manejar tecla Escape para cerrar
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [player.user_id, onClose]);

  // Rango activo: preferir el de stats o el inferido del leaderboard
  const rankKey = stats?.rank?.rank_name || player.rank_name || 'SCRIPT_ROOKIE';
  const rankInfo = RANK_CONFIG[rankKey] || RANK_CONFIG.SCRIPT_ROOKIE;

  // Puntuación por cada modo
  const modeScores = stats?.mode_scores || player.mode_scores || {
    NORMAL: player.score || 0,
    HACKING: 0,
    IMPOSSIBLE: 0,
  };

  const totalScore = stats?.total_score ?? player.score ?? 0;
  const maxWave = stats?.max_wave ?? player.wave ?? 1;

  // Renderizar a través de Portal directamente en document.body para ubicarse en el centro de la pantalla
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn pointer-events-auto select-none"
      onClick={onClose}
    >
      <div
        className="relative bg-neutral-950/95 border border-cyan-500/50 rounded-2xl p-6 sm:p-7 w-full max-w-3xl shadow-[0_0_60px_rgba(6,182,212,0.28)] flex flex-col gap-4 sm:gap-5 text-neutral-200 font-mono my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre superior derecho */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg w-8 h-8 flex items-center justify-center transition-all bg-neutral-900/70 hover:bg-neutral-800 cursor-pointer shadow-md"
          title="Cerrar ventana (Esc)"
        >
          ✕
        </button>

        {/* 1. Nombre de jugador en la parte superior con ciclo de colores RGB */}
        <div className="text-center pt-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/80 font-mono mb-1">
            PERFIL TÁCTICO // OPERADOR
          </div>
          <h2 className="text-3xl sm:text-4xl font-orbitron font-bold tracking-wider animate-rgb-cycle">
            {player.username || 'Operador'}
          </h2>
          <div className="text-xs font-mono text-neutral-500 mt-1">
            IDENTIFICADOR MILITAR: <span className="text-neutral-300 font-semibold">{player.user_id}</span>
          </div>
        </div>

        {/* 2. Rango del jugador y botón de 'Ver requisitos' a la derecha */}
        <div className={`rounded-xl p-4 border ${rankInfo.border} ${rankInfo.bg} shadow-lg transition-all`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`p-2.5 rounded-lg bg-neutral-950/90 border ${rankInfo.border} shadow-[0_0_20px_rgba(0,0,0,0.6)] shrink-0`}>
                <RankVectorIcon rankName={rankKey} className={`w-9 h-9 ${rankInfo.color}`} size={36} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`font-orbitron font-bold text-base sm:text-lg tracking-wide ${rankInfo.color}`}>
                    {rankInfo.title}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold tracking-wider ${rankInfo.badge}`}>
                    NIVEL {rankInfo.level} // AUTORIZACIÓN
                  </span>
                </div>
                <div className="text-xs text-neutral-400 font-mono mt-1 leading-tight">
                  {stats?.rank?.description || 'Autorización de seguridad de combate cibernético.'}
                </div>
              </div>
            </div>

            {/* Botón que alterna entre la puntuación por modos y los requisitos de rango */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowRankConditions((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  showRankConditions
                    ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.4)]'
                    : 'border-cyan-500/50 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                }`}
                title={showRankConditions ? "Volver a ver puntuación por modo" : "Ver condiciones para subir de rango"}
              >
                <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
                  {showRankConditions ? '←' : '?'}
                </span>
                <span className="font-mono text-[11px] tracking-wider">
                  {showRankConditions ? 'VER PUNTUACIÓN' : 'VER REQUISITOS'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Área de Contenido Dinámico: Alterna entre Puntuación por Modos y Requisitos de Rango sin alterar los márgenes ni generar scroll */}
        <div className="min-h-[175px] flex flex-col justify-center transition-all">
          {showRankConditions ? (
            /* Vista B: Condiciones de Rango (4 columnas horizontales) */
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2.5">
                <span className="text-yellow-400 font-mono font-bold">JERARQUÍA DE RANGOS DE COMBATE (REGLA 4)</span>
                <span className="text-neutral-500 text-[10px]">CRITERIOS DE ASCENSO</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Rango 1: Rookie */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all min-h-[135px] ${
                    rankKey === 'SCRIPT_ROOKIE'
                      ? 'border-emerald-400 bg-emerald-950/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'border-neutral-800 bg-neutral-900/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-1.5">
                      <RankVectorIcon rankName="SCRIPT_ROOKIE" className="w-4 h-4" size={16} />
                      <span>NV.1 ROOKIE</span>
                    </div>
                    <p className="text-[10px] text-neutral-300 leading-snug">
                      Rango inicial de instrucción para todo operador nuevo.
                    </p>
                  </div>
                  {rankKey === 'SCRIPT_ROOKIE' ? (
                    <span className="mt-2 text-[9px] font-bold text-emerald-300 uppercase tracking-widest bg-emerald-500/20 px-1.5 py-0.5 rounded text-center border border-emerald-500/30">
                      ★ Rango Actual
                    </span>
                  ) : (
                    <span className="mt-2 text-[9px] text-neutral-500 font-mono uppercase tracking-widest text-center">
                      Base
                    </span>
                  )}
                </div>

                {/* Rango 2: Hunter */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all min-h-[135px] ${
                    rankKey === 'VULNERABILITY_HUNTER'
                      ? 'border-cyan-400 bg-cyan-950/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'border-neutral-800 bg-neutral-900/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs mb-1.5">
                      <RankVectorIcon rankName="VULNERABILITY_HUNTER" className="w-4 h-4" size={16} />
                      <span>NV.2 HUNTER</span>
                    </div>
                    <div className="text-[10px] text-neutral-300 leading-snug space-y-0.5">
                      <div>• Score ≥ 1,500</div>
                      <div>• Oleada ≥ 2</div>
                    </div>
                  </div>
                  {rankKey === 'VULNERABILITY_HUNTER' ? (
                    <span className="mt-2 text-[9px] font-bold text-cyan-300 uppercase tracking-widest bg-cyan-500/20 px-1.5 py-0.5 rounded text-center border border-cyan-500/30">
                      ★ Rango Actual
                    </span>
                  ) : (
                    <span className="mt-2 text-[9px] text-neutral-500 font-mono uppercase tracking-widest text-center">
                      Requerido
                    </span>
                  )}
                </div>

                {/* Rango 3: Specialist */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all min-h-[135px] ${
                    rankKey === 'SECURITY_SPECIALIST'
                      ? 'border-purple-400 bg-purple-950/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                      : 'border-neutral-800 bg-neutral-900/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs mb-1.5">
                      <RankVectorIcon rankName="SECURITY_SPECIALIST" className="w-4 h-4" size={16} />
                      <span>NV.3 SPECIALIST</span>
                    </div>
                    <div className="text-[10px] text-neutral-300 leading-snug space-y-0.5">
                      <div>• Score ≥ 4,000</div>
                      <div>• Oleada ≥ 3</div>
                    </div>
                  </div>
                  {rankKey === 'SECURITY_SPECIALIST' ? (
                    <span className="mt-2 text-[9px] font-bold text-purple-300 uppercase tracking-widest bg-purple-500/20 px-1.5 py-0.5 rounded text-center border border-purple-500/30">
                      ★ Rango Actual
                    </span>
                  ) : (
                    <span className="mt-2 text-[9px] text-neutral-500 font-mono uppercase tracking-widest text-center">
                      Requerido
                    </span>
                  )}
                </div>

                {/* Rango 4: Elite */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between text-left transition-all min-h-[135px] ${
                    rankKey === 'ELITE_OPERATOR'
                      ? 'border-amber-400 bg-amber-950/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'border-neutral-800 bg-neutral-900/50 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1.5">
                      <RankVectorIcon rankName="ELITE_OPERATOR" className="w-4 h-4" size={16} />
                      <span>NV.4 ELITE</span>
                    </div>
                    <div className="text-[10px] text-neutral-300 leading-snug space-y-0.5">
                      <div>• Score ≥ 10K & W ≥ 5</div>
                      <div className="text-red-400 font-semibold">• Vía IMP: 5K & W ≥ 3</div>
                    </div>
                  </div>
                  {rankKey === 'ELITE_OPERATOR' ? (
                    <span className="mt-2 text-[9px] font-bold text-amber-300 uppercase tracking-widest bg-amber-500/20 px-1.5 py-0.5 rounded text-center border border-amber-500/30">
                      ★ Rango Actual
                    </span>
                  ) : (
                    <span className="mt-2 text-[9px] text-neutral-500 font-mono uppercase tracking-widest text-center">
                      Requerido
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Vista A: Puntuación por Modo de Juego (3 columnas horizontales) */
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2.5">
                <span className="text-cyan-400 font-mono">PUNTUACIÓN POR MODO DE JUEGO</span>
                <span className="text-[11px] text-neutral-400">
                  MÁXIMA OLEADA: <strong className="text-white">W{maxWave}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Modo Normal */}
                <div className="flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-xl border border-sky-500/40 bg-sky-950/20 hover:border-sky-400 hover:bg-sky-950/30 transition-all text-center min-h-[135px]">
                  <div className="p-2 rounded-lg bg-sky-950/70 border border-sky-500/40 mb-1.5 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
                    <GameModeVectorIcon mode="NORMAL" className="w-6 h-6 text-sky-400" size={24} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold font-orbitron text-sky-300 tracking-wider">
                    NORMAL
                  </span>
                  <span className="text-[10px] text-sky-400/80 font-mono mt-0.5 mb-2 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/30">
                    x1.0 MULT
                  </span>
                  <div className="w-full pt-2 border-t border-sky-500/20 flex flex-col items-center">
                    <span className="text-base sm:text-lg font-bold font-mono text-white tracking-wider">
                      {(modeScores.NORMAL || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono tracking-widest">PUNTOS</span>
                  </div>
                </div>

                {/* Modo Hacking */}
                <div className="flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-950/30 transition-all text-center min-h-[135px]">
                  <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 mb-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <GameModeVectorIcon mode="HACKING" className="w-6 h-6 text-emerald-400" size={24} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold font-orbitron text-emerald-300 tracking-wider">
                    HACKING
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5 mb-2 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                    x1.5 MULT
                  </span>
                  <div className="w-full pt-2 border-t border-emerald-500/20 flex flex-col items-center">
                    <span className="text-base sm:text-lg font-bold font-mono text-white tracking-wider">
                      {(modeScores.HACKING || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono tracking-widest">PUNTOS</span>
                  </div>
                </div>

                {/* Modo Impossible */}
                <div className="flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-xl border border-red-500/40 bg-red-950/20 hover:border-red-400 hover:bg-red-950/30 transition-all text-center min-h-[135px]">
                  <div className="p-2 rounded-lg bg-red-950/70 border border-red-500/40 mb-1.5 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <GameModeVectorIcon mode="IMPOSSIBLE" className="w-6 h-6 text-red-400" size={24} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold font-orbitron text-red-300 tracking-wider">
                    IMPOSSIBLE
                  </span>
                  <span className="text-[10px] text-red-400/80 font-mono mt-0.5 mb-2 px-2 py-0.5 rounded bg-red-950/60 border border-red-500/30">
                    x2.5 MULT
                  </span>
                  <div className="w-full pt-2 border-t border-red-500/20 flex flex-col items-center">
                    <span className="text-base sm:text-lg font-bold font-mono text-white tracking-wider">
                      {(modeScores.IMPOSSIBLE || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono tracking-widest">PUNTOS</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resumen Total Inferior */}
        <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>SISTEMA DE CLASIFICACIÓN TÁCTICA ACTIVO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">TOTAL GLOBAL ACUMULADO:</span>
            <span className="text-lg font-bold font-mono text-yellow-400 tracking-wider">
              {totalScore.toLocaleString()} PTS
            </span>
          </div>
        </div>

        {loading && (
          <div className="text-center text-[11px] font-mono text-cyan-400 animate-pulse">
            SINCRONIZANDO DATOS DE RED...
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
