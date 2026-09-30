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

