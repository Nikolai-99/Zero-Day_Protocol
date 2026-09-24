"""Pruebas de integración sobre los contratos de la interfaz consumible (FastAPI).

Verifica:
- Cumplimiento de contratos JSON y códigos de estado HTTP (200, 201, 400, 422).
- Validación estricta de esquemas Pydantic ante tipos o campos malformados.
- Persistencia e integridad referencial acumulada en base de datos aislada.
- Detección exclusiva de defectos de contrato (Nivel 2 de la pirámide).
"""

from fastapi.testclient import TestClient


class TestApiContractsAndValidation:
    """Verificación de contratos HTTP y esquemas de datos."""

    def test_post_user_valid_contract(self, client: TestClient, synthetic_operator: dict):
        """Registro de operador retorna 200 y el contrato de usuario esperado."""
        res = client.post("/api/users", json=synthetic_operator)
        assert res.status_code == 200
        data = res.json()
        assert "id" in data
        assert "username" in data
        assert data["id"] == synthetic_operator["id"]
        assert data["username"] == synthetic_operator["username"]

    def test_post_user_missing_required_fields_returns_422(self, client: TestClient):
        """Si falta un campo obligatorio (username), Pydantic debe rechazar con HTTP 422."""
        res = client.post("/api/users", json={"id": "MISSING-NAME-ID"})
        assert res.status_code == 422
        errors = res.json().get("detail", [])
        assert any("username" in str(err.get("loc", [])) for err in errors)

    def test_post_score_invalid_types_returns_422(
        self, client: TestClient, synthetic_operator: dict
    ):
        """Si se envía un score como texto alfanumérico no numérico, retorna HTTP 422."""
        client.post("/api/users", json=synthetic_operator)
        payload = {
            "user_id": synthetic_operator["id"],
            "score": "INVALID_NON_NUMERIC_SCORE",
            "wave": 1,
            "game_mode": "NORMAL",
        }
        res = client.post("/api/scores", json=payload)
        assert res.status_code == 422

    def test_rules_damage_endpoint_contract(self, client: TestClient):
        """Endpoint /api/rules/damage cumple con el contrato JSON y estructura de respuesta."""
        payload = {
            "current_hp": 100,
            "current_shields": 0,
            "game_mode": "NORMAL",
            "damage_amount": 30,
            "is_invulnerable": False,
        }
        res = client.post("/api/rules/damage", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["new_hp"] == 70
        assert data["new_shields"] == 0
        assert data["is_game_over"] is False
        assert data["shield_absorbed"] is False

    def test_rules_damage_endpoint_invalid_mode_returns_400(self, client: TestClient):
        """Endpoint /api/rules/damage rechaza modos de juego fuera de los válidos con HTTP 400."""
        payload = {
            "current_hp": 100,
            "current_shields": 0,
            "game_mode": "GOD_MODE_INVALID",
            "damage_amount": 30,
            "is_invulnerable": False,
        }
        res = client.post("/api/rules/damage", json=payload)
        assert res.status_code == 400
        assert "Modo de juego inválido" in res.json().get("detail", "")

    def test_rules_score_endpoint_contract(self, client: TestClient):
        """Endpoint /api/rules/score calcula puntos y respeta el contrato esperado."""
        payload = {
            "enemy_type": "NORMAL",
            "wave": 3,
            "game_mode": "NORMAL",
            "is_graze": False,
        }
        res = client.post("/api/rules/score", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "points_awarded" in data
        assert "base_points" in data
        assert "wave_multiplier" in data
        assert "mode_multiplier" in data
        assert data["base_points"] == 100
        assert data["wave_multiplier"] == 1.2
        assert data["points_awarded"] == 120

    def test_rules_rank_endpoint_contract(self, client: TestClient):
        """Endpoint /api/rules/rank retorna la jerarquía y nivel de autorización correcto."""
        payload = {
            "score": 15000,
            "max_wave": 6,
            "game_mode": "NORMAL",
        }
        res = client.post("/api/rules/rank", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["rank_name"] == "ELITE_OPERATOR"
        assert data["clearance_level"] == 4
        assert "description" in data


class TestApiRelationalPersistence:
    """Verificación de persistencia multicomponente e integridad relacional."""

    def test_full_user_score_lifecycle_and_rank_aggregation(
        self, client: TestClient, synthetic_operator: dict
    ):
        """Flujo completo de persistencia: Usuario -> Partidas múltiples -> Agregación y Rank."""
        op_id = synthetic_operator["id"]
        op_name = synthetic_operator["username"]

        # 1. Crear operador
        user_res = client.post("/api/users", json={"id": op_id, "username": op_name})
        assert user_res.status_code == 200

        # 2. Registrar primera partida en NORMAL
        score1_res = client.post(
            "/api/scores",
            json={"user_id": op_id, "score": 2500, "wave": 2, "game_mode": "NORMAL"},
        )
        assert score1_res.status_code == 200

        # 3. Registrar segunda partida en IMPOSSIBLE
        score2_res = client.post(
            "/api/scores",
            json={"user_id": op_id, "score": 3000, "wave": 3, "game_mode": "IMPOSSIBLE"},
        )
        assert score2_res.status_code == 200

        # 4. Consultar estadísticas consolidadas del operador
        stats_res = client.get(f"/api/users/{op_id}/stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()

        assert stats["user_id"] == op_id
        assert stats["username"] == op_name
        assert stats["total_score"] == 5500
        assert stats["max_wave"] == 3
        assert stats["mode_scores"]["NORMAL"] == 2500
        assert stats["mode_scores"]["IMPOSSIBLE"] == 3000
        assert stats["mode_scores"]["HACKING"] == 0

        # 5500 pts y Wave 3 en NORMAL => SECURITY_SPECIALIST (requiere >= 4000 y wave >= 3)
        assert stats["rank"]["rank_name"] == "SECURITY_SPECIALIST"
        assert stats["rank"]["clearance_level"] == 3

        # 5. Comprobar que aparece en el Leaderboard consolidado sin duplicar filas
        lb_res = client.get("/api/leaderboard")
        assert lb_res.status_code == 200
        entries = lb_res.json()
        matching = [e for e in entries if e["user_id"] == op_id]
        assert len(matching) == 1, (
            "El operador debe tener exactamente una fila agregada en el Leaderboard"
        )
        assert matching[0]["score"] == 5500
        assert matching[0]["wave"] == 3
