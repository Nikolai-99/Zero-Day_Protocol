# Defensa del Desarrollador — Zero-Day Protocol

> **Asignatura:** PRO402 - Taller de Testing y Calidad de Software  
> **Evaluación Final:** Feedback de defensa Individual en Vivo ante el Docente con Pipeline de CI Activo  

---

## 🎯 Protocolo General de la Defensa Presencial

La evaluación se realiza de forma individual con el repositorio en pantalla y la pestaña **Actions** de GitHub abierta. No se evalúan definiciones teóricas de memoria, sino la **capacidad técnica de defender cada decisión, prueba y límite del proyecto**.

---

## ❓ Banco de Preguntas Típicas del Evaluador y Respuestas Maestras

### 1. ¿Qué prueba de esta suite es la que más costó definir y por qué?

* **Respuesta del Desarrollador:**
  > *"La prueba que más costó definir fue [`test_e2e_hacking_quiz_modal_interaction_and_rewards`](tests/e2e/test_ui_journey.py#L95) en el Nivel 3 (Playwright), junto con [`test_impossible_mode_elite_operator_qualification`](tests/unit/test_ranking_rules.py#L135) en Nivel 1.*
  > 
  > *En el caso de Playwright, el minijuego de inyección de código depende de una simulación gráfica WebGL 3D a 60 FPS con Pointer Lock. El desafío consistió en probar la interacción del usuario sin depender de la posición física de las mallas 3D en el Canvas (lo cual causaba pruebas intermitentes o flaky tests en entornos sin aceleración por hardware), aislando el evento al DOM del modal reactivo, sincronizando la respuesta asíncrona de `/api/rules/quiz` y asegurando que tras cerrar la terminal la nave no quedara congelada en pausa oculta.*
  > 
  > *En el caso de rangos, requirió modelar una regla combinatoria en la tabla de decisión de RN-04 donde coexisten dos caminos de promoción: la vía nominal (10,000 pts y Oleada 5) y el atajo acelerado por riesgo en IMPOSSIBLE (5,000 pts y Oleada 3), cuidando que en los límites frontera exactos (4,999 vs 5,000 pts) el sistema no promoviera indebidamente al operador."*

---

### 2. ¿Qué parte del sistema sigue sin estar cubierta y qué riesgo aceptaste al dejarlo así?

* **Respuesta del Desarrollador:**
  > *"Quedaron formalmente fuera del alcance dos áreas, ambas documentadas en [`PLAN-DE-PRUEBAS.md`](PLAN-DE-PRUEBAS.md#L28):*
  > 1. * **Los Shaders GLSL de Postprocesado (Bloom y Vignette) en WebGL:** No tienen aserción directa de renderizado de píxeles. Acepté este riesgo porque el motor gráfico Three.js es una librería de terceros madura y probar colores de píxeles en navegadores headless genera falsos positivos por diferencias de renderizado de software. El riesgo residual se mitiga con la prueba de precarga [`shaderWarmup.ts`](src/components/gameplay/shaderWarmup.ts) durante el splash.
  > 2. * **Concurrencia Masiva de Escrituras en SQLite:** No implementé pruebas de estrés de 1,000 transacciones simultáneas por segundo. Acepté este riesgo porque Zero-Day Protocol es una aplicación monousuario de escritorio local (Electron) que se conecta a un backend en loopback (`127.0.0.1:8000`). No existe concurrencia multi-inquilino en producción."*

---

### 3. Este umbral de rendimiento, ¿de dónde salió y por qué ese número?

* **Respuesta del Desarrollador:**
  > *"Los umbrales se fijaron a priori en [`NO-FUNCIONALES.md`](NO-FUNCIONALES.md) a partir del presupuesto de fotogramas de la simulación gráfica a 60 FPS (Frame Budget):*
  > - **Umbral de Combate ($\le 0.5$ ms):** A 60 FPS, cada fotograma dura 16.6 ms. Si en una oleada intensa colisionan 5 a 10 proyectiles en el mismo fotograma, la resolución matemática no puede consumir más del 5% del presupuesto total de CPU (menos de 0.8 ms). Fijé 0.5 ms como margen conservador. En la medición real obtuvimos **0.0032 ms**, lo que permite resolver más de 300 colisiones simultáneas sin provocar caídas de FPS.
  > - **Umbral del Endpoint API REST ($\le 50$ ms):** Para llamadas HTTP locales en loopback, 50 ms es el límite en que la percepción humana nota un lag o retardo en el feedback táctico. La medición real arrojó **2.45 ms**."*

---

### 4. Si mañana alguien cambia esta función, ¿qué se pone rojo en el pipeline?

* **Respuesta del Desarrollador:**
  > *"Depende del nivel donde se introduzca el cambio, ya que la pirámide fue diseñada para que cada nivel capture un defecto exclusivo:*
  > 1. * **Si cambian una fórmula matemática (ej. quitan el piso `max(0, ...)` en [`CombatRules`](backend/services/game_rules.py#L35)):** El pipeline fallará inmediatamente en el **Paso 10 (Nivel 1 Unitario)** en `test_defect_regression_hp_never_drops_negative`, antes de levantar la API o el navegador.
  > 2. * **Si un desarrollador renombra un campo JSON en la API (ej. cambia `new_hp` por `remaining_hp` o `username` por `callsign`):** Las pruebas unitarias pasarán en verde porque no tocan FastAPI, pero el pipeline fallará en el **Paso 11 (Nivel 2 Integración)** en `test_rules_damage_endpoint_contract` o `test_post_user_missing_required_fields_returns_422`.
  > 3. * **Si en el frontend se rompe la reactividad del HUD o el botón de inicio deja de responder:** Los tests unitarios y de API estarán en verde, pero el pipeline fallará en el **Paso 12 (Nivel 3 Playwright E2E)** en `test_e2e_start_normal_mission_and_hud_display` al no encontrar el selector `#hud-hp` en el DOM."*

---

### 5. ¿Qué dijo un agente de IA durante el módulo que resultó estar equivocado y cómo te diste cuenta?

* **Respuesta del Desarrollador:**
  > *"El agente propuso tres errores técnicos graves que rechacé formalmente (documentados en la Sección 🤖 Uso de IA del [`README.md`](README.md#5-balance-del-módulo-y-criterio-técnico-del-desarrollador-evaluación-final---requisito-e)):*
  > 
  > 1. **Propuesta Errónea de Testing (Playwright):** El agente sugirió capturar las coordenadas espaciales X, Y, Z de las partículas de los virus en el Canvas de WebGL mediante capturas periódicas en Playwright. Me di cuenta del error al analizar que en GitHub Actions (Ubuntu sin tarjeta gráfica física) SwiftShader corre por software y tiene variaciones temporales, lo que habría introducido pruebas intermitentes (*flaky tests*) que romperían el pipeline sin que existiera un bug real. Rechacé la propuesta y ordené probar los elementos reactivos del DOM.
  > 
  > 2. **Propuesta Errónea de Dominio (Colisión de Identidad):** El agente propuso reutilizar el `candidate_id` sin validar si ya existía en la base de datos, mutando el nombre de un usuario anterior si alguien ingresaba con su mismo ID provisional. Me percaté al auditar el flujo de persistencia: un usuario podía sobreescribir el historial de otro. Corregí la lógica para generar un UUID nuevo si el nombre no coincide exactamente.
  > 
  > 3. **Propuesta Errónea de Gameplay (Auto-Pausa Silenciosa):** Al implementar el cierre del modal del Hacking Quiz, el agente dejó enlazada la variable `isPaused`. Me di cuenta jugando la build: al pasar el quiz en la oleada 5, la nave no respondía al teclado hasta tocar Escape. Desacoplé ambos estados en `GameScene.tsx`."*

### 6. ¿Cómo funciona el flujo del Pipeline?

* **Respuesta del Desarrollador:**
  > *"El pipeline de Integración Continua ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) está diseñado bajo el principio de **Fail-Fast (Fallo Temprano)** y la **Pirámide de Pruebas de Mike Cohn**. Su propósito es actuar como una aduana de calidad estricta y determinista: ningún cambio puede integrarse a la rama `main` si presenta inconsistencias de tipado, estilo, regresiones funcionales o degradación del rendimiento.*
  >
  > *El flujo se estructura conceptualmente en 4 fases secuenciales:*
  > 1. * **Aprovisionamiento y Entorno Hermético:** Descarga el código y prepara los runtimes de Python 3.12 y Node.js v20, instalando dependencias deterministas mediante lockfiles (`uv.lock` y `package-lock.json`) y el navegador Chromium para pruebas de interfaz.*
  > 2. * **Puertas de Análisis Estático (Quality Gates):** Valida tipos con Pyrefly y estilo/calidad con Ruff en segundos, abortando el pipeline antes de gastar recursos si hay errores de sintaxis o tipado.*
  > 3. * **Ejecución de la Pirámide de Pruebas:** Ejecuta de abajo hacia arriba la suite de pruebas: primero pruebas unitarias aisladas (`tests/unit`), luego pruebas de integración con base de datos en memoria y contratos API (`tests/integration`), y finalmente pruebas End-to-End con Playwright (`tests/e2e`).*
  > 4. * **Validación No Funcional y Regresión:** Asegura que los umbrales de latencia, seguridad y privacidad no hayan sufrido regresión.*
  >
  > *A continuación, defiendo y explico cada línea del archivo de configuración:*
  >
  > | Líneas | Código en `ci.yml` | Explicación Técnica y Justificación de Diseño |
  > | :--- | :--- | :--- |
  > | `L1` | `name: Zero-Day Protocol CI Pipeline` | Nombre identificador legible del flujo de trabajo desplegado en la interfaz de GitHub Actions. |
  > | `L3-L5` | `on:`<br>`  push:`<br>`    branches: [ main ]` | **Disparador 1:** Gatilla automáticamente la ejecución del pipeline ante cualquier commit directo o merge completado en la rama productiva `main`. |
  > | `L6-L7` | `  pull_request:`<br>`    branches: [ main ]` | **Disparador 2:** Evalúa automáticamente cualquier Pull Request propuesta cuyo destino sea `main`, impidiendo el merge si alguna etapa falla. |
  > | `L9-L10`| `concurrency:`<br>`  group: ${{ github.workflow }}-${{ github.ref }}` | Agrupa las corridas activas utilizando el nombre del pipeline y la referencia Git (rama o PR) como clave única. |
  > | `L11` | `  cancel-in-progress: true` | **Optimización de Recursos:** Si un desarrollador envía un nuevo commit mientras una ejecución anterior aún está corriendo, cancela inmediatamente la anterior para no desperdiciar minutos de máquina ni analizar código obsoleto. |
  > | `L13-L15`| `jobs:`<br>`  static-checks-and-test-pyramid:`<br>`    name: Controles Estáticos y Pirámide de Pruebas` | Declara el trabajo principal y su identificador descriptivo en el panel de ejecución. |
  > | `L16` | `    runs-on: ubuntu-latest` | Especifica el entorno de ejecución: una máquina virtual Ubuntu Linux limpia, actualizada y provista por GitHub. |
  > | `L18-L20`| `    steps:`<br>`      - name: 1. Checkout del Repositorio`<br>`        uses: actions/checkout@v4` | Clona el repositorio Git dentro del runner virtual en el directorio de trabajo actual. |
  > | `L22-L25`| `      - name: 2. Configurar Entorno Python (3.12)`<br>`        uses: actions/setup-python@v5`<br>`        with:`<br>`          python-version: "3.12"` | Provee e inicializa el runtime oficial de Python versión 3.12 requerido para el backend y las herramientas de análisis. |
  > | `L27-L31`| `      - name: 3. Instalar Gestor Astral uv`<br>`        uses: astral-sh/setup-uv@v5`<br>`        with:`<br>`          version: "latest"`<br>`          enable-cache: false` | Instala `uv`, el gestor de paquetes ultrarrápido en Rust. Se fija `enable-cache: false` para forzar una sincronización limpia, sin sesgos por caché residual del runner. |
  > | `L33-L37`| `      - name: 4. Configurar Entorno Node.js (v20)`<br>`        uses: actions/setup-node@v4`<br>`        with:`<br>`          node-version: "20"`<br>`          cache: "npm"` | Instala Node.js v20 (LTS) necesario para el frontend React/Vite/Electron, activando la caché global de npm para acelerar descargas. |
  > | `L39-L40`| `      - name: 5. Sincronizar Dependencias de Python (uv sync)`<br>`        run: uv sync` | Crea el entorno virtual `.venv` e instala exactamente las dependencias bloqueadas en [`uv.lock`](uv.lock), garantizando determinismo absoluto. |
  > | `L42-L43`| `      - name: 6. Instalar Dependencias de Node (npm ci determinista)`<br>`        run: npm ci` | Ejecuta una instalación limpia (`clean install`) del frontend a partir de [`package-lock.json`](package-lock.json), evitando mutaciones en el árbol de dependencias que `npm install` podría provocar. |
  > | `L45-L46`| `      - name: 7. Instalar Navegador Chromium para Playwright`<br>`        run: uv run playwright install --with-deps chromium` | Descarga el binario del navegador Chromium y las librerías de sistema operativo requeridas para levantar pruebas de interfaz gráfica en entornos headless (sin display físico). |
  > | `L48-L49`| `      - name: 8. Control Estático 1 - Tipado Estricto (Pyrefly)`<br>`        run: uv run pyrefly check` | **Quality Gate Estático 1:** Verifica estáticamente la consistencia de tipos en Python para prevenir errores de tipo en tiempo de ejecución. |
  > | `L51-L52`| `      - name: 9. Control Estático 2 - Linter y Calidad de Código (Ruff)`<br>`        run: uv run ruff check .` | **Quality Gate Estático 2:** Analiza el código con Ruff a máxima velocidad, verificando normas PEP 8, importaciones no utilizadas y potenciales bugs sintácticos. |
  > | `L54-L55`| `      - name: 10. Nivel 1 - Pruebas Unitarias de Dominio (Combat, Score, Hacking, Ranking, Identity)`<br>`        run: uv run pytest tests/unit` | **Base de la Pirámide:** Ejecuta las pruebas unitarias de lógica pura de negocio en milisegundos sin I/O, garantizando que las reglas de combate y puntuación no tengan defectos. |
  > | `L57-L58`| `      - name: 11. Nivel 2 - Pruebas de Integración (API Contracts & SQLite en Memoria)`<br>`        run: uv run pytest tests/integration` | **Cuerpo de la Pirámide:** Valida los contratos JSON de la API REST y la persistencia relacional SQLite en memoria sin tocar el disco productivo. |
  > | `L60-L61`| `      - name: 12. Nivel 3 - Pruebas Extremo a Extremo con Playwright (User Journey)`<br>`        run: uv run pytest tests/e2e` | **Cúspide de la Pirámide:** Lanza la aplicación y automatiza la interacción del usuario en Chromium headless, validando el ciclo de vida completo en pantalla. |
  > | `L63-L64`| `      - name: 13. Pruebas No Funcionales y Regresión (Rendimiento, Seguridad, Privacidad)`<br>`        run: uv run pytest tests/non_functional` | **Certificación de Requisitos No Funcionales:** Evalúa los benchmarks de microsegundos ($\le 0.5$ ms en combate, $\le 50$ ms en API) y controles de seguridad/privacidad para blindar el sistema contra regresiones."*
