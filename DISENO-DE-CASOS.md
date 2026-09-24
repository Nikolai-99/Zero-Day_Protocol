# Diseño Formal de Casos de Prueba — Zero-Day Protocol

> **Documento de Cumplimiento Técnico — Evaluación Parcial 2 (PRO402)**  
> **Estándar Metodológico:** Particiones de Equivalencia, Análisis de Valores Límite (BVA) y Tablas de Decisión.

---

## 1. Introducción y Enfoque Metodológico

Este documento contiene la derivación sistemática y formal de los casos de prueba implementados en la suite automatizada de **Zero-Day Protocol**. Las pruebas existentes no responden a intuición o casuística arbitraria, sino a la aplicación rigurosa de técnicas de diseño de pruebas de caja negra y análisis de frontera.

---

## 2. Regla de Negocio 1: Resolución de Combate y Mitigación de Daño (`CombatRules`)

### A. Particiones de Equivalencia (EP)

| Parámetro / Estado | Clase Válida | Clases Inválidas | Justificación |
| :--- | :--- | :--- | :--- |
| **Vida Actual (`current_hp`)** | $EP_1: [1, 99]$ (Activo/Herido)<br/>$EP_2: \{100\}$ (Salud Plena) | $EP_3: \{0\}$ (Jugador Muerto)<br/>$EP_4: < 0$ (Fuera de rango inferior)<br/>$EP_5: > 100$ (Fuera de rango superior) | Un jugador con $HP \le 0$ no debe procesar impactos; $HP > 100$ no es alcanzable según el contrato. |
| **Modo de Juego (`game_mode`)** | $EP_6: \{\text{"NORMAL"}\}$<br/>$EP_7: \{\text{"HACKING"}\}$<br/>$EP_8: \{\text{"IMPOSSIBLE"}\}$ | $EP_9: \{\text{"EASY"}, \text{"GOD"}, \text{""}, \dots\}$ | Solo existen tres modos canónicos de simulación; cualquier otro valor debe emitir `ValueError`. |
| **Monto de Daño (`damage_amount`)** | $EP_{10}: > 0$ (Impacto hostil)<br/>$EP_{11}: < 0$ (Paquete médico / Cura) | $EP_{12}: \{0\}$ (Impacto nulo) | Daño negativo representa curación completa; daño positivo resta salud o consume escudos. |
| **Invulnerabilidad (`is_invulnerable`)** | $EP_{13}: \{\text{True}\}$ (Giro de barril activo)<br/>$EP_{14}: \{\text{False}\}$ (Vulnerable) | N/A (Tipo booleano acotado) | Durante el giro táctico no se reduce vida ni se consumen escudos. |

---

### B. Análisis de Valores Límite (BVA)

| Identificador | Variable Evaluada | Frontera / Límite | Valores Seleccionados | Resultado Esperado | Prueba Asociada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BVA-COMBAT-01** | `current_hp` | Límite inferior de muerte ($0$) | $HP = 0$ | Retorna `is_game_over=True`, `new_hp=0`. | `test_damage_when_already_dead_remains_game_over` |
| **BVA-COMBAT-02** | `current_hp` | Salud mínima operativa ($1$) | $HP = 1, \text{daño} = 1$ | $HP$ cae exactamente a $0$, activa `is_game_over=True`. | `test_fatal_damage_triggers_game_over` |
| **BVA-COMBAT-03** | `damage_amount` | Daño letal exacto | $HP = 40, \text{daño} = 40$ | $HP$ resultante $0$, partida terminada. | `test_fatal_damage_triggers_game_over` |
| **BVA-COMBAT-04** | `damage_amount` | Daño excesivo (*Overkill*) | $HP = 20, \text{daño} = 80$ | **Truncamiento rígido:** $HP$ queda en $0$ (nunca negativo). | `test_negative_hp_defect_regression` |
| **BVA-COMBAT-05** | `current_hp` | Salud máxima ($100$) | $HP = 99, \text{cura} = -1$ | Restaura salud plena a exactamente $100$. | `test_healing_restores_to_max_hp` |

---

### C. Tabla de Decisión: Mitigación de Daño y Escudos Matrix

Aplica cuando la regla combina simultáneamente: Modo de Juego $\times$ Escudos Matrix $\times$ Invulnerabilidad $\times$ Tipo de Daño.

| Regla / Condición | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **¿Jugador Invulnerable?** | **Sí** | No | No | No | No | No | No | No |
| **¿Daño Negativo (Cura)?** | - | **Sí** | No | No | No | No | No | No |
| **Modo de Juego** | Cualquiera | Cualquiera | NORMAL | NORMAL | HACKING | HACKING | IMPOSSIBLE | IMPOSSIBLE |
| **¿Posee Escudos? (`shields > 0`)** | - | - | - | - | **Sí** | **No** | **Sí** | **No** |
| **Acción: Daño a Vida (`HP`)** | 0 | $-HP_{\text{max}}$ | $HP - D$ | Truncar $0$ | 0 | Letal ($0$) | 0 | Letal ($0$) |
| **Acción: Consumo de Escudos** | 0 | 0 | 0 | 0 | $-1$ | 0 | $-1$ | 0 |
| **Acción: `is_game_over`** | `False` | `False` | `False` | `True` | `False` | `True` | `False` | `True` |
| **Prueba que lo implementa** | `test_invulnerable_prevents_damage` | `test_healing_restores_to_max_hp` | `test_normal_damage_reduces_hp` | `test_negative_hp_defect_regression` | `test_hacking_mode_absorbs_with_shield` | `test_hacking_mode_zero_shields_is_fatal` | `test_impossible_mode_absorbs_with_shield` | `test_impossible_mode_zero_shields_is_fatal` |

---

## 3. Regla de Negocio 4: Jerarquía de Rangos de Operadores (`RankingRules`)

### A. Particiones de Equivalencia y Fronteras Numéricas (BVA)

La regla clasifica a los operadores en cuatro niveles de autorización militar según Score, Oleada y Modo.

```text
Score:  0 ----------- 1500 ----------- 4000 ----------- 10000 ----------->
Oleada: 1 ------------ 2 -------------- 3 -------------- 5 -------------->
Rango:  [SCRIPT_ROOKIE] [VULN_HUNTER]  [SEC_SPECIALIST] [ELITE_OPERATOR]
                       (Atajo en IMPOSSIBLE: Score >= 5000 y Wave >= 3)
```

| Transición de Rango | Variable Crítica | Valor Bajo el Límite ($N - 1$) | Valor en el Borde ($N$) | Valor Sobre el Límite ($N + 1$) | Pruebas de Frontera |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Rookie $\to$ Hunter** | Score (Wave $\ge 2$) | $1,499$ (`SCRIPT_ROOKIE`) | $1,500$ (`VULNERABILITY_HUNTER`) | $1,501$ (`VULNERABILITY_HUNTER`) | `test_rank_vulnerability_hunter_boundary` |
| **Rookie $\to$ Hunter** | Wave (Score $\ge 1500$) | Wave $1$ (`SCRIPT_ROOKIE`) | Wave $2$ (`VULNERABILITY_HUNTER`) | Wave $3$ (`VULNERABILITY_HUNTER`) | `test_rank_wave_boundary_conditions` |
| **Hunter $\to$ Specialist** | Score (Wave $\ge 3$) | $3,999$ (`VULNERABILITY_HUNTER`) | $4,000$ (`SECURITY_SPECIALIST`) | $4,001$ (`SECURITY_SPECIALIST`) | `test_rank_security_specialist_boundary` |
| **Specialist $\to$ Elite** | Score (Wave $\ge 5$) | $9,999$ (`SECURITY_SPECIALIST`) | $10,000$ (`ELITE_OPERATOR`) | $10,001$ (`ELITE_OPERATOR`) | `test_rank_elite_operator_standard_boundary` |
| **Atajo IMPOSSIBLE** | Score (Wave $\ge 3$) | $4,999$ (`SECURITY_SPECIALIST`) | $5,000$ (`ELITE_OPERATOR`) | $5,001$ (`ELITE_OPERATOR`) | `test_rank_elite_operator_impossible_shortcut` |

---

### B. Tabla de Decisión: Asignación de Rango y Nivel de Autorización

| Condición Compuesta | T1 | T2 | T3 | T4 | T5 | T6 | T7 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **¿Modo IMPOSSIBLE?** | No | No | No | No | **Sí** | **Sí** | No |
| **¿Score $\ge 10,000$?** | **Sí** | No | No | No | No | No | No |
| **¿Score $\ge 5,000$?** | - | No | No | No | **Sí** | No | No |
| **¿Score $\ge 4,000$?** | - | **Sí** | No | No | - | No | No |
| **¿Score $\ge 1,500$?** | - | - | **Sí** | No | - | No | No |
| **¿Oleada Requerida Alcanzada?** | **Wave $\ge 5$** | **Wave $\ge 3$** | **Wave $\ge 2$** | - | **Wave $\ge 3$** | - | Insuficiente |
| **Rango Asignado** | `ELITE_OPERATOR` | `SECURITY_SPECIALIST` | `VULNERABILITY_HUNTER` | `SCRIPT_ROOKIE` | `ELITE_OPERATOR` | `SCRIPT_ROOKIE` | `SCRIPT_ROOKIE` |
| **Nivel de Autorización (*Clearance*)** | **Nivel 4** | **Nivel 3** | **Nivel 2** | **Nivel 1** | **Nivel 4** | **Nivel 1** | **Nivel 1** |
| **Prueba Automatizada** | `test_rank_elite_operator_standard` | `test_rank_security_specialist` | `test_rank_vulnerability_hunter` | `test_rank_script_rookie_default` | `test_rank_elite_operator_impossible_shortcut` | `test_rank_impossible_below_shortcut` | `test_rank_wave_insufficient_downgrades` |

---

## 4. Regla de Negocio 2: Sistema de Puntuación Escalar (`ScoreRules`)

### A. Particiones de Equivalencia y Multiplicadores

* **Tipo de Enemigo:**
  * $EP_1: \{\text{"NORMAL"}\} \implies \text{Base} = 100\text{ pts}$.
  * $EP_2: \{\text{"CORE"}\} \implies \text{Base} = 1,000\text{ pts}$.
  * $EP_3: \{\text{"TRIANGLE"}\} \implies \text{Base} = 1,000\text{ pts}$.
  * $EP_4: \{\text{"BOSS"}, \text{"INVALID"}\} \implies \text{Error: ValueError}$.
* **Fórmula de Oleada:**
  $$\text{WaveMult} = 1.0 + (\text{wave} - 1) \times 0.10$$
  * Oleada 1 (Límite inferior): $\text{WaveMult} = 1.0$.
  * Oleada 5 (Límite nominal): $\text{WaveMult} = 1.4$.
* **Mecánica de Roce Táctico (*Graze*):**
  * Modos NORMAL y HACKING: $+15\text{ pts}$.
  * Modo IMPOSSIBLE (Regla de Scarcity): $0\text{ pts}$ expresamente.

---

## 5. Casos de Prueba Descartados con Justificación Técnica

La pauta de evaluación establece que: *«Un caso descartado con argumento vale más que uno implementado sin criterio»*.

| Caso Candidato | Técnica de Origen | Decisión | Fundamento y Justificación Técnica del Descarte |
| :--- | :--- | :---: | :--- |
| **Puntuación con Oleada Negativa ($\text{wave} \le 0$) en API** | Partición Inválida | **Descartado** | Descartado en las pruebas de integración porque el esquema Pydantic `ScoreRequest` impone la restricción declarativa `Field(ge=1)`. El framework FastAPI intercepta la petición y responde `422 Unprocessable Entity` antes de invocar la función de dominio, haciendo redundante probar el cálculo matemático interno con valores negativos. |
| **Validación de Coordenadas de Proyectiles en Playwright** | Análisis Funcional UI | **Descartado** | Descartado por considerarse una **prueba inestable (*flaky test*)**. Las posiciones de las partículas en el Canvas WebGL dependen de la tasa de refresco (60 FPS) y de la emulación de software de la GPU en headless. Intentar aserciones exactas de píxeles genera falsos positivos. Se sustituyó por la verificación determinista del DOM en el montaje del HUD (`System Status` y `HP 100%`). |
| **Daño con Escudos Negativos (`current_shields < 0`)** | Partición Inválida | **Descartado** | El método `resolve_damage` aplica `max(0, min(5, current_shields))` sanitizando el estado interno. Probar valores como `-1` o `-5` no aporta valor ya que la precondición del tipo y del store de Zustand garantiza que el estado nunca decrece por debajo de cero (`consumeShieldStack` solo opera si `shields > 0`). |
| **Pruebas de Concurrencia Masiva sobre SQLite** | Estrés / No Funcional | **Descartado** | Queda explícitamente fuera del alcance de la EP2 según el estándar ISO/IEC/IEEE 29119. La arquitectura del juego es un cliente de escritorio monousuario local; evaluar contención de bloqueos transaccionales distribuidos desvirtúa el foco evaluado. |

---

## 6. Matriz de Trazabilidad Bidireccional (Caso Diseñado $\leftrightarrow$ Prueba Implementada)

| ID Caso de Prueba | Regla Asociada | Técnica Aplicada | Nombre de la Prueba Automatizada | Archivo de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **TC-COMBAT-001** | RN-01 | Partición Válida | `test_normal_damage_reduces_hp` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-002** | RN-01 | BVA (Límite 0) | `test_fatal_damage_triggers_game_over` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-003** | RN-01 | BVA / Regresión | `test_negative_hp_defect_regression` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-004** | RN-01 | Tabla Decisión (R5) | `test_hacking_mode_absorbs_with_shield` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-005** | RN-01 | Tabla Decisión (R1) | `test_invulnerable_prevents_damage` | `tests/unit/test_combat_rules.py` |
| **TC-RANK-001** | RN-04 | BVA (1499 / 1500) | `test_rank_vulnerability_hunter_boundary` | `tests/unit/test_ranking_rules.py` |
| **TC-RANK-002** | RN-04 | BVA (3999 / 4000) | `test_rank_security_specialist_boundary` | `tests/unit/test_ranking_rules.py` |
| **TC-RANK-003** | RN-04 | BVA (9999 / 10000) | `test_rank_elite_operator_standard_boundary` | `tests/unit/test_ranking_rules.py` |
| **TC-RANK-004** | RN-04 | Tabla Decisión (T5) | `test_rank_elite_operator_impossible_shortcut` | `tests/unit/test_ranking_rules.py` |
| **TC-API-001** | RN-01 | Contrato HTTP | `test_rules_damage_endpoint_contract` | `tests/integration/test_api_contracts.py` |
| **TC-API-002** | RN-05 | Validación 422 | `test_post_user_missing_required_fields_returns_422` | `tests/integration/test_api_contracts.py` |
| **TC-API-003** | RN-02 / RN-04 | Persistencia DB | `test_full_user_score_lifecycle_and_rank_aggregation` | `tests/integration/test_api_contracts.py` |
| **TC-E2E-001** | RN-05 | User Journey UI | `test_e2e_main_menu_and_operator_renaming` | `tests/e2e/test_ui_journey.py` |
| **TC-E2E-002** | RN-01 | Recorrido Completo | `test_e2e_start_normal_mission_and_hud_display` | `tests/e2e/test_ui_journey.py` |
| **TC-E2E-003** | RN-01 | Adaptación HUD | `test_e2e_hacking_mode_hud_adaptation` | `tests/e2e/test_ui_journey.py` |
| **TC-E2E-004** | RN-01 | Alerta Hostil HUD | `test_e2e_impossible_mode_hud_and_vulnerability_warning` | `tests/e2e/test_ui_journey.py` |
