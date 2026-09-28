# Plan Maestro de Pruebas Cerrado (ISO/IEC/IEEE 29119) — Zero-Day Protocol

> **Asignatura:** PRO402 - Taller de Testing y Calidad de Software  
> **Evaluación Final:** Pipeline Funcional, Pruebas No Funcionales y Cierre de Suite  
> **Estándar:** ISO/IEC/IEEE 29119-3 (Estructura y Documentación de Pruebas de Software)  
> **Estado del Documento:** **CERRADO Y AUDITADO (Entrega Final)**

---

## 1. Alcance de las Pruebas (*Test Scope*)

### 1.1 Elementos Dentro del Alcance (*In Scope*)
* **Reglas de Negocio Troncales (Nivel 1 — 88 Pruebas):**
  * Mitigación de daño, cálculo de vida y fin de partida (`CombatRules`).
  * Progresión de oleadas, multiplicadores por modo y roce táctico (`ScoreRules`).
  * Inyección de código, evaluación de intentos y límite de escudos (`HackingRules`).
  * Clasificación militar y rangos de operadores (`RankingRules`).
  * Normalización y persistencia de identidad de operador (`UserIdentityRules`).
* **Interfaz Consumible API REST (Nivel 2 — 22 Pruebas):**
  * Contratos JSON de endpoints expuestos en FastAPI (`/api/rules/*`, `/api/users`, `/api/scores`, `/api/leaderboard`, `/api/questions`).
  * Códigos de respuesta HTTP ante entradas válidas (`200 OK`) e inválidas (`400 Bad Request`, `422 Unprocessable Entity`).
  * Persistencia e integridad referencial acumulativa en base de datos SQLite aislada en memoria.
* **Recorrido de Usuario y Flujo de Interfaz Web (Nivel 3 — 6 Pruebas):**
  * Carga y renderizado inicial del menú táctico en el servidor Vite (`http://127.0.0.1:3000`).
  * Interacción de usuario: renombrado de operador, selección de modos de dificultad e inicio de misión.
  * Montaje reactivo del HUD de estado de combate en el DOM con Playwright Chromium.
  * Interacción completa con la Terminal de Hackeo / Quiz en la interfaz web.
* **Pruebas No Funcionales y Regresión (Nivel Especializado — 8 Pruebas):**
  * Eficiencia de desempeño: latencia matemática de combate ($\le 0.5$ ms) y respuesta HTTP ($\le 50$ ms).
  * Seguridad: neutralización de SQL Injection, contención XSS y prevención de manipulación de estado.
  * Privacidad y Minimización: conformidad con la **Ley Nº 21.719** de Chile y datos 100% sintéticos.
* **Pipeline de Integración Continua (GitHub Actions):**
  * Ejecución automatizada ante cada `push` y `pull_request` a la rama `main` en runner `ubuntu-latest`.

### 1.2 Elementos Fuera del Alcance (*Out of Scope - Declaración Explícita*)
1. **Renderizado de Píxeles en Canvas WebGL 3D:** Descartado para Playwright por causar *flaky tests* dependientes de drivers gráficos del sistema operativo. La verificación se realiza sobre los componentes reactivos del DOM del HUD.
2. **Concurrencia Masiva o Bloqueo Distribuido en SQLite:** Descartado por no aplicar a la arquitectura de una aplicación de escritorio local monousuario.
3. **Plataformas Móviles (iOS/Android):** El producto está diseñado exclusivamente para PC (Windows / Web Desktop).

---

## 2. Riesgos del Producto y Prioridad (ISO/IEC 25010)

| ID Riesgo | Descripción del Riesgo de Producto | Característica ISO/IEC 25010 | Prob. | Impacto | Severidad | Mitigación Automatizada |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **RSK-01** | **Corrupción de Vida / Estado Negativo:** Daño severo deja vida negativa sin Game Over. | **Adecuación Funcional** | Media | Crítico | **Alta** | Nivel 1: `test_defect_regression_hp_never_drops_negative`. |
| **RSK-02** | **Rotura de Contrato API en Despliegue:** Renombrado inadvertido de campos o tipos JSON. | **Fiabilidad** | Alta | Alto | **Alta** | Nivel 2: `test_api_contracts.py` y validación Pydantic 422. |
| **RSK-03** | **Inconsistencia de Clasificación y Rangos:** Asignación errónea de rango militar. | **Adecuación Funcional** | Media | Alto | **Media** | Nivel 1 y 2: BVA de umbrales y agregación histórica en DB. |
| **RSK-04** | **Bloqueo del Flujo de Interfaz (UI Freeze):** Botón o modal no interactivo. | **Usabilidad** | Baja | Crítico | **Alta** | Nivel 3: Pruebas E2E de clic, inputs y montaje con Playwright. |
| **RSK-05** | **Contaminación de Datos de Producción:** Ejecución de tests ensucia `zero_day_protocol.db`. | **Seguridad** | Alta | Medio | **Media** | Nivel 2 y 3: Base en memoria (`sqlite:///:memory:`) y base temporal efímera en E2E. |
| **RSK-06** | **Degradación de Latencia de Combate:** Retardo en cálculo que baja FPS de 60. | **Eficiencia Desempeño** | Media | Medio | **Media** | No Funcional: `test_combat_resolution_latency_below_threshold`. |
| **RSK-07** | **Inyección Maliciosa y Fuga de Privacidad:** Ataques SQLi o exposición de PII. | **Seguridad y Privacidad** | Alta | Crítico | **Alta** | No Funcional: Pruebas de SQLi y minimización Ley 21.719. |

---

## 3. Estrategia de Prueba por Niveles y Pipeline

```text
+-----------------------------------------------------------------------------------------+
| PIPELINE DE INTEGRACIÓN CONTINUA (GitHub Actions CI - Ubuntu Latest)                    |
| -> Disparadores: Push a main / Pull Request a main                                      |
| -> Controles Estáticos: Pyrefly (0 errores) | Ruff (0 diagnósticos)                    |
+-----------------------------------------------------------------------------------------+
       |
       +---> NIVEL 1: UNITARIAS (pytest tests/unit) -> 88 pruebas (0.17s)
       |     Valida: Fórmulas aritméticas puras, valores límite (BVA), tablas de decisión.
       |
       +---> NIVEL 2: INTEGRACIÓN (pytest tests/integration) -> 22 pruebas (0.35s)
       |     Valida: Esquemas Pydantic, respuestas HTTP 200/400/422, SQLite en memoria.
       |
       +---> NIVEL 3: EXTREMO A EXTREMO (pytest tests/e2e) -> 6 pruebas (14s)
       |     Valida: Navegador Chromium real, interacciones DOM, HUD reactivo y Quiz.
       |
       +---> NO FUNCIONALES Y REGRESIÓN (pytest tests/non_functional) -> 8 pruebas (0.15s)
             Valida: Umbrales de latencia (<0.5ms), seguridad SQLi/XSS, privacidad Ley 21.719.
```

---

## 4. Matriz de Trazabilidad Cerrada (Riesgo $\rightarrow$ Requisito $\rightarrow$ Caso $\rightarrow$ Prueba $\rightarrow$ Pipeline)

| Riesgo | Requisito | Caso de Prueba | Nivel | Prueba Automatizada | Resultado en el Pipeline CI |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **RSK-01** | RN-01 (Combate) | TC-COMBAT-003 | Unitario | `test_defect_regression_hp_never_drops_negative` | ✅ **EXITOSO (PASA)** |
| **RSK-01** | RN-01 (Combate) | TC-COMBAT-004 | Unitario | `test_shield_absorbs_damage_completely` | ✅ **EXITOSO (PASA)** |
| **RSK-02** | RN-01 (API) | TC-API-001 | Integración | `test_rules_damage_endpoint_contract` | ✅ **EXITOSO (PASA)** |
| **RSK-02** | RN-05 (API) | TC-API-002 | Integración | `test_post_user_missing_required_fields_returns_422` | ✅ **EXITOSO (PASA)** |
| **RSK-02** | RN-03 (API) | TC-API-004 | Integración | `test_api_quiz_endpoint` | ✅ **EXITOSO (PASA)** |
| **RSK-03** | RN-04 (Rangos) | TC-RANK-001 | Unitario | `test_boundary_thresholds` | ✅ **EXITOSO (PASA)** |
| **RSK-03** | RN-04 (Rangos) | TC-RANK-004 | Unitario | `test_impossible_mode_elite_operator_qualification` | ✅ **EXITOSO (PASA)** |
| **RSK-03** | RN-02 / RN-04 | TC-API-003 | Integración | `test_full_user_score_lifecycle_and_rank_aggregation` | ✅ **EXITOSO (PASA)** |
| **RSK-04** | RN-05 (UI) | TC-E2E-001 | E2E | `test_e2e_main_menu_and_operator_renaming` | ✅ **EXITOSO (PASA)** |
| **RSK-04** | RN-01 (UI) | TC-E2E-002 | E2E | `test_e2e_start_normal_mission_and_hud_display` | ✅ **EXITOSO (PASA)** |
| **RSK-04** | RN-01 (UI) | TC-E2E-003 | E2E | `test_e2e_hacking_mode_hud_adaptation` | ✅ **EXITOSO (PASA)** |
| **RSK-04** | RN-03 (UI) | TC-E2E-006 | E2E | `test_e2e_hacking_quiz_modal_interaction_and_rewards` | ✅ **EXITOSO (PASA)** |
| **RSK-05** | RN-02 / DB | TC-API-003 | Integración | `test_engine` con `sqlite:///:memory:` (Aislamiento) | ✅ **EXITOSO (PASA)** |
| **RSK-06** | No Funcional | TC-PERF-001 | No Funcional | `test_combat_resolution_latency_below_threshold` | ✅ **EXITOSO (PASA)** |
| **RSK-07** | No Funcional | TC-SEC-001 | No Funcional | `test_sql_injection_attempt_in_callsign_is_treated_as_literal` | ✅ **EXITOSO (PASA)** |
| **RSK-07** | No Funcional | TC-PRIV-001 | No Funcional | `test_operator_model_does_not_collect_personally_identifiable_information` | ✅ **EXITOSO (PASA)** |

---

## 5. Cierre Formal de Objetivos y Criterios de Salida

Se contrastan los criterios de salida declarados en la EP2 frente a los logros reales verificados en la Evaluación Final:

| Criterio de Salida Declarado | Meta Exigida | Logro Real en la Evaluación Final | Estado de Cumplimiento |
| :--- | :--- | :--- | :---: |
| **1. 100% de Pruebas en Verde** | Suite completa sin fallos | **124 pruebas automatizadas aprobadas** (88 unitarias, 22 integración, 6 E2E, 8 no funcionales) en ~25s. | ✅ **SUPERADO** |
| **2. Cero Defectos Silenciados** | 0 `# noqa`, 0 advertencias | `ruff check .` finaliza con 0 advertencias y 0 diagnósticos silenciados. | ✅ **CUMPLIDO** |
| **3. Tipado Estático Estricto** | 0 errores en Pyrefly | `pyrefly check` finaliza con 0 errores en backend y tests. | ✅ **CUMPLIDO** |
| **4. Integración Continua** | Pipeline automatizado | GitHub Actions configurado en `.github/workflows/ci.yml` ejecutando controles y tests ante push/PR. | ✅ **CUMPLIDO** |
| **5. Cero Fugas de Datos** | Base física inalterada | `zero_day_protocol.db` inmaculada con exactamente 5 usuarios iniciales tras correr la suite completa. | ✅ **CUMPLIDO** |
| **6. Umbrales No Funcionales** | Mediciones con criterio previo | Latencia de combate ($0.003$ ms $\le 0.5$ ms) y blindaje SQLi/XSS verificado en código. | ✅ **CUMPLIDO** |
| **7. Privacidad Ley 21.719** | Protección de datos personales | Cero datos personales sensibles almacenados; uso de datos 100% sintéticos. | ✅ **CUMPLIDO** |

---

## 6. Declaración de Cierre del Plan

El presente Plan de Pruebas se declara **CERRADO Y CONFORME**. Todos los riesgos de severidad Alta y Media han sido mitigados mediante pruebas automatizadas reproducibles integradas en la canalización de CI. Las exclusiones declaradas (renderizado visual de Canvas 3D y concurrencia masiva) fueron justificadas técnicamente y no comprometen la confiabilidad del producto evaluado.
