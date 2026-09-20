import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { COLORS } from '../../../constants/gameConstants';
import { Block } from '../../../types';

/**
 * Componente BlockMesh (Enemigo rectangular / Bloque cúbico de protección)
 * Responsabilidad única: Renderizar visualmente los bloques o barreras de protección rectangulares (cúbicas) en la escena,
 * aplicando un sutil efecto de escala oscilante y un hermoso efecto de brillo estático (bloom).
 */
export const BlockMesh: React.FC<{ entity: Block }> = ({ entity }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);

    // Animación de respiración/escala de los bloques (sutil oscilación regular)
    useFrame(() => {
        if (!groupRef.current) return;
        groupRef.current.visible = entity.active;
        if (!entity.active) return;
        
        // Pulsa hacia afuera con una oscilación suave
        const scaleValue = 0.9 + (Math.sin(Date.now() * 0.005 + entity.id.charCodeAt(0)) * 0.03);
        groupRef.current.scale.setScalar(scaleValue);
    });

    return (
        <group ref={groupRef} position={[entity.position.x, entity.position.y, entity.position.z]}>
            <mesh ref={meshRef} position={[0, 0.5, 0]}>
                <boxGeometry args={[1.8, 1, 1.8]} />
                <meshStandardMaterial 
                    color={COLORS.BLOCK} 
                    emissive={COLORS.BLOCK}
                    emissiveIntensity={1.8}
                    transparent
                    opacity={0.95}
                />
            </mesh>
        </group>
    );
};
