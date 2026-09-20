import * as THREE from 'three';
import { Bullet, Enemy, Block } from '../types';
import { COLORS } from '../constants/gameConstants';

export interface CollisionContext {
  gameMode: string;
  wave: number;
  isInvulnerable: boolean;
  playerPosition: THREE.Vector3;
  cursorPosition: THREE.Vector3;
  addShieldStack: () => void;
  consumeShieldStack: () => boolean;
  addScore: (points: number) => void;
  damagePlayer: (amount: number) => void;
  killPlayer: () => void;
  spawnParticles: (pos: THREE.Vector3, color: string, count?: number, isSpawnEffect?: boolean) => void;
  spawnCircularExplosion: (pos: THREE.Vector3, color: string, count?: number, speed?: number) => void;
  spawnGlitchParticles: (pos: THREE.Vector3, count?: number) => void;
  deactivateBossShields: () => void;
}

export interface ICollisionService {
  checkPlayerBlockCollision(nextPos: THREE.Vector3, blocks: Block[]): boolean;
  processBulletCollisions(bullets: Bullet[], enemies: Enemy[], blocks: Block[], delta: number, ctx: CollisionContext): void;
}

const getDistanceSq2D = (p1: THREE.Vector3, p2: THREE.Vector3) => {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return dx * dx + dz * dz;
};

// Scratchpad para cálculos de posiciones de explosión sin allocations en V8 (Zero GC)
const _explosionCenter = new THREE.Vector3();

export class CollisionService implements ICollisionService {
  public checkPlayerBlockCollision(nextPos: THREE.Vector3, blocks: Block[]): boolean {
    const thresholdSq = 1.6 * 1.6; // 2.56
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.active && getDistanceSq2D(nextPos, block.position) < thresholdSq) {
        return true;
      }
    }
    return false;
  }

  public processBulletCollisions(
    bullets: Bullet[],
    enemies: Enemy[],
    blocks: Block[],
    delta: number,
    ctx: CollisionContext
  ): void {
    // 1. Clasificar balas activas para desacoplar bucles y evitar O(N^2)
    const playerBullets: Bullet[] = [];
    const enemyBullets: Bullet[] = [];
    
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (!b.active) continue;

      // Limpieza de balas fuera del mapa
      if (b.position.lengthSq() > 1600) {
        b.active = false;
        continue;
      }

      if (b.isPlayer) {
        playerBullets.push(b);
      } else {
        enemyBullets.push(b);
      }
    }

    // 2. Procesar balas del jugador
    for (let pIdx = 0; pIdx < playerBullets.length; pIdx++) {
      const bullet = playerBullets[pIdx];
      if (!bullet.active) continue;

      // A. Colisión con enemigos
      for (let eIdx = 0; eIdx < enemies.length; eIdx++) {
        const enemy = enemies[eIdx];
        if (!enemy.active || enemy.spawnTimer > 0 || enemy.dying) continue;
        if (!bullet.active) break;

        const isBoss = enemy.type === 'CORE' || enemy.type === 'TRIANGLE';
        const hitDistSq = isBoss ? 2.25 : 1.0; // 1.5^2 o 1.0^2

        if (getDistanceSq2D(bullet.position, enemy.position) < hitDistSq) {
          // Escudo de jefes
          if (isBoss && enemy.isShielded) {
            bullet.active = false;
            ctx.spawnParticles(bullet.position, COLORS.ENEMY_SHIELD, 3);
            break;
          }

          // Daño al enemigo
          enemy.hp -= 1;
          bullet.active = false;
          ctx.spawnParticles(bullet.position, '#FFFFFF', 3);

          if (enemy.hp <= 0) {
            if (enemy.type === 'NORMAL') {
              enemy.active = false;
              ctx.addScore(100);

              _explosionCenter.copy(enemy.position);
              _explosionCenter.y += 1.26;
              ctx.spawnCircularExplosion(_explosionCenter, '#D000FF', 24, 6.0);

              // Comprobar si aún quedan normales activos sin generar arrays
              let hasNormalAlive = false;
              for (let k = 0; k < enemies.length; k++) {
                if (enemies[k].active && enemies[k].type === 'NORMAL') {
                  hasNormalAlive = true;
                  break;
                }
              }
              if (!hasNormalAlive) {
                ctx.deactivateBossShields();
              }
            } else {
              // CORE o TRIANGLE
              enemy.active = false;
              ctx.addScore(1000);
              ctx.spawnGlitchParticles(enemy.position, 40);
              ctx.spawnParticles(enemy.position, '#FF8800', 20);
            }
          }
          break;
        }
      }

      // B. Colisión con bloques de protección
      if (bullet.active) {
        for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
          const block = blocks[bIdx];
          if (block.active && getDistanceSq2D(bullet.position, block.position) < 1.44) { // 1.2^2
            block.hp -= 1;
            bullet.active = false;
            ctx.spawnParticles(bullet.position, COLORS.BLOCK, 2);

            if (block.hp <= 0) {
              block.active = false;
              ctx.spawnParticles(block.position, '#00BFFF', 8);
              if (ctx.gameMode === 'HACKING' || ctx.gameMode === 'IMPOSSIBLE') {
                ctx.addShieldStack();
                ctx.spawnParticles(block.position, '#00FF88', 12, true);
              }
            }
            break;
          }
        }
      }

      // C. Colisión contra balas enemigas (solo compara contra enemyBullets)
      if (bullet.active) {
        for (let ebIdx = 0; ebIdx < enemyBullets.length; ebIdx++) {
          const enemyBullet = enemyBullets[ebIdx];
          if (enemyBullet.active && getDistanceSq2D(bullet.position, enemyBullet.position) < 0.36) { // 0.6^2
            bullet.active = false;
            enemyBullet.active = false;
            ctx.spawnParticles(bullet.position, COLORS.PLAYER_BULLET, 4);
            break;
          }
        }
      }
    }

    // 3. Procesar balas enemigas contra el jugador y bloques
    const isImpossible = ctx.gameMode === 'IMPOSSIBLE';
    const grazeInnerSq = 0.0576; // 0.24^2
    const grazeOuterSq = 0.3025; // 0.55^2
    const hitboxSq = isImpossible ? 0.3025 : 0.0576;

    for (let ebIdx = 0; ebIdx < enemyBullets.length; ebIdx++) {
      const bullet = enemyBullets[ebIdx];
      if (!bullet.active) continue;

      const distSqToCursor = getDistanceSq2D(bullet.position, ctx.cursorPosition);

      // A. Graze (roce)
      if (!isImpossible && !bullet.grazed && distSqToCursor >= grazeInnerSq && distSqToCursor < grazeOuterSq) {
        bullet.grazed = true;
        ctx.spawnParticles(ctx.cursorPosition, '#00FFFF', 4, true);
        ctx.addScore(15);
      }

      // B. Impacto contra el cursor del jugador
      if (distSqToCursor < hitboxSq) {
        if (bullet.bulletType === 'DAMAGE' && ctx.isInvulnerable) {
          continue;
        }
        bullet.active = false;

        if (bullet.bulletType === 'HEAL') {
          ctx.damagePlayer(-100);
          ctx.spawnParticles(ctx.cursorPosition, COLORS.HEAL_EFFECT, 10);
        } else {
          if (ctx.gameMode === 'HACKING' || isImpossible) {
            const hasShield = ctx.consumeShieldStack();
            if (hasShield) {
              ctx.spawnParticles(ctx.cursorPosition, '#00FF88', 18, true);
            } else {
              ctx.spawnParticles(ctx.cursorPosition, '#FF0000', 20);
              ctx.killPlayer();
            }
          } else {
            ctx.damagePlayer(10);
            ctx.spawnParticles(ctx.cursorPosition, '#FF0000', 8);
          }
        }
        continue;
      }

      // C. Colisión con bloques
      for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
        const block = blocks[bIdx];
        if (block.active && getDistanceSq2D(bullet.position, block.position) < 1.44) {
          bullet.active = false;
          ctx.spawnParticles(bullet.position, '#FF4400', 2);
          break;
        }
      }
    }
  }
}
