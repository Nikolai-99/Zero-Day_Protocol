from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.crud import crud
from backend.schemas import schemas

router = APIRouter(tags=["leaderboard"])


@router.get("/api/leaderboard", response_model=List[schemas.Score])
def get_leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    return crud.get_leaderboard(db=db, limit=limit)


@router.post("/api/scores", response_model=schemas.Score)
def save_score(score: schemas.ScoreCreate, db: Session = Depends(get_db)):
    # Comprobar que el usuario exista (operador con nombre registrado)
    db_user = crud.get_user(db, score.user_id)
    if not db_user:
        raise HTTPException(
            status_code=400,
            detail=(
                "Operador no registrado. Para registrar puntuación, "
                "debe asignar su nombre en [Renombrar]."
            ),
        )

    return crud.create_or_accumulate_score(db=db, score=score)
