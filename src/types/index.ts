import { Vector3 } from 'three';

export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'VICTORY' | 'PAUSED';
export type GameMode = 'NORMAL' | 'HACKING' | 'IMPOSSIBLE';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
}

export interface Entity {
  id: string;
  position: Vector3;
  velocity?: Vector3;
  rotation?: number;
  active: boolean;
}

export interface Bullet extends Entity {
  isPlayer: boolean;
  color: string;
  bulletType: 'DAMAGE' | 'HEAL';
  scale?: number; // Added for fade-out effect
  grazed?: boolean; // Added for bullet grazing compensation system
  isNew?: boolean; // Added to handle rendering before first movement frame
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  scale: number;
  color: string;
  behavior?: 'GLITCH' | 'NORMAL';
}

export interface Enemy extends Entity {
  type: 'NORMAL' | 'CORE' | 'TRIANGLE';
  hp: number;
  maxHp: number; // Added to handle restore
  lastShot: number;
  aimDir: Vector3; // The current direction the enemy is facing
  spawnTimer: number; // If > 0, enemy is spawning and cannot act/be hit
  isShielded?: boolean; // For CORE/TRIANGLE enemies
  hasBloom?: boolean; // Visual state for CORE/TRIANGLE after shield loss
  spiralAngle?: number; // Current angle for spiral attack pattern
  shotPatternIndex?: number; // Tracks the sequence for continuous firing
  dying?: boolean; // Is currently in death animation
  deathTimer?: number; // Time remaining in death animation
}

export interface Block extends Entity {
  hp: number;
}

export interface GameStore {
  score: number;
  savedScore: number;
  hp: number;
  wave: number;
  maxWaves: number;
  gameState: GameState;
  gameMode: GameMode;
  shieldStacks: number; // Stacks de escudo para el modo Hacking
  isInvulnerable: boolean; // Indica si el jugador está en estado invulnerable (durante el teletransporte)
  dashStartTime: number;
  dashDirection: 'left' | 'right' | null;

  // API & DB State
  userId: string;
  username: string;
  isNamed: boolean;
  leaderboard: ScoreData[];
  devMode: boolean;

  setScore: (n: number) => void;
  setHp: (n: number) => void;
  setWave: (n: number) => void;
  setGameState: (s: GameState) => void;
  setGameMode: (m: GameMode) => void;
  addShieldStack: () => void;
  consumeShieldStack: () => boolean;
  setInvulnerable: (b: boolean) => void;
  setDashState: (direction: 'left' | 'right' | null, startTime: number) => void;
  
  // API & DB Actions
  loadLeaderboard: () => Promise<void>;
  saveSession: () => Promise<void>;
  setPlayerInfo: (id: string, name: string) => Promise<void> | void;
  loadDevMode: () => Promise<void>;
  toggleDevMode: () => Promise<void>;
  
  reset: () => void;
  restartGame: () => void;
}

export interface UserRankInfo {
  rank_name: string;
  clearance_level: number;
  description: string;
}

export interface UserStatsData {
  user_id: string;
  username: string;
  total_score: number;
  max_wave: number;
  rank: UserRankInfo;
  mode_scores: {
    NORMAL: number;
    HACKING: number;
    IMPOSSIBLE: number;
  };
}

export interface ScoreData {
  id?: number;
  user_id: string;
  score: number;
  wave: number;
  timestamp?: string;
  username?: string;
  game_mode?: string;
  mode_scores?: {
    NORMAL: number;
    HACKING: number;
    IMPOSSIBLE: number;
  };
  rank_name?: string;
  clearance_level?: number;
}

declare global {
  interface Window {
    electronAPI?: {
      toggleFullScreen: () => void;
      onFullScreenChanged: (callback: (isFull: boolean) => void) => () => void;
      appReady?: () => void;
    };
  }
}