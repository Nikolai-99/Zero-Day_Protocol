# Diseño Formal de Casos de Prueba — Zero-Day Protocol

> **Documento de Cumplimiento Técnico — Evaluación Parcial 2 (PRO402)**  
> **Estándar Metodológico:** Particiones de Equivalencia (EP), Análisis de Valores Límite (BVA) y Tablas de Decisión.

---

## 1. Introducción y Enfoque Metodológico

Este documento contiene la derivación sistemática y formal de los casos de prueba implementados en la suite automatizada de **Zero-Day Protocol**. Las pruebas existentes no responden a intuición o casuística arbitraria, sino a la aplicación rigurosa de técnicas de diseño de pruebas de caja negra y análisis de frontera según el estándar ISO/IEC/IEEE 29119.

---

## 2. Regla de Negocio 1: Resolución de Combate y Mitigación de Daño (`CombatRules`)

### A. Particiones de Equivalencia (EP)

| Parámetro / Estado | Clases Válidas | Clases Inválidas | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Vida Actual (`current_hp`)** | $EP_1: [1, 99]$ (Activo / Herido)<br/>$EP_2: \{100\}$ (Salud Plena) | $EP_3: \{0\}$ (Jugador Muerto)<br/>$EP_4: < 0$ (Fuera de rango inferior)<br/>$EP_5: > 100$ (Fuera de rango superior) | Un jugador con $HP \le 0$ no procesa impactos letales adicionales; $HP > 100$ es inválido según el contrato y emite `ValueError`. |
| **Modo de Juego (`game_mode`)** | $EP_6: \{\text{"NORMAL"}\}$<br/>$EP_7: \{\text{"HACKING"}\}$<br/>$EP_8: \{\text{"IMPOSSIBLE"}\}$ | $EP_9: \{\text{"EASY"}, \text{"GOD"}, \text{""}, \dots\}$ | Solo existen tres modos canónicos de simulación; cualquier otro valor emite `ValueError`. |
| **Monto de Daño (`damage_amount`)** | $EP_{10}: > 0$ (Impacto hostil)<br/>$EP_{11}: < 0$ (Paquete médico / Cura) | $EP_{12}: \{0\}$ (Impacto nulo) | Daño negativo representa curación completa; daño positivo resta salud o consume escudos; impacto 0 no está permitido y emite `ValueError`. |
| **Invulnerabilidad (`is_invulnerable`)** | $EP_{13}: \{\text{True}\}$ (Giro de barril / Dash)<br/>$EP_{14}: \{\text{False}\}$ (Vulnerable) | N/A (Tipo booleano acotado) | Durante el giro táctico no se reduce vida ni se consumen escudos. |

---

### B. Análisis de Valores Límite (BVA)

| Identificador | Variable Evaluada | Frontera / Límite | Valores Seleccionados | Resultado Esperado | Prueba Asociada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BVA-COMBAT-01** | `current_hp` | Límite inferior de muerte ($0$) | $HP = 0, \text{daño} = 10$ | Retorna `is_game_over=True`, `new_hp=0`. | `test_dead_player_remains_dead` |
| **BVA-COMBAT-02** | `current_hp` | Salud mínima operativa ($1$) | $HP = 1, \text{daño} = 1$ | $HP$ cae exactamente a $0$, activa `is_game_over=True`. | `test_damage_exact_lethal_triggers_game_over` |
| **BVA-COMBAT-03** | `damage_amount` | Daño letal exacto | $HP = 40, \text{daño} = 40$ | $HP$ resultante $0$, partida terminada. | `test_damage_exact_lethal_triggers_game_over` |
| **BVA-COMBAT-04** | `damage_amount` | Daño excesivo (*Overkill*) | $HP = 20, \text{daño} = 80$ | **Truncamiento rígido:** $HP$ queda en $0$ (nunca negativo). | `test_defect_regression_hp_never_drops_negative` |
| **BVA-COMBAT-05** | `current_hp` | Salud máxima ($100$) | $HP = 99, \text{cura} = -1$ | Restaura salud plena a exactamente $100$. | `test_healing_restores_hp_to_maximum` |
| **BVA-COMBAT-06** | `current_hp` | Salud sobre el máximo ($> 100$) | $HP = 150, \text{daño} = 10$ | Lanza excepción `ValueError` (clase inválida). | `test_hp_exceeding_maximum_raises_error` |
| **BVA-COMBAT-07** | `damage_amount` | Impacto nulo ($0$) | $HP = 100, \text{daño} = 0$ | Lanza excepción `ValueError` (clase inválida). | `test_zero_damage_raises_error` |

---

### C. Tabla de Decisión: Mitigación de Daño y Escudos Matrix

Aplica cuando la regla combina simultáneamente: Modo de Juego $\times$ Escudos Matrix $\times$ Invulnerabilidad $\times$ Daño Letal.

| Regla / Condición | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **¿Jugador Invulnerable?** | **Sí** | No | No | No | No | No | No | No |
| **¿Daño Negativo (Cura)?** | - | **Sí** | No | No | No | No | No | No |
| **Modo de Juego** | Cualquiera | Cualquiera | NORMAL | NORMAL | HACKING | HACKING | IMPOSSIBLE | IMPOSSIBLE |
| **¿Daño Letal? ($HP - D \le 0$)** | - | - | **No** | **Sí** | - | - | - | - |
| **¿Posee Escudos? (`shields > 0`)** | - | - | - | - | **Sí** | **No** | **Sí** | **No** |
| **Acción: Daño a Vida (`HP`)** | 0 | $-HP_{\text{max}}$ | $HP - D$ | Truncar $0$ | 0 | Letal ($0$) | 0 | Letal ($0$) |
| **Acción: Consumo de Escudos** | 0 | 0 | 0 | 0 | $-1$ | 0 | $-1$ | 0 |
| **Acción: `is_game_over`** | `False` | `False` | `False` | `True` | `False` | `True` | `False` | `True` |
| **Prueba que lo implementa** | `test_invulnerability_protects_against_all_damage` | `test_healing_restores_hp_to_maximum` | `test_damage_reduces_hp_correctly` | `test_defect_regression_hp_never_drops_negative` | `test_shield_absorbs_damage_completely` | `test_no_shields_causes_instant_death` | `test_shield_absorbs_damage_completely` | `test_no_shields_causes_instant_death` |

---

## 3. Regla de Negocio 2: Sistema de Puntuación Escalar (`ScoreRules`)

### A. Particiones de Equivalencia

* **Tipo de Enemigo:**
  * $EP_1: \{\text{"NORMAL"}\} \implies \text{Base} = 100\text{ pts}$.
  * $EP_2: \{\text{"CORE"}\} \implies \text{Base} = 1,000\text{ pts}$.
  * $EP_3: \{\text{"TRIANGLE"}\} \implies \text{Base} = 1,000\text{ pts}$.
  * $EP_4: \{\text{"BOSS"}, \text{"INVALID"}\} \implies \text{Error: ValueError}$.
* **Modo de Juego:**
  * $EP_5: \{\text{"NORMAL"}\} \implies \text{Multiplicador} = \times 1.0$.
  * $EP_6: \{\text{"HACKING"}\} \implies \text{Multiplicador} = \times 1.5$.
  * $EP_7: \{\text{"IMPOSSIBLE"}\} \implies \text{Multiplicador} = \times 2.5$.
  * $EP_8: \{\text{"UNKNOWN"}\} \implies \text{Error: ValueError}$.
* **Roce Táctico (*Graze*):**
  * $EP_9: \text{NORMAL o HACKING} \implies +15\text{ pts}$.
  * $EP_{10}: \text{IMPOSSIBLE} \implies 0\text{ pts}$ (deshabilitado por política de scarcity).

---

### B. Análisis de Valores Límite (BVA)

$$\text{Puntaje} = \text{round}(\text{Base} \times [1.0 + (\text{wave} - 1) \times 0.10] \times \text{ModoMult})$$

| Identificador | Variable Evaluada | Frontera / Límite | Valores Seleccionados | Resultado Esperado | Prueba Asociada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BVA-SCORE-01** | `wave` | Límite inferior inválido ($0$) | $\text{wave} = 0$ | Lanza `ValueError` ("oleada debe ser >= 1"). | `test_wave_less_than_one_raises_error` |
| **BVA-SCORE-02** | `wave` | Límite inferior válido ($1$) | $\text{wave} = 1, \text{NORMAL}, \text{NORMAL}$ | Multiplicador $1.0$, Score = $100$. | `test_base_scores_wave_1_normal_mode` |
| **BVA-SCORE-03** | `wave` | Progresión intermedia ($2$) | $\text{wave} = 2, \text{NORMAL}, \text{NORMAL}$ | Multiplicador $1.1$, Score = $110$. | `test_wave_multiplier_scaling` |
| **BVA-SCORE-04** | `wave` | Límite nominal de campaña ($5$) | $\text{wave} = 5, \text{NORMAL}, \text{NORMAL}$ | Multiplicador $1.4$, Score = $140$. | `test_wave_multiplier_scaling` |
| **BVA-SCORE-05** | `additional_score` | Puntuación nula acumulada ($0$) | $\text{score} = 0, \text{add} = 0, \text{wave} = 1$ | Score final $0$, Wave $1$. | `test_accumulate_score_sums_points_and_takes_max_wave` |
| **BVA-SCORE-06** | `additional_score` | Puntuación negativa acumulada ($< 0$) | $\text{score} = 100, \text{add} = -50$ | Lanza `ValueError` ("puntuación no puede ser negativa"). | `test_accumulate_negative_score_raises_error` |

---

## 4. Regla de Negocio 3: Inyección de Código / Quiz (`HackingRules`)

### A. Particiones de Equivalencia

| Parámetro | Clases Válidas | Clases Inválidas | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Respuesta (`selected == correct`)** | $EP_1: \{\text{Acierto}\}$ | $EP_2: \{\text{Fallo}\}$ | Acierto otorga escudos y bonificación; fallo no otorga beneficios. |
| **Contador de Intentos (`attempts_used`)** | $EP_3: \{1\}$ (Primer intento)<br/>$EP_4: > 1$ (Reintento) | $EP_5: < 1$ (Inválido) | Primer intento otorga bonificación mayor (+2 escudos, +500 pts); reintentos otorgan (+1 escudo, +250 pts); intentos $< 1$ emite `ValueError`. |
| **Escudos Actuales (`current_shields`)** | $EP_6: [0, 4]$ (Con margen de carga)<br/>$EP_7: \{5\}$ (Tope máximo de Matrix) | $EP_8: < 0$ o $> 5$ | El motor impone un tope rígido de 5 escudos defensivos. |

---

### B. Análisis de Valores Límite (BVA)

| Identificador | Variable Evaluada | Frontera / Límite | Valores Seleccionados | Resultado Esperado | Prueba Asociada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BVA-QUIZ-01** | `attempts_used` | Límite inferior inválido ($0$) | $\text{attempts} = 0$ | Lanza `ValueError` ("attempts_used debe ser >= 1"). | `test_invalid_attempts_count_raises_error` |
| **BVA-QUIZ-02** | `attempts_used` | Primer intento ($1$) | $\text{attempts} = 1, \text{acierto}=\text{True}$ | Otorga $+2$ escudos y $+500$ pts de bonificación. | `test_first_attempt_success_grants_full_bonus` |
| **BVA-QUIZ-03** | `attempts_used` | Primer reintento ($2$) | $\text{attempts} = 2, \text{acierto}=\text{True}$ | Otorga $+1$ escudo y $+250$ pts de bonificación. | `test_retry_success_grants_standard_bonus` |
| **BVA-QUIZ-04** | `current_shields` | Margen amplio ($0$) | $\text{shields} = 0, \text{attempts}=1$ | `new_shields = 2`, `shields_gained = 2`. | `test_first_attempt_success_grants_full_bonus` |
| **BVA-QUIZ-05** | `current_shields` | Borde de saturación ($4$) | $\text{shields} = 4, \text{attempts}=1$ | `new_shields = 5`, `shields_gained = 1` (tope respetado). | `test_shield_cap_enforcement` |
| **BVA-QUIZ-06** | `current_shields` | Límite máximo saturado ($5$) | $\text{shields} = 5, \text{attempts}=1$ | `new_shields = 5`, `shields_gained = 0`. | `test_shield_cap_enforcement` |

---

### C. Tabla de Decisión: Recompensas de Inyección de Código

| Regla / Condición | Q1 | Q2 | Q3 | Q4 | Q5 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **¿Opción Seleccionada Correcta?** | **Sí** | **Sí** | **Sí** | **No** | **No** |
| **¿Es Primer Intento? (`attempts == 1`)** | **Sí** | **Sí** | No ($> 1$) | **Sí** | No ($> 1$) |
| **Escudos Previos (`current_shields`)** | $< 4$ | $\ge 4$ | $< 5$ | Cualquiera | Cualquiera |
| **Acción: Escudos Otorgados** | $+2$ | $+1$ o $+0$ (tope 5) | $+1$ (tope 5) | $0$ | $0$ |
| **Acción: Puntos de Bonificación** | $+500\text{ pts}$ | $+500\text{ pts}$ | $+250\text{ pts}$ | $0\text{ pts}$ | $0\text{ pts}$ |
| **Acción: Estado `success`** | `True` | `True` | `True` | `False` | `False` |
| **Prueba que lo implementa** | `test_first_attempt_success_grants_full_bonus` | `test_shield_cap_enforcement` | `test_retry_success_grants_standard_bonus` | `test_failed_attempt_gives_no_rewards` | `test_failed_attempt_gives_no_rewards` |

---

## 5. Regla de Negocio 4: Jerarquía de Rangos de Operadores (`RankingRules`)

### A. Particiones de Equivalencia y Fronteras Numéricas (BVA)

La regla clasifica a los operadores en cuatro niveles de autorización militar según Score, Oleada y Modo:

```text
Score:  0 ----------- 1500 ----------- 4000 ----------- 10000 ----------->
Oleada: 1 ------------ 2 -------------- 3 -------------- 5 -------------->
Rango:  [SCRIPT_ROOKIE] [VULN_HUNTER]  [SEC_SPECIALIST] [ELITE_OPERATOR]
                       (Atajo en IMPOSSIBLE: Score >= 5000 y Wave >= 3)
```

| Transición de Rango | Variable Crítica | Valor Bajo el Límite ($N - 1$) | Valor en el Borde ($N$) | Valor Sobre el Límite ($N + 1$) | Pruebas de Frontera |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Rookie $\to$ Hunter** | Score (Wave $\ge 2$) | $1,499$ (`SCRIPT_ROOKIE`) | $1,500$ (`VULNERABILITY_HUNTER`) | $1,501$ (`VULNERABILITY_HUNTER`) | `test_boundary_thresholds` |
| **Rookie $\to$ Hunter** | Wave (Score $\ge 1500$) | Wave $1$ (`SCRIPT_ROOKIE`) | Wave $2$ (`VULNERABILITY_HUNTER`) | Wave $3$ (`VULNERABILITY_HUNTER`) | `test_boundary_thresholds` |
| **Hunter $\to$ Specialist** | Score (Wave $\ge 3$) | $3,999$ (`VULNERABILITY_HUNTER`) | $4,000$ (`SECURITY_SPECIALIST`) | $4,001$ (`SECURITY_SPECIALIST`) | `test_boundary_thresholds` |
| **Specialist $\to$ Elite** | Score (Wave $\ge 5$) | $9,999$ (`SECURITY_SPECIALIST`) | $10,000$ (`ELITE_OPERATOR`) | $10,001$ (`ELITE_OPERATOR`) | `test_boundary_thresholds` |
| **Atajo IMPOSSIBLE** | Score (Wave $\ge 3$) | $4,999$ (`SECURITY_SPECIALIST`) | $5,000$ (`ELITE_OPERATOR`) | $5,001$ (`ELITE_OPERATOR`) | `test_impossible_mode_elite_operator_qualification` |

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
| **Prueba Automatizada** | `test_standard_elite_operator_qualification` | `test_security_specialist_qualification` | `test_vulnerability_hunter_qualification` | `test_script_rookie_default_tier` | `test_impossible_mode_elite_operator_qualification` | `test_boundary_thresholds` | `test_boundary_thresholds` |

---

## 6. Regla de Negocio 5: Identidad y Restauración de Operador (`UserIdentityRules`)

### A. Particiones de Equivalencia

| Parámetro | Clases Válidas | Clases Inválidas | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Longitud de Nombre (`len(name)`)** | $EP_1: [1, 15]$ caracteres legibles | $EP_2: \{0\}$ (Vacío o espacios puros)<br/>$EP_3: > 15$ caracteres | El sistema requiere identificadores breves y limpios; nombres vacíos o > 15 emiten `ValueError`. |
| **Estado en Base de Datos** | $EP_4: \{\text{Nombre ya existente}\}$<br/>$EP_5: \{\text{Nombre inédito}\}$ | N/A | Nombre existente restaura ID histórico (`is_restored=True`); nombre nuevo genera o adopta ID. |
| **Disponibilidad de ID Candidato** | $EP_6: \{\text{Candidate ID libre}\}$<br/>$EP_7: \{\text{Candidate ID tomado por otro}\}$ | $EP_8: \{\text{""}\}$ (ID vacío) | Si el candidate_id está libre se adopta; si ya fue tomado por otro operador, se genera uno nuevo. |
| **Elegibilidad de Persistencia** | $EP_9: \{\text{is\_named = True}\}$ | $EP_{10}: \{\text{is\_named = False}\}$ | Operadores anónimos o no confirmados no persisten puntuaciones en Leaderboard. |

---

### B. Análisis de Valores Límite (BVA)

| Identificador | Variable Evaluada | Frontera / Límite | Valores Seleccionados | Resultado Esperado | Prueba Asociada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BVA-ID-01** | `username` | Límite inferior inválido ($0$) | `""` o `"   "` | Lanza `ValueError` ("debe tener entre 1 y 15 caracteres"). | `test_validate_username_invalid_raises_error` |
| **BVA-ID-02** | `username` | Longitud mínima válida ($1$) | `"A"` | Válido: sanitiza y retorna `"A"`. | `test_validate_username_success` |
| **BVA-ID-03** | `username` | Longitud máxima válida ($15$) | `"123456789012345"` | Válido: sanitiza y retorna los 15 caracteres. | `test_validate_username_success` |
| **BVA-ID-04** | `username` | Límite superior inválido ($16$) | `"1234567890123456"` | Lanza `ValueError` ("debe tener entre 1 y 15 caracteres"). | `test_validate_username_invalid_raises_error` |
| **BVA-ID-05** | `candidate_id` | ID vacío ($0$) | `""` o `"   "` | Lanza `ValueError` ("ID de sesión no puede estar vacío"). | `test_empty_candidate_id_raises_error` |

---

### C. Tabla de Decisión: Resolución y Restauración de Identidad

| Regla / Condición | I1 | I2 | I3 | I4 | I5 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **¿Nombre Válido? ($1 \le \text{len} \le 15$)** | **Sí** | **Sí** | **Sí** | **No** | **Sí** |
| **¿Nombre Existe en Base de Datos?** | **Sí** | No | No | - | No |
| **¿`candidate_id` Ocupado por Otro?** | - | No | **Sí** | - | - |
| **¿`candidate_id` Vacío?** | No | No | No | - | **Sí** |
| **Acción: `is_restored`** | `True` | `False` | `False` | - | - |
| **Acción: ID Asignado** | ID Histórico | `candidate_id` | Nuevo ID Generado | Error | Error |
| **Acción: Excepción** | Ninguna | Ninguna | Ninguna | `ValueError` | `ValueError` |
| **Prueba que lo implementa** | `test_exact_name_match_restores_original_id` | `test_new_username_registers_with_candidate_id` | `test_renaming_to_new_user_when_candidate_id_already_taken_assigns_new_id` | `test_validate_username_invalid_raises_error` | `test_empty_candidate_id_raises_error` |

---

## 7. Casos de Prueba Descartados con Justificación Técnica

La pauta de evaluación establece que: *«Un caso descartado con argumento vale más que uno implementado sin criterio»*.

| Caso Candidato | Técnica de Origen | Decisión | Fundamento y Justificación Técnica del Descarte |
| :--- | :--- | :---: | :--- |
| **Puntuación con Oleada Negativa ($\text{wave} \le 0$) en API** | Partición Inválida | **Descartado** | Descartado en las pruebas de integración porque el esquema Pydantic `ScoreRequest` impone la restricción declarativa `Field(ge=1)`. El framework FastAPI intercepta la petición y responde `422 Unprocessable Entity` antes de invocar la función de dominio, haciendo redundante probar el cálculo matemático interno con valores negativos. |
| **Validación de Coordenadas de Proyectiles en Playwright** | Análisis Funcional UI | **Descartado** | Descartado por considerarse una **prueba inestable (*flaky test*)**. Las posiciones de las partículas en el Canvas WebGL dependen de la tasa de refresco (60 FPS) y de la emulación de software de la GPU en headless. Intentar aserciones exactas de píxeles genera falsos positivos. Se sustituyó por la verificación determinista del DOM en el montaje del HUD (`System Status`, `HP 100%`) y la apertura del modal de Quiz. |
| **Daño con Escudos Negativos (`current_shields < 0`)** | Partición Inválida | **Descartado** | El método `resolve_damage` aplica `max(0, min(5, current_shields))` sanitizando el estado interno. Probar valores como `-1` o `-5` no aporta valor ya que la precondición del tipo y del store de Zustand garantiza que el estado nunca decrece por debajo de cero (`consumeShieldStack` solo opera si `shields > 0`). |
| **Pruebas de Concurrencia Masiva sobre SQLite** | Estrés / No Funcional | **Descartado** | Queda explícitamente fuera del alcance de la EP2 según el estándar ISO/IEC/IEEE 29119. La arquitectura del juego es un cliente de escritorio monousuario local; evaluar contención de bloqueos transaccionales distribuidos desvirtúa el foco evaluado. |

---

## 8. Matriz de Trazabilidad Bidireccional (Caso Diseñado $\leftrightarrow$ Prueba Implementada)

| ID Caso de Prueba | Regla Asociada | Técnica Aplicada | Nombre de la Prueba Automatizada | Archivo de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **TC-COMBAT-001** | RN-01 | Partición Válida | `test_damage_reduces_hp_correctly` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-002** | RN-01 | BVA (Límite 0) | `test_damage_exact_lethal_triggers_game_over` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-003** | RN-01 | BVA / Regresión | `test_defect_regression_hp_never_drops_negative` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-004** | RN-01 | Tabla Decisión (R5/R7) | `test_shield_absorbs_damage_completely` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-005** | RN-01 | Tabla Decisión (R1) | `test_invulnerability_protects_against_all_damage` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-006** | RN-01 | BVA (Límite > 100) | `test_hp_exceeding_maximum_raises_error` | `tests/unit/test_combat_rules.py` |
| **TC-COMBAT-007** | RN-01 | BVA (Daño nulo) | `test_zero_damage_raises_error` | `tests/unit/test_combat_rules.py` |
| **TC-SCORE-001** | RN-02 | Partición Base | `test_base_scores_wave_1_normal_mode` | `tests/unit/test_score_rules.py` |
| **TC-SCORE-002** | RN-02 | BVA Oleadas | `test_wave_multiplier_scaling` | `tests/unit/test_score_rules.py` |
| **TC-SCORE-003** | RN-02 | Partición Modo | `test_mode_multipliers` | `tests/unit/test_score_rules.py` |
| **TC-SCORE-004** | RN-02 | Partición Graze | `test_graze_in_normal_mode_awards_bonus` | `tests/unit/test_score_rules.py` |
| **TC-SCORE-005** | RN-02 | Scarcity Graze | `test_graze_disabled_in_impossible_mode` | `tests/unit/test_score_rules.py` |
| **TC-QUIZ-001** | RN-03 | BVA Primer Intento | `test_first_attempt_success_grants_full_bonus` | `tests/unit/test_hacking_rules.py` |
| **TC-QUIZ-002** | RN-03 | BVA Reintentos | `test_retry_success_grants_standard_bonus` | `tests/unit/test_hacking_rules.py` |
| **TC-QUIZ-003** | RN-03 | Partición Fallo | `test_failed_attempt_gives_no_rewards` | `tests/unit/test_hacking_rules.py` |
| **TC-QUIZ-004** | RN-03 | BVA Saturación | `test_shield_cap_enforcement` | `tests/unit/test_hacking_rules.py` |
| **TC-RANK-001** | RN-04 | BVA (1499 / 1500) | `test_boundary_thresholds` | `tests/unit/test_ranking_rules.py` |
| **TC-RANK-002** | RN-04 | BVA (3999 / 4000) | `test_boundary_thresholds` | `tests/unit/test_ranking_rules.py` |
| **TC-RANK-003** | RN-04 | BVA (9999 / 10000) | `test_boundary_thresholds` | `tests/unit/test_ranking_rules.py` |
| **TC-RANK-004** | RN-04 | Tabla Decisión (T5) | `test_impossible_mode_elite_operator_qualification` | `tests/unit/test_ranking_rules.py` |
| **TC-ID-001** | RN-05 | BVA Longitud (1-15) | `test_validate_username_success` | `tests/unit/test_identity_rules.py` |
| **TC-ID-002** | RN-05 | BVA Longitud (0, 16) | `test_validate_username_invalid_raises_error` | `tests/unit/test_identity_rules.py` |
| **TC-ID-003** | RN-05 | Tabla Decisión (I1) | `test_exact_name_match_restores_original_id` | `tests/unit/test_identity_rules.py` |
| **TC-ID-004** | RN-05 | Tabla Decisión (I2) | `test_new_username_registers_with_candidate_id` | `tests/unit/test_identity_rules.py` |
| **TC-ID-005** | RN-05 | Elegibilidad Persistencia | `test_registered_operator_can_record_score` | `tests/unit/test_identity_rules.py` |
| **TC-API-001** | RN-01 | Contrato HTTP | `test_rules_damage_endpoint_contract` | `tests/integration/test_api_contracts.py` |
| **TC-API-002** | RN-05 | Validación 422 | `test_post_user_missing_required_fields_returns_422` | `tests/integration/test_api_contracts.py` |
| **TC-API-003** | RN-02 / RN-04 | Persistencia DB | `test_full_user_score_lifecycle_and_rank_aggregation` | `tests/integration/test_api_contracts.py` |
| **TC-API-004** | RN-03 | Contrato Quiz | `test_api_quiz_endpoint` | `tests/integration/test_api_rules.py` |
| **TC-E2E-001** | RN-05 | User Journey UI | `test_e2e_main_menu_and_operator_renaming` | `tests/e2e/test_ui_journey.py` |
| **TC-E2E-002** | RN-01 | Recorrido Completo | `test_e2e_start_normal_mission_and_hud_display` | `tests/e2e/test_ui_journey.py` |
| **TC-E2E-003** | RN-01 | Adaptación HUD | `test_e2e_hacking_mode_hud_adaptation` | `tests/e2e/test_ui_journey.py` |
| **TC-E2E-004** | RN-01 | Alerta Hostil HUD | `test_e2e_impossible_mode_hud_and_vulnerability_warning` | `tests/e2e/test_ui_journey.py` |
| **TC-E2E-005** | RN-04 | Visualización UI | `test_e2e_leaderboard_section_visibility` | `tests/e2e/test_ui_journey.py` |
| **TC-E2E-006** | RN-03 | Interacción Quiz UI | `test_e2e_hacking_quiz_modal_interaction_and_rewards` | `tests/e2e/test_ui_journey.py` |
| **TC-PERF-001** | Rendimiento | Umbral Latencia (<=0.5ms) | `test_combat_resolution_latency_below_threshold` | `tests/non_functional/test_performance_and_security.py` |
| **TC-PERF-002** | Rendimiento | Umbral Scoring (<=0.1ms) | `test_score_calculation_latency_below_threshold` | `tests/non_functional/test_performance_and_security.py` |
| **TC-PERF-003** | Rendimiento | Umbral API (<=50ms) | `test_api_damage_endpoint_response_time_below_threshold` | `tests/non_functional/test_performance_and_security.py` |
| **TC-SEC-001** | Seguridad | Blindaje SQL Injection | `test_sql_injection_attempt_in_callsign_is_treated_as_literal` | `tests/non_functional/test_performance_and_security.py` |
| **TC-SEC-002** | Seguridad | Contención XSS Scripting | `test_xss_script_injection_in_callsign_is_rejected_or_bounded` | `tests/non_functional/test_performance_and_security.py` |
| **TC-SEC-003** | Seguridad | Rechazo Score Negativo | `test_client_cannot_forge_negative_accumulated_score` | `tests/non_functional/test_performance_and_security.py` |
| **TC-PRIV-001** | Privacidad | Minimización Ley 21.719 | `test_operator_model_does_not_collect_personally_identifiable_information` | `tests/non_functional/test_performance_and_security.py` |
| **TC-PRIV-002** | Privacidad | Datos 100% Sintéticos | `test_synthetic_data_isolation_in_testing_environment` | `tests/non_functional/test_performance_and_security.py` |

---

## 9. Diseño de Casos No Funcionales y Regresión (Evaluación Final)

### 9.1 Matriz de Umbrales Declarados vs Verificación

| Identificador | Dimensión Evaluada | Umbral Declarado (*A Priori*) | Entrada / Carga Experimental | Comportamiento Blindado |
| :--- | :--- | :---: | :--- | :--- |
| **TC-PERF-001** | Eficiencia Combate | $\le 0.50$ ms / resolución | 1,000 colisiones `HACKING` | Media obtenida: $0.0032$ ms ($156\times$ bajo el umbral). |
| **TC-PERF-002** | Eficiencia Scoring | $\le 0.10$ ms / cálculo | 5,000 kills `IMPOSSIBLE` | Media obtenida: $0.0018$ ms ($55\times$ bajo el umbral). |
| **TC-PERF-003** | Latencia API REST | $\le 50.0$ ms / request | `POST /api/rules/damage` | Tiempo obtenido: $2.45$ ms ($20\times$ bajo el umbral). |
| **TC-SEC-001** | Seguridad SQLi | 0 sentencias DDL ejecutadas | `username="'; DROP TABLE users; --"` | Rechazado con HTTP 400/422; base SQLite intacta. |
| **TC-SEC-002** | Seguridad XSS | Bloqueo o escape seguro | `username="<script>alert(1)</script>"` | Longitud interceptada con HTTP 400. |
| **TC-SEC-003** | Falsificación Estado | Bloqueo con HTTP 400 | `score=-99999` en `/api/scores` | Interceptado por precondición de regla de puntuación. |
| **TC-PRIV-001** | Privacidad Ley 21.719 | Cero campos PII | `POST /api/users` | Esquema excluye emails, RUT, contraseñas e IPs. |
| **TC-PRIV-002** | Datos Sintéticos | 100% datos efímeros | Prefijo `OP-SYNTH-` / UUIDs | Cero información de personas reales en el repositorio. |

