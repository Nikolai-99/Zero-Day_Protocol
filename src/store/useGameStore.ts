import { create } from 'zustand';
import { GameStore } from '../types';
import { gameApi } from '../api/gameApi';
import { v4 as uuidv4 } from 'uuid';

// Generar sesión aleatoria de operador al entrar al juego (según Regla de Identidad)
const generateRandomOperator = () => {
  const randomSuffix = uuidv4().substring(0, 8);
  const id = `player_${randomSuffix}`;
  const name = `Operador_${randomSuffix.substring(0, 4)}`;
  return { id, name };
};

// Mantener la sesión del operador mientras el juego siga abierto
const getInitialOperator = () => {
  try {
    const savedId = sessionStorage.getItem('zero_day_protocol_session_id');
    const savedName = sessionStorage.getItem('zero_day_protocol_session_username');
    const savedIsNamed = sessionStorage.getItem('zero_day_protocol_session_is_named') === 'true';
    if (savedId && savedName) {
      return { id: savedId, name: savedName, isNamed: savedIsNamed };
    }
  } catch {
    // sessionStorage no disponible en algunos entornos
  }
  const op = generateRandomOperator();
  return { id: op.id, name: op.name, isNamed: false };
};

const player = getInitialOperator();

const initialState = {
  score: 0,
  savedScore: 0,
  hp: 100,
  wave: 1,
  gameState: 'MENU' as const,
  gameMode: 'HACKING' as const,
  shieldStacks: 0,
  isInvulnerable: false,
  dashStartTime: 0,
  dashDirection: null as 'left' | 'right' | null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  maxWaves: 5,
  
  // API & DB State
  userId: player.id,
  username: player.name,
  isNamed: player.isNamed,
  leaderboard: [],
  devMode: false,

  setScore: (n) => set({ score: n }),
  setHp: (n) => set({ hp: Math.max(0, n) }),
  setWave: (n) => set({ wave: n }),
  setGameState: (s) => set({ gameState: s }),
  setGameMode: (m) => set({ gameMode: m }),
  addShieldStack: () => {
    const current = get().shieldStacks;
    if (current < 5) {
      set({ shieldStacks: current + 1 });
    }
  },
  consumeShieldStack: () => {
    const current = get().shieldStacks;
    if (current > 0) {
      set({ shieldStacks: current - 1 });
      return true;
    }
    return false;
  },
  setInvulnerable: (b) => set({ isInvulnerable: b }),
  setDashState: (direction, startTime) => set({ dashDirection: direction, dashStartTime: startTime }),
  
  // API & DB Actions
  setPlayerInfo: async (id, name) => {
    const { username: currentName, isNamed } = get();
    let candidateId = id;
    // Si el usuario ya tenía nombre registrado y está cambiando a otro nombre diferente,
    // se genera un nuevo ID para el nuevo nombre a fin de que cambie según la regla
    if (isNamed && currentName !== name) {
      candidateId = generateRandomOperator().id;
    }

    const res = await gameApi.registerUser(candidateId, name);
    if (res.success && res.user) {
      const finalId = res.user.id;
      const finalName = res.user.username;
      try {
        sessionStorage.setItem('zero_day_protocol_session_id', finalId);
        sessionStorage.setItem('zero_day_protocol_session_username', finalName);
        sessionStorage.setItem('zero_day_protocol_session_is_named', 'true');
      } catch {}
      set({ userId: finalId, username: finalName, isNamed: true });
    } else {
      try {
        sessionStorage.setItem('zero_day_protocol_session_id', candidateId);
        sessionStorage.setItem('zero_day_protocol_session_username', name);
        sessionStorage.setItem('zero_day_protocol_session_is_named', 'true');
      } catch {}
      set({ userId: candidateId, username: name, isNamed: true });
    }
    get().loadLeaderboard();
  },

  loadLeaderboard: async () => {
    const lbList = await gameApi.getLeaderboard();
    set({ leaderboard: lbList });
  },

  saveSession: async () => {
    const { userId, score, savedScore, wave, isNamed, gameMode } = get();
    const delta = score - savedScore;
    // Regla de Negocio: No guardar puntuación si el usuario no ha ingresado su nombre
    // y solo sincronizar si hay puntos nuevos acumulados en la partida (delta > 0)
    if (isNamed && delta > 0) {
      set({ savedScore: score });
      const res = await gameApi.saveScore(userId, delta, wave, gameMode);
      if (!res) {
        // En caso de fallo de red, revertir savedScore para reintentar
        set({ savedScore });
      }
    }
    const lbList = await gameApi.getLeaderboard();
    set({ leaderboard: lbList });
  },

  loadDevMode: async () => {
    const enabled = await gameApi.getDevMode();
    set({ devMode: enabled });
  },

  toggleDevMode: async () => {
    const current = get().devMode;
    const nextVal = !current;
    const success = await gameApi.setDevMode(nextVal);
    if (success) {
      set({ devMode: nextVal });
    }
  },

  reset: () => {
    set((state) => ({
      ...initialState,
      score: 0,
      savedScore: 0,
      userId: state.userId,
      username: state.username,
      isNamed: state.isNamed,
      leaderboard: state.leaderboard,
      devMode: state.devMode,
    }));
  },
  
  restartGame: () => {
    set((state) => ({
      ...initialState,
      score: 0,
      savedScore: 0,
      gameMode: state.gameMode, // Keep the current mode
      gameState: 'PLAYING',      // Go straight to playing, skipping menu
      userId: state.userId,
      username: state.username,
      isNamed: state.isNamed,
      leaderboard: state.leaderboard,
      devMode: state.devMode,
    }));
  },
}));