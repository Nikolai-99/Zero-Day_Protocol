import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/config", tags=["config"])


class DevModeConfig(BaseModel):
    devMode: bool


@router.get("/devmode", response_model=DevModeConfig)
def get_dev_mode():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Subir dos niveles para llegar a la raíz del proyecto (backend/routers/ -> backend/ -> raíz)
    devmode_path = os.path.join(current_dir, "..", "..", "dev_mode.txt")
    dev_mode = False
    if os.path.exists(devmode_path):
        with open(devmode_path, "r", encoding="utf-8") as f:
            content = f.read().strip().lower()
            dev_mode = content == "true"
    return {"devMode": dev_mode}


@router.post("/devmode", response_model=DevModeConfig)
def update_dev_mode(config: DevModeConfig):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    devmode_path = os.path.join(current_dir, "..", "..", "dev_mode.txt")
    try:
        with open(devmode_path, "w", encoding="utf-8") as f:
            f.write("true" if config.devMode else "false")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al escribir dev_mode.txt: {e}")
    return {"devMode": config.devMode}
