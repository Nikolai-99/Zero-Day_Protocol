from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.crud import crud
from backend.schemas import schemas

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=schemas.User)
def register_or_restore_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user, is_restored = crud.register_or_restore_user(
        db=db, username=user.username, candidate_id=user.id
    )
    return schemas.User(
        id=db_user.id,
        username=db_user.username,
        created_at=db_user.created_at,
        is_restored=is_restored,
    )


@router.get("/by-name/{username}", response_model=schemas.User)
def get_user_by_name(username: str, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=username)
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return db_user


@router.get("/{user_id}/stats", response_model=schemas.UserStats)
def get_user_stats(user_id: str, db: Session = Depends(get_db)):
    stats = crud.get_user_stats(db=db, user_id=user_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Operador no encontrado")
    return stats
