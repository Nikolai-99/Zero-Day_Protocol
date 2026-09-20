"""Batería de pruebas para la Regla de Negocio 1: Combate y Mitigación de Daño.

Cubre:
- Deducción de daño en modo NORMAL.
- Límite inferior de vida en 0 (HP nunca negativo).
- Disparo de estado Game Over al llegar a 0 de HP.
- Reproducción del defecto real histórico donde la vida se reducía a -10, -20 sin Game Over.
- Mecánica de absorción por escudo en modos HACKING e IMPOSSIBLE.
- Muerte súbita a un golpe en modos avanzados si los escudos están agotados.
- Estado de invulnerabilidad táctica.
- Restauración de vida por ítems de curación.
"""

import pytest

from backend.services.game_rules import CombatRules


class TestCombatRulesNormalMode:
    """Pruebas de combate en modo NORMAL."""

    def test_damage_reduces_hp_correctly(self):
        """El daño estándar debe descontarse directamente de la vida."""
        result = CombatRules.resolve_damage(
            current_hp=100,
            current_shields=0,
            game_mode="NORMAL",
            damage_amount=20,
        )
        assert result.new_hp == 80
        assert result.new_shields == 0
        assert result.is_game_over is False
        assert result.shield_absorbed is False

    def test_damage_exact_lethal_triggers_game_over(self):
        """Un impacto que deja la vida exactamente en 0 debe provocar Game Over."""
        result = CombatRules.resolve_damage(
            current_hp=20,
            current_shields=0,
            game_mode="NORMAL",
            damage_amount=20,
        )
        assert result.new_hp == 0
        assert result.is_game_over is True
        assert result.shield_absorbed is False

    def test_defect_regression_hp_never_drops_negative(self):
        """Reproducción y validación del defecto real histórico del juego.

        Defecto detectado: Cuando el daño superaba la vida restante (ej. HP=10, daño=30 o 40),
        la vida caía a valores negativos (-10, -20, -30) y el bucle de juego no finalizaba
        la partida inmediatamente.
        Comportamiento corregido: La vida debe truncarse rígidamente en 0 (piso matemático)
        y marcar 'is_game_over=True' de forma determinista.
        """
        initial_hp = 10
        overkill_damage = 30  # Sin la regla matemática, 10 - 30 = -20

        result = CombatRules.resolve_damage(
            current_hp=initial_hp,
            current_shields=0,
            game_mode="NORMAL",
            damage_amount=overkill_damage,
        )

        # Verificaciones críticas de la corrección del defecto
        assert result.new_hp >= 0, f"Defecto activo: la vida fue negativa ({result.new_hp})"
        assert result.new_hp == 0
        assert result.is_game_over is True
        assert result.shield_absorbed is False

    @pytest.mark.parametrize(
        ("hp", "damage", "expected_hp", "expected_game_over"),
        [
            (100, 10, 90, False),
            (50, 49, 1, False),
            (50, 50, 0, True),
            (15, 25, 0, True),
            (5, 100, 0, True),
        ],
    )
    def test_damage_boundary_scenarios(self, hp, damage, expected_hp, expected_game_over):
        """Evaluación de casos de frontera para daño y Game Over."""
        result = CombatRules.resolve_damage(
            current_hp=hp,
            current_shields=0,
            game_mode="NORMAL",
            damage_amount=damage,
        )
        assert result.new_hp == expected_hp
        assert result.is_game_over is expected_game_over


class TestCombatRulesShieldModes:
    """Pruebas de absorción de escudos en modos HACKING e IMPOSSIBLE."""

    @pytest.mark.parametrize("mode", ["HACKING", "IMPOSSIBLE"])
    def test_shield_absorbs_damage_completely(self, mode):
        """Si el jugador posee escudos, se absorbe 1 stack y la vida no disminuye."""
        result = CombatRules.resolve_damage(
            current_hp=100,
            current_shields=3,
            game_mode=mode,
            damage_amount=50,
        )
        assert result.new_hp == 100
        assert result.new_shields == 2
        assert result.is_game_over is False
        assert result.shield_absorbed is True

    @pytest.mark.parametrize("mode", ["HACKING", "IMPOSSIBLE"])
    def test_no_shields_causes_instant_death(self, mode):
        """En modos avanzados, recibir impacto con 0 escudos es letal instantáneamente."""
        result = CombatRules.resolve_damage(
            current_hp=100,
            current_shields=0,
            game_mode=mode,
            damage_amount=10,
        )
        assert result.new_hp == 0
        assert result.new_shields == 0
        assert result.is_game_over is True
        assert result.shield_absorbed is False


class TestCombatRulesSpecialConditions:
    """Pruebas de condiciones especiales: invulnerabilidad, curación y excepciones."""

    def test_invulnerability_protects_against_all_damage(self):
        """Durante invulnerabilidad (dash / teletransporte) no se pierde HP ni escudos."""
        result = CombatRules.resolve_damage(
            current_hp=50,
            current_shields=2,
            game_mode="HACKING",
            damage_amount=100,
            is_invulnerable=True,
        )
        assert result.new_hp == 50
        assert result.new_shields == 2
        assert result.is_game_over is False
        assert result.shield_absorbed is False

    def test_healing_restores_hp_to_maximum(self):
        """El daño negativo representa un kit de reparación médica."""
        result = CombatRules.resolve_damage(
            current_hp=30,
            current_shields=0,
            game_mode="NORMAL",
            damage_amount=-50,
        )
        assert result.new_hp == CombatRules.MAX_HP
        assert result.is_game_over is False

    def test_dead_player_remains_dead(self):
        """Un jugador con HP 0 o menor no puede ser revivido por impactos."""
        result = CombatRules.resolve_damage(
            current_hp=0,
            current_shields=2,
            game_mode="NORMAL",
            damage_amount=10,
        )
        assert result.new_hp == 0
        assert result.is_game_over is True

    def test_invalid_game_mode_raises_error(self):
        """Un modo desconocido debe lanzar ValueError para proteger la integridad del dominio."""
        with pytest.raises(ValueError, match="Modo de juego inválido"):
            CombatRules.resolve_damage(
                current_hp=100,
                current_shields=0,
                game_mode="ULTRA_GLSL",
                damage_amount=20,
            )
