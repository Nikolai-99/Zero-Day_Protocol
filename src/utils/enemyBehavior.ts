import * as THREE from 'three';
import { Enemy, Bullet, Block } from '../types';
import { CONFIG, COLORS } from '../constants/gameConstants';

// Generador atómico ultra-rápido de identificadores para evitar GC thrashing de strings y criptografía
let _bulletIdCounter = 0;
const getFastBulletId = () => (++_bulletIdCounter).toString();

export interface EnemyUpdateContext {
  playerPosition: THREE.Vector3;
  cursorVelocity: THREE.Vector3;
  delta: number;
  time: number;
  gameMode: string;
  hackingSpeedMultiplier: number;
  enemies: Enemy[];
  blocks: Block[];
  bullets: Bullet[];
  spawnParticles: (pos: THREE.Vector3, color: string, count?: number, isSpawnEffect?: boolean) => void;
  spawnGlitchParticles: (pos: THREE.Vector3, count?: number) => void;
}

export interface IEnemyBehaviorService {
  updateEnemies(enemies: Enemy[], ctx: EnemyUpdateContext): void;
}

// Scratchpads to avoid GC thrashing in real-time loops
const _tempVec = new THREE.Vector3();
const _tempVec2 = new THREE.Vector3();
const _separationVector = new THREE.Vector3();
const _push = new THREE.Vector3();
const _idealDirToPlayer = new THREE.Vector3();
const _predictedPlayerPos = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _backAway = new THREE.Vector3();
const _newPos = new THREE.Vector3();
const _bulletSpawnPos = new THREE.Vector3();
const _enemyDyingMoveVec = new THREE.Vector3();

export class EnemyBehaviorService implements IEnemyBehaviorService {
  public updateEnemies(enemies: Enemy[], ctx: EnemyUpdateContext): void {
    enemies.forEach(enemy => {
      if (!enemy.active) return;

      // Animación de Muerte
      if (enemy.dying) {
        enemy.deathTimer = (enemy.deathTimer || 0) - ctx.delta;
        _enemyDyingMoveVec.set(
          (Math.random() - 0.5) * 0.2,
          0,
          (Math.random() - 0.5) * 0.2
        );
        enemy.position.add(_enemyDyingMoveVec);
        if (enemy.deathTimer <= 0) {
          enemy.active = false;
        }
        return;
      }

      // Temporizador de Spawn
      if (enemy.spawnTimer > 0) {
        enemy.spawnTimer -= ctx.delta;
        return;
      }

      const distToPlayer = ctx.playerPosition.distanceTo(enemy.position);
      const isSpecial = enemy.type === 'CORE' || enemy.type === 'TRIANGLE';

      // 1. Fuerza de Separación
      _separationVector.set(0, 0, 0);
      let neighbors = 0;
      const separationRadius = 2.5;

      enemies.forEach(other => {
        if (other === enemy || !other.active || other.dying || other.spawnTimer > 0) return;

        const dist = enemy.position.distanceTo(other.position);
        if (dist < separationRadius && dist > 0.001) {
          _push.subVectors(enemy.position, other.position);
          _push.normalize();
          _push.divideScalar(dist);
          _separationVector.add(_push);
          neighbors++;
        }
      });

      // 2. Determinar Dirección Ideal hacia el Jugador
      if (ctx.gameMode === 'IMPOSSIBLE' && enemy.type === 'NORMAL') {
        const playerSpeed = ctx.cursorVelocity.length();
        const isMovingFast = playerSpeed > 5.0;

        if (isMovingFast) {
          const bulletSpeed = CONFIG.BULLET_SPEED * 0.6 * ctx.hackingSpeedMultiplier;
          const t_flight = Math.min(0.6, distToPlayer / bulletSpeed);
          _tempVec2.copy(ctx.cursorVelocity).multiplyScalar(t_flight);
          _predictedPlayerPos.copy(ctx.playerPosition).add(_tempVec2);
          _idealDirToPlayer.subVectors(_predictedPlayerPos, enemy.position).normalize();
        } else {
          _idealDirToPlayer.subVectors(ctx.playerPosition, enemy.position).normalize();
        }
      } else {
        _idealDirToPlayer.subVectors(ctx.playerPosition, enemy.position).normalize();
      }

      // Rotar paulatinamente hacia el objetivo
      let turnSpeed = isSpecial ? 4.0 : (ctx.gameMode === 'IMPOSSIBLE' ? 25.0 : 10.0);
      if (ctx.gameMode === 'HACKING' || ctx.gameMode === 'IMPOSSIBLE') {
        turnSpeed *= ctx.hackingSpeedMultiplier;
      }
      enemy.aimDir.lerp(_idealDirToPlayer, ctx.delta * turnSpeed).normalize();

      // 3. Combinar Fuerzas de Movimiento
      _moveDir.copy(_idealDirToPlayer);

      const keepDist = isSpecial ? 10 : 5;
      if (distToPlayer < keepDist) {
        _backAway.copy(_moveDir).negate().multiplyScalar(0.5);
        _moveDir.add(_backAway);
      }

      if (neighbors > 0) {
        _separationVector.divideScalar(neighbors);
        _separationVector.multiplyScalar(2.5);
        _moveDir.add(_separationVector);
      }

      _moveDir.normalize();

      // 4. Mover Enemigo
      let speedMultiplier = ctx.gameMode === 'NORMAL' ? 1.5 : 1.2;
      if (ctx.gameMode === 'HACKING' || ctx.gameMode === 'IMPOSSIBLE') {
        speedMultiplier *= ctx.hackingSpeedMultiplier;
      }
      const baseSpeed = isSpecial ? CONFIG.ENEMY_SPEED * 0.4 : CONFIG.ENEMY_SPEED;
      const finalSpeed = baseSpeed * speedMultiplier;

      _newPos.copy(enemy.position).addScaledVector(_moveDir, finalSpeed * ctx.delta);

      // Límites del mapa
      const boundary = CONFIG.FIELD_SIZE / 2 - 1.0;
      if (Math.abs(_newPos.x) > boundary) _newPos.x = Math.sign(_newPos.x) * boundary;
      if (Math.abs(_newPos.z) > boundary) _newPos.z = Math.sign(_newPos.z) * boundary;

      // Colisión con bloques
      let enemyBlocked = false;
      ctx.blocks.forEach(b => {
        if (b.active && _newPos.distanceTo(b.position) < 1.5) {
          enemyBlocked = true;
        }
      });

      if (!enemyBlocked) {
        enemy.position.copy(_newPos);
      }

      // Actualizar Rotación (solo visual)
      if (enemy.type === 'NORMAL') {
        enemy.rotation = Math.atan2(enemy.aimDir.x, enemy.aimDir.z);
      }

      // 5. Lógica de Disparo (Siempre disparando a Y = 0.55 y Y-velocity = 0 para simetría sobre el suelo)
      if (enemy.type === 'CORE') {
        if (ctx.time - enemy.lastShot > 100) {
          enemy.spiralAngle = (enemy.spiralAngle || 0) + 0.25;
          for (let arm = 0; arm < 2; arm++) {
            const angle = enemy.spiralAngle + (Math.PI * arm);
            const spreadDir = _tempVec.set(Math.sin(angle), 0, Math.cos(angle)).normalize();

            _bulletSpawnPos.copy(enemy.position);
            _tempVec2.copy(spreadDir).multiplyScalar(0.8);
            _bulletSpawnPos.add(_tempVec2);
            _bulletSpawnPos.y = 0.55; // Ajustado Y = 0.55 (sobre el suelo sin atravesarlo)

            ctx.bullets.push({
              id: getFastBulletId(),
              position: _bulletSpawnPos.clone(),
              velocity: spreadDir.clone().setY(0).normalize().multiplyScalar(CONFIG.BULLET_SPEED * 0.4 * ctx.hackingSpeedMultiplier),
              active: true,
              isPlayer: false,
              color: '#FF4400',
              bulletType: 'DAMAGE',
              scale: 2.2,
              isNew: true
            });
          }
          enemy.lastShot = ctx.time;
        }
      }
      else if (enemy.type === 'TRIANGLE') {
        enemy.rotation = (enemy.rotation || 0) + ctx.delta * 3.0;

        if (ctx.time - enemy.lastShot > 80) {
          const dir = _tempVec.set(Math.sin(enemy.rotation!), 0, Math.cos(enemy.rotation!)).normalize();

          _bulletSpawnPos.copy(enemy.position);
          _tempVec2.copy(dir).multiplyScalar(1.0);
          _bulletSpawnPos.add(_tempVec2);
          _bulletSpawnPos.y = 0.55; // Ajustado Y = 0.55 (sobre el suelo sin atravesarlo)

          ctx.bullets.push({
            id: getFastBulletId(),
            position: _bulletSpawnPos.clone(),
            velocity: dir.clone().setY(0).normalize().multiplyScalar(CONFIG.BULLET_SPEED * 0.6 * ctx.hackingSpeedMultiplier),
            active: true,
            isPlayer: false,
            color: COLORS.ENEMY_TRIANGLE,
            bulletType: 'DAMAGE',
            scale: 2.0,
            isNew: true
          });

          enemy.lastShot = ctx.time;
        }
      }
      else {
        // NORMAL ENEMY
        const fireRate = ctx.gameMode === 'IMPOSSIBLE' ? 170 : CONFIG.ENEMY_FIRE_RATE;
        if (ctx.time - enemy.lastShot > fireRate) {
          _bulletSpawnPos.copy(enemy.position);
          _tempVec2.copy(enemy.aimDir).multiplyScalar(1.0);
          _bulletSpawnPos.add(_tempVec2);
          _bulletSpawnPos.y = 0.55; // Ajustado Y = 0.55 (sobre el suelo sin atravesarlo)

          ctx.bullets.push({
            id: getFastBulletId(),
            position: _bulletSpawnPos.clone(),
            velocity: enemy.aimDir.clone().setY(0).normalize().multiplyScalar(CONFIG.BULLET_SPEED * 0.6 * ctx.hackingSpeedMultiplier),
            active: true,
            isPlayer: false,
            color: '#D000FF',
            bulletType: 'DAMAGE',
            scale: 1.0,
            isNew: true
          });
          enemy.lastShot = ctx.time;
        }
      }
    });
  }
}
