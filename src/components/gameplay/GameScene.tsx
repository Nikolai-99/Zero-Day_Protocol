import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EnemyMesh, BlockMesh } from './meshes/index';
import { PlayerController } from './PlayerController';
import { Lighting } from './Lighting';
import { Floor } from './Floor';
import { DynamicObjectRenderer } from './DynamicObjectRenderer';
import { CONFIG, COLORS } from '../../constants/gameConstants';
import { useGameStore } from '../../store/useGameStore';
import { Bullet, Enemy, Block, Particle } from '../../types';
import { audioSystem } from '../../utils/audioSystem';
import { CollisionService } from '../../utils/collisionManager';
import { EnemyBehaviorService } from '../../utils/enemyBehavior';

// Generador de IDs secuenciales de alto rendimiento (Zero GC)
let _entityIdCounter = 0;
const getNextEntityId = () => (++_entityIdCounter).toString();

const collisionService = new CollisionService();
const enemyBehaviorService = new EnemyBehaviorService();
// @ts-ignore
import musicUrl from '../../../assets/Zero-day Protocol.mp3';
// @ts-ignore
import genesisUrl from '../../../assets/Genesis.mp3';

const getDistance2D = (p1: THREE.Vector3, p2: THREE.Vector3) => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.z - p2.z) ** 2);
};

// Pre-allocated static scratch variables to avoid GC thrashing in useFrame
const _playerPosition = new THREE.Vector3();
const _cursorPosition = new THREE.Vector3();
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
const _centerPos = new THREE.Vector3();
const _enemyDyingMoveVec = new THREE.Vector3();

interface GameSceneProps {
  onRestart: () => void;
}

export const GameScene: React.FC<GameSceneProps> = ({ onRestart }) => {
  const { camera } = useThree();
  
  // Selectores atómicos: sincroniza estado de escena y oleada
  const gameState = useGameStore((state) => state.gameState);
  const gameMode = useGameStore((state) => state.gameMode);
  const wave = useGameStore((state) => state.wave);
  const setScore = useGameStore.getState().setScore;
  const setHp = useGameStore.getState().setHp;
  const setWave = useGameStore.getState().setWave;
  const setGameState = useGameStore.getState().setGameState;

  // --- Mutable Game State ---
  const playerRef = useRef<THREE.Group>(null);
  const visualCursorRef = useRef<THREE.Group>(null); // Ref al cursor visual para colisión precisa
  const playerHp = useRef(100);
  const lastCursorPosRef = useRef<THREE.Vector3 | null>(null);
  const cursorVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const enemiesRef = useRef<Enemy[]>([]);
  const blocksRef = useRef<Block[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  const waveTransitionTimer = useRef(0);
  const isTransitioning = useRef(false);
  const lastDashDirection = useRef<'left' | 'right' | null>(null);

  const [, setTick] = useState(0); 




  // --- Level Generation Helpers ---
  const generateBlocks = (waveNum: number) => {
    const newBlocks: Block[] = [];
    
    let maxBlocks = 0;
    if (gameMode === 'IMPOSSIBLE') {
        // En IMPOSSIBLE mode, solo se generan bloques en la ronda 1 y en rondas múltiplos de 3 (3, 6, 9...)
        if (waveNum !== 1 && waveNum % 3 !== 0) {
            blocksRef.current = [];
            return;
        }
        maxBlocks = Math.floor(Math.random() * 2) + 1; // 1 o 2 cubos
    } else {
        // En NORMAL y HACKING mode, comportamiento original (1, 2, o 3 cubos por ronda)
        maxBlocks = Math.floor(Math.random() * 3) + 1;
    }

    let attempts = 0;
    const boundaryLimit = CONFIG.FIELD_SIZE / 2 - 4; 

    while (newBlocks.length < maxBlocks && attempts < 150) {
        attempts++;
        const x = Math.floor((Math.random() * (boundaryLimit * 2) - boundaryLimit) / 4) * 4;
        const z = Math.floor((Math.random() * (boundaryLimit * 2) - boundaryLimit) / 4) * 4;
        const pos = new THREE.Vector3(x, 0, z);

        if (pos.distanceTo(new THREE.Vector3(0,0,0)) < 8) continue;
        const exists = newBlocks.some(b => b.position.distanceTo(pos) < 1.0);
        if (!exists) {
            newBlocks.push({ id: getNextEntityId(), position: pos, active: true, hp: 3 });
        }
    }
    blocksRef.current = newBlocks;
  };

  const spawnWave = (waveNum: number) => {
    const newEnemies: Enemy[] = [];
    const playerPos = playerRef.current ? playerRef.current.position.clone() : new THREE.Vector3(0, 0, 0);

    // DETERMINE SPECIAL ENEMY SPAWN
    // Rule: Wave 1 guarantees the TRIANGLE special enemy for testing as requested. Wave 2 guarantees a special enemy. Waves 3+ have 60% chance.
    const spawnSpecial = waveNum === 1 || waveNum === 2 || (waveNum > 2 && Math.random() < 0.6);
    
    console.log(`[SPAWN] Iniciando Ola ${waveNum}. Especial: ${spawnSpecial}`);

    // Logic: If special enemy spawns, NO blocks.
    if (spawnSpecial) {
        blocksRef.current = []; // Clear blocks

        // Force Triangle in Wave 1 for testing
        const useTriangle = waveNum === 1 || Math.random() < 0.4;

        const specialPos = getRandomSpawnPos(18, 24);
        const specialDir = new THREE.Vector3().subVectors(playerPos, specialPos).normalize();

        if (useTriangle) {
            console.log(`[SPAWN] Aparece enemigo especial: TRIANGULO en la posicion`, specialPos);
            newEnemies.push({
                id: getNextEntityId(),
                type: 'TRIANGLE',
                position: specialPos,
                active: true,
                hp: 12 + (waveNum * 2),
                maxHp: 12 + (waveNum * 2),
                lastShot: 0,
                aimDir: specialDir,
                rotation: 0,
                spawnTimer: 2.0,
                isShielded: true,
                shotPatternIndex: 0
            });
            spawnParticles(specialPos, COLORS.ENEMY_TRIANGLE, 20, true);
        } else {
             console.log(`[SPAWN] Aparece enemigo especial: CORE en la posicion`, specialPos);
             newEnemies.push({
                id: getNextEntityId(),
                type: 'CORE',
                position: specialPos,
                active: true,
                hp: 15 + (waveNum * 3),
                maxHp: 15 + (waveNum * 3),
                lastShot: 0,
                aimDir: specialDir,
                rotation: 0,
                spawnTimer: 2.0, 
                isShielded: true,
                spiralAngle: 0
            });
            spawnParticles(specialPos, COLORS.ENEMY_CORE, 20, true);
        }

    } else {
        // No special enemy -> Normal Round -> Generate Blocks
        generateBlocks(waveNum);
    }

    // SPAWN NORMAL ENEMIES
    // Normal mode: scales from 15 (wave 1) to 30 (wave 5)
    // Hacking/Impossible modes: scales from 15 (wave 1) to 50 (wave 30+)
    let normalCount = 15;
    if (gameMode === 'NORMAL') {
        const progress = Math.min(1.0, (waveNum - 1) / 4); // maxWaves is 5
        normalCount = Math.round(15 + progress * 15); // 15 (w1) to 30 (w5)
    } else {
        // HACKING or IMPOSSIBLE
        const progress = Math.min(1.0, (waveNum - 1) / 29);
        normalCount = Math.round(15 + progress * 35); // 15 (w1) to 50 (w30)
    }

    if (spawnSpecial) {
        normalCount = Math.max(1, normalCount - 2); // Dejar espacio para el jefe
    }

    for(let i=0; i<normalCount; i++) {
        // Spawn de enemigos normales dispersos por todo el mapa (rango de 10 a 28)
        const pos = getRandomSpawnPos(10, 28);
        const dirToPlayer = new THREE.Vector3().subVectors(playerPos, pos).normalize();
        const initialRotation = Math.atan2(dirToPlayer.x, dirToPlayer.z);
        
        spawnParticles(pos, '#D000FF', 8, true); 

        const kitHp = (gameMode === 'NORMAL' || gameMode === 'HACKING') ? 4 : 1;

        newEnemies.push({
            id: getNextEntityId(),
            type: 'NORMAL',
            position: pos,
            active: true,
            hp: kitHp,
            maxHp: kitHp,
            lastShot: Math.random() * 1000, 
            aimDir: dirToPlayer,
            rotation: initialRotation, 
            spawnTimer: 2.0 
        });
    }
    enemiesRef.current = newEnemies;
    setTick(t => t + 1);
  };

  const getRandomSpawnPos = (minR: number, maxR: number) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = minR + Math.random() * (maxR - minR);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      return new THREE.Vector3(x, 0, z);
  };

  // --- Audio System Lifecycle & Dynamic Music Switcher ---
  useEffect(() => {
    const handleMusicTransition = async () => {
      // Si el audio aún no se ha cargado en el preloader, no hacemos nada todavía
      if (!audioSystem.currentUrl) return;

      if (gameState === 'MENU') {
        // Asegurar que el AudioContext esté activo y reproducir la canción del menú
        audioSystem.resume();
        const currentTrack = audioSystem.currentUrl;
        if (currentTrack !== musicUrl) {
          audioSystem.stop();
          await audioSystem.loadTrack(musicUrl); // Resolución instantánea gracias al caché
          audioSystem.play();
        } else if (!audioSystem.isPlaying) {
          audioSystem.play();
        }
      } 
      else if (gameState === 'PLAYING') {
        // Reanudar el AudioContext (despausar si venimos de PAUSED)
        audioSystem.resume();
        const currentTrack = audioSystem.currentUrl;
        if (currentTrack !== genesisUrl) {
          audioSystem.stop();
          await audioSystem.loadTrack(genesisUrl); // Resolución instantánea gracias al caché
          audioSystem.play();
        } else if (!audioSystem.isPlaying) {
          audioSystem.play();
        }
      } 
      else if (gameState === 'PAUSED') {
        // Pausar el AudioContext para congelar la música durante la pantalla de pausa
        audioSystem.pause();
      } 
      else if (gameState === 'GAMEOVER' || gameState === 'VICTORY') {
        // Detener la música completamente en las pantallas de fin de partida
        audioSystem.stop();
      }
    };
    
    handleMusicTransition();
  }, [gameState]);

  // --- Precarga de Recursos Críticos al Iniciar ---
  // Mantiene la ventana de Splash de Electron abierta hasta que todo esté 100% cargado y compilado,
  // evitando micro-congelamientos (stutter) o renderizado por partes al revelar la interfaz.
  useEffect(() => {
    const preloadAssets = async () => {
      try {
        console.log('[PRELOAD] Iniciando precarga asíncrona de canciones...');
        // Descargar y decodificar ambas canciones en paralelo en segundo plano
        await Promise.all([
          audioSystem.loadTrack(musicUrl),
          audioSystem.loadTrack(genesisUrl)
        ]);
        
        // Seleccionar explícitamente el tema del menú para iniciar
        await audioSystem.loadTrack(musicUrl);
        audioSystem.play();
        console.log('[PRELOAD] Precarga asíncrona finalizada con éxito.');
      } catch (e) {
        console.error('[PRELOAD] Error crítico al precargar recursos:', e);
      } finally {
        // Notificar a Electron que la app está lista (cierra el Splash y muestra la ventana principal)
        if (window.electronAPI && window.electronAPI.appReady) {
          window.electronAPI.appReady();
        }
      }
    };

    preloadAssets();

    return () => {
      audioSystem.stop(); // Detener música al desmontar completamente
    };
  }, []);

  // --- Initialization ---
  // FIX: Dependency array is empty [] to ensure this runs ONLY on mount
  useEffect(() => {
    playerHp.current = 100;
    setHp(100);
    setScore(0);
    setWave(1);
    isTransitioning.current = false;

    if (playerRef.current) playerRef.current.position.set(0, 0, 0);
    
    // Initial Setup
    blocksRef.current = []; 
    spawnWave(1);
    
    bulletsRef.current = [];
    particlesRef.current = [];
    
    setTick(t => t + 1);
  }, []);

  // --- Helper: Particle Spawner ---
  const spawnParticles = (pos: THREE.Vector3, color: string, count: number = 5, isSpawnEffect: boolean = false) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: getNextEntityId(),
        position: pos.clone(),
        velocity: isSpawnEffect 
            ? new THREE.Vector3((Math.random()-0.5)*2, 0, (Math.random()-0.5)*2) 
            : new THREE.Vector3((Math.random()-0.5)*10, 0, (Math.random()-0.5)*10),
        active: true,
        life: isSpawnEffect ? 1.5 : 1.0,
        maxLife: isSpawnEffect ? 1.5 : 1.0,
        scale: isSpawnEffect ? 0.1 : Math.random() * 0.5 + 0.2,
        color: color,
        behavior: 'NORMAL'
      });
    }
  };

  const spawnCircularExplosion = (pos: THREE.Vector3, color: string, count: number = 24, speed: number = 3.2) => {
    // 1. Esfera exterior expansiva (más lenta y con mayor tiempo de vida)
    const ringCount = count;
    for (let i = 0; i < ringCount; i++) {
      // Generar una dirección tridimensional aleatoria uniforme sobre una esfera
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize().multiplyScalar(speed * (Math.random() * 0.35 + 0.85)); // Leve variación de velocidad
      
      particlesRef.current.push({
        id: getNextEntityId(),
        position: pos.clone(),
        velocity: velocity,
        active: true,
        life: 1.2, // Expansión lenta y duradera
        maxLife: 1.2,
        scale: Math.random() * 0.4 + 0.45, // Tamaños variados
        color: color,
        behavior: 'NORMAL'
      });
    }

    // 2. Fragmentos acumulados en el núcleo (esfera interior de expansión muy lenta y persistente)
    const centerCount = Math.round(count * 0.85); 
    for (let i = 0; i < centerCount; i++) {
      const centerSpeed = Math.random() * (speed * 0.35); 
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5),
        (Math.random() - 0.5),
        (Math.random() - 0.5)
      ).normalize().multiplyScalar(centerSpeed);
      
      particlesRef.current.push({
        id: getNextEntityId(),
        // Pequeño desplazamiento aleatorio en el núcleo
        position: pos.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2)),
        velocity: velocity,
        active: true,
        life: 1.5, // Mayor persistencia en el centro de la detonación
        maxLife: 1.5,
        scale: Math.random() * 0.3 + 0.3,
        color: color,
        behavior: 'NORMAL'
      });
    }
  };

  const spawnGlitchParticles = (pos: THREE.Vector3, count: number = 20) => {
      for (let i = 0; i < count; i++) {
        const color = '#FFFFFF'; 
        particlesRef.current.push({
            id: getNextEntityId(),
            position: pos.clone().add(new THREE.Vector3((Math.random()-0.5)*1.5, (Math.random()-0.5)*1.5, (Math.random()-0.5)*1.5)),
            velocity: new THREE.Vector3((Math.random()-0.5)*5, (Math.random()-0.5)*5, (Math.random()-0.5)*5),
            active: true,
            life: 1.0,
            maxLife: 1.0,
            scale: Math.random() * 0.5 + 0.3,
            color: color,
            behavior: 'GLITCH' 
        });
      }
  };

  const handlePlayerShoot = (pos: THREE.Vector3, dir: THREE.Vector3) => {
    const { wave, gameMode } = useGameStore.getState();
    const bulletSpeedMultiplier = (gameMode === 'HACKING' || gameMode === 'IMPOSSIBLE') ? (1.0 + Math.min(1.0, (wave - 1) / 29) * 0.7) : 1.0;
    bulletsRef.current.push({
        id: getNextEntityId(),
        position: pos,
        velocity: dir.multiplyScalar(CONFIG.BULLET_SPEED * bulletSpeedMultiplier),
        active: true,
        isPlayer: true,
        color: COLORS.PLAYER_BULLET,
        bulletType: 'DAMAGE',
        scale: 1.0, // Init scale
        isNew: true // Added to skip first movement frame so it renders at spawn position
    });
  };

  const checkPlayerCollision = (nextPos: THREE.Vector3) => {
      return collisionService.checkPlayerBlockCollision(nextPos, blocksRef.current);
  };

  // --- Main Game Loop ---
  useFrame((state, delta) => {
    // Actualizar análisis espectral de bajos en cada frame
    audioSystem.update();

    if (gameState !== 'PLAYING') return;

    // playerPosition static scratchpad update
    if (playerRef.current) {
      _playerPosition.copy(playerRef.current.position);
    } else {
      _playerPosition.set(0, 0, 0);
    }
    const playerPosition = _playerPosition;

    const { wave, gameMode, dashDirection } = useGameStore.getState();
    const hackingSpeedMultiplier = (gameMode === 'HACKING' || gameMode === 'IMPOSSIBLE') ? (1.0 + Math.min(1.0, (wave - 1) / 29) * 0.7) : 1.0;

    // Trigger burst of particles at start of dash animation
    if (dashDirection !== lastDashDirection.current) {
        if (dashDirection !== null) {
            const cursorPosition = visualCursorRef.current ? visualCursorRef.current.position.clone() : playerPosition;
            // burst of glitch particles
            spawnParticles(cursorPosition, '#FFFFFF', 15, true);
            spawnParticles(cursorPosition, COLORS.PLAYER_CURSOR_EMISSIVE, 10, true);
        }
        lastDashDirection.current = dashDirection;
    }

    // Calcular velocidad del cursor en tiempo real (en el plano XZ) para la simulación física de proyectiles
    if (visualCursorRef.current) {
        const currentCursorPos = visualCursorRef.current.position;
        if (lastCursorPosRef.current && delta > 0) {
            cursorVelocityRef.current.subVectors(currentCursorPos, lastCursorPosRef.current).multiplyScalar(1 / delta);
            cursorVelocityRef.current.clampLength(0, 30.0); // Limitar velocidad para suavidad
        } else if (!lastCursorPosRef.current) {
            lastCursorPosRef.current = new THREE.Vector3();
        }
        lastCursorPosRef.current.copy(currentCursorPos);
    }

    const time = state.clock.getElapsedTime() * 1000;

    // --- 0. Wave Transition Logic ---
    let skippingEnemies = false;

    if (isTransitioning.current) {
        waveTransitionTimer.current -= delta;
        skippingEnemies = true;
        
        if (waveTransitionTimer.current <= 0) {
            isTransitioning.current = false;
            skippingEnemies = false; // Resume logic immediately
            
            const { wave: currentWave, maxWaves, gameMode: currentMode } = useGameStore.getState();

            if (currentMode === 'HACKING' || currentMode === 'IMPOSSIBLE') {
                const nextWave = currentWave + 1;
                spawnWave(nextWave);
                setWave(nextWave);
            } else {
                if (currentWave < maxWaves) {
                    const nextWave = currentWave + 1;
                    spawnWave(nextWave);
                    setWave(nextWave);
                } else {
                    setGameState('VICTORY');
                }
            }
        }
    }

    // Precalculate cursorPosition in a scratchpad for bullet collision checks
    if (visualCursorRef.current) {
      _cursorPosition.copy(visualCursorRef.current.position);
    } else {
      _cursorPosition.copy(_playerPosition);
    }

    // --- 1. Bullet Movement & Physics ---
    bulletsRef.current.forEach(bullet => {
      if (!bullet.active) return;
      
      // Always move
      if (bullet.isNew) {
          bullet.isNew = false;
      } else {
          if (bullet.velocity) {
              _tempVec.copy(bullet.velocity).multiplyScalar(delta);
              bullet.position.add(_tempVec);
          }
      }
      
      // If Transitioning: FADE OUT effect (ONLY FOR ENEMY BULLETS)
      if (skippingEnemies && !bullet.isPlayer) {
          bullet.scale = (bullet.scale !== undefined ? bullet.scale : 1.0) - (delta * 5); // Shrink fast
          if (bullet.scale <= 0) {
              bullet.active = false;
          }
      }
    });

    // --- 2. Collision Processing (Using CollisionService) ---
    if (!skippingEnemies) {
      const { isInvulnerable, addShieldStack, consumeShieldStack } = useGameStore.getState();
      
      collisionService.processBulletCollisions(
        bulletsRef.current,
        enemiesRef.current,
        blocksRef.current,
        delta,
        {
          gameMode,
          wave,
          isInvulnerable,
          playerPosition,
          cursorPosition: _cursorPosition,
          addShieldStack,
          consumeShieldStack,
          addScore: (points) => setScore(useGameStore.getState().score + points),
          damagePlayer: (amount) => {
            if (useGameStore.getState().gameState !== 'PLAYING') return;
            if (playerHp.current <= 0 && amount > 0) return;

            if (amount < 0) {
              playerHp.current = 100; // Full heal
              setHp(100);
            } else {
              playerHp.current = Math.max(0, playerHp.current - amount);
              setHp(playerHp.current);
              if (playerHp.current === 0) {
                const cursorPosition = visualCursorRef.current ? visualCursorRef.current.position : playerPosition;
                spawnParticles(cursorPosition, '#FF0000', 20);
                setGameState('GAMEOVER');
              }
            }
          },
          killPlayer: () => {
            playerHp.current = 0;
            setHp(0);
            setGameState('GAMEOVER');
          },
          spawnParticles,
          spawnCircularExplosion,
          spawnGlitchParticles,
          deactivateBossShields: () => {
            enemiesRef.current.forEach(boss => {
              if ((boss.type === 'CORE' || boss.type === 'TRIANGLE') && boss.isShielded) {
                boss.isShielded = false;
                boss.hasBloom = true;
                spawnGlitchParticles(boss.position, 30);
                spawnCircularExplosion(boss.position, COLORS.ENEMY_SHIELD, 28, 5.5);
              }
            });
          }
        }
      );
    }

    // Limpieza in-place de balas inactivas (Zero GC Array allocation)
    let bWrite = 0;
    const bullets = bulletsRef.current;
    for (let i = 0; i < bullets.length; i++) {
      if (bullets[i].active) {
        bullets[bWrite++] = bullets[i];
      }
    }
    bullets.length = bWrite;

    // --- 3. Particles ---
    particlesRef.current.forEach(p => {
      if (!p.active) return;
      if (p.velocity) {
          _tempVec.copy(p.velocity).multiplyScalar(delta);
          p.position.add(_tempVec);
      }
      p.life -= delta;
      
      if (p.behavior === 'GLITCH') {
          p.scale += delta * 0.5;
          p.rotation = (p.rotation || 0) + delta * 2;
      }
      else if (p.color === COLORS.ENEMY_SHIELD) {
         p.scale = (p.life / p.maxLife) * 0.5;
      }
      else if (p.color === '#FFA500' && p.life > 0.5) {
          p.scale = Math.min(0.6, p.scale + delta);
      } else {
          p.scale = (p.life / p.maxLife) * 0.8; 
      }
      if (p.life <= 0) p.active = false;
    });

    // Limpieza in-place de partículas inactivas (Zero GC Array allocation)
    let pWrite = 0;
    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].active) {
        particles[pWrite++] = particles[i];
      }
    }
    particles.length = pWrite;

    // STOP HERE IF TRANSITIONING
    if (skippingEnemies) return;

    // --- 4. Shield Dynamic Checks (Zero-GC) ---
    let hasActiveNormals = false;
    const allCurrentEnemies = enemiesRef.current;
    for (let i = 0; i < allCurrentEnemies.length; i++) {
      const e = allCurrentEnemies[i];
      if (e.active && e.type === 'NORMAL' && !e.dying) {
        hasActiveNormals = true;
        break;
      }
    }

    for (let i = 0; i < allCurrentEnemies.length; i++) {
      const boss = allCurrentEnemies[i];
      if (boss.active && (boss.type === 'CORE' || boss.type === 'TRIANGLE') && !boss.dying) {
        if (boss.isShielded !== hasActiveNormals) {
          boss.isShielded = hasActiveNormals;
          if (!hasActiveNormals) {
            boss.hasBloom = true;
            spawnGlitchParticles(boss.position, 30);
            spawnCircularExplosion(boss.position, COLORS.ENEMY_SHIELD, 28, 5.5);
          }
        }
      }
    }

    // --- 5. Enemy AI Updates (Using EnemyBehaviorService) ---
    enemyBehaviorService.updateEnemies(enemiesRef.current, {
      playerPosition,
      cursorVelocity: cursorVelocityRef.current,
      delta,
      time,
      gameMode,
      hackingSpeedMultiplier,
      enemies: enemiesRef.current,
      blocks: blocksRef.current,
      bullets: bulletsRef.current,
      spawnParticles,
      spawnGlitchParticles
    });

    // --- 6. Wave Check ---
    const allEnemiesDead = enemiesRef.current.every(e => !e.active);
    if (allEnemiesDead && !isTransitioning.current) {
        isTransitioning.current = true;
        waveTransitionTimer.current = 0.5; // Fast transition 
    }
  });
  
  return (
    <>
      <Lighting />
      <Floor />
      
      <PlayerController 
        playerRef={playerRef} 
        visualCursorRef={visualCursorRef}
        onShoot={handlePlayerShoot}
        checkCollision={checkPlayerCollision}
        isGameActive={gameState === 'PLAYING'}
      />

      {enemiesRef.current.map(enemy => (
        <EnemyMesh key={enemy.id} entity={enemy} />
      ))}

      {blocksRef.current.map(block => (
        <BlockMesh key={block.id} entity={block} />
      ))}

      <DynamicObjectRenderer 
        bullets={bulletsRef} 
        particles={particlesRef} 
        cursorRef={visualCursorRef}
        cursorVelocityRef={cursorVelocityRef}
      />
    </>
  );
};