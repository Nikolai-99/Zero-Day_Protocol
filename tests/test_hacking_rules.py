"""Batería de pruebas para la Regla de Negocio 3: Hacking Quiz (Inyección de Código).

Cubre:
- Acierto al primer intento (bono máximo: +2 escudos, +500 puntos).
- Acierto en reintentos (bono estándar: +1 escudo, +250 puntos).
- Límite máximo de escudos acumulables (tope rígido en 5).
- Respuesta fallida (sin recompensas ni alteración del estado defensivo).
- Validación de integridad en el contador de intentos.
"""

import pytest

from backend.services.game_rules import HackingRules


class TestHackingRulesEvaluation:
    """Pruebas funcionales de evaluación del minijuego de inyección de código."""

    def test_first_attempt_success_grants_full_bonus(self):
        """El primer intento exitoso debe conceder 2 escudos y 500 puntos."""
        result = HackingRules.evaluate_quiz_attempt(
            selected_option=2,
            correct_option=2,
            attempts_used=1,
            current_shields=1,
        )
        assert result.success is True
        assert result.new_shields == 3
        assert result.shields_gained == 2
        assert result.bonus_score == 500

    @pytest.mark.parametrize("attempt", [2, 3, 4])
    def test_retry_success_grants_standard_bonus(self, attempt):
        """Los aciertos tras reintentos otorgan 1 escudo y 250 puntos."""
        result = HackingRules.evaluate_quiz_attempt(
            selected_option=0,
            correct_option=0,
            attempts_used=attempt,
            current_shields=2,
        )
        assert result.success is True
        assert result.new_shields == 3
        assert result.shields_gained == 1
        assert result.bonus_score == 250

    def test_failed_attempt_gives_no_rewards(self):
        """Una respuesta errónea no altera los escudos ni concede bonificación."""
        result = HackingRules.evaluate_quiz_attempt(
            selected_option=1,
            correct_option=3,
            attempts_used=1,
            current_shields=2,
        )
        assert result.success is False
        assert result.new_shields == 2
        assert result.shields_gained == 0
        assert result.bonus_score == 0

    @pytest.mark.parametrize(
        ("initial_shields", "attempts", "expected_shields", "expected_gained"),
        [
            (3, 1, 5, 2),  # 3 + 2 = 5 (llega justo al tope)
            (4, 1, 5, 1),  # 4 + 2 = 6 -> truncado a 5 (gana 1 neto)
            (5, 1, 5, 0),  # Ya en el tope -> gana 0 neto
            (5, 2, 5, 0),  # Reintento ya en el tope -> gana 0 neto
            (0, 1, 2, 2),  # Desde 0 gana 2
        ],
    )
    def test_shield_cap_enforcement(
        self, initial_shields, attempts, expected_shields, expected_gained
    ):
        """El jugador nunca debe superar el límite de 5 escudos Matrix."""
        result = HackingRules.evaluate_quiz_attempt(
            selected_option=1,
            correct_option=1,
            attempts_used=attempts,
            current_shields=initial_shields,
        )
        assert result.new_shields == expected_shields
        assert result.shields_gained == expected_gained
        assert result.new_shields <= HackingRules.MAX_SHIELDS

    def test_invalid_attempts_count_raises_error(self):
        """Un contador de intentos menor a 1 debe provocar una excepción."""
        with pytest.raises(ValueError, match="attempts_used debe ser >= 1"):
            HackingRules.evaluate_quiz_attempt(
                selected_option=1,
                correct_option=1,
                attempts_used=0,
                current_shields=0,
            )
