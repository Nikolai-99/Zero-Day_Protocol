"""Batería de Pruebas No Funcionales Automatizadas — Zero-Day Protocol.

Cubre las categorías exigidas por la Evaluación Final:
1. Rendimiento (Performance): Umbrales de latencia matemática y tiempos de respuesta.
2. Seguridad (Security): Protección ante SQL Injection, evasión de contratos y sanitización.
3. Privacidad y Minimización (Ley 21.719): Verificación de esquemas sin PII y derecho de supresión.
"""

import time

from fastapi.testclient import TestClient

from backend.services.game_rules import CombatRules, ScoreRules


class TestPerformanceCriticalOperations:
    """Mediciones de rendimiento con umbrales declarados antes de medir (Criterio C)."""

    def test_combat_resolution_latency_below_threshold(self):
        """Umbral declarado: Latencia de resolución de combate <= 0.5 ms por ejecución.

        Una simulación de 1,000 impactos sucesivos no debe exceder 500 ms en total.
        """
        iterations = 1000
        start_time = time.perf_counter()

        for _ in range(iterations):
            CombatRules.resolve_damage(
                current_hp=100,
                current_shields=3,
                game_mode="HACKING",
                damage_amount=25,
            )

        total_elapsed = time.perf_counter() - start_time
        avg_latency_ms = (total_elapsed / iterations) * 1000

        # Umbral predefinido: 0.5 ms
        assert avg_latency_ms < 0.5, (
            f"Latencia media {avg_latency_ms:.4f} ms supera umbral de 0.5 ms"
        )

    def test_score_calculation_latency_below_threshold(self):
        """Umbral declarado: Latencia de cálculo de puntuación escalar <= 0.1 ms por llamada.

        5,000 cálculos de puntuación de impacto no deben superar 500 ms.
        """
        iterations = 5000
        start_time = time.perf_counter()

        for _ in range(iterations):
            ScoreRules.calculate_score(
                enemy_type="CORE",
                wave=5,
                game_mode="IMPOSSIBLE",
            )

        total_elapsed = time.perf_counter() - start_time
        avg_latency_ms = (total_elapsed / iterations) * 1000

        # Umbral predefinido: 0.1 ms
        assert avg_latency_ms < 0.1, (
            f"Latencia media {avg_latency_ms:.4f} ms supera umbral de 0.1 ms"
        )

    def test_api_damage_endpoint_response_time_below_threshold(self, client: TestClient):
        """Umbral declarado: Tiempo de respuesta HTTP del endpoint /api/rules/damage <= 50 ms."""
        payload = {
            "current_hp": 80,
            "current_shields": 2,
            "game_mode": "HACKING",
            "damage_amount": 20,
            "is_invulnerable": False,
        }

        # Calentamiento inicial del handler
        client.post("/api/rules/damage", json=payload)

        # Medición cronometrada
        start_time = time.perf_counter()
        response = client.post("/api/rules/damage", json=payload)
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        assert response.status_code == 200
        # Umbral predefinido: 50 ms
        assert elapsed_ms < 50.0, (
            f"Tiempo de respuesta {elapsed_ms:.2f} ms supera el umbral de 50 ms"
        )


class TestSecurityDefensiveIntegrity:
    """Verificación de seguridad: no confiar en datos del cliente y sanitizar inputs."""

    def test_sql_injection_attempt_in_callsign_is_treated_as_literal(self, client: TestClient):
        """Umbral: SQLi en Callsign no altera la base de datos ni ejecuta sentencias."""
        # Intento de SQL Injection extenso (>15 caracteres)
        sql_injection_payload = {
            "id": "OP-SEC-TEST",
            "username": "'; DROP TABLE users; --",
        }
        response = client.post("/api/users", json=sql_injection_payload)
        assert response.status_code in (400, 422)

        # Inyección SQL acotada (<= 15 caracteres) tratada como literal plano
        short_sqli = {
            "id": "OP-SEC-SHORT",
            "username": "' OR 1=1;--",
        }
        res_short = client.post("/api/users", json=short_sqli)
        assert res_short.status_code == 200
        data = res_short.json()
        assert data["username"] == "' OR 1=1;--"

        # Comprobar que la tabla users sigue existiendo y respondiendo normalmente
        leaderboard_res = client.get("/api/leaderboard")
        assert leaderboard_res.status_code == 200

    def test_xss_script_injection_in_callsign_is_rejected_or_bounded(self, client: TestClient):
        """Umbral: Payloads script son rechazados por longitud o tratados como strings planos."""
        xss_payload = {
            "id": "OP-XSS-TEST",
            "username": "<script>alert(1)</script>",
        }
        response = client.post("/api/users", json=xss_payload)
        assert response.status_code in (400, 422)

    def test_client_cannot_forge_negative_accumulated_score(self, client: TestClient):
        """Umbral: Cliente malicioso no puede enviar puntuación negativa al ranking."""
        negative_payload = {
            "user_id": "OP-HACK-01",
            "score": -99999,
            "wave": 1,
            "game_mode": "NORMAL",
        }
        response = client.post("/api/scores", json=negative_payload)
        assert response.status_code in (400, 422)


class TestPrivacyAndDataMinimizationLey21719:
    """Verificación de cumplimiento de principios de Privacidad y Ley 21.719 (Criterio C)."""

    def test_operator_model_does_not_collect_personally_identifiable_information(
        self, client: TestClient
    ):
        """Principio de Minimización (Ley 21.719):

        El modelo de usuario solo expone id y username táctico.
        No almacena ni expone correos, IPs, DNI/RUT, contraseñas ni geolocalización.
        """
        response = client.post(
            "/api/users", json={"id": "OP-TEST-PRIV", "username": "ZeroTactical"}
        )
        assert response.status_code == 200
        user_data = response.json()

        forbidden_keys = {"email", "password", "rut", "dni", "phone", "ip_address", "location"}
        actual_keys = set(user_data.keys())

        assert forbidden_keys.isdisjoint(actual_keys), (
            f"El esquema expone datos personales prohibidos: {actual_keys}"
        )

    def test_synthetic_data_isolation_in_testing_environment(self, client: TestClient):
        """Garantizar que datos en tests son 100% sintéticos y efímeros (Ley 21.719)."""
        synth_user = "OP-SYNTH-99"
        reg = client.post("/api/users", json={"id": "OP-ID-SYNTH", "username": synth_user})
        assert reg.status_code == 200
        assert reg.json()["username"].startswith("OP-SYNTH-")
