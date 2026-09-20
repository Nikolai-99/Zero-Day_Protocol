import json
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.database import Base, engine, get_db
from backend.crud import crud
from backend.routers import config, leaderboard, questions, rules, users

# Inicializar las tablas de la base de datos
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Sembrar preguntas y configurar dev_mode.txt en startup
    db = next(get_db())
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        questions_file_path = os.path.join(current_dir, "..", "questions.json")

        if os.path.exists(questions_file_path):
            with open(questions_file_path, "r", encoding="utf-8") as f:
                questions_data = json.load(f)
                crud.seed_questions(db, questions_data)
                print(f"[DATABASE LOAD] Carga exitosa: {len(questions_data)} preguntas sembradas.")
        else:
            print("[DATABASE WARNING] questions.json no encontrado en raíz. Saltando semilla.")

        # Inicializar dev_mode.txt en falso si no existe
        devmode_path = os.path.join(current_dir, "..", "dev_mode.txt")
        if not os.path.exists(devmode_path):
            with open(devmode_path, "w", encoding="utf-8") as f:
                f.write("false")
                print("[SYSTEM INIT] Archivo dev_mode.txt inicializado en falso.")
    except Exception as e:
        print(f"[DATABASE ERROR] Error al sembrar base de datos: {e}")
    finally:
        db.close()
    yield


app = FastAPI(
    title="Zero-Day Protocol Local API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configurar middleware de CORS para Electron (Vite Dev Server) y Tauri
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Vite Dev Server
        "tauri://localhost",  # Tauri
        "https://tauri.localhost",  # Tauri macOS
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar (incluir) todos los routers modulares
app.include_router(config.router)
app.include_router(users.router)
app.include_router(questions.router)
app.include_router(leaderboard.router)
app.include_router(rules.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "project": "Zero-Day Protocol", "db": "SQLite"}
