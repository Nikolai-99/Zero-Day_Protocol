"""Pruebas de integración para los endpoints REST de reglas de negocio (/api/rules/*)."""

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core.database import Base, get_db
from backend.main import app

# Configuración de base de datos aislada en memoria para testing
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


class TestApiRulesEndpoints:
    """Pruebas sobre la exposición HTTP de las reglas del motor."""

    def test_api_damage_endpoint_normal_mode(self):
        """Endpoint /api/rules/damage debe procesar el impacto y retornar JSON correcto."""
        payload = {
            "current_hp": 80,
            "current_shields": 0,
            "game_mode": "NORMAL",
            "damage_amount": 25,
            "is_invulnerable": False,
        }
        response = client.post("/api/rules/damage", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["new_hp"] == 55
        assert data["is_game_over"] is False
        assert data["shield_absorbed"] is False

    def test_api_damage_endpoint_fatal_defect_regression(self):
        """Endpoint /api/rules/damage trunca el daño en 0 ante overkill."""
        payload = {
            "current_hp": 10,
            "current_shields": 0,
            "game_mode": "NORMAL",
            "damage_amount": 50,
            "is_invulnerable": False,
        }
        response = client.post("/api/rules/damage", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["new_hp"] == 0
        assert data["is_game_over"] is True

    def test_api_score_endpoint(self):
        """Endpoint /api/rules/score calcula puntos con multiplicadores."""
        payload = {
            "enemy_type": "CORE",
            "wave": 2,
            "game_mode": "HACKING",
            "is_graze": False,
        }
        response = client.post("/api/rules/score", json=payload)
        assert response.status_code == 200
        data = response.json()
        # 1000 * 1.1 * 1.5 = 1650
        assert data["points_awarded"] == 1650
        assert data["base_points"] == 1000

    def test_api_quiz_endpoint(self):
        """Endpoint /api/rules/quiz evalúa intento de inyección."""
        payload = {
            "selected_option": 1,
            "correct_option": 1,
            "attempts_used": 1,
            "current_shields": 2,
        }
        response = client.post("/api/rules/quiz", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["new_shields"] == 4
        assert data["bonus_score"] == 500

    def test_api_rank_endpoint(self):
        """Endpoint /api/rules/rank determina nivel militar del jugador."""
        payload = {
            "score": 12000,
            "max_wave": 6,
            "game_mode": "NORMAL",
        }
        response = client.post("/api/rules/rank", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["rank_name"] == "ELITE_OPERATOR"
        assert data["clearance_level"] == 4

    def test_api_damage_invalid_mode_returns_400(self):
        """El endpoint debe responder HTTP 400 si se envía un modo no soportado."""
        payload = {
            "current_hp": 100,
            "current_shields": 0,
            "game_mode": "UNKNOWN_MODE",
            "damage_amount": 10,
            "is_invulnerable": False,
        }
        response = client.post("/api/rules/damage", json=payload)
        assert response.status_code == 400
        assert "Modo de juego inválido" in response.json()["detail"]

    def test_api_identity_rule_endpoint(self):
        """Endpoint /api/rules/identity resuelve y restaura el ID exacto."""
        payload = {
            "username": "Neo",
            "candidate_id": "OP-TEMP-7777",
            "existing_users": {"Neo": "OP-ORIGINAL-ONE", "Trinity": "OP-ORIGINAL-TWO"},
        }
        response = client.post("/api/rules/identity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["is_restored"] is True
        assert data["user_id"] == "OP-ORIGINAL-ONE"
        assert data["username"] == "Neo"

    def test_api_user_registration_and_restoration_lifecycle(self):
        """Ciclo completo en /api/users: registro inicial y restauración en nueva sesión.

        1. Se registra 'CiberOperator' con un ID inicial.
        2. Simula una nueva sesión con un ID aleatorio diferente.
        3. El jugador se renombra con su nombre previo 'CiberOperator'.
        4. La API debe restaurar el ID inicial y marcar is_restored=True.
        """
        import uuid

        unique_name = f"Op_{uuid.uuid4().hex[:6]}"
        initial_id = f"OP-INIT-{uuid.uuid4().hex[:4]}"
        new_session_random_id = f"OP-RAND-{uuid.uuid4().hex[:4]}"

        # Paso 1: Registro por primera vez
        r1 = client.post("/api/users", json={"id": initial_id, "username": unique_name})
        assert r1.status_code == 200
        u1 = r1.json()
        assert u1["id"] == initial_id
        assert u1["username"] == unique_name
        assert u1["is_restored"] is False

        # Paso 2: Renombrar en nueva sesión con nuevo ID aleatorio
        r2 = client.post("/api/users", json={"id": new_session_random_id, "username": unique_name})
        assert r2.status_code == 200
        u2 = r2.json()
        # Verificación clave: el ID fue restaurado al original, no se mantuvo el aleatorio
        assert u2["id"] == initial_id
        assert u2["username"] == unique_name
        assert u2["is_restored"] is True

    def test_api_save_score_unregistered_user_rejected_400(self):
        """Un usuario que no ha ingresado su nombre no puede guardar su puntuación."""
        payload = {
            "user_id": "unregistered_temp_guest_9999",
            "score": 5000,
            "wave": 3,
        }
        response = client.post("/api/scores", json=payload)
        assert response.status_code == 400
        assert "Operador no registrado" in response.json()["detail"]

    def test_api_score_accumulation_and_leaderboard_single_row_with_username(self):
        """Las partidas sucesivas de un operador registrado deben acumularse en un solo registro

        en la tabla de puntuación, mostrando su nombre y la mayor oleada alcanzada.
        """
        import uuid

        unique_name = f"Hero_{uuid.uuid4().hex[:6]}"
        user_id = f"OP-HERO-{uuid.uuid4().hex[:4]}"

        # 1. Registrar operador
        reg_res = client.post("/api/users", json={"id": user_id, "username": unique_name})
        assert reg_res.status_code == 200

        # 2. Primera partida: 1500 puntos, Oleada 2
        s1 = client.post("/api/scores", json={"user_id": user_id, "score": 1500, "wave": 2})
        assert s1.status_code == 200
        d1 = s1.json()
        assert d1["score"] == 1500
        assert d1["wave"] == 2
        assert d1["username"] == unique_name

        # 3. Segunda partida: 2500 puntos, Oleada 4
        s2 = client.post("/api/scores", json={"user_id": user_id, "score": 2500, "wave": 4})
        assert s2.status_code == 200
        d2 = s2.json()
        assert d2["score"] == 4000  # 1500 + 2500 acumulado
        assert d2["wave"] == 4  # max(2, 4)
        assert d2["username"] == unique_name

        # 4. Tercera partida: 500 puntos, Oleada 1 (menor que oleada 4)
        s3 = client.post("/api/scores", json={"user_id": user_id, "score": 500, "wave": 1})
        assert s3.status_code == 200
        d3 = s3.json()
        assert d3["score"] == 4500  # 4000 + 500
        assert d3["wave"] == 4  # Conserva oleada máxima 4

        # 5. Consultar Leaderboard: Debe figurar exactamente UNA línea para este operador
        lb_res = client.get("/api/leaderboard")
        assert lb_res.status_code == 200
        lb = lb_res.json()

        operator_entries = [entry for entry in lb if entry["user_id"] == user_id]
        assert len(operator_entries) == 1, (
            "Debe aparecer solo una linea con el registro del jugador"
        )

        entry = operator_entries[0]
        assert entry["username"] == unique_name
        assert entry["score"] == 4500
        assert entry["wave"] == 4

    def test_api_rename_to_new_user_changes_id_and_preserves_original_user(self):
        """Al cambiar el nombre a un usuario nuevo, el ID debe cambiar según la regla

        y el usuario anterior debe permanecer intacto en la base de datos.
        """
        import uuid

        user1_name = f"Player1_{uuid.uuid4().hex[:4]}"
        user1_id = f"OP-P1-{uuid.uuid4().hex[:4]}"
        user2_name = f"Player2_{uuid.uuid4().hex[:4]}"

        # 1. Registrar Player1 con user1_id
        r1 = client.post("/api/users", json={"id": user1_id, "username": user1_name})
        assert r1.status_code == 200
        u1 = r1.json()
        assert u1["id"] == user1_id
        assert u1["username"] == user1_name

        # 2. El cliente intenta cambiar el nombre a Player2 enviando el mismo user1_id
        r2 = client.post("/api/users", json={"id": user1_id, "username": user2_name})
        assert r2.status_code == 200
        u2 = r2.json()
        # El ID DEBE cambiar según la regla para no sobrescribir a Player1
        assert u2["id"] != user1_id
        assert u2["username"] == user2_name

        # 3. Comprobar que Player1 sigue existiendo con su ID original
        by_name = client.get(f"/api/users/by-name/{user1_name}")
        assert by_name.status_code == 200
        assert by_name.json()["id"] == user1_id

        # 4. Si Player2 vuelve a renombrarse a Player1, restaura su ID original
        r3 = client.post("/api/users", json={"id": u2["id"], "username": user1_name})
        assert r3.status_code == 200
        u3 = r3.json()
        assert u3["id"] == user1_id
        assert u3["is_restored"] is True

    def test_api_recurring_score_accumulation_mid_game(self):
        """La puntuación se guarda y acumula de manera recurrente según enemigos derrotados,

        incluso si la partida no completa una oleada o el jugador sale a mitad de partida.
        """
        import uuid

        op_name = f"MidHero_{uuid.uuid4().hex[:4]}"
        op_id = f"OP-MID-{uuid.uuid4().hex[:4]}"

        client.post("/api/users", json={"id": op_id, "username": op_name})

        # 1. Enemigos derrotados en medio de la oleada 1: 300 pts sincronizados
        r1 = client.post("/api/scores", json={"user_id": op_id, "score": 300, "wave": 1})
        assert r1.status_code == 200
        assert r1.json()["score"] == 300

        # 2. Más enemigos derrotados en la misma oleada antes de salir: 200 pts adicionales
        r2 = client.post("/api/scores", json={"user_id": op_id, "score": 200, "wave": 1})
        assert r2.status_code == 200
        assert r2.json()["score"] == 500  # 300 + 200 acumulados recurrentemente

        # 3. Partida en oleada 2 donde derrota a un enemigo (100 pts) y sale a mitad de partida
        r3 = client.post("/api/scores", json={"user_id": op_id, "score": 100, "wave": 2})
        assert r3.status_code == 200
        assert r3.json()["score"] == 600
        assert r3.json()["wave"] == 2

    def test_api_get_user_stats_with_ranks_and_modes(self):
        """Endpoint /api/users/{user_id}/stats desglosa puntuaciones por modo y rango militar."""
        import uuid

        op_name = f"RankHero_{uuid.uuid4().hex[:4]}"
        op_id = f"OP-RANK-{uuid.uuid4().hex[:4]}"

        client.post("/api/users", json={"id": op_id, "username": op_name})

        # Puntuaciones en modos diferenciados
        client.post(
            "/api/scores",
            json={"user_id": op_id, "score": 4000, "wave": 3, "game_mode": "NORMAL"},
        )
        client.post(
            "/api/scores",
            json={"user_id": op_id, "score": 2500, "wave": 2, "game_mode": "HACKING"},
        )

        res = client.get(f"/api/users/{op_id}/stats")
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == op_id
        assert data["username"] == op_name
        assert data["total_score"] == 6500
        assert data["max_wave"] == 3
        assert data["mode_scores"]["NORMAL"] == 4000
        assert data["mode_scores"]["HACKING"] == 2500
        assert data["mode_scores"]["IMPOSSIBLE"] == 0
        # 6500 pts y oleada 3 => SECURITY_SPECIALIST (requiere >= 4000 y wave >= 3)
        assert data["rank"]["rank_name"] == "SECURITY_SPECIALIST"
        assert data["rank"]["clearance_level"] == 3

    def test_api_leaderboard_includes_mode_scores_and_rank(self):
        """Leaderboard incluye desglose de modos y rango de autorización para cada operador."""
        import uuid

        elite_name = f"Elite_{uuid.uuid4().hex[:4]}"
        elite_id = f"OP-ELITE-{uuid.uuid4().hex[:4]}"

        client.post("/api/users", json={"id": elite_id, "username": elite_name})
        client.post(
            "/api/scores",
            json={"user_id": elite_id, "score": 12000, "wave": 5, "game_mode": "NORMAL"},
        )

        lb_res = client.get("/api/leaderboard")
        assert lb_res.status_code == 200
        lb_list = lb_res.json()
        entry = next(e for e in lb_list if e["user_id"] == elite_id)
        assert entry["username"] == elite_name
        assert entry["score"] == 12000
        assert entry["rank_name"] == "ELITE_OPERATOR"
        assert entry["clearance_level"] == 4
        assert entry["mode_scores"]["NORMAL"] == 12000
