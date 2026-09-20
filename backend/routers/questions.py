from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.crud import crud
from backend.schemas import schemas

router = APIRouter(prefix="/api/questions", tags=["questions"])


@router.get("", response_model=List[schemas.Question])
def get_game_questions(db: Session = Depends(get_db)):
    questions = crud.get_questions(db)
    if not questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No questions found in database."
        )
    return questions
