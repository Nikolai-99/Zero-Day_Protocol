import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { GameMode } from '../../types';
import { HUD } from './HUD';
import { MainMenu } from './MainMenu';
import { GameStatusScreen } from './GameStatusScreen';
import { FPSCounter } from './FPSCounter';
import { audioSystem } from '../../utils/audioSystem';

interface GameUIProps {
  onRestart: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({ onRestart }) => {
  const { 
    score, hp, gameState, setGameState, wave, maxWaves, setGameMode, reset, restartGame, gameMode,
    userId, username, leaderboard, loadLeaderboard, saveSession, setPlayerInfo,
    devMode, loadDevMode, toggleDevMode, shieldStacks
  } = useGameStore();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [volume, setVolume] = useState(0.6); // Valor inicial al 60%
  const [prevVolume, setPrevVolume] = useState(0.6);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sincronizar el volumen al montar (siempre al 60% al iniciar el juego)
  useEffect(() => {
    setVolume(0.6);
    audioSystem.setVolume(0.6);
    localStorage.setItem('zero_day_protocol_volume', '0.6');
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioSystem.setVolume(val);
    localStorage.setItem('zero_day_protocol_volume', val.toString());
    if (val > 0) {
      setPrevVolume(val);
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      audioSystem.setVolume(0);
      localStorage.setItem('zero_day_protocol_volume', '0');
    } else {
      const restoreVol = prevVolume > 0 ? prevVolume : 1.0;
      setVolume(restoreVol);
      audioSystem.setVolume(restoreVol);
      localStorage.setItem('zero_day_protocol_volume', restoreVol.toString());
    }
  };

  // Sincronizar el estado de pantalla completa
  useEffect(() => {
    if (window.electronAPI) {
      const unsubscribe = window.electronAPI.onFullScreenChanged((isFull) => {
        setIsFullScreen(isFull);
      });
      return () => {
        unsubscribe();
      };
    } else {
      const handleFullscreenChange = () => {
        setIsFullScreen(!!document.fullscreenElement);
      };
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.altKey && (e.code === 'Space' || e.key === ' ')) {
          e.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  const toggleFullScreen = () => {
    if (window.electronAPI) {
      window.electronAPI.toggleFullScreen();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.error('Error al activar pantalla completa:', err);
        });
      } else {
        document.exitFullscreen().catch((err) => {
          console.error('Error al salir de pantalla completa:', err);
        });
      }
    }
  };

  // Cargar tabla de clasificación y devmode al montar
  useEffect(() => {
    loadLeaderboard();
    loadDevMode();
  }, [loadLeaderboard, loadDevMode]);

  // Guardar puntuaciones automáticamente al finalizar o pausar
  useEffect(() => {
    if (gameState === 'GAMEOVER' || gameState === 'VICTORY' || gameState === 'PAUSED') {
      saveSession();
    }
  }, [gameState, saveSession]);

  // Sincronización recurrente durante la partida según enemigos derrotados
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const interval = setInterval(() => {
      saveSession();
    }, 2500);

    return () => clearInterval(interval);
  }, [gameState, saveSession]);

  // Salvaguarda al cerrar la ventana
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSession();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveSession]);

  const startGame = (mode: GameMode) => {
    setGameMode(mode);
    setGameState('PLAYING');
  };

  const handleReturnToMenu = async () => {
    await saveSession(); // Asegurar guardar puntuación de enemigos derrotados antes de salir
    reset(); // Reset game state fully to MENU sin perder la identidad del operador
    onRestart(); // Trigger restart logic in App/Scene
  };

  const handleReboot = async () => {
    await saveSession(); // Asegurar guardar puntuación acumulada antes de reiniciar
    restartGame(); // Reset game state pero mantener modo e identidad
    onRestart(); // Trigger restart logic in App/Scene
  };

  const handleRename = (newName: string) => {
    setPlayerInfo(userId, newName);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
      {/* Fondo negro sólido para el menú */}
      {gameState === 'MENU' && (
        <div className="fixed inset-0 bg-[#080808] z-0 pointer-events-none" />
      )}

      {/* HUD (only show when playing) */}
      {(gameState === 'PLAYING') && (
        <HUD
          gameMode={gameMode}
          hp={hp}
          wave={wave}
          maxWaves={maxWaves}
          score={score}
          shieldStacks={shieldStacks}
        />
      )}

      {/* Screens */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {/* MENU */}
        {gameState === 'MENU' && (
          <MainMenu
            onStartGame={startGame}
            username={username}
            userId={userId}
            onRename={handleRename}
            leaderboard={leaderboard}
          />
        )}

        {/* PAUSE SCREEN */}
        {gameState === 'PAUSED' && (
          <div className="pointer-events-auto bg-neutral-950/90 border border-red-500/40 p-8 rounded-lg text-center max-w-sm font-mono animate-fadeIn backdrop-blur-md shadow-2xl shadow-red-950/30">
            <h2 className="text-2xl font-bold tracking-widest text-red-500 mb-2 animate-pulse">SYSTEM PAUSED</h2>
            <p className="text-neutral-400 text-xs mb-6 uppercase tracking-wider leading-relaxed">
              Simulation threat vectors frozen. Network connection is on hold.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setGameState('PLAYING');
                  // Re-engage pointer lock automatically after a tiny delay
                  setTimeout(() => {
                      document.body.requestPointerLock();
                  }, 50);
                }}
                className="border border-green-500/50 bg-green-950/20 text-green-400 hover:bg-green-500 hover:text-black transition-colors px-6 py-2 text-xs tracking-widest uppercase font-bold"
              >
                Resume Simulation
              </button>
              <button 
                onClick={handleReturnToMenu}
                className="border border-neutral-600 bg-neutral-900/30 text-neutral-400 hover:bg-white hover:text-black transition-colors px-6 py-2 text-xs tracking-widest uppercase font-bold"
              >
                Abort & Return
              </button>
            </div>
          </div>
        )}

        {/* GAME OVER & VICTORY */}
        {(gameState === 'GAMEOVER' || gameState === 'VICTORY') && (
          <GameStatusScreen
            gameState={gameState}
            score={score}
            wave={wave}
            onReboot={handleReboot}
            onReturnToMenu={handleReturnToMenu}
          />
        )}
      </div>

      {/* Botones de Control Superiores (Volumen + Pantalla Completa) */}
      <div className="absolute top-8 right-8 z-50 pointer-events-auto flex items-center gap-2">
        {/* Volumen Desplegable hacia la izquierda */}
        <div className="flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 rounded-full px-2 h-9 w-9 hover:w-36 transition-all duration-300 backdrop-blur-md hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.15)] group/vol overflow-hidden justify-end">
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={handleVolumeChange}
            className="w-0 scale-x-0 group-hover/vol:w-20 group-hover/vol:scale-x-100 transition-all duration-300 origin-right accent-cyan-400 bg-transparent h-1 rounded cursor-pointer"
            title="Ajustar Volumen"
          />
          <button 
            className="text-neutral-400 hover:text-cyan-400 transition-colors flex items-center justify-center w-5 h-5 flex-shrink-0"
            onClick={toggleMute}
          >
            {volume === 0 ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : volume < 0.5 ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>

        {/* Botón de Pantalla Completa */}
        <button
          onClick={toggleFullScreen}
          className="flex items-center justify-center w-9 h-9 rounded-full border border-neutral-800 bg-neutral-950/80 text-neutral-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all duration-300 backdrop-blur-md relative group"
          title="Alternar Pantalla Completa (Alt + Espacio)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 15v6h-6M3 9V3h6" />
          </svg>

          {/* Tooltip Cyberpunk */}
          <span className="absolute right-12 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all duration-200 bg-neutral-950/90 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono px-2.5 py-1 rounded whitespace-nowrap tracking-wider shadow-[0_0_10px_rgba(0,255,255,0.2)] pointer-events-none">
            {isFullScreen ? 'MODO VENTANA' : 'PANTALLA COMPLETA'} <span className="text-neutral-500 ml-1">Alt+Space</span>
          </span>
        </button>

        {/* Botón de Configuración */}
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`flex items-center justify-center w-9 h-9 rounded-full border bg-neutral-950/80 hover:text-cyan-400 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all duration-300 backdrop-blur-md relative group ${
            isSettingsOpen ? 'border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(0,255,255,0.3)]' : 'border-neutral-800 text-neutral-400'
          }`}
          title="Configuración"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>

          {/* Tooltip Cyberpunk */}
          <span className="absolute right-12 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all duration-200 bg-neutral-950/90 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono px-2.5 py-1 rounded whitespace-nowrap tracking-wider shadow-[0_0_10px_rgba(0,255,255,0.2)] pointer-events-none">
            AJUSTES
          </span>
        </button>
      </div>

      {/* Panel Emergente de Configuración */}
      {isSettingsOpen && (
        <div className="absolute top-20 right-8 z-50 pointer-events-auto w-72 bg-neutral-950/95 border border-cyan-500/30 p-6 rounded-md font-mono text-white backdrop-blur-lg shadow-[0_0_30px_rgba(0,255,255,0.15)] animate-fadeIn">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
            <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase">CONFIGURACIÓN</span>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="text-[10px] text-neutral-500 hover:text-white"
            >
              [CERRAR]
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {/* Modo Desarrollador */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Modo Dev</span>
                <button
                  onClick={toggleDevMode}
                  className={`py-1 px-3 border text-[9px] font-bold uppercase transition-all tracking-wider ${
                    devMode 
                      ? 'border-red-500 bg-red-950/20 text-red-400 hover:bg-red-900/20' 
                      : 'border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {devMode ? 'ACTIVO (ON)' : 'SILENCIOSO (OFF)'}
                </button>
              </div>
              <p className="text-[8px] text-neutral-500 leading-normal">
                Habilita logs adicionales y herramientas de depuración avanzadas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Control del Monitor de FPS en tiempo real */}
      <FPSCounter />
    </div>
  );
};