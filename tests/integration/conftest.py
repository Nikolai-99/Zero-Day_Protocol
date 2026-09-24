"""Configuración compartida y fixtures para las pruebas de integración (Nivel 2).

Proporciona:
- Base de datos SQLite aislada en memoria (sqlite:///:memory:) con StaticPool.
- Generador de datos sintéticos conforme al principio de minimización.
- Cliente de pruebas HTTP (FastAPI TestClient) preconfigurado.
- Limpieza y aislamiento continuo para evitar contaminación de la BD de producción.
"""

import uuid
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core.database import Base, get_db
from backend.main import app

# Motor de base de datos volátil en memoria compartida por hilo
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def test_db_override():
    """Generador de sesiones de testing sobre la base de datos en memoria."""
    db: Session = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Fijar override continuo para toda la suite de integración
app.dependency_overrides[get_db] = test_db_override


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Crea el esquema de base de datos relacional para la sesión de pruebas."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Cliente HTTP que inyecta la base de datos aislada en memoria."""
    app.dependency_overrides[get_db] = test_db_override
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def synthetic_operator():
    """Generador de datos sintéticos mínimos de operador (Principio de Minimización)."""
    unique_suffix = uuid.uuid4().hex[:6]
    return {
        "id": f"OP-TEST-{unique_suffix}",
        "username": f"Ghost_{unique_suffix}",
    }
