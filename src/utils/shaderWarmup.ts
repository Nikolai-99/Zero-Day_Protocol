import * as THREE from 'three';
import { COLORS } from '../constants/gameConstants';

/**
 * Realiza la precompilación (Warmup) de los materiales estándar de Three.js
 * antes de que comience el juego para evitar caídas de FPS (stuttering/jank)
 * durante el gameplay cuando se renderizan por primera vez.
 */
export function warmUpShaders(gl: THREE.WebGLRenderer, camera: THREE.Camera) {
  console.log('[WARMUP] Iniciando precompilación de materiales...');
  const startTime = performance.now();

  const dummyScene = new THREE.Scene();

  // 1. Player Bullet Standard Material & Mesh
  const playerBulletMat = new THREE.MeshStandardMaterial({
    color: COLORS.PLAYER_BULLET || '#FFB300',
    emissive: COLORS.PLAYER_BULLET_EMISSIVE || '#FF8F00',
    emissiveIntensity: 4.0,
    toneMapped: false,
  });
  const playerBulletMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), playerBulletMat);
  dummyScene.add(playerBulletMesh);

  // 2. Enemy Bullet Standard Material & Mesh (para calentar el pipeline estándar de iluminación)
  const enemyBulletMat = new THREE.MeshStandardMaterial({
    color: COLORS.ENEMY_BULLET || '#FF4400',
    emissive: COLORS.ENEMY_BULLET_EMISSIVE || '#FF0000',
    emissiveIntensity: 4.0,
    toneMapped: false,
  });
  const enemyBulletMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), enemyBulletMat);
  dummyScene.add(enemyBulletMesh);

  // 3. Player Mesh Standard Material & Mesh (para calentar extrude/standard shaders con luces)
  const playerMat = new THREE.MeshStandardMaterial({
    color: COLORS.PLAYER_CURSOR || '#F5DEB3',
    emissive: COLORS.PLAYER_CURSOR_EMISSIVE || '#CD853F',
    emissiveIntensity: 3.0,
    roughness: 0.4,
    metalness: 0.8,
    toneMapped: false,
  });
  const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), playerMat);
  dummyScene.add(playerMesh);

  // Compilar la escena dummy con el WebGLRenderer de Three.js
  gl.compile(dummyScene, camera);

  // Limpieza de memoria (disponer de los recursos creados temporalmente)
  playerBulletMesh.geometry.dispose();
  playerBulletMat.dispose();

  enemyBulletMesh.geometry.dispose();
  enemyBulletMat.dispose();

  playerMesh.geometry.dispose();
  playerMat.dispose();

  const endTime = performance.now();
  console.log(`[WARMUP] Precompilación finalizada con éxito en ${(endTime - startTime).toFixed(2)}ms.`);
}
