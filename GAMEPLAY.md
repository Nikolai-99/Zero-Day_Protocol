# 🕹️ Guía de Mecánicas, Modos de Juego y Controles — Zero-Day Protocol

Este documento reúne todas las especificaciones de jugabilidad, esquema de controles de combate FPS, balance de dificultades y el funcionamiento de la terminal de inyección (Hacking Quiz).

---

## 🎮 Controles de Combate FPS

El juego implementa una vista en primera persona integrada con el estándar **Pointer Lock API**:

| Tecla / Acción | Función | Descripción Técnica |
| :--- | :--- | :--- |
| **Click Izquierdo** | **Disparo / Captura de Cursor** | Captura el puntero del mouse mediante Pointer Lock para controlar la rotación horizontal de la nave e inicia ráfagas de proyectiles láser. |
| **WASD** | **Movimiento en la Arena** | Desplazamiento ágil sobre el plano XZ relativo a la arena para optimizar el esquive intuitivo de proyectiles. |
| **Shift + A / D** | **Giro de Barril (Barrel Roll)** | Maniobra de esquive evasivo de 500 ms. Desplaza físicamente al jugador 14.0 unidades hacia la dirección indicada (soporta diagonales como `W+A` o `S+D`). La nave describe un bucle circular ("O") de 360° con efecto visual de Bloom. Otorga **invulnerabilidad total** frente a proyectiles durante la maniobra (cooldown de 500 ms). |
| **Espacio** | **Disparo Láser Continuo** | Emite ráfagas de proyectiles de alta velocidad con colisión destructiva contra balas enemigas. |
| **Escape / Alt+Tab** | **Liberar Puntero del Mouse** | Libera el puntero del mouse del Pointer Lock para interactuar con las interfaces de usuario o pausar el control. Al morir o ganar, el puntero se libera automáticamente. |

---

## ⚔️ Modos de Juego y Balance de Dificultad

Zero-Day Protocol cuenta con tres modos de juego calibrados matemáticamente:

### 1. Normal Mode (Estándar)
* **Hitbox del Jugador:** Estrecha y precisa de **0.24 unidades**.
* **Sistema de Roce (Graze):** Activo. Rozar proyectiles a menos de 0.55 unidades otorga **+15 puntos** de bonificación sin infligir daño.
* **Resistencia Enemiga (KiT):** 4 impactos para ser neutralizados (4 HP).
* **Patrón de Disparo:** Fuego directo hacia la posición actual del jugador (sin predicción balística).
* **Cadencia:** 1200 ms entre ráfagas y velocidad de apuntado estándar.
* **Recursos:** Spawnea entre 1 y 3 cubos blancos de escudo por cada oleada.
* **Condición de Victoria:** Barra de salud de **100 HP**. Concluye victoriosamente al completar la **Oleada 5**.

### 2. Hacking Mode (1-Hit Survival)
* **Hitbox del Jugador:** 0.24 unidades con sistema de Graze activo (+15 pts).
* **Mecánica de Daño:** **Muerte a un solo golpe (0 HP)**. Cualquier impacto directo resulta letal a menos que se cuente con escudos activos.
* **Escudos Matrix:** Destruir cubos blancos otorga stacks de escudo (máximo 5). Cada escudo absorbe exactamente 1 impacto completo.
* **Recursos:** Spawnea de 1 a 3 bloques blancos de escudo por oleada.
* **Progresión:** Oleadas infinitas con incremento progresivo de velocidad de desplazamiento enemigo.

### 3. Impossible Mode (Hardcore)
* **Hitbox Castigadora:** Se amplía a **0.55 unidades** (todo roce cuenta como impacto directo; Graze desactivado).
* **Resistencia KiT:** 1 solo impacto para ser destruido (1 HP), compensando la extrema agresividad del entorno.
* **IA de Predicción Dinámica (Lead Aiming):** Los enemigos básicos calculan el vector de velocidad del jugador e interceptan su trayectoria futura, **únicamente cuando el jugador se desplaza a alta velocidad (> 5.0 u/s)**. Si el operador realiza movimientos lentos y metódicos, la IA regresa a disparo directo, permitiendo un margen táctico para esquivar proyectiles de forma controlada.
* **Fuego Abrasador:** Cadencia de fuego enemiga acelerada a **170 ms** con fijación de mira instantánea.
* **Escasez Crítica de Recursos:** Los cubos de escudo solo aparecen en la ronda 1 y en rondas múltiplos de 3 (3, 6, 9...), generando solo de 1 a 2 cubos.
* **Progresión:** Oleadas infinitas.

### Parámetros Globales de Combate
* **Fuerza de Spawn Inicial:** Fijada en **15 enemigos KiT** al inicio de la oleada 1 para una curva de aprendizaje progresiva.
* **Destrucción de Proyectiles:** Los disparos láser del jugador colisionan físicamente contra proyectiles enemigos, permitiendo abrir brechas seguras en el fuego cruzado.

---

## 💻 Terminal de Inyección y Hacking Quiz

El minijuego de inyección de código permite poner a prueba conocimientos de ciberseguridad y vulnerabilidades web (SQL Injection, XSS, autenticación, sanitización).

### Activación durante la Partida
Durante el combate activo, la terminal de hacking se activa bajo condiciones operativas específicas:
* **Aparición Natural:** Tras derrotar oleadas avanzadas o al enfrentar enemigos élite de tipo `CORE`.
* **Acceso Directo de Prueba (Menú Principal):** Para facilitar la validación funcional inmediata sin necesidad de completar 5 oleadas continuas, el botón *"Terminal de Inyección de Código"* del menú principal permite acceder directamente al pool interactivo de preguntas técnicas.

### Recompensas de Inyección Exitosa
Al resolver correctamente un desafío técnico en la terminal:
1. **Recuperación de Escudos:** Se otorgan stacks adicionales de escudo Matrix (hasta el límite de 5).
2. **Puntuación de Bonificación:** Bonificación escalar según el tiempo restante de resolución.
3. **Flujo Ininterrumpido:** La interfaz restaura inmediatamente el control del jugador y el Pointer Lock, reanudando la partida sin pausas artificiales.
