# Plan Maestro de Pruebas (ISO/IEC/IEEE 29119) — Zero-Day Protocol

> **Asignatura:** PRO402 - Taller de Testing y Calidad de Software  
> **Evaluación Parcial 2 (EP2):** Casos diseñados y suite automatizada en tres niveles  
> **Estándar:** ISO/IEC/IEEE 29119-3 (Estructura y Documentación de Pruebas de Software)

---

## 1. Alcance de las Pruebas (*Test Scope*)

### 1.1 Elementos Dentro del Alcance (*In Scope*)
* **Reglas de Negocio Troncales (Nivel 1):**
  * Mitigación de daño, cálculo de vida y fin de partida (`CombatRules`).
  * Progresión de oleadas, multiplicadores por modo y roce táctico (`ScoreRules`).
  * Clasificación militar y rangos de operadores (`RankingRules`).
  * Normalización y persistencia de identidad de operador (`UserIdentityRules`).
* **Interfaz Consumible API REST (Nivel 2):**
  * Contratos JSON de endpoints expuestos en FastAPI (`/api/rules/*`, `/api/users`, `/api/scores`, `/api/leaderboard`).
  * Códigos de respuesta HTTP ante entradas válidas (`200 OK`) e inválidas (`400 Bad Request`, `422 Unprocessable Entity`).
  * Persistencia e integridad referencial acumulativa en base de datos SQLite aislada en memoria.
* **Recorrido de Usuario y Flujo de Interfaz Web (Nivel 3):**
  * Carga y renderizado inicial del menú táctico en el servidor Vite (`http://127.0.0.1:3000`).
  * Interacción de usuario: renombrado de operador, selección de modos de dificultad e inicio de misión.
  * Montaje reactivo del HUD de estado de combate en el DOM con Playwright.

### 1.2 Elementos Fuera del Alcance (*Out of Scope*)
* Shaders WebGL de bajo nivel y renderizado visual de mallas 3D en el Canvas de Three.js (no deterministas en headless).
* Pruebas de carga masiva o concurrencia distribuida en SQLite (el juego es una aplicación monousuario de escritorio local).
* Minijuego interactivo de preguntas durante el bucle de oleadas (desacoplado de la UI principal en la build actual).
* Pruebas de penetración de red o seguridad perimetral de la API local loopback.

---

## 2. Riesgos del Producto y Prioridad (Conectados a ISO/IEC 25010)

Los riesgos de calidad identificados en la EP1 se priorizan y mitigan mediante la suite en tres niveles:

| ID Riesgo | Descripción del Riesgo de Producto | Característica ISO/IEC 25010 | Probabilidad | Impacto | Severidad | Mitigación Automatizada |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **RSK-01** | **Corrupción de Vida / Estado Negativo:** Un impacto severo reduce el HP por debajo de 0 sin terminar la partida. | **Adecuación Funcional** (Completitud) | Media | Crítico | **Alta** | Nivel 1: Pruebas unitarias de regresión (`test_negative_hp_defect_regression`). |
| **RSK-02** | **Rotura de Contrato API en Despliegue:** Renombrado inadvertido de campos JSON o cambios de tipos en el backend. | **Fiabilidad** (Tolerancia a fallos) | Alta | Alto | **Alta** | Nivel 2: Pruebas de integración de esquemas Pydantic y códigos 422 (`test_api_contracts.py`). |
| **RSK-03** | **Inconsistencia de Clasificación y Rangos:** Un operador con puntaje de élite recibe un rango erróneo o se duplica en el Leaderboard. | **Adecuación Funcional** (Exactitud) | Media | Alto | **Media** | Nivel 1 y 2: Pruebas BVA de fronteras de score y prueba de agregación única en Leaderboard. |
| **RSK-04** | **Bloqueo del Flujo de Interfaz (UI Freeze):** El botón de inicio de misión o input de Callsign no responde, impidiendo jugar. | **Usabilidad** (Operabilidad) | Baja | Crítico | **Alta** | Nivel 3: Pruebas E2E con Playwright validando clic, entrada de texto y montaje del HUD. |
| **RSK-05** | **Contaminación de Datos de Producción:** Ejecución de pruebas que ensucia el archivo físico `zero_day_protocol.db`. | **Seguridad** (Integridad de datos) | Alta | Medio | **Media** | Nivel 2: Inyección de base de datos volátil en memoria (`sqlite:///:memory:`) con StaticPool. |

---

## 3. Estrategia de Prueba por Niveles

La suite aplica el principio fundamental de que **cada nivel debe probar lo que los otros no pueden detectar**:

```text
+---------------------------------------------------------------------------------+
| NIVEL 3: EXTREMO A EXTREMO (Playwright)                                         |
| -> Valida: Recorrido completo del usuario, eventos DOM, visibilidad HUD.       |
| -> No valida: Fórmulas aritméticas complejas ni esquemas JSON internos.        |
+---------------------------------------------------------------------------------+
| NIVEL 2: INTEGRACIÓN (pytest + FastAPI TestClient + SQLite en memoria)          |
| -> Valida: Serialización Pydantic, códigos HTTP, transacciones relacionales.   |
| -> No valida: Renderizado visual en el navegador ni animaciones CSS.           |
+---------------------------------------------------------------------------------+
| NIVEL 1: UNITARIAS (pytest)                                                     |
| -> Valida: Algoritmos puros, valores límite (BVA), inmutabilidad de dataclass. |
| -> No valida: Peticiones HTTP ni interacciones del usuario en pantalla.         |
+---------------------------------------------------------------------------------+
```

---

## 4. Matriz de Trazabilidad Integral

$$\text{Riesgo de Calidad} \longrightarrow \text{Requisito de Negocio} \longrightarrow \text{Caso de Prueba} \longrightarrow \text{Prueba Automatizada}$$

| Riesgo | Requisito | Caso de Prueba | Nivel | Prueba Automatizada | Criterio de Éxito |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **RSK-01** | RN-01 (Combate) | TC-COMBAT-003 | Unitario | `test_negative_hp_defect_regression` | HP trunca estrictamente en 0. |
| **RSK-01** | RN-01 (Combate) | TC-COMBAT-004 | Unitario | `test_hacking_mode_absorbs_with_shield` | Absorbe 100% de daño consumiendo 1 escudo. |
| **RSK-02** | RN-01 (API) | TC-API-001 | Integración | `test_rules_damage_endpoint_contract` | Responde 200 OK con `new_hp` y `is_game_over`. |
| **RSK-02** | RN-05 (API) | TC-API-002 | Integración | `test_post_user_missing_required_fields_returns_422` | Responde 422 ante omisión de `username`. |
| **RSK-03** | RN-04 (Rangos) | TC-RANK-001 | Unitario | `test_rank_vulnerability_hunter_boundary` | 1499 pts $\to$ Rookie; 1500 pts $\to$ Hunter. |
| **RSK-03** | RN-04 (Rangos) | TC-RANK-004 | Unitario | `test_rank_elite_operator_impossible_shortcut` | Atajo Impossible activo con 5000 pts y Wave 3. |
| **RSK-03** | RN-02 / RN-04 | TC-API-003 | Integración | `test_full_user_score_lifecycle_and_rank_aggregation` | Persiste en DB, suma puntajes y calcula rango. |
| **RSK-04** | RN-05 (UI) | TC-E2E-001 | E2E | `test_e2e_main_menu_and_operator_renaming` | Input permite renombrar y actualiza texto en DOM. |
| **RSK-04** | RN-01 (UI) | TC-E2E-002 | E2E | `test_e2e_start_normal_mission_and_hud_display` | Clic en Normal Mode monta HUD con HP 100%. |
| **RSK-04** | RN-01 (UI) | TC-E2E-003 | E2E | `test_e2e_hacking_mode_hud_adaptation` | Clic en Hacking Mode monta HUD con Shield Matrix. |
| **RSK-05** | RN-02 / DB | TC-API-003 | Integración | `test_engine` con `sqlite:///:memory:` | Archivo físico `zero_day_protocol.db` inalterado. |

---

## 5. Criterios de Entrada y Salida (*Entry and Exit Criteria*)

### 5.1 Criterios de Entrada
1. Código fuente del proyecto con dependencias sincronizadas (`uv sync`).
2. Archivos estáticos de desarrollo compilados o disponibles (`dist/` y servidor Vite).
3. Intérprete de Python 3.12 fijado en `.python-version` y `uv.lock` bloqueado.
4. Navegador Chromium local accesible para el arnés de Playwright.

### 5.2 Criterios de Salida (Definición de Terminado / Confiabilidad)
1. **100% de Pruebas en Verde:** Ejecución exitosa de los 3 niveles (`86 unitarias + 22 integración + 5 E2E = 113 pruebas`) sin fallos ni omisiones.
2. **Cero Defectos Silenciados:** Linter `ruff` finaliza con 0 advertencias y 0 errores.
3. **Verificación Estática de Tipos:** `pyrefly check` finaliza con 0 errores de tipos en backend y suite de pruebas.
4. **Resistencia Comprobada a la Verificación en Vivo:** Cada nivel de prueba responde aisladamente ante el defecto que le corresponde.
5. **Cero Fugas de Datos:** Base de datos de producción limpia de registros de testing.
