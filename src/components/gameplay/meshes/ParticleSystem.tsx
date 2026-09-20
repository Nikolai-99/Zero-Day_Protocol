import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Particle } from '../../../types';

/**
 * Componente ParticleSystem
 * Responsabilidad única: Renderizar visualmente una partícula de neón individual en el espacio 3D,
 * sincronizando su posición, rotación, y escala según los cálculos físicos.
 * Multiplica la coloración para forzar valores HDR que incrementen el bloom un 20%.
 */
export const ParticleSystem: React.FC<{ entity: Particle }> = ({ entity }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
     if (meshRef.current) {
         meshRef.current.position.copy(entity.position);
         
         // Sincronizar escala dinámica y rotación (especialmente para partículas glitch)
         const s = entity.scale !== undefined ? entity.scale : 1;
         meshRef.current.scale.setScalar(s);
         
         if (entity.rotation !== undefined) {
             meshRef.current.rotation.y = entity.rotation;
         }
     }
  });

  const brightColor = useMemo(() => {
    // Multiplicar el color para que sea HDR (> 1.0) y brille un 20% más intenso con el bloom
    return new THREE.Color(entity.color).multiplyScalar(3.0);
  }, [entity.color]);

  return (
    <mesh ref={meshRef} renderOrder={10}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshBasicMaterial 
        color={brightColor} 
        toneMapped={false}
        depthWrite={true}
        depthTest={true}
      />
    </mesh>
  );
};
