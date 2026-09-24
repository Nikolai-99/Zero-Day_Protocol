"""Batería de pruebas para la Regla de Negocio 4: Rangos de Operadores.

Cubre:
- Categorización jerárquica en los 4 niveles de autorización de seguridad:
  1. ELITE_OPERATOR (Nivel 4).
  2. SECURITY_SPECIALIST (Nivel 3).
  3. VULNERABILITY_HUNTER (Nivel 2).
  4. SCRIPT_ROOKIE (Nivel 1).
- Condición de mérito táctico acelerado para modo IMPOSSIBLE (Score >= 5000 y Wave >= 3).
- Análisis exhaustivo de valores de frontera (boundary values) en umbrales de puntuación y oleada.
- Validación defensiva de entradas ilógicas (puntaje negativo, oleada < 1).
"""

import pytest

from backend.services.game_rules import RankingRules


class TestRankingRulesClassification:

    def test_standard_elite_operator_qualification(self):
        """Un score de 10,000 y oleada 5 debe clasificar como ELITE_OPERATOR (Nivel 4)."""
        result = RankingRules.calculate_operator_rank(
            score=10000,
            max_wave=5,
            game_mode="NORMAL",
        )
        assert result.rank_name == "ELITE_OPERATOR"
        assert result.clearance_level == 4

    def test_impossible_mode_elite_operator_qualification(self):
        """En modo IMPOSSIBLE, el rango élite se desbloquea con 5,000 puntos y oleada 3."""
        result = RankingRules.calculate_operator_rank(
            score=5000,
            max_wave=3,
            game_mode="IMPOSSIBLE",
        )
        assert result.rank_name == "ELITE_OPERATOR"
        assert result.clearance_level == 4

    def test_security_specialist_qualification(self):
        """Score >= 4,000 y Oleada >= 3 otorgan SECURITY_SPECIALIST (Nivel 3)."""
        result = RankingRules.calculate_operator_rank(
            score=4500,
            max_wave=3,
            game_mode="NORMAL",
        )
        assert result.rank_name == "SECURITY_SPECIALIST"
        assert result.clearance_level == 3

    def test_vulnerability_hunter_qualification(self):
        """Score >= 1,500 y Oleada >= 2 otorgan VULNERABILITY_HUNTER (Nivel 2)."""
        result = RankingRules.calculate_operator_rank(
            score=2000,
            max_wave=2,
            game_mode="NORMAL",
        )
        assert result.rank_name == "VULNERABILITY_HUNTER"
        assert result.clearance_level == 2

    def test_script_rookie_default_tier(self):
        """Puntuaciones bajas o tempranas reciben SCRIPT_ROOKIE (Nivel 1)."""
        result = RankingRules.calculate_operator_rank(
            score=800,
            max_wave=1,
            game_mode="NORMAL",
        )
        assert result.rank_name == "SCRIPT_ROOKIE"
        assert result.clearance_level == 1


class TestRankingRulesBoundaryAnalysis:
    """Análisis riguroso de frontera para los umbrales de cada rango."""

    @pytest.mark.parametrize(
        ("score", "wave", "mode", "expected_rank", "expected_level"),
        [
            # Frontera SCRIPT_ROOKIE vs VULNERABILITY_HUNTER (1500 pts, Wave 2)
            (1499, 2, "NORMAL", "SCRIPT_ROOKIE", 1),
            (1500, 1, "NORMAL", "SCRIPT_ROOKIE", 1),
            (1500, 2, "NORMAL", "VULNERABILITY_HUNTER", 2),
            # Frontera VULNERABILITY_HUNTER vs SECURITY_SPECIALIST (4000 pts, Wave 3)
            (3999, 3, "NORMAL", "VULNERABILITY_HUNTER", 2),
            (4000, 2, "NORMAL", "VULNERABILITY_HUNTER", 2),
            (4000, 3, "NORMAL", "SECURITY_SPECIALIST", 3),
            # Frontera SECURITY_SPECIALIST vs ELITE_OPERATOR estándar (10000 pts, Wave 5)
            (9999, 5, "NORMAL", "SECURITY_SPECIALIST", 3),
            (10000, 4, "NORMAL", "SECURITY_SPECIALIST", 3),
            (10000, 5, "NORMAL", "ELITE_OPERATOR", 4),
            # Frontera acelerada en IMPOSSIBLE (5000 pts, Wave 3)
            (4999, 3, "IMPOSSIBLE", "SECURITY_SPECIALIST", 3),
            (5000, 2, "IMPOSSIBLE", "VULNERABILITY_HUNTER", 2),
            (5000, 3, "IMPOSSIBLE", "ELITE_OPERATOR", 4),
        ],
    )
    def test_boundary_thresholds(self, score, wave, mode, expected_rank, expected_level):
        """Verificación exacta de valores límite por encima y por debajo del corte."""
        result = RankingRules.calculate_operator_rank(
            score=score,
            max_wave=wave,
            game_mode=mode,
        )
        assert result.rank_name == expected_rank
        assert result.clearance_level == expected_level


class TestRankingRulesDefensiveValidation:
    """Validación de restricciones numéricas."""

    def test_negative_score_raises_error(self):
        """Un puntaje negativo debe lanzar ValueError."""
        with pytest.raises(ValueError, match="El puntaje no puede ser negativo"):
            RankingRules.calculate_operator_rank(
                score=-10,
                max_wave=1,
                game_mode="NORMAL",
            )

    def test_zero_wave_raises_error(self):
        """Una oleada menor a 1 debe lanzar ValueError."""
        with pytest.raises(ValueError, match="La oleada máxima alcanzada debe ser >= 1"):
            RankingRules.calculate_operator_rank(
                score=1000,
                max_wave=0,
                game_mode="NORMAL",
            )
