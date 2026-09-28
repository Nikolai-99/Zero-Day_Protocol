"""Fixtures compartidos para la suite de pruebas no funcionales."""

from tests.integration.conftest import (
    client,
    setup_test_database,
    synthetic_operator,
    test_db_override,
    test_engine,
)

__all__ = [
    "client",
    "setup_test_database",
    "synthetic_operator",
    "test_db_override",
    "test_engine",
]
