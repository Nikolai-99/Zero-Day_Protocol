import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { COLORS } from '../../../constants/gameConstants';
import { useGameStore } from '../../../store/useGameStore';
import playerModelUrl from '../../../../assets/3D Models/Player_Cursor.glb';

/**
 * Componente PlayerMeshInner
 * Carga el modelo 3D GLTF de la nave del jugador, configura sus materiales emisivos
 * para el efecto bloom según los colores de Blender, y maneja las animaciones de spawn,
 * daño (hit flash/shake) y barril (barrel roll).
 */
const PlayerMeshInner: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Cargar el modelo GLTF
  const gltf = useLoader(GLTFLoader, playerModelUrl);
  
  // Clonar la escena para evitar interferencia si existieran múltiples instancias
  const modelScene = useMemo(() => gltf.scene.clone(), [gltf]);

  // Calcular el centro geométrico de la nave para centrar su pivote
  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(modelScene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }, [modelScene]);

  // Extraer y guardar referencia de los materiales del modelo de Blender
  const materials = useMemo(() => {
    const mats: { cursor1?: THREE.MeshStandardMaterial, cursor2?: THREE.MeshStandardMaterial } = {};
    
    modelScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const setupMat = (mat: THREE.MeshStandardMaterial) => {
          const clonedMat = mat.clone(); // Clonar material para evitar que compartan estado
          clonedMat.toneMapped = false; // Desactivar tone mapping para habilitar Bloom Neón de alta intensidad
          if (clonedMat.name === 'Cursor_1') {
            mats.cursor1 = clonedMat;
            // Configurar color base de emisión ciberpunk naranja oscuro
            clonedMat.emissive.setRGB(0.7991030812263489, 0.4019778072834015, 0.0003035269910469651);
            clonedMat.emissiveIntensity = 3.0;
          } else if (clonedMat.name === 'Cursor_2') {
            mats.cursor2 = clonedMat;
            // Configurar color base de emisión ciberpunk naranja neón brillante
            clonedMat.emissive.setRGB(1, 0.5825232863426208, 0.03249448537826538);
            clonedMat.emissiveIntensity = 5.0;
          }
          return clonedMat;
        };

        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => setupMat(m as THREE.MeshStandardMaterial));
        } else {
          child.material = setupMat(child.material as THREE.MeshStandardMaterial);
        }
      }
    });
    return mats;
  }, [modelScene]);

  // Temporizadores locales de animación
  const spawnTimer = useRef(1.5);
  const hp = useGameStore((state) => state.hp);
  const isInvulnerable = useGameStore((state) => state.isInvulnerable);
  const dashDirection = useGameStore((state) => state.dashDirection);
  const dashStartTime = useGameStore((state) => state.dashStartTime);
  const prevHpRef = useRef(hp);
  const flashTimer = useRef(0);

  useEffect(() => {
    // Si la vida disminuye, gatillar animación de daño
    if (hp < prevHpRef.current) {
      flashTimer.current = 0.35;
    }
    prevHpRef.current = hp;
  }, [hp]);

  // Bucle de frame de R3F para animaciones
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    let baseScale = 1.0;
    let baseOpacity = 1.0;

    // 1. Animación de Spawn
    if (spawnTimer.current > 0) {
      spawnTimer.current -= delta;
      const progress = Math.max(0, 1.0 - (spawnTimer.current / 1.5));
      baseScale = progress;
      baseOpacity = progress;
      
      // Ajustar opacidad de materiales en spawn si es necesario
      modelScene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m: any) => {
            m.transparent = true;
            m.opacity = baseOpacity;
          });
        }
      });
    } else {
      // Desactivar transparencia una vez completado el spawn si no hay daño
      if (flashTimer.current <= 0) {
        modelScene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m: any) => {
              m.transparent = false;
              m.opacity = 1.0;
            });
          }
        });
      }
    }

    // 2. Animación de Impacto (Destello en Rojo, Sacudida y Escala de Daño)
    if (flashTimer.current > 0 && !isInvulnerable) {
      flashTimer.current -= delta;
      const damageProgress = Math.max(0, flashTimer.current / 0.35); // de 1.0 a 0.0

      // Sacudida física en los 3 ejes
      groupRef.current.position.set(
        (Math.random() - 0.5) * 0.15 * damageProgress,
        0.2 + (Math.random() - 0.5) * 0.12 * damageProgress,
        (Math.random() - 0.5) * 0.15 * damageProgress
      );

      // Pulsación de escala del daño (25% extra)
      const pulseScale = baseScale * (1.0 + 0.25 * damageProgress);
      groupRef.current.scale.setScalar(pulseScale);

      // Mezclar colores originales a Rojo Puro con Emisión masiva de color rojo neón
      if (materials.cursor1) {
        materials.cursor1.color.setRGB(
          1.0,
          THREE.MathUtils.lerp(0.7991030812263489, 0.0, damageProgress),
          THREE.MathUtils.lerp(0.0003035269910469651, 0.0, damageProgress)
        );
        materials.cursor1.emissive.setHex(0xFF0000);
        materials.cursor1.emissiveIntensity = 3.0 + 12.0 * damageProgress;
        materials.cursor1.transparent = true;
        materials.cursor1.opacity = baseOpacity;
      }
      if (materials.cursor2) {
        materials.cursor2.color.setRGB(
          1.0,
          THREE.MathUtils.lerp(1.0, 0.0, damageProgress),
          THREE.MathUtils.lerp(0.03249448537826538, 0.0, damageProgress)
        );
        materials.cursor2.emissive.setHex(0xFF0000);
        materials.cursor2.emissiveIntensity = 5.0 + 15.0 * damageProgress;
        materials.cursor2.transparent = true;
        materials.cursor2.opacity = baseOpacity;
      }
    } else {
      // 3. Comportamiento Base y Dash (Barrel Roll)
      const now = performance.now();
      const elapsed = now - dashStartTime;

      if (dashDirection && elapsed < 500) {
        const t = elapsed / 500;
        const theta = t * 2 * Math.PI;

        // Rotación: giro de barril (barrel roll) sobre su eje longitudinal local (Z)
        const rollAngle = dashDirection === 'left' ? theta : -theta;
        groupRef.current.rotation.set(0, 0, rollAngle);

        // Posición: bucle parabólico/circular en pantalla (eje X e Y)
        const localRadius = 1.5;
        const offsetX = dashDirection === 'left' ? -localRadius * Math.sin(theta) : localRadius * Math.sin(theta);
        const offsetZ = localRadius * (1 - Math.cos(theta));

        groupRef.current.position.set(offsetX, 0.2 + offsetZ, 0);

        // Efecto de brillo de dash (Bloom Spike senoidal)
        const spike = Math.sin(Math.PI * t);
        if (materials.cursor1) {
          materials.cursor1.color.setRGB(0.7991030812263489, 0.4019778072834015, 0.0003035269910469651);
          materials.cursor1.emissive.setRGB(0.7991030812263489, 0.4019778072834015, 0.0003035269910469651);
          materials.cursor1.emissiveIntensity = 3.0 + 17.0 * spike;
        }
        if (materials.cursor2) {
          materials.cursor2.color.setRGB(1, 0.5825232863426208, 0.03249448537826538);
          materials.cursor2.emissive.setRGB(1, 0.5825232863426208, 0.03249448537826538);
          materials.cursor2.emissiveIntensity = 5.0 + 25.0 * spike;
        }
      } else {
        // Estado inactivo / movimiento estándar
        groupRef.current.position.set(0, 0.2, 0);
        groupRef.current.rotation.set(0, 0, 0);
        groupRef.current.scale.setScalar(baseScale);

        // Restaurar intensidad de emisión estándar
        if (materials.cursor1) {
          materials.cursor1.color.setRGB(0.7991030812263489, 0.4019778072834015, 0.0003035269910469651);
          materials.cursor1.emissive.setRGB(0.7991030812263489, 0.4019778072834015, 0.0003035269910469651);
          materials.cursor1.emissiveIntensity = 3.0;
        }
        if (materials.cursor2) {
          materials.cursor2.color.setRGB(1, 0.5825232863426208, 0.03249448537826538);
          materials.cursor2.emissive.setRGB(1, 0.5825232863426208, 0.03249448537826538);
          materials.cursor2.emissiveIntensity = 5.0;
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.2, 0]}>
      {/* 
        1. Grupo Externo: Controla la rotación base para mirar hacia adelante (Math.PI / 2 en Y)
           y reduce el tamaño en un 30% (escala de 0.7 en todos los ejes).
      */}
      <group rotation={[0, Math.PI / 2, 0]} scale={[0.7, 0.7, 0.7]}>
        {/* 
          2. Grupo Interno: Aplica el desfase de centrado geométrico puro del modelo
             en relación a sus ejes originales sin verse distorsionado por la rotación.
        */}
        <group position={[-centerOffset.x, -centerOffset.y, -centerOffset.z]}>
          <primitive object={modelScene} />
        </group>
      </group>
    </group>
  );
};

export const PlayerMesh: React.FC = () => {
  return (
    <Suspense fallback={
      // Fallback visual en lo que se carga y compila el GLTF
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <coneGeometry args={[0.5, 1.2, 3]} />
        <meshBasicMaterial color={COLORS.PLAYER_CURSOR} wireframe />
      </mesh>
    }>
      <PlayerMeshInner />
    </Suspense>
  );
};
