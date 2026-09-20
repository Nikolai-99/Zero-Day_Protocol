"""Reglas de negocio puras de Zero-Day Protocol.

Este módulo concentra las reglas troncales de dominio del sistema:
1. Resolución de combate, daño y mitigación de escudos.
2. Cálculo de puntuación y multiplicadores de oleada/modo.
3. Validación y recompensas de inyección de código (Hacking Quiz).
4. Asignación de rangos de operador para la clasificación.
5. Creación, validación y restauración de identidad de operador para puntuación.
"""

import uuid
from dataclasses import dataclass
from typing import Literal

GameModeType = Literal["NORMAL", "HACKING", "IMPOSSIBLE"]
EnemyType = Literal["NORMAL", "CORE", "TRIANGLE"]


@dataclass(frozen=True)
class DamageResult:
    """Resultado inmutable del procesamiento de daño al jugador."""

    new_hp: int
    new_shields: int
    is_game_over: bool
    shield_absorbed: bool


@dataclass(frozen=True)
class ScoreResult:
    """Resultado inmutable del cálculo de puntuación."""

    points_awarded: int
    base_points: int
    wave_multiplier: float
    mode_multiplier: float


@dataclass(frozen=True)
class QuizResult:
    """Resultado inmutable de la evaluación de un intento de hackeo."""

    success: bool
    new_shields: int
    bonus_score: int
    shields_gained: int


@dataclass(frozen=True)
class RankResult:
    """Resultado inmutable de la asignación de rango de operador."""

    rank_name: str
    clearance_level: int
    description: str


@dataclass(frozen=True)
class IdentityResult:
    """Resultado inmutable de la resolución o restauración de identidad de operador."""

    user_id: str
    username: str
    is_restored: bool
    message: str


class CombatRules:
    """Regla 1: Combate, Mitigación de Escudos y Estado de Supervivencia."""

    MAX_HP: int = 100
    MAX_SHIELDS: int = 5

    @classmethod
    def resolve_damage(
        cls,
        current_hp: int,
        current_shields: int,
        game_mode: str,
        damage_amount: int,
        is_invulnerable: bool = False,
    ) -> DamageResult:
        """Calcula el estado del jugador tras recibir impacto o curación.

        - Si el jugador está invulnerable, no recibe daño ni consume escudo.
        - En modo NORMAL: la vida se reduce por `damage_amount`, con límite inferior en 0.
          Si la vida llega a 0, se termina la partida (GAMEOVER).
        - En modos HACKING e IMPOSSIBLE: si cuenta con escudos (> 0), se absorbe
          el daño consumiendo exactamente 1 escudo sin perder vida. Si no quedan
          escudos (0), la partida termina de inmediato con muerte a un golpe.
        - Curación (`damage_amount < 0`): restaura la vida a MAX_HP siempre que el
          jugador siga vivo (`current_hp > 0`).
        """
        valid_modes = {"NORMAL", "HACKING", "IMPOSSIBLE"}
        if game_mode not in valid_modes:
            raise ValueError(f"Modo de juego inválido: '{game_mode}'. Válidos: {valid_modes}")

        # Jugador ya muerto no procesa más impactos
        if current_hp <= 0:
            return DamageResult(
                new_hp=0,
                new_shields=max(0, min(cls.MAX_SHIELDS, current_shields)),
                is_game_over=True,
                shield_absorbed=False,
            )

        # Estado de invulnerabilidad (ej. teletransporte / dash activo)
        if is_invulnerable:
            return DamageResult(
                new_hp=current_hp,
                new_shields=current_shields,
                is_game_over=False,
                shield_absorbed=False,
            )

        # Curación completa
        if damage_amount < 0:
            return DamageResult(
                new_hp=cls.MAX_HP,
                new_shields=current_shields,
                is_game_over=False,
                shield_absorbed=False,
            )

        # Modo Normal: Daño a la barra de vida
        if game_mode == "NORMAL":
            calculated_hp = max(0, current_hp - damage_amount)
            is_dead = calculated_hp == 0
            return DamageResult(
                new_hp=calculated_hp,
                new_shields=0,
                is_game_over=is_dead,
                shield_absorbed=False,
            )

        # Modos Hacking e Impossible: Mecánica de Escudos Matrix
        if current_shields > 0:
            # Absorción exitosa mediante escudo
            remaining_shields = current_shields - 1
            return DamageResult(
                new_hp=current_hp,
                new_shields=remaining_shields,
                is_game_over=False,
                shield_absorbed=True,
            )

        # Muerte a un solo golpe (sin escudos disponibles)
        return DamageResult(
            new_hp=0,
            new_shields=0,
            is_game_over=True,
            shield_absorbed=False,
        )


class ScoreRules:
    """Regla 2: Sistema de Puntuación y Multiplicadores de Modo/Oleada."""

    BASE_SCORES: dict[str, int] = {
        "NORMAL": 100,
        "CORE": 1000,
        "TRIANGLE": 1000,
    }

    MODE_MULTIPLIERS: dict[str, float] = {
        "NORMAL": 1.0,
        "HACKING": 1.5,
        "IMPOSSIBLE": 2.5,
    }

    GRAZE_BONUS_POINTS: int = 15

    @classmethod
    def calculate_score(
        cls,
        enemy_type: str,
        wave: int,
        game_mode: str,
        is_graze: bool = False,
    ) -> ScoreResult:
        """Calcula el puntaje adjudicado por neutralización de amenazas o roce táctico.

        - Base: NORMAL (100 pts), CORE (1000 pts), TRIANGLE (1000 pts).
        - Multiplicador de Oleada: 1.0 + (wave - 1) * 0.10.
        - Multiplicador de Modo: NORMAL (x1.0), HACKING (x1.5), IMPOSSIBLE (x2.5).
        - Graze: 15 puntos extra fijos en NORMAL y HACKING. En IMPOSSIBLE, el roce
          está deshabilitado por política de amenaza letal (retorna 0 bono).
        """
        if wave < 1:
            raise ValueError(f"El número de oleada debe ser >= 1, recibido: {wave}")

        if game_mode not in cls.MODE_MULTIPLIERS:
            raise ValueError(f"Modo de juego desconocido: '{game_mode}'")

        mode_mult = cls.MODE_MULTIPLIERS[game_mode]
        wave_mult = 1.0 + (wave - 1) * 0.10

        if is_graze:
            # Graze táctico de proyectiles
            graze_points = cls.GRAZE_BONUS_POINTS if game_mode != "IMPOSSIBLE" else 0
            return ScoreResult(
                points_awarded=graze_points,
                base_points=cls.GRAZE_BONUS_POINTS,
                wave_multiplier=1.0,
                mode_multiplier=mode_mult,
            )

        if enemy_type not in cls.BASE_SCORES:
            raise ValueError(f"Tipo de enemigo inválido: '{enemy_type}'")

        base_pts = cls.BASE_SCORES[enemy_type]
        final_points = round(base_pts * wave_mult * mode_mult)

        return ScoreResult(
            points_awarded=final_points,
            base_points=base_pts,
            wave_multiplier=wave_mult,
            mode_multiplier=mode_mult,
        )

    @classmethod
    def accumulate_score(
        cls,
        current_score: int,
        additional_score: int,
        current_wave: int,
        additional_wave: int,
    ) -> tuple[int, int]:
        """Suma la puntuación de una nueva partida al registro único del operador.

        - La puntuación acumulada se incrementa con `additional_score`.
        - La oleada registrada pasa a ser el máximo histórico alcanzado
          (`max(current_wave, additional_wave)`).
        """
        if additional_score < 0:
            raise ValueError(f"La puntuación adicional no puede ser negativa: {additional_score}")
        if additional_wave < 1:
            raise ValueError(f"La oleada adicional debe ser >= 1: {additional_wave}")

        new_total_score = current_score + additional_score
        new_max_wave = max(current_wave, additional_wave)
        return new_total_score, new_max_wave


class HackingRules:
    """Regla 3: Evaluación y Recompensas de Inyección de Código (Hacking Quiz)."""

    MAX_SHIELDS: int = 5
    FIRST_TRY_SHIELD_BONUS: int = 2
    NORMAL_SHIELD_BONUS: int = 1
    FIRST_TRY_SCORE_BONUS: int = 500
    RETRY_SCORE_BONUS: int = 250

    @classmethod
    def evaluate_quiz_attempt(
        cls,
        selected_option: int,
        correct_option: int,
        attempts_used: int,
        current_shields: int,
    ) -> QuizResult:
        """Evalúa un intento de respuesta en el minijuego de inyección de código.

        - Acierto al primer intento (`attempts_used == 1`):
          Otorga +2 stacks de escudo (tope 5) y +500 puntos de bonificación.
        - Acierto tras reintentos (`attempts_used > 1`):
          Otorga +1 stack de escudo (tope 5) y +250 puntos de bonificación.
        - Fallo (`selected_option != correct_option`):
          No otorga escudos ni bonificación de puntaje.
        """
        if attempts_used < 1:
            raise ValueError(f"attempts_used debe ser >= 1, recibido: {attempts_used}")

        if selected_option == correct_option:
            shields_to_add = (
                cls.FIRST_TRY_SHIELD_BONUS if attempts_used == 1 else cls.NORMAL_SHIELD_BONUS
            )
            score_bonus = cls.FIRST_TRY_SCORE_BONUS if attempts_used == 1 else cls.RETRY_SCORE_BONUS

            new_shields = min(cls.MAX_SHIELDS, current_shields + shields_to_add)
            effective_gained = max(0, new_shields - current_shields)

            return QuizResult(
                success=True,
                new_shields=new_shields,
                bonus_score=score_bonus,
                shields_gained=effective_gained,
            )

        return QuizResult(
            success=False,
            new_shields=current_shields,
            bonus_score=0,
            shields_gained=0,
        )


class RankingRules:
    """Regla 4: Calificación y Rangos de Operadores en Clasificación."""

    @classmethod
    def calculate_operator_rank(
        cls,
        score: int,
        max_wave: int,
        game_mode: str,
    ) -> RankResult:
        """Determina el rango y nivel de autorización militar del operador.

        - ELITE_OPERATOR (Nivel 4):
          Score >= 10,000 y Wave >= 5 (o en modo IMPOSSIBLE con Score >= 5,000 y Wave >= 3).
        - SECURITY_SPECIALIST (Nivel 3):
          Score >= 4,000 y Wave >= 3.
        - VULNERABILITY_HUNTER (Nivel 2):
          Score >= 1,500 y Wave >= 2.
        - SCRIPT_ROOKIE (Nivel 1):
          Operadores novatos que no alcancen los umbrales de seguridad anteriores.
        """
        if score < 0:
            raise ValueError(f"El puntaje no puede ser negativo: {score}")
        if max_wave < 1:
            raise ValueError(f"La oleada máxima alcanzada debe ser >= 1: {max_wave}")

        # 1. Rango Elite Operator
        is_impossible_elite = game_mode == "IMPOSSIBLE" and score >= 5000 and max_wave >= 3
        is_standard_elite = score >= 10000 and max_wave >= 5

        if is_impossible_elite or is_standard_elite:
            return RankResult(
                rank_name="ELITE_OPERATOR",
                clearance_level=4,
                description=(
                    "Acceso de Nivel 4: Maestro en mitigación de exploits "
                    "y neutralización de núcleos."
                ),
            )

        # 2. Rango Security Specialist
        if score >= 4000 and max_wave >= 3:
            return RankResult(
                rank_name="SECURITY_SPECIALIST",
                clearance_level=3,
                description=(
                    "Acceso de Nivel 3: Capacidad probada en contención de amenazas coordinadas."
                ),
            )

        # 3. Rango Vulnerability Hunter
        if score >= 1500 and max_wave >= 2:
            return RankResult(
                rank_name="VULNERABILITY_HUNTER",
                clearance_level=2,
                description=(
                    "Acceso de Nivel 2: Operador táctico capaz de resolver vectores de intrusión."
                ),
            )

        # 4. Rango Base: Script Rookie
        return RankResult(
            rank_name="SCRIPT_ROOKIE",
            clearance_level=1,
            description="Acceso de Nivel 1: Operador en etapa de instrucción inicial.",
        )


class UserIdentityRules:
    """Regla 5: Creación, Validación y Restauración de Identidad de Operador para Puntuación."""

    MIN_USERNAME_LENGTH: int = 1
    MAX_USERNAME_LENGTH: int = 15

    @classmethod
    def validate_username(cls, username: str) -> str:
        """Valida y sanea el nombre de operador ingresado.

        - Debe tener entre 1 y 15 caracteres (sin contar espacios en blanco extremos).
        - No puede consistir únicamente en espacios en blanco.
        """
        cleaned = username.strip()
        if len(cleaned) < cls.MIN_USERNAME_LENGTH or len(cleaned) > cls.MAX_USERNAME_LENGTH:
            raise ValueError(
                f"El nombre de operador debe tener entre {cls.MIN_USERNAME_LENGTH} "
                f"y {cls.MAX_USERNAME_LENGTH} caracteres (recibido: '{username}')."
            )
        return cleaned

    @classmethod
    def generate_random_operator(cls, prefix: str = "OP-") -> tuple[str, str]:
        """Genera un ID y un nombre temporal aleatorio al entrar al juego."""
        random_code = uuid.uuid4().hex[:8].upper()
        random_id = f"{prefix}{random_code}"
        random_name = f"Cadet_{random_code[:4]}"
        return random_id, random_name

    @classmethod
    def resolve_operator_identity(
        cls,
        input_username: str,
        candidate_id: str,
        existing_users_map: dict[str, str],
    ) -> IdentityResult:
        """Resuelve la identidad del jugador al renombrarse:

        - Si el nombre coincide exactamente con un operador existente en el sistema,
          se restaura su ID original (vinculado a sus puntuaciones históricas).
        - Si es un nombre nuevo, se adopta el ID aleatorio actual para el nuevo operador.
        """
        sanitized_name = cls.validate_username(input_username)
        if not candidate_id or not candidate_id.strip():
            raise ValueError("El ID actual de la sesión no puede estar vacío.")

        clean_candidate_id = candidate_id.strip()

        # Si el nombre exacto ya existe en la base de datos, restaurar su ID original
        if sanitized_name in existing_users_map:
            restored_id = existing_users_map[sanitized_name]
            return IdentityResult(
                user_id=restored_id,
                username=sanitized_name,
                is_restored=True,
                message=f"Operador '{sanitized_name}' reconocido. ID restaurado a {restored_id}.",
            )

        # Si el candidate_id ya pertenece a otro usuario registrado, generar un nuevo ID
        final_id = clean_candidate_id
        if clean_candidate_id in existing_users_map.values():
            new_gen_id, _ = cls.generate_random_operator(prefix="player_")
            final_id = new_gen_id

        # Si no existe, se crea un nuevo operador con el candidate_id (o nuevo ID)
        return IdentityResult(
            user_id=final_id,
            username=sanitized_name,
            is_restored=False,
            message=f"Nuevo operador '{sanitized_name}' registrado con ID {final_id}.",
        )

    @classmethod
    def can_record_score(cls, is_registered_operator: bool) -> bool:
        """Determina si una sesión es elegible para persistir puntuación.

        Solo los operadores que hayan asignado activamente su nombre son elegibles.
        Las sesiones anónimas o sin nombre registrado no guardan puntuación.
        """
        return is_registered_operator
