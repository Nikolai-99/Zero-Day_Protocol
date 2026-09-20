"""Batería de pruebas para la Regla de Negocio 2: Sistema de Puntuación.

Cubre:
- Puntuaciones base por categoría de malware (NORMAL, CORE, TRIANGLE).
- Progresión escalar del multiplicador de oleada (1.0 + (wave - 1) * 0.10).
- Multiplicadores de riesgo por modo de juego (NORMAL=1.0, HACKING=1.5, IMPOSSIBLE=2.5).
- Mecánica de roce táctico (Graze) y su inhabilitación en modo IMPOSSIBLE.
- Manejo defensivo ante parámetros anómalos o fuera de especificación.
"""

import pytest

from backend.services.game_rules import ScoreRules


class TestScoreRulesKillCalculation:
    """Pruebas de puntuación por eliminación de enemigos."""

    @pytest.mark.parametrize(
        ("enemy_type", "expected_base"),
        [
            ("NORMAL", 100),
            ("CORE", 1000),
            ("TRIANGLE", 1000),
        ],
    )
    def test_base_scores_wave_1_normal_mode(self, enemy_type, expected_base):
        """En oleada 1 y modo NORMAL, el puntaje otorgado coincide exactamente con la base."""
        result = ScoreRules.calculate_score(
            enemy_type=enemy_type,
            wave=1,
            game_mode="NORMAL",
        )
        assert result.base_points == expected_base
        assert result.wave_multiplier == 1.0
        assert result.mode_multiplier == 1.0
        assert result.points_awarded == expected_base

    @pytest.mark.parametrize(
        ("wave", "expected_wave_mult"),
        [
            (1, 1.0),
            (2, 1.1),
            (3, 1.2),
            (5, 1.4),
            (10, 1.9),
        ],
    )
    def test_wave_multiplier_scaling(self, wave, expected_wave_mult):
        """El multiplicador de oleada debe aumentar un 10% adicional por cada oleada superada."""
        result = ScoreRules.calculate_score(
            enemy_type="NORMAL",
            wave=wave,
            game_mode="NORMAL",
        )
        assert pytest.approx(result.wave_multiplier) == expected_wave_mult
        assert result.points_awarded == round(100 * expected_wave_mult)

    @pytest.mark.parametrize(
        ("game_mode", "expected_mode_mult"),
        [
            ("NORMAL", 1.0),
            ("HACKING", 1.5),
            ("IMPOSSIBLE", 2.5),
        ],
    )
    def test_mode_multipliers(self, game_mode, expected_mode_mult):
        """Los modos de dificultad más altos deben multiplicar proporcionalmente la recompensa."""
        result = ScoreRules.calculate_score(
            enemy_type="CORE",
            wave=1,
            game_mode=game_mode,
        )
        assert result.mode_multiplier == expected_mode_mult
        assert result.points_awarded == round(1000 * expected_mode_mult)

    def test_combined_wave_and_mode_multipliers(self):
        """Comprueba el cálculo combinado con enemigo CORE en oleada 5 y modo IMPOSSIBLE."""
        # Base: 1000, Wave 5: 1.4, Mode IMPOSSIBLE: 2.5 -> 1000 * 1.4 * 2.5 = 3500
        result = ScoreRules.calculate_score(
            enemy_type="CORE",
            wave=5,
            game_mode="IMPOSSIBLE",
        )
        assert result.points_awarded == 3500
        assert result.base_points == 1000
        assert pytest.approx(result.wave_multiplier) == 1.4
        assert result.mode_multiplier == 2.5


class TestScoreRulesGraze:
    """Pruebas de la mecánica de graze (roce de proyectiles)."""

    def test_graze_in_normal_mode_awards_bonus(self):
        """En modo NORMAL, el graze exitoso otorga 15 puntos fijos."""
        result = ScoreRules.calculate_score(
            enemy_type="NORMAL",
            wave=3,
            game_mode="NORMAL",
            is_graze=True,
        )
        assert result.points_awarded == 15
        assert result.base_points == 15

    def test_graze_in_hacking_mode_awards_bonus(self):
        """En modo HACKING, el graze exitoso otorga 15 puntos fijos."""
        result = ScoreRules.calculate_score(
            enemy_type="NORMAL",
            wave=1,
            game_mode="HACKING",
            is_graze=True,
        )
        assert result.points_awarded == 15

    def test_graze_disabled_in_impossible_mode(self):
        """En modo IMPOSSIBLE, el roce está penalizado/inhabilitado dando 0 puntos de bono."""
        result = ScoreRules.calculate_score(
            enemy_type="NORMAL",
            wave=2,
            game_mode="IMPOSSIBLE",
            is_graze=True,
        )
        assert result.points_awarded == 0
        assert result.base_points == 15


class TestScoreRulesDefensiveValidation:
    """Pruebas de integridad de parámetros para el servicio de puntuación."""

    def test_wave_less_than_one_raises_error(self):
        """Una oleada menor a 1 debe lanzar ValueError."""
        with pytest.raises(ValueError, match="El número de oleada debe ser >= 1"):
            ScoreRules.calculate_score(
                enemy_type="NORMAL",
                wave=0,
                game_mode="NORMAL",
            )

    def test_invalid_mode_raises_error(self):
        """Un modo desconocido debe lanzar ValueError."""
        with pytest.raises(ValueError, match="Modo de juego desconocido"):
            ScoreRules.calculate_score(
                enemy_type="NORMAL",
                wave=1,
                game_mode="CUSTOM_UNKNOWN",
            )

    def test_invalid_enemy_type_raises_error(self):
        """Un tipo de enemigo desconocido debe lanzar ValueError."""
        with pytest.raises(ValueError, match="Tipo de enemigo inválido"):
            ScoreRules.calculate_score(
                enemy_type="BOSS_LEVIATHAN",
                wave=1,
                game_mode="NORMAL",
            )


class TestScoreRulesAccumulation:
    """Pruebas de la lógica de acumulación de puntuación para un único registro de operador."""

    def test_accumulate_score_sums_points_and_takes_max_wave(self):
        """La puntuación debe sumarse y la oleada debe actualizarse al máximo alcanzado."""
        total_score, max_wave = ScoreRules.accumulate_score(
            current_score=1200,
            additional_score=800,
            current_wave=2,
            additional_wave=4,
        )
        assert total_score == 2000
        assert max_wave == 4

    def test_accumulate_score_preserves_higher_previous_wave(self):
        """Si la partida actual terminó en una oleada menor a la histórica, conserva la mayor."""
        total_score, max_wave = ScoreRules.accumulate_score(
            current_score=3000,
            additional_score=500,
            current_wave=5,
            additional_wave=2,
        )
        assert total_score == 3500
        assert max_wave == 5

    def test_accumulate_negative_score_raises_error(self):
        """Una puntuación adicional negativa debe lanzar ValueError."""
        with pytest.raises(ValueError, match="La puntuación adicional no puede ser negativa"):
            ScoreRules.accumulate_score(
                current_score=1000,
                additional_score=-50,
                current_wave=2,
                additional_wave=3,
            )

    def test_accumulate_invalid_wave_raises_error(self):
        """Una oleada adicional menor a 1 debe lanzar ValueError."""
        with pytest.raises(ValueError, match="La oleada adicional debe ser >= 1"):
            ScoreRules.accumulate_score(
                current_score=1000,
                additional_score=100,
                current_wave=2,
                additional_wave=0,
            )
