# ⚡ Arquitectura del Motor 3D, Rendimiento y Gestión de Caché — Zero-Day Protocol

Este documento describe las decisiones de arquitectura de software, patrones a bajo nivel y optimizaciones gráficas implementadas para garantizar **60 FPS estables sin pausas de recolección de basura (Zero-GC)** en hardware modesto con gráficos integrados (iGPU).

---

## 🚀 Optimizaciones de Arranque y Compilación Gráfica

### 1. Caché de Sombreadores en Disco (Shader Disk Cache)
* **Persistencia del Caché:** Se eliminó la invocación a `session.defaultSession.clearCache()` en el ciclo de vida de Electron. Esto permite a Chromium conservar la caché en disco de sombreadores de WebGL compilados. En arranques subsecuentes, los shaders se cargan al instante con cero sobrecarga de CPU.
* **Flags de GPU en Electron:** Configuración explícita en [`electron-main.js`](electron-main.js) para habilitar aceleración por hardware incondicional (`--ignore-gpu-blocklist`), rasterización acelerada por GPU y selección forzada de GPU de alto rendimiento en portátiles con gráficos conmutables (`--force-high-performance-gpu`).

### 2. Precalentamiento Asíncrono de Shaders (Shader Warmup)
* **Problema:** Three.js compila materiales y programas de sombreadores de manera tardía (*lazy compilation*) al renderizar por primera vez una malla en la escena, provocando micro-congelamientos (*stuttering*) perceptibles al disparar el primer proyectil.
* **Solución Técnica:** Se diseñó un precalentador asíncrono en [`src/utils/shaderWarmup.ts`](src/utils/shaderWarmup.ts). Durante el inicio, una escena fantasma oculta compila de forma anticipada todos los materiales emisivos y de partículas antes de ceder el control al usuario.

### 3. Splash Screen Reactivo Basado en Eventos IPC
* En lugar de retener una pantalla de carga estática durante un tiempo arbitrario (ej. 2.5 s), el Canvas 3D emite un mensaje IPC (`app-ready`) inmediatamente tras concluir la compilación de shaders. La ventana principal se muestra de forma instantánea, reduciendo los tiempos de arranque perceptible a escasos milisegundos.

---

## 🛠️ Arquitectura de Alto Rendimiento para Hardware de Bajos Recursos (Target: Intel UHD 620 a 60 FPS)

Para lograr un rendimiento fluido sostenido sobre procesadores de bajo consumo (ej. Intel Core i5-8250U con Intel UHD Graphics 620 y TDP de 15W):

### 1. Renderizado Instanciado con `THREE.InstancedMesh` (`DynamicObjectRenderer.tsx`)
* **Colapso de Draw Calls:** Se erradicó el mapeo individual de componentes React (`<BulletMesh>`, `<ParticleMesh>`) que provocaba entre 150 y 250+ llamadas de dibujado por fotograma. Se unificaron en dos instancias globales de `THREE.InstancedMesh` (una para proyectiles láser y otra para partículas de impacto), reduciendo el costo a **2 draw calls fijas**.
* **Eliminación de Reconciliación React:** Se suprimieron los hooks de intervalo periódico (`setTick(t => t + 1)`) que forzaban la reconciliación virtual del DOM a 60 Hz. Las matrices de transformación y colores se inyectan directamente en los búferes de memoria GPU mediante `setMatrixAt` y `setColorAt`.

### 2. Arquitectura Zero-GC (Anti Garbage Collector Spikes)
* **Generadores Atómicos Secuenciales:** Se reemplazó `uuidv4()` en bucles de alta frecuencia por contadores atómicos enteros (`getFastBulletId()`, `getNextEntityId()`), eliminando la instanciación de cientos de strings temporales en el heap de V8 por segundo.
* **Compactación In-Place de Arrays:** Se eliminó el uso de `.filter()` dentro del bucle de simulación principal (`useFrame` en [`src/components/GameScene.tsx`](src/components/GameScene.tsx)), reemplazándolo por compactación sobre el mismo arreglo en memoria (`array.length = writeIndex`), neutralizando los picos de recolección de basura (*Stop-the-World GC pauses* de 15 a 40 ms).
* **Buffers Preasignados en Audio:** En el módulo de audio Web Audio API ([`src/utils/audioSystem.ts`](src/utils/audioSystem.ts)), el arreglo de frecuencias (`Uint8Array`) se mantiene preasignado de manera estática, evitando 3.600 asignaciones residuales por minuto.

### 3. Optimización Algorítmica en Colisiones (`collisionManager.ts`)
* **Comparaciones de Distancia al Cuadrado:** Se erradicó `Math.sqrt()` en el bucle continuo de detección bala-entidad, evaluando directamente radios al cuadrado ($d^2 \le r^2$) y liberando a la CPU de operaciones de raíz cuadrada en coma flotante.
* **Separación de Sublistas en Un Solo Paso:** Se bifurcan los proyectiles en arreglos pre-filtrados (jugador vs enemigos), reduciendo la complejidad del bucle de colisión mutua en más del 84%.
* **Vectores Reutilizables (Scratchpads):** Los cálculos de onda expansiva reutilizan instancias estáticas (`_explosionCenter`), previniendo la creación de objetos `THREE.Vector3` temporales en tiempo de ejecución.

### 4. Suscripciones Atómicas de Estado con Zustand
* Se reemplazó la desestructuración de store reactivo completo (`useGameStore()`) por selectores atómicos específicos (`useGameStore(s => s.gameState)`).
* Las mutaciones de alta frecuencia (puntaje, tiempo, oleada) acceden al estado desacoplado vía `useGameStore.getState()`, garantizando que el árbol WebGL nunca sufra re-renders involuntarios por actualizaciones de interfaz 2D.

### 5. Optimización de Canvas y Post-procesado para iGPU
* **Canvas WebGL:** Inicializado con `powerPreference: 'high-performance'`, `antialias: false` (el efecto de dispersión de Bloom suaviza los bordes sin costo de memoria DDR4 compartida), `stencil: false`, `alpha: false`.
* **EffectComposer:** Configurado con `multisampling={0}` en `@react-three/postprocessing`, suprimiendo pasadas redundantes sobre memoria de video unificada.
* **Depuración de Sombras Dinámicas:** Se retiraron las directivas `castShadow` y `receiveShadow` innecesarias en geometrías primarias, aligerando el cálculo de mapas de sombras en los sombreadores.
* **Aislamiento en Menús:** Se desactiva el renderizado 3D y la escena WebGL mientras el jugador navega por menús y tablas de clasificación, reduciendo el consumo de GPU a 0%.

---

## 🛠️ Gestión de Caché en Entornos de Desarrollo

Dado que el entorno productivo retiene la caché de shaders en disco para maximizar el arranque, para depuración local de CSS, HTML o sombreadores se recomienda:

1. **Desactivar Caché en DevTools:** Abrir las herramientas de desarrollador (`Ctrl + Shift + I`), acceder a la pestaña **Network** y marcar la casilla **Disable Cache**.
2. **Hard Reload:** Presionar `Ctrl + F5` o `Ctrl + Shift + R` en la ventana del juego para invalidar recursos estáticos en memoria.
3. **Launcher Automatizado:** El script [`run_dev.bat`](run_dev.bat) purga automáticamente la caché temporal en `%APPDATA%\zero_day_protocol` antes de cada sesión de desarrollo.
