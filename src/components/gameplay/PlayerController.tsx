import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PlayerMesh } from './meshes/index';
import { CONFIG, COLORS } from '../../constants/gameConstants';
import { useGameStore } from '../../store/useGameStore';

// Pre-allocated static scratch variables to avoid GC thrashing in useFrame
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _euler = new THREE.Euler();
const _nextPos = new THREE.Vector3();
const _velocity = new THREE.Vector3();
const _localOffset = new THREE.Vector3();
const _rotateY = new THREE.Quaternion();
const _tilt = new THREE.Quaternion();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _xAxis = new THREE.Vector3(1, 0, 0);

const _fireDirection = new THREE.Vector3();
const _cameraForward = new THREE.Vector3();
const _spawnPos = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

interface PlayerControllerProps {
  playerRef: React.RefObject<THREE.Group>;
  visualCursorRef: React.RefObject<THREE.Group>;
  onShoot: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  checkCollision: (nextPos: THREE.Vector3) => boolean;
  isGameActive: boolean;
}

export const PlayerController: React.FC<PlayerControllerProps> = ({ 
  playerRef, 
  visualCursorRef,
  onShoot,
  checkCollision,
  isGameActive,
}) => {
  
  // Input State
  const keys = useRef<{ [key: string]: boolean }>({});
  const isMouseDown = useRef(false);
  const lastFireTime = useRef(0);
  const lastTeleportTime = useRef(0);

  // Dash Animation State
  const dashStartPos = useRef(new THREE.Vector3());
  const dashEndPos = useRef(new THREE.Vector3());
  const dashStartTimeRef = useRef(0);
  const dashDirectionRef = useRef<'left' | 'right' | null>(null);
  
  // R3F hooks
  const { camera } = useThree();
  
  // Rotation State (Yaw: Y-axis rotation, Pitch: X-axis rotation)
  const yaw = useRef(0);
  const pitch = useRef(0);

  // --- Force initial alignment on mount to match gameplay perspective ---
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.position.set(0, 0, 0);
    }
    yaw.current = 0;
    pitch.current = 0;

    // Configurar la cámara en el mismo ángulo horizontal que tiene el gameplay (headHeight = 1.0)
    camera.position.set(0, 1.0, 0);
    camera.rotation.set(0, 0, 0, 'YXZ');

    // Inicializar el cursor en la posición y orientación relativa de gameplay
    if (visualCursorRef.current) {
      _localOffset.set(0, -0.55, -1.6);
      _localOffset.applyQuaternion(camera.quaternion);
      visualCursorRef.current.position.copy(camera.position).add(_localOffset);
      visualCursorRef.current.quaternion.copy(camera.quaternion);
      _rotateY.setFromAxisAngle(_yAxis, Math.PI);
      visualCursorRef.current.quaternion.multiply(_rotateY);
      _tilt.setFromAxisAngle(_xAxis, -0.35);
      visualCursorRef.current.quaternion.multiply(_tilt);
    }
  }, [camera, playerRef, visualCursorRef]);

  const triggerTeleport = () => {
    const hasW = keys.current['KeyW'] || keys.current['ArrowUp'];
    const hasS = keys.current['KeyS'] || keys.current['ArrowDown'];
    const hasA = keys.current['KeyA'] || keys.current['ArrowLeft'];
    const hasD = keys.current['KeyD'] || keys.current['ArrowRight'];

    // Debe presionar A o D para definir el ángulo lateral del giro
    if (!hasA && !hasD) return;
    if (!playerRef.current) return;
    if (dashDirectionRef.current !== null) return; // Ya está haciendo una voltereta

    const now = performance.now();
    const cooldown = 500; // 500ms cooldown to match the barrel roll duration exactly (no recovery delay)
    if (now - lastTeleportTime.current < cooldown) return;

    // Vectores direccionales relativos a la rotación Yaw (plano horizontal XZ)
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, yaw.current, 0)).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, yaw.current, 0)).normalize();
    
    let teleportDir = new THREE.Vector3();
    if (hasA) teleportDir.sub(right);
    if (hasD) teleportDir.add(right);
    if (hasW) teleportDir.add(forward);
    if (hasS) teleportDir.sub(forward);

    if (teleportDir.lengthSq() === 0) return;
    teleportDir.normalize();

    const teleportDistance = 14.0; // Distance to teleport (doubled for 100% speed boost)
    const currentPos = playerRef.current.position.clone();
    const nextPos = currentPos.add(teleportDir.multiplyScalar(teleportDistance));

    // Boundary limits
    const boundary = CONFIG.FIELD_SIZE / 2 - 1.0;
    nextPos.x = Math.max(-boundary, Math.min(boundary, nextPos.x));
    nextPos.z = Math.max(-boundary, Math.min(boundary, nextPos.z));

    // Check collision with blocks before teleporting
    if (checkCollision(nextPos)) {
        return; // Collision detected, abort teleport without putting it on cooldown
    }

    // Success! Update cooldown and perform teleportation
    lastTeleportTime.current = now;
    
    dashStartPos.current.copy(playerRef.current.position);
    dashEndPos.current.copy(nextPos);
    dashStartTimeRef.current = now;
    dashDirectionRef.current = hasA ? 'left' : 'right';
    
    // Enable invulnerability and dash state in Zustand store for 500ms
    useGameStore.getState().setInvulnerable(true);
    useGameStore.getState().setDashState(dashDirectionRef.current, now);
    
    // Disable invulnerability and clear dash state after 500ms
    setTimeout(() => {
        useGameStore.getState().setInvulnerable(false);
        useGameStore.getState().setDashState(null, 0);
        dashDirectionRef.current = null;
    }, 500);
  };

  // --- Input & Pointer Lock Listeners ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
        keys.current[e.code] = true;
        
        // Trigger teleport on Shift press
        if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && isGameActive) {
            triggerTeleport();
        }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current[e.code] = false;
    
    const onMouseDown = () => {
        isMouseDown.current = true;
        if (isGameActive) {
            document.body.requestPointerLock();
        }
    };
    
    const onMouseUp = () => {
        isMouseDown.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === document.body && isGameActive) {
            const sensitivity = 0.002;
            yaw.current -= e.movementX * sensitivity;
            // pitch.current queda bloqueado en 0 para simular la perspectiva clásica de DOOM (sin cabeceo vertical)
            pitch.current = 0;
        }
    };

    const onBlur = () => {
        isMouseDown.current = false;
    };

    const onPointerLockChange = () => {
        // Si el puntero se libera y el estado del juego era PLAYING, pausamos el juego automáticamente
        if (document.pointerLockElement !== document.body && useGameStore.getState().gameState === 'PLAYING') {
            useGameStore.getState().setGameState('PAUSED');
        }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.body.style.cursor = 'default'; // Restablecer cursor
    };
  }, [isGameActive]);

  // --- Release Pointer Lock when game is no longer active (Reboot, GameOver, Victory, Menu) ---
  useEffect(() => {
    if (!isGameActive) {
      if (document.pointerLockElement === document.body) {
        document.exitPointerLock();
      }
      document.body.style.cursor = 'default'; // Asegurar que se muestre el cursor por defecto
    }
  }, [isGameActive]);

  // --- Physics & Camera Loop ---
  useFrame((state, delta) => {
    if (!isGameActive || !playerRef.current) return;

    const time = state.clock.getElapsedTime() * 1000;

    // Check if player is currently in barrel roll animation
    if (dashDirectionRef.current !== null) {
      const elapsed = performance.now() - dashStartTimeRef.current;
      const t = Math.min(1.0, elapsed / 500); // Normalize over 500ms
      
      // Interpolate physical position smoothly
      playerRef.current.position.lerpVectors(dashStartPos.current, dashEndPos.current, t);
    } else {
      // 1. Movimiento WASD normal relativo a la rotación Yaw de la cámara (para recorrer el plano correctamente)
      _euler.set(0, yaw.current, 0);
      _forward.set(0, 0, -1).applyEuler(_euler).normalize();
      _right.set(1, 0, 0).applyEuler(_euler).normalize();

      _moveDir.set(0, 0, 0);

      if (keys.current['KeyW'] || keys.current['ArrowUp']) { _moveDir.add(_forward); }
      if (keys.current['KeyS'] || keys.current['ArrowDown']) { _moveDir.sub(_forward); }
      if (keys.current['KeyA'] || keys.current['ArrowLeft']) { _moveDir.sub(_right); }
      if (keys.current['KeyD'] || keys.current['ArrowRight']) { _moveDir.add(_right); }

      // Aplicar Movimiento
      if (_moveDir.lengthSq() > 0) {
        _moveDir.normalize();

        _velocity.copy(_moveDir).multiplyScalar(CONFIG.PLAYER_SPEED * delta);
        _nextPos.copy(playerRef.current.position).add(_velocity);

        // Límites de frontera del mapa
        const boundary = CONFIG.FIELD_SIZE / 2 - 1.0;
        if (Math.abs(_nextPos.x) > boundary) _nextPos.x = Math.sign(_nextPos.x) * boundary;
        if (Math.abs(_nextPos.z) > boundary) _nextPos.z = Math.sign(_nextPos.z) * boundary;

        // Comprobar Colisiones
        if (!checkCollision(_nextPos)) {
          playerRef.current.position.copy(_nextPos);
        }
      }
    }
    
    // 2. Posicionamiento y Rotación de la Cámara (Altura de los ojos)
    const headHeight = 1.0;
    camera.position.copy(playerRef.current.position);
    camera.position.y += headHeight;
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');

    // 3. Posicionamiento del Cursor 3D (Holograma del jugador en la parte inferior apuntando hacia adelante)
    if (visualCursorRef.current) {
        // Colocar el cursor más abajo (y = -0.55) y ligeramente más cerca (z = -1.6) en el espacio de la cámara
        _localOffset.set(0, -0.55, -1.6);
        _localOffset.applyQuaternion(camera.quaternion);
        
        visualCursorRef.current.position.copy(camera.position).add(_localOffset);
        
        // Copiar rotación de la cámara para apuntar hacia adelante
        visualCursorRef.current.quaternion.copy(camera.quaternion);
        
        // Invertir posición visual: rotar 180 grados en Y para que apunte hacia adelante (mirando al frente)
        _rotateY.setFromAxisAngle(_yAxis, Math.PI);
        visualCursorRef.current.quaternion.multiply(_rotateY);
        
        // Añadir un cabeceo (pitch) hacia arriba en su eje local para que apunte ligeramente hacia el medio de la pantalla
        _tilt.setFromAxisAngle(_xAxis, -0.35); // Inclinación hacia arriba
        visualCursorRef.current.quaternion.multiply(_tilt);
    }

    // 4. Lógica de Disparo (Bloqueada al plano horizontal rozando el suelo, saliendo exactamente de la punta del cursor)
    const isShooting = isMouseDown.current || keys.current['Space'];

    if (isShooting && time - lastFireTime.current > CONFIG.PLAYER_FIRE_RATE) {
      // Dirección frontal horizontal (en el plano XZ) basada en la rotación de mirada (yaw)
      _euler.set(0, yaw.current, 0);
      _fireDirection.set(0, 0, -1).applyEuler(_euler).normalize();
      
      // Dirección de mirada completa de la cámara para calcular la punta del cursor
      _cameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      
      // Spawnear exactamente en la punta del cursor visual (PlayerMesh tiene una longitud de 0.8 y está escalado a 0.22)
      if (visualCursorRef.current) {
        _spawnPos.copy(visualCursorRef.current.position);
        _tempVec.copy(_cameraForward).multiplyScalar(0.8 * 0.22);
        _spawnPos.add(_tempVec);
      } else {
        _spawnPos.copy(playerRef.current.position);
      }
      
      // Colocar proyectil ligeramente adelante para evitar colisión interna
      _tempVec.copy(_fireDirection).multiplyScalar(0.2);
      _spawnPos.add(_tempVec);
      
      // Forzar Y = 0.55 y Y-velocity = 0 para disparar perfectamente simétrico y recto sobre el suelo
      _spawnPos.y = 0.55;
      _fireDirection.y = 0;
      _fireDirection.normalize();

      onShoot(_spawnPos.clone(), _fireDirection.clone());
      lastFireTime.current = time;
    }
  });

  return (
    <>
        {/* Entidad física en el suelo (mantiene colisiones y lógica de enemigos) */}
        <group ref={playerRef} position={[0, 0, 0]} />
        
        {/* Cursor visual reducido en la parte inferior (solo visible durante gameplay) */}
        <group ref={visualCursorRef} scale={[0.22, 0.22, 0.22]} visible={isGameActive}>
            <PlayerMesh />
        </group>
    </>
  );
};