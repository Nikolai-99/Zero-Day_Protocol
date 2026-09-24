"""Pruebas de extremo a extremo (E2E) con Playwright sobre la interfaz de usuario web.

Cubre el nivel 3 de la pirámide de pruebas:
- Recorrido completo de usuario (User Journey) en el frontend real de Vite.
- Entrada y persistencia visual de la identidad del operador (Callsign).
- Transición fluida de pantallas (Menú Principal -> Escena 3D & HUD).
- Adaptación dinámica de la interfaz HUD según el modo de dificultad seleccionado.
- Detección estricta de roturas de botones, pasos omitidos o fallos de renderizado en DOM.
"""

from playwright.sync_api import Page


class TestUserJourneyE2E:
    """Verificación de recorridos completos de usuario sobre la aplicación web."""

    def test_e2e_main_menu_and_operator_renaming(self, page: Page):
        """Verifica la carga del menú principal y el flujo completo de renombrado de Callsign."""
        # 1. Verificar carga inicial del título y subtítulo táctico
        assert page.title() == "Zero-Day Protocol"
        h1_element = page.locator("h1")
        assert "ZERO-DAY PROTOCOL" in (h1_element.text_content() or "")

        # 2. Flujo de renombrado de operador
        rename_btn = page.get_by_role("button", name="[Renombrar]")
        assert rename_btn.is_visible(), "El botón de renombrar debe estar visible en el menú"
        rename_btn.click()

        # Rellenar nuevo Callsign
        input_box = page.locator('input[type="text"]')
        assert input_box.is_visible(), "El input de texto de operador debe mostrarse tras el clic"
        input_box.fill("CYBER_OPERATOR")

        ok_btn = page.get_by_role("button", name="OK")
        assert ok_btn.is_visible(), "El botón OK de confirmación debe estar disponible"
        ok_btn.click()

        # 3. Verificar que el alias se actualizó en el DOM y el formulario se cerró
        page.wait_for_selector("text=CYBER_OPERATOR", timeout=5000)
        assert page.locator("text=CYBER_OPERATOR").is_visible()
        assert not input_box.is_visible(), "El input debe desaparecer tras confirmar el nombre"
        assert page.get_by_role("button", name="[Renombrar]").is_visible()

    def test_e2e_start_normal_mission_and_hud_display(self, page: Page):
        """Recorrido completo: Inicio de misión en modo Normal y verificación del HUD activo."""
        # 1. Hacer clic en el botón de Modo Normal
        normal_mode_btn = page.get_by_role("button", name="Normal Mode")
        assert normal_mode_btn.is_visible(), "El botón de Normal Mode debe estar visible en el menú"
        normal_mode_btn.click()

        # 2. Verificar transición de pantalla: El HUD debe montarse en el DOM
        page.wait_for_selector("text=System Status", timeout=8000)
        assert page.locator("text=System Status").is_visible(), "El HUD System Status debe montarse"
        assert page.locator("text=HP").is_visible(), "La etiqueta HP debe figurar en modo Normal"
        assert page.locator("text=100%").is_visible(), "La salud inicial debe ser 100%"

        # 3. Verificar que el menú principal desapareció completamente del DOM
        assert not normal_mode_btn.is_visible(), (
            "El menú principal no debe ser visible durante gameplay"
        )
        assert not page.locator("h1:has-text('ZERO-DAY PROTOCOL')").is_visible()

    def test_e2e_hacking_mode_hud_adaptation(self, page: Page):
        """Verifica que el modo Hacking configure el HUD de escudos Matrix en vez de vida."""
        hacking_btn = page.get_by_role("button", name="Hacking Mode")
        assert hacking_btn.is_visible(), "El botón de Hacking Mode debe estar visible en el menú"
        hacking_btn.click()

        page.wait_for_selector("text=Shield Matrix", timeout=8000)
        assert page.locator("text=Shield Matrix").is_visible()
        assert page.locator("text=[0/5 STACKS]").is_visible()
        assert not page.locator("text=HP").is_visible(), "En modo Hacking no debe haber barra de HP"
        assert not hacking_btn.is_visible(), "El menú debe desmontarse al entrar a Hacking Mode"

    def test_e2e_impossible_mode_hud_and_vulnerability_warning(self, page: Page):
        """Verifica que el modo Impossible active la alerta de muerte a 1 golpe en el HUD."""
        impossible_btn = page.get_by_role("button", name="Impossible Mode")
        assert impossible_btn.is_visible(), "El botón Impossible Mode debe estar visible"
        impossible_btn.click()

        page.wait_for_selector("text=Impossible Shield Matrix", timeout=8000)
        assert page.locator("text=Impossible Shield Matrix").is_visible()
        assert page.locator("text=VULNERABLE (1 HIT)").is_visible()
        assert not page.locator("text=HP").is_visible()
        assert not impossible_btn.is_visible()

    def test_e2e_leaderboard_section_visibility(self, page: Page):
        """Verifica que el panel lateral derecho del menú despliegue la clasificación global."""
        classification_header = page.locator("text=CLASSIFICATION")
        assert classification_header.is_visible(), (
            "La sección de Clasificación/Leaderboard debe estar visible en el menú"
        )
        hint_text = page.locator("text=CLIC EN NOMBRE PARA RANGO")
        assert hint_text.is_visible(), "La indicación de interacción de rango debe mostrarse"
