import React, { useMemo, useRef, Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { COLORS } from '../../../constants/gameConstants';
import { Enemy } from '../../../types';
import { useGameStore } from '../../../store/useGameStore';
import virusModelUrl from '../../../../assets/3D Models/KiT_Virus.glb';

/**
 * Componente ShieldHalos
 * Responsabilidad única: Renderizar visualmente los anillos rotativos del escudo del Core boss.
 */
export const ShieldHalos: React.FC = () => {
    const groupRef = useRef<THREE.Group>(null);
    const rings = useMemo(() => [0, 1, 2, 3, 4], []);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        
        groupRef.current.children.forEach((child, i) => {
            const speed = 1.5;
            const offset = i * (Math.PI / 2.5);
            
            // Ciclo de animación vertical de los anillos del escudo
            const loopDuration = 2.0;
            const progress = ((t * speed + offset) % loopDuration) / loopDuration;
            
            const y = -0.6 + (progress * 1.3);
            const rBase = 0.6;
            const radius = Math.sqrt(Math.max(0, rBase * rBase - y * y));

            child.position.y = y;
            child.scale.set(radius, radius, 1);
            child.rotation.z = t * 2 + i;
            
            // Desvanecimiento suave en los extremos
            const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
            material.opacity = 1.0 - Math.pow(progress, 3);
        });
    });

    return (
        <group ref={groupRef} rotation={[Math.PI/2, 0, 0]}>
            {rings.map((i) => (
                <mesh key={i}>
                    <torusGeometry args={[1, 0.04, 8, 32]} />
                    <meshBasicMaterial 
                        color={COLORS.ENEMY_SHIELD} 
                        transparent 
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </group>
    );
};

/**
 * Componente EnemyMesh
 * Responsabilidad única: Actuar como un enrutador (Router de componentes) que selecciona
 * e instancia la malla específica de enemigo según su tipo ('CORE', 'TRIANGLE' o 'NORMAL').
 */
export const EnemyMesh: React.FC<{ entity: Enemy }> = ({ entity }) => {
    if (entity.type === 'CORE') {
        return <CoreEnemyMesh entity={entity} />;
    }
    if (entity.type === 'TRIANGLE') {
        return <TriangleEnemyMesh entity={entity} />;
    }
    return <NormalEnemyMesh entity={entity} />;
};

/**
 * Componente TriangleEnemyMesh (Enemigo en forma de triángulo / Prisma triangular)
 * Responsabilidad única: Renderizar visualmente el enemigo con forma de prisma triangular (3 lados)
 * con efectos de escudo esférico y animación de aparición/muerte. Representa la figura de
 * prisma triangular elevado del juego.
 */
const TriangleEnemyMesh: React.FC<{ entity: Enemy }> = ({ entity }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const shieldGroupRef = useRef<THREE.Group>(null);
    const shieldMeshRef = useRef<THREE.Mesh>(null);

    const wasShielded = useRef(entity.isShielded ?? true);
    const shieldBreakProgress = useRef(-1); // -1 = idle, >= 0 = break anim progress
    const pulseTimer = useRef(0);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        groupRef.current.visible = entity.active;
        if (!entity.active) return;
        
        groupRef.current.position.copy(entity.position);
        groupRef.current.rotation.y = entity.rotation || 0;

        // Detección de pérdida de escudo para disparar la animación de ruptura
        const currentShielded = !!entity.isShielded;
        if (wasShielded.current && !currentShielded) {
            shieldBreakProgress.current = 0;
            wasShielded.current = false;
            pulseTimer.current = 0.5; // Shockwave de pulso en el cuerpo del enemigo
        } else if (!wasShielded.current && currentShielded) {
            wasShielded.current = true;
            shieldBreakProgress.current = -1;
        }

        // Animación dinámica del escudo de fuerza mediante Refs directos en Three.js
        if (shieldGroupRef.current) {
            if (shieldBreakProgress.current >= 0) {
                // Animación de estallido / desvanecimiento del escudo al perderlo
                shieldGroupRef.current.visible = true;
                shieldBreakProgress.current += delta * 2.5; // Duración ~400ms
                const p = shieldBreakProgress.current;

                // El campo de fuerza se expande explosivamente de 1.1 a 2.6
                const s = 1.1 + p * 1.5;
                shieldGroupRef.current.scale.setScalar(s);

                if (shieldMeshRef.current) {
                    const mat = shieldMeshRef.current.material as THREE.MeshBasicMaterial;
                    mat.opacity = Math.max(0, 0.7 * (1.0 - p));
                }

                if (p >= 1.0) {
                    shieldBreakProgress.current = -1;
                    shieldGroupRef.current.visible = false;
                }
            } else if (currentShielded && !entity.dying) {
                shieldGroupRef.current.visible = true;
                const idleScale = 1.0 + Math.sin(state.clock.getElapsedTime() * 4) * 0.04;
                shieldGroupRef.current.scale.setScalar(idleScale);
                if (shieldMeshRef.current) {
                    const mat = shieldMeshRef.current.material as THREE.MeshBasicMaterial;
                    mat.opacity = 0.25;
                }
            } else {
                shieldGroupRef.current.visible = false;
            }
        }

        // Animación de muerte (achicarse y girar en glitch)
        if (entity.dying) {
            const currentScale = groupRef.current.scale.x;
            if (currentScale > 0.01) {
                const newScale = THREE.MathUtils.lerp(currentScale, 0, 0.05);
                groupRef.current.scale.setScalar(newScale);
            }
            if (meshRef.current) {
                meshRef.current.rotation.x = Math.random() * Math.PI;
                meshRef.current.rotation.z = Math.random() * Math.PI;
            }
        } 
        else {
            // Pulso físico en el cuerpo del jefe al romperse el escudo
            if (pulseTimer.current > 0) {
                pulseTimer.current -= delta;
                const pulseScale = 1.0 + Math.sin((0.5 - pulseTimer.current) * Math.PI * 4) * 0.25;
                groupRef.current.scale.setScalar(Math.max(1.0, pulseScale));
            } else if (entity.spawnTimer <= 0) {
                groupRef.current.scale.setScalar(1.0);
            }

            // Brillo oscilatorio neón cuando el escudo cae
            if (meshRef.current) {
                const mat = meshRef.current.material as THREE.MeshStandardMaterial;
                if (!currentShielded) {
                    // Si no tiene escudo, el cuerpo del triángulo brilla intensamente con bloom neon
                    const neonPulse = 3.5 + Math.sin(state.clock.getElapsedTime() * 6) * 0.8;
                    mat.emissiveIntensity = neonPulse; 
                } else {
                    // Con escudo, brilla suavemente
                    mat.emissiveIntensity = 1.0;
                }
                
                meshRef.current.rotation.x = 0;
                meshRef.current.rotation.z = 0;
            }

            // Animación de aparición (escalar de 0 a 1 de forma suave sin escalas negativas)
            if (entity.spawnTimer > 0) {
                const scale = Math.max(0.01, 1.0 - (entity.spawnTimer / 2.0));
                groupRef.current.scale.setScalar(scale);
            }
        }
    });

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef} position={[0, 0.45, 0]}>
                {/* Geometría de cono con 3 lados para crear una pirámide triangular */}
                <coneGeometry args={[0.8, 1.2, 3]} />
                <meshStandardMaterial 
                    color={COLORS.ENEMY_TRIANGLE} 
                    emissive={COLORS.ENEMY_TRIANGLE}
                    emissiveIntensity={0.8}
                    roughness={0.2}
                    metalness={0.8}
                    flatShading={true}
                />
            </mesh>
            
            {/* Esferas de los vértices de la base (en Y = 0.0) */}
            {[0, 1, 2].map(i => (
                <mesh key={i} position={[Math.sin(i * Math.PI * 2 / 3) * 0.8, 0.0, Math.cos(i * Math.PI * 2 / 3) * 0.8]}>
                    <sphereGeometry args={[0.15, 8, 8]} />
                    <meshBasicMaterial color={COLORS.ENEMY_TRIANGLE} />
                </mesh>
            ))}
            
            {/* Esfera del vértice superior (en Y = 1.05) */}
            <mesh position={[0, 1.05, 0]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshBasicMaterial color={COLORS.ENEMY_TRIANGLE} />
            </mesh>

            {/* Escudo de fuerza esférico translúcido animado */}
            <group ref={shieldGroupRef} position={[0, 0.45, 0]}>
                <mesh ref={shieldMeshRef}>
                    <sphereGeometry args={[1.1, 32, 32]} />
                    <meshBasicMaterial 
                        color={COLORS.ENEMY_SHIELD} 
                        transparent 
                        opacity={0.25} 
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </mesh>
            </group>
        </group>
    );
};

/**
 * Componente CoreEnemyMesh (Enemigo Círculo / Core / Esfera neón del Jefe)
 * Responsabilidad única: Renderizar visualmente al jefe de tipo Core, el cual tiene forma de círculo o esfera flotante neón,
 * con efectos de halos dinámicos orbitales y animación de spawn/glitch de muerte.
 */
const CoreEnemyMesh: React.FC<{ entity: Enemy }> = ({ entity }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const shieldGroupRef = useRef<THREE.Group>(null);
    const shieldMeshRef = useRef<THREE.Mesh>(null);

    const wasShielded = useRef(entity.isShielded ?? true);
    const shieldBreakProgress = useRef(-1); // -1 = idle, >= 0 = break anim progress
    const pulseTimer = useRef(0);

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        groupRef.current.visible = entity.active;
        if (!entity.active) return;

        groupRef.current.position.copy(entity.position);

        // Detección de pérdida de escudo para disparar la animación de ruptura
        const currentShielded = !!entity.isShielded;
        if (wasShielded.current && !currentShielded) {
            shieldBreakProgress.current = 0;
            wasShielded.current = false;
            pulseTimer.current = 0.5; // Shockwave de pulso en el núcleo
        } else if (!wasShielded.current && currentShielded) {
            wasShielded.current = true;
            shieldBreakProgress.current = -1;
        }

        // Animación dinámica del escudo de fuerza y halos mediante Refs directos en Three.js
        if (shieldGroupRef.current) {
            if (shieldBreakProgress.current >= 0) {
                // Animación de estallido / desvanecimiento del escudo al perderlo
                shieldGroupRef.current.visible = true;
                shieldBreakProgress.current += delta * 2.5; // Duración ~400ms
                const p = shieldBreakProgress.current;

                // El campo de fuerza se expande explosivamente de 1.0 a 2.6
                const s = 1.0 + p * 1.6;
                shieldGroupRef.current.scale.setScalar(s);

                if (shieldMeshRef.current) {
                    const mat = shieldMeshRef.current.material as THREE.MeshBasicMaterial;
                    mat.opacity = Math.max(0, 0.7 * (1.0 - p));
                }

                if (p >= 1.0) {
                    shieldBreakProgress.current = -1;
                    shieldGroupRef.current.visible = false;
                }
            } else if (currentShielded && !entity.dying) {
                shieldGroupRef.current.visible = true;
                shieldGroupRef.current.scale.setScalar(1.0);
                if (shieldMeshRef.current) {
                    const mat = shieldMeshRef.current.material as THREE.MeshBasicMaterial;
                    mat.opacity = 0.25;
                }
            } else {
                shieldGroupRef.current.visible = false;
            }
        }
        
        if (entity.dying) {
            const currentScale = groupRef.current.scale.x;
            if (currentScale > 0.01) {
                const newScale = THREE.MathUtils.lerp(currentScale, 0, 0.05);
                groupRef.current.scale.setScalar(newScale);
            }
            if (meshRef.current) {
                 meshRef.current.position.x = (Math.random() - 0.5) * 0.2;
                 meshRef.current.position.z = (Math.random() - 0.5) * 0.2;
            }
        }
        else {
            // Efecto de pulso en la escala y brillo de emisión bloom neón del núcleo
            if (meshRef.current) {
                let scale = 1.0 + (Math.sin(state.clock.getElapsedTime() * 5) * 0.03);
                if (pulseTimer.current > 0) {
                    pulseTimer.current -= delta;
                    scale += Math.sin((0.5 - pulseTimer.current) * Math.PI * 4) * 0.3;
                }
                meshRef.current.scale.setScalar(Math.max(0.5, scale));
                meshRef.current.position.x = 0;
                meshRef.current.position.z = 0;
                
                const mat = meshRef.current.material as THREE.MeshStandardMaterial;
                if (!currentShielded) {
                    // Sin escudo, brillo hiper-intenso del núcleo con oscilación neón
                    const neonPulse = 3.5 + Math.sin(state.clock.getElapsedTime() * 6) * 0.8;
                    mat.emissiveIntensity = neonPulse;
                } else {
                    // Con escudo, brillo base
                    mat.emissiveIntensity = 1.2;
                }
            }

            // Animación de aparición (escalar de 0 a 1 suavemente)
            if (entity.spawnTimer > 0) {
                const scale = Math.max(0.01, 1.0 - (entity.spawnTimer / 2.0));
                groupRef.current.scale.setScalar(scale);
            }
        }
    });

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef} position={[0, 0.45, 0]}>
                <sphereGeometry args={[0.8, 32, 32]} />
                <meshStandardMaterial 
                    color={COLORS.ENEMY_CORE} 
                    emissive={COLORS.ENEMY_CORE}
                    emissiveIntensity={0.5}
                    roughness={0.2}
                    metalness={0.8}
                    toneMapped={false} 
                />
            </mesh>
            
            {/* Anillos orbitales y escudo de fuerza del Core boss */}
            <group ref={shieldGroupRef} position={[0, 0.45, 0]}>
                <ShieldHalos />
                <mesh ref={shieldMeshRef}>
                    <sphereGeometry args={[1.0, 32, 32]} />
                    <meshBasicMaterial 
                        color={COLORS.ENEMY_SHIELD} 
                        transparent 
                        opacity={0.25} 
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        toneMapped={false} 
                    />
                </mesh>
            </group>
        </group>
    );
};

/**
 * Componente NormalEnemyMeshInner
 * Carga el modelo 3D GLTF del virus (KiT_Virus.glb), alinea su pivote en el suelo y
 * configura sus materiales para brillar con efectos de neón/bloom.
 */
const NormalEnemyMeshInner: React.FC<{ entity: Enemy }> = ({ entity }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Cargar el modelo del enemigo virus
  const gltf = useLoader(GLTFLoader, virusModelUrl);
  const modelScene = useMemo(() => gltf.scene.clone(), [gltf]);

  // Obtener limites geometricos
  const { centerOffset, minBoundsY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(modelScene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return {
      centerOffset: center,
      minBoundsY: box.min.y
    };
  }, [modelScene]);

  // Configurar materiales del modelo
  const materials = useMemo(() => {
    const mats: THREE.MeshStandardMaterial[] = [];
    modelScene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const setupMat = (mat: THREE.MeshStandardMaterial) => {
          const clonedMat = mat.clone(); // Clonar el material para evitar que compartan estado entre virus
          clonedMat.toneMapped = false; // Permitir que brille con bloom
          if (clonedMat.name !== 'Black') {
            clonedMat.emissive.copy(clonedMat.color);
            if (clonedMat.name.toLowerCase().includes('purple')) {
              clonedMat.emissiveIntensity = 9.6; // Reducido un 20% (de 12.0 a 9.6)
            } else {
              clonedMat.emissiveIntensity = 3.6;  // Reducido un 20% (de 4.5 a 3.6)
            }
          } else {
            clonedMat.roughness = 0.8;
            clonedMat.metalness = 0.2;
          }
          mats.push(clonedMat);
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

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    groupRef.current.visible = entity.active;
    if (!entity.active) return;
    
    groupRef.current.position.copy(entity.position);
    groupRef.current.rotation.y = entity.rotation || 0;

    // 1. Animación de muerte
    if (entity.dying) {
      const currentScale = groupRef.current.scale.x;
      if (currentScale > 0.01) {
        const newScale = THREE.MathUtils.lerp(currentScale, 0, 0.05);
        groupRef.current.scale.setScalar(newScale);
      }
    } 
    // 2. Animación de spawn (fade-in y escala sin valores negativos)
    else if (entity.spawnTimer > 0) {
      const progress = Math.max(0.01, 1.0 - (entity.spawnTimer / 2.0));
      groupRef.current.scale.setScalar(progress);
      
      materials.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = progress;
      });
    } 
    // 3. Estado normal activo
    else {
      groupRef.current.scale.setScalar(1.0);
      materials.forEach((mat) => {
        mat.transparent = false;
        mat.opacity = 1.0;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* 
        Rotación en Y de 90 grados (Math.PI / 2) para que la placa del virus mire de cara al jugador.
        Escalado a 0.22 para equiparar al tamaño estándar de enemigos en el mapa.
        Desfase en X/Z para centrar el pivote, y en Y para que repose exactamente sobre el suelo.
      */}
      <group rotation={[0, Math.PI / 2, 0]} scale={[0.22, 0.22, 0.22]}>
        <group position={[-centerOffset.x, -minBoundsY, -centerOffset.z]}>
          <primitive object={modelScene} />
        </group>
      </group>
    </group>
  );
};

/**
 * Componente NormalEnemyMesh (Enemigo KiT)
 * Carga de forma segura el modelo 3D y envuelve su ejecución con Suspense.
 */
const NormalEnemyMesh: React.FC<{ entity: Enemy }> = ({ entity }) => {
  return (
    <Suspense fallback={
      // Fallback simple mientras carga el modelo
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.5, 0.8, 0.1]} />
        <meshBasicMaterial color={COLORS.ENEMY_OUTLINE} wireframe />
      </mesh>
    }>
      <NormalEnemyMeshInner entity={entity} />
    </Suspense>
  );
};
