import React from 'react';
import { CONFIG } from '../../constants/gameConstants';

/**
 * Componente Floor
 * Responsabilidad única: Renderizar de forma aislada y estática la superficie/suelo de la arena,
 * aplicando un efecto de glassmorphism (cristal semi-transparente reflectante y translúcido)
 * y una cuadrícula de neón de alta tecnología.
 */
export const Floor: React.FC = () => {
  return (
    <group>
      {/* 1. Suelo de Cristal Templado Oscuro (Glassmorphism) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[CONFIG.FIELD_SIZE, CONFIG.FIELD_SIZE]} />
        <meshStandardMaterial 
          color="#1a0a00"
          transparent={true}
          opacity={0.45}
          roughness={0.12}
          metalness={0.8}
        />
      </mesh>

      {/* 2. Cuadrícula holográfica de Neón Cyberpunk */}
      <gridHelper 
        args={[
          CONFIG.FIELD_SIZE, 
          60, 
          '#ffaa33',
          '#663300'
        ]} 
        position={[0, 0.005, 0]} 
        // @ts-ignore
        material-transparent={true}
        // @ts-ignore
        material-opacity={0.75}
        // @ts-ignore
        material-toneMapped={false}
      />
    </group>
  );
};

export default Floor;
