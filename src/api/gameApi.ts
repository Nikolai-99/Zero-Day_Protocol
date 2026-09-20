import { QuizQuestion, ScoreData, UserStatsData } from '../types';
import fallbackQuestions from '../constants/questions';

const API_BASE = 'http://127.0.0.1:8000/api';

export const gameApi = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async getQuestions(): Promise<QuizQuestion[]> {
    try {
      const res = await fetch(`${API_BASE}/questions`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch (e) {
      console.warn('[API] Fallback a preguntas locales debido a error en API:', e);
      return fallbackQuestions;
    }
  },

  async saveScore(
    userId: string,
    score: number,
    wave: number,
    gameMode: string = 'NORMAL'
  ): Promise<ScoreData | null> {
    try {
      const res = await fetch(`${API_BASE}/scores`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, score, wave, game_mode: gameMode }),
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch (e) {
      console.error('[API] Error al guardar puntuación:', e);
      return null;
    }
  },

  async getUserStats(userId: string): Promise<UserStatsData | null> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/stats`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch (e) {
      console.error('[API] Error al obtener estadísticas del operador:', e);
      return null;
    }
  },

  async getLeaderboard(limit = 10): Promise<ScoreData[]> {
    try {
      const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch (e) {
      console.error('[API] Error al obtener ranking:', e);
      return [];
    }
  },

  async registerUser(
    userId: string,
    username: string
  ): Promise<{ success: boolean; user?: { id: string; username: string; is_restored?: boolean } }> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ id: userId, username }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      return { success: true, user: data };
    } catch (e) {
      console.error('[API] Error al registrar usuario:', e);
      return { success: false };
    }
  },

  async getDevMode(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/config/devmode`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      return data.devMode;
    } catch (e) {
      console.error('[API] Error al obtener devmode:', e);
      return false;
    }
  },

  async setDevMode(enabled: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/config/devmode`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ devMode: enabled }),
      });
      return res.ok;
    } catch (e) {
      console.error('[API] Error al guardar devmode:', e);
      return false;
    }
  }
};
