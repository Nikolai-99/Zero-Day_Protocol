import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bullet, Particle } from '../../types';
import { COLORS } from '../../constants/gameConstants';

interface DynamicObjectRendererProps {
  bullets: React.MutableRefObject<Bullet[]>;
  particles: React.MutableRefObject<Particle[]>;
  cursorRef?: React.RefObject<THREE.Group>;
  cursorVelocityRef?: React.RefObject<THREE.Vector3>;
}

const MAX_BULLETS = 600;
const MAX_PARTICLES = 800;

// Geometrías y materiales compartidos estáticos (0 allocations por frame)
const bulletGeometry = new THREE.SphereGeometry(0.14, 8, 8);
const bulletMaterial = new THREE.MeshBasicMaterial({
  toneMapped: false,
  depthWrite: true,
  depthTest: true,
});

const particleGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const particleMaterial = new THREE.MeshBasicMaterial({
  toneMapped: false,
  depthWrite: true,
  depthTest: true,
});

// Scratchpads estáticos para cálculos de matrices sin generar basura (Zero GC)
const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _quatIdentity = new THREE.Quaternion();
const _color = new THREE.Color();
const _yAxis = new THREE.Vector3(0, 1, 0);

/**
 * Componente DynamicObjectRenderer
 * Responsabilidad única: Renderizar masivamente proyectiles y partículas mediante InstancedMesh,
 * reduciendo más de 150 draw calls a exactamente 2 draw calls y eliminando los re-renders de React.
 */
export const DynamicObjectRenderer: React.FC<DynamicObjectRendererProps> = ({ 
  bullets, 
  particles,
}) => {
  const bulletMeshRef = useRef<THREE.InstancedMesh>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh>(null);

  // Inicializar buffers de color instanciados para Three.js
  useEffect(() => {
    if (bulletMeshRef.current && !bulletMeshRef.current.instanceColor) {
      bulletMeshRef.current.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BULLETS * 3), 3);
    }
    if (particleMeshRef.current && !particleMeshRef.current.instanceColor) {
      particleMeshRef.current.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
    }
  }, []);

  // Actualización de transformaciones directamente en GPU sin reconciliación de React
  useFrame(() => {
    // 1. Proyectiles
    const bMesh = bulletMeshRef.current;
    if (bMesh) {
      const bList = bullets.current;
      let count = 0;
      for (let i = 0; i < bList.length; i++) {
        const b = bList[i];
        if (!b.active) continue;
        if (count >= MAX_BULLETS) break;

        const s = b.scale !== undefined ? b.scale : 1.0;
        _pos.copy(b.position);
        _scale.set(s, s, s);
        _matrix.compose(_pos, _quatIdentity, _scale);
        bMesh.setMatrixAt(count, _matrix);

        // Selección de color neón HDR para brillo óptimo en Bloom
        if (b.isPlayer) {
          _color.set(COLORS.PLAYER_BULLET).multiplyScalar(3.0);
        } else if (b.color === '#D000FF') {
          _color.set('#E258FF').multiplyScalar(3.0);
        } else if (b.color === '#00FFFF' || b.color === COLORS.ENEMY_TRIANGLE) {
          _color.set('#A6FFFF').multiplyScalar(3.0);
        } else if (b.bulletType === 'HEAL') {
          _color.set(COLORS.BULLET_HEAL).multiplyScalar(3.0);
        } else {
          _color.set(b.color || COLORS.ENEMY_BULLET).multiplyScalar(3.0);
        }
        bMesh.setColorAt(count, _color);
        count++;
      }
      bMesh.count = count;
      bMesh.instanceMatrix.needsUpdate = true;
      if (bMesh.instanceColor) bMesh.instanceColor.needsUpdate = true;
    }

    // 2. Partículas de impacto y explosiones
    const pMesh = particleMeshRef.current;
    if (pMesh) {
      const pList = particles.current;
      let count = 0;
      for (let i = 0; i < pList.length; i++) {
        const p = pList[i];
        if (!p.active) continue;
        if (count >= MAX_PARTICLES) break;

        const s = p.scale !== undefined ? p.scale : 1.0;
        _pos.copy(p.position);
        _scale.set(s, s, s);
        if (p.rotation !== undefined) {
          _quat.setFromAxisAngle(_yAxis, p.rotation);
        } else {
          _quat.copy(_quatIdentity);
        }
        _matrix.compose(_pos, _quat, _scale);
        pMesh.setMatrixAt(count, _matrix);

        _color.set(p.color).multiplyScalar(3.0);
        pMesh.setColorAt(count, _color);
        count++;
      }
      pMesh.count = count;
      pMesh.instanceMatrix.needsUpdate = true;
      if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh
        ref={bulletMeshRef}
        args={[bulletGeometry, bulletMaterial, MAX_BULLETS]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={particleMeshRef}
        args={[particleGeometry, particleMaterial, MAX_PARTICLES]}
        frustumCulled={false}
      />
    </>
  );
};

export default DynamicObjectRenderer;

