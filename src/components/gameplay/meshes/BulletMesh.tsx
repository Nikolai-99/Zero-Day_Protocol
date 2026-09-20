import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COLORS } from '../../../constants/gameConstants';
import { Bullet } from '../../../types';

export interface BulletMeshProps {
  entity: Bullet;
  cursorRef?: React.RefObject<THREE.Group>;
  cursorVelocityRef?: React.RefObject<THREE.Vector3>;
}

/**
 * Componente BulletMesh
 * Responsabilidad única: Renderizar visualmente las balas/proyectiles (del jugador y enemigos)
 * en el espacio 3D con materiales estándar optimizados, actualizando dinámicamente su escala.
 */
export const BulletMesh: React.FC<BulletMeshProps> = ({ entity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Sincronizar posición y escala
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(entity.position);
      const s = entity.scale !== undefined ? entity.scale : 1;
      meshRef.current.scale.setScalar(s);
    }
  });

  if (entity.isPlayer) {
    return (
      <mesh ref={meshRef} renderOrder={10}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial 
          color={COLORS.PLAYER_BULLET} 
          emissive={COLORS.PLAYER_BULLET_EMISSIVE}
          emissiveIntensity={4.0}
          depthWrite={true}
          depthTest={true}
          toneMapped={false}
        />
      </mesh>
    );
  }

  // Determinar paleta neón para proyectiles enemigos convencionales y de curación
  let color = entity.color || COLORS.ENEMY_BULLET;
  let emissive = entity.color || COLORS.ENEMY_BULLET_EMISSIVE;

  if (entity.color === '#D000FF') {
    emissive = '#E258FF'; // Morado claro/magenta para un bloom muy brillante y nítido
  } else if (entity.color === '#00FFFF' || entity.color === COLORS.ENEMY_TRIANGLE) {
    emissive = '#A6FFFF'; // Cyan claro/brillante para el Triangle
  } else if (entity.bulletType === 'HEAL') {
    color = COLORS.BULLET_HEAL;
    emissive = COLORS.BULLET_HEAL_EMISSIVE;
  }

  return (
    <mesh ref={meshRef} renderOrder={10}>
      <sphereGeometry args={[0.14, 8, 8]} />
      <meshStandardMaterial 
        color={color} 
        emissive={emissive}
        emissiveIntensity={4.0}
        depthWrite={true}
        depthTest={true}
        toneMapped={false}
      />
    </mesh>
  );
};
