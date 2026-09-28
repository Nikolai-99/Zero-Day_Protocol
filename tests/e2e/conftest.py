"""Configuración de fixtures para pruebas Extremo a Extremo (E2E) con Playwright.

Proporciona:
- Servidor Vite en modo desarrollo dinámico (compilación en vivo de src/ sin caché estático).
- Servidor FastAPI backend en puerto 8000.
- Limpieza preventiva de puertos para evitar que procesos residuales capturen el puerto.
- Lanzamiento de navegador Chromium de alta compatibilidad.
- Aislamiento de contextos de navegación con viewport estándar 1024x768.
"""

import os
import socket
import subprocess
import sys
import time
from typing import Any, Generator

import pytest
from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Verifica si un puerto TCP local está aceptando conexiones."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def terminate_process(proc: subprocess.Popen) -> None:
    """Finaliza un subproceso y sus hijos de forma segura y dirigida por PID."""
    if proc.poll() is not None:
        return
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                capture_output=True,
                check=False,
            )
        else:
            proc.terminate()
            proc.wait(timeout=2)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


@pytest.fixture(scope="session")
def servers():
    """Inicia FastAPI y Vite en modo desarrollo dinámico con base de datos de prueba aislada."""
    started_processes = []
    test_db_file = os.path.abspath("zero_day_e2e_isolated.db")

    # Limpiar base de datos temporal si existiera de una ejecución previa abortada
    for ext in ["", "-journal", "-wal", "-shm"]:
        fpath = f"{test_db_file}{ext}"
        if os.path.exists(fpath):
            try:
                os.remove(fpath)
            except Exception:
                pass

    # Configurar entorno de backend apuntando a la base aislada
    backend_env = os.environ.copy()
    backend_env["DATABASE_URL"] = f"sqlite:///{test_db_file}"

    # 1. Iniciar Backend en puerto 8000 con base aislada
    backend_proc = subprocess.Popen(
        "uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000",
        shell=True,
        env=backend_env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    started_processes.append(backend_proc)

    # 2. Iniciar Frontend Vite en modo desarrollo
    frontend_proc = subprocess.Popen(
        "npx vite --port 3000 --host 127.0.0.1",
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    started_processes.append(frontend_proc)

    # Esperar hasta 20 segundos a que ambos puertos estén respondiendo activamente
    start_time = time.time()
    while time.time() - start_time < 20:
        if is_port_in_use(8000) and is_port_in_use(3000):
            break
        time.sleep(0.5)

    if not (is_port_in_use(8000) and is_port_in_use(3000)):
        for proc in started_processes:
            terminate_process(proc)
        raise RuntimeError("Los servidores de prueba (8000/3000) no lograron iniciar a tiempo.")

    # Breve estabilización del socket HTTP de Vite
    time.sleep(1)

    yield {"backend": "http://127.0.0.1:8000", "frontend": "http://127.0.0.1:3000"}

    # Limpieza dirigida y limpia al finalizar la sesión de pruebas (por PID específico)
    for proc in started_processes:
        terminate_process(proc)

    # Eliminar base de datos temporal aislada de E2E
    time.sleep(0.5)
    for ext in ["", "-journal", "-wal", "-shm"]:
        fpath = f"{test_db_file}{ext}"
        if os.path.exists(fpath):
            try:
                os.remove(fpath)
            except Exception:
                pass


@pytest.fixture(scope="session")
def browser_instance():
    """Instancia de navegador Chromium configurada para entorno de testing."""
    pw = sync_playwright().start()
    browser: Browser | None = None
    for channel in ["chrome", "msedge", None]:
        try:
            launch_args = [
                "--no-sandbox",
                "--disable-gpu-sandbox",
            ]
            if sys.platform == "win32":
                launch_args.extend(["--use-gl=angle", "--use-angle=swiftshader"])
            launch_kwargs: dict[str, Any] = {
                "headless": True,
                "args": launch_args,
            }
            if channel:
                launch_kwargs["channel"] = channel
            browser = pw.chromium.launch(**launch_kwargs)
            break
        except Exception:
            continue

    if not browser:
        pw.stop()
        raise RuntimeError("No se pudo iniciar ningún navegador Chromium para Playwright.")

    yield browser

    try:
        browser.close()
    except Exception:
        pass
    try:
        pw.stop()
    except Exception:
        pass


@pytest.fixture
def page(browser_instance: Browser, servers: dict) -> Generator[Page, None, None]:
    """Crea una página aislada con viewport estándar 1024x768 navegando al frontend dinámico."""
    context: BrowserContext = browser_instance.new_context(
        viewport={"width": 1024, "height": 768}
    )
    test_page: Page = context.new_page()
    test_page.goto(servers["frontend"], wait_until="networkidle")
    yield test_page
    try:
        test_page.close()
    except Exception:
        pass
    try:
        context.close()
    except Exception:
        pass
