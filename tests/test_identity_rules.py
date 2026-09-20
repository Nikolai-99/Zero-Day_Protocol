"""Batería de pruebas para la Regla de Negocio 5: Identidad y Restauración de Operador.

Cubre:
- Validación y saneamiento del nombre de operador (longitud 1 a 15 caracteres).
- Generación de operadores efímeros/aleatorios al entrar al juego.
- Resolución de identidad: restauración del ID original cuando el jugador ingresa
  su nombre exacto registrado previamente.
- Registro de nuevo operador adoptando el ID candidato cuando el nombre es nuevo.
- Manejo defensivo ante entradas vacías o que excedan los límites de caracteres.
"""

import pytest

from backend.services.game_rules import UserIdentityRules


class TestUserIdentityValidation:
    """Pruebas de validación sintáctica del nombre de operador."""

    @pytest.mark.parametrize(
        "valid_name",
        [
            "A",
            "Neo",
            "ZeroCool_99",
            "123456789012345",  # Exactamente 15 caracteres
            "  Trinity  ",  # Se debe sanear/recortar
        ],
    )
    def test_validate_username_success(self, valid_name):
        """Los nombres válidos deben ser aceptados y limpios de espacios periféricos."""
        cleaned = UserIdentityRules.validate_username(valid_name)
        assert len(cleaned) >= UserIdentityRules.MIN_USERNAME_LENGTH
        assert len(cleaned) <= UserIdentityRules.MAX_USERNAME_LENGTH
        assert cleaned == valid_name.strip()

    @pytest.mark.parametrize(
        "invalid_name",
        [
            "",
            "   ",
            "\t\n",
            "SuperCiberHacker2026",  # 20 caracteres (supera 15)
            "A" * 16,  # 16 caracteres
        ],
    )
    def test_validate_username_invalid_raises_error(self, invalid_name):
        """Nombres vacíos, de solo espacios o de longitud > 15 deben lanzar ValueError."""
        with pytest.raises(ValueError, match="El nombre de operador debe tener entre"):
            UserIdentityRules.validate_username(invalid_name)


class TestUserIdentityRandomGeneration:
    """Pruebas de generación de sesión aleatoria de operador al iniciar el juego."""

    def test_generate_random_operator_default_format(self):
        """Debe generar un ID con prefijo OP- y un nombre por defecto Cadet_."""
        user_id, username = UserIdentityRules.generate_random_operator()
        assert user_id.startswith("OP-")
        assert len(user_id) == 11  # 'OP-' (3) + 8 caracteres hex
        assert username.startswith("Cadet_")

    def test_generate_random_operator_custom_prefix(self):
        """Permite personalizar el prefijo del ID generado."""
        user_id, username = UserIdentityRules.generate_random_operator(prefix="player_")
        assert user_id.startswith("player_")
        assert len(user_id) == 15  # 'player_' (7) + 8 caracteres hex


class TestUserIdentityResolutionAndRestoration:
    """Pruebas de la lógica de reclamo y restauración de ID por nombre exacto."""

    def test_exact_name_match_restores_original_id(self):
        """Regla de Negocio: Si el usuario ingresa su nombre exacto en 'renombrar',

        el sistema debe restaurar el ID original asociado a dicho usuario para
        conservar su progreso histórico de puntuación en el Leaderboard.
        """
        existing_database = {
            "ZeroCool": "OP-HISTORIC-01",
            "AcidBurn": "OP-HISTORIC-02",
        }
        current_random_session_id = "OP-TEMP-9999"

        result = UserIdentityRules.resolve_operator_identity(
            input_username="ZeroCool",
            candidate_id=current_random_session_id,
            existing_users_map=existing_database,
        )

        assert result.is_restored is True
        assert result.user_id == "OP-HISTORIC-01"  # Se restauró el ID original
        assert result.username == "ZeroCool"
        assert "ID restaurado" in result.message

    def test_new_username_registers_with_candidate_id(self):
        """Si el nombre ingresado no existe en la base de datos,

        se adopta el ID candidato actual como identidad del nuevo operador.
        """
        existing_database = {
            "ZeroCool": "OP-HISTORIC-01",
        }
        current_random_session_id = "OP-TEMP-5555"

        result = UserIdentityRules.resolve_operator_identity(
            input_username="PhantomPhreak",
            candidate_id=current_random_session_id,
            existing_users_map=existing_database,
        )

        assert result.is_restored is False
        assert result.user_id == "OP-TEMP-5555"
        assert result.username == "PhantomPhreak"
        assert "Nuevo operador" in result.message

    def test_renaming_to_new_user_when_candidate_id_already_taken_assigns_new_id(self):
        """Si el candidate_id ya pertenece a otro usuario en la base de datos,
        el sistema debe generar un nuevo ID para el nuevo nombre, asegurando que
        el ID cambie y no se sobrescriba al operador previo.
        """
        existing_database = {
            "ExistingPlayer": "OP-TAKEN-01",
        }
        result = UserIdentityRules.resolve_operator_identity(
            input_username="NewPlayer",
            candidate_id="OP-TAKEN-01",
            existing_users_map=existing_database,
        )

        assert result.is_restored is False
        assert result.username == "NewPlayer"
        assert result.user_id != "OP-TAKEN-01"
        assert result.user_id.startswith("player_")

    def test_empty_candidate_id_raises_error(self):
        """Un ID de sesión vacío debe lanzar ValueError."""
        with pytest.raises(ValueError, match="El ID actual de la sesión no puede estar vacío"):
            UserIdentityRules.resolve_operator_identity(
                input_username="Morpheus",
                candidate_id="",
                existing_users_map={},
            )


class TestUserIdentityScoreEligibility:
    """Pruebas para determinar la elegibilidad de persistencia de puntuación."""

    def test_registered_operator_can_record_score(self):
        """Un operador que ha ingresado su nombre es elegible para guardar su puntuación."""
        assert UserIdentityRules.can_record_score(is_registered_operator=True) is True

    def test_unregistered_operator_cannot_record_score(self):
        """Una sesión anónima que no colocó su nombre no debe guardar su puntuación."""
        assert UserIdentityRules.can_record_score(is_registered_operator=False) is False
