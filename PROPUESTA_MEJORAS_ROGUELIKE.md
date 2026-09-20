# Propuesta Arquitectónica: Sistema de Mejoras y Ciber-Buffs (Roguelike)

**Proyecto:** Zero-Day Protocol  
**Módulo:** PRO402 - Taller de Testing y Calidad de Software  
**Fecha:** Septiembre 2026  
**Estado:** Documento de Diseño y Análisis (Pre-integración)

---

## 1. Resumen Ejecutivo
El presente documento formaliza la propuesta de diseño para integrar una mecánica de progresión tipo *roguelike* (inspirada en *Vampire Survivors*) a **Zero-Day Protocol**. 

Aunque la mecánica no se encuentra actualmente activa en el bucle principal de renderizado 3D para priorizar la estabilidad de la Evaluación Parcial 1 (EP1), este diseño establece la arquitectura matemática, las reglas de negocio de dominio y la estrategia de verificación en tres niveles para su posterior despliegue en la EP2 y Evaluación Final.

---

## 2. Concepto Lúdico: Los "Protocolos de Kernel"
Al superar una oleada de virus o completar exitosamente un minijuego de inyección de código (*Hacking Quiz*), el operador recibe una interrupción de sistema que le presenta una selección aleatoria de tres mejoras de software (*Ciber-Buffs*).

### Catálogo Inicial de Protocolos:
1. **Overclock de Hilos (`THREAD_OVERCLOCK`):** Aumenta la cadencia de fuego reduciendo el intervalo entre disparos en un 15% por nivel.
2. **Subnet Firewall (`SUBNET_FIREWALL`):** Incrementa la capacidad y regeneración de escudos de matriz (+1 stack por nivel, máx. 5).
3. **Buffer Penetration (`BUFFER_PENETRATION`):** Incrementa el daño base de los proyectiles contra las barreras de datos y núcleos enemigos.
4. **Algoritmo de Evasión (`EVASION_ROUTINE`):** Incrementa la velocidad de desplazamiento del cursor en un 10% por nivel.

---

## 3. Reglas de Negocio del Sistema de Buffs

### Regla 1: Selección y Disponibilidad de Opciones
* **Nivel Máximo (Cap):** Cada protocolo cuenta con un rango de niveles de `Tier 1` a `Tier 5`.
* **Exclusión de Saturación:** Todo protocolo que alcance el `Tier 5` queda automáticamente excluido del *pool* de selección en futuras oleadas.
* **Mecanismo de Reroll:** El operador dispone de una cantidad finita de reintentos de selección (*rerolls*). Cada uso decrementa el contador en 1. Si `rerolls == 0`, la petición de refresco es rechazada.
* **Pool Agotado:** Si todos los protocolos alcanzan el nivel máximo, el sistema entrega una recompensa alternativa por defecto (*Restauración de Integridad* o *Puntos Planos*) sin generar excepciones.

### Regla 2: Acumulación y Límites Físicos (Hard Caps)
* **Cadencia de Disparo Compuesta:**
  $$T_{\text{nuevo}} = T_{\text{base}} \times (0.85)^{\text{tier}}$$
* **Límite Duro (Hard Cap / BVA):** El intervalo de disparo **nunca puede ser inferior a 30 ms** (`max(30, T_nuevo)`), impidiendo desbordamientos de memoria o caídas drásticas de fotogramas por segundo.
* **Límite de Escudos:** Los stacks de absorción están acotados rígidamente en el intervalo $[0, 5]$.
* **Límite de Velocidad:** La velocidad máxima del cursor tiene un tope superior en $25.0\text{ u/s}$.

### Regla 3: Sinergias y Protocolos Maestros (Tablas de Decisión)
Se define la evolución de protocolos cuando se cumplen condiciones compuestas simultáneas:
* **Protocolo Maestro "Zero-Day Overdrive":**
  1. Condición 1: `THREAD_OVERCLOCK` en `Tier 5`.
  2. Condición 2: `SUBNET_FIREWALL` en `Tier 5`.
  3. Condición 3: Oleada actual $\ge 3$.
* Si las tres condiciones son verdaderas, el sistema desbloquea el protocolo maestro que otorga disparo dual con absorción automática. Si cualquiera es falsa, la evolución permanece bloqueada.

### Regla 4: Ponderación de Rareza por Desempeño
* Si el minijuego de inyección se resuelve en el **primer intento**, el sistema garantiza al menos una carta de rareza **Épica/Legendaria** en la siguiente selección.
* Si el operador comete errores o requiere asistencia de pistas, la selección se limita a rarezas **Común** y **Rara**.

---

## 4. Cobertura de Requisitos para las Evaluaciones de PRO402

### Para la Evaluación Parcial 1 (EP1): Línea Base
* **Lógica Pura:** El subsistema se implementa en Python en `backend/services/buff_system.py` con tipos estrictos, sin dependencias externas.
* **Sensibilidad a Mutantes:** Pruebas unitarias en `pytest` que verifican bordes estrictos (`tier == 5`, `cooldown >= 30`). Si un agente evaluador muta un `>=` por `>`, la prueba falla inmediatamente evidenciando cobertura real.

### Para la Evaluación Parcial 2 (EP2): Casos Diseñados y Suite en 3 Niveles
* **Técnicas Formales (`DISENO-DE-CASOS.md`):**
  * *Partición de Equivalencia:* Tiers no adquiridos (0), en progreso (1..4), maximizados (5), inválidos (>5).
  * *Análisis de Valores Límite:* Cooldowns en 29ms, 30ms, 31ms; escudos en 4, 5, 6; rerolls en 0 y 1.
  * *Tablas de Decisión:* Matriz de 8 combinaciones booleanas para la evolución "Zero-Day Overdrive".
* **Integración API (FastAPI):**
  * `POST /api/buffs/roll` (obtener 3 opciones basadas en estado del jugador).
  * `POST /api/buffs/select` (aplicar protocolo, validar elegibilidad y deducir rerolls).
* **Extremo a Extremo (Playwright):**
  * Simulación E2E de victoria de oleada 1, aparición de la ventana modal de selección de cartas, clic sobre una mejora y verificación de que el estado en la interfaz se actualiza correctamente.

### Para la Evaluación Final: Pipeline CI y Pruebas No Funcionales
* **Rendimiento:** Medición de latencia en la resolución de tiradas de buffs con umbral $< 15\text{ ms}$.
* **Seguridad:** Validación rigurosa en FastAPI y Pydantic para evitar inyecciones de identificadores de mejora no autorizados o fuera de catálogo.
* **CI/CD:** Pipeline automatizado en GitHub Actions ejecutando la suite completa ante cada *push*.

---

## 5. Plan de Integración Futura
1. **Fase 1 (Actual):** Consolidación de la línea base con las 4 reglas troncales del juego (Combate, Score, Hacking y Ranking) para aprobar EP1.
2. **Fase 2 (EP2):** Activación de los endpoints en FastAPI y conexión de la UI modal en React/Vite para pruebas de integración y Playwright.
3. **Fase 3 (Final):** Inclusión en el pipeline de GitHub Actions y auditoría de pruebas no funcionales.
