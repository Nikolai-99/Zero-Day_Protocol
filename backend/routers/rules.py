"""Router de API REST para consultar y verificar reglas de negocio de Zero-Day Protocol."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.services.game_rules import (
    CombatRules,
    HackingRules,
    RankingRules,
    ScoreRules,
    UserIdentityRules,
)

router = APIRouter(prefix="/api/rules", tags=["rules"])


class DamageRequest(BaseModel):
    current_hp: int = Field(..., ge=0, le=100)
    current_shields: int = Field(..., ge=0, le=5)
    game_mode: str
    damage_amount: int
    is_invulnerable: bool = False


class ScoreRequest(BaseModel):
    enemy_type: str
    wave: int = Field(..., ge=1)
    game_mode: str
    is_graze: bool = False


class QuizRequest(BaseModel):
    selected_option: int
    correct_option: int
    attempts_used: int = Field(..., ge=1)
    current_shields: int = Field(..., ge=0, le=5)


class RankRequest(BaseModel):
    score: int = Field(..., ge=0)
    max_wave: int = Field(..., ge=1)
    game_mode: str


class IdentityRequest(BaseModel):
    username: str
    candidate_id: str
    existing_users: dict[str, str] = Field(default_factory=dict)


@router.post("/damage")
def calculate_damage(req: DamageRequest):
    try:
        result = CombatRules.resolve_damage(
            current_hp=req.current_hp,
            current_shields=req.current_shields,
            game_mode=req.game_mode,
            damage_amount=req.damage_amount,
            is_invulnerable=req.is_invulnerable,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/score")
def calculate_score(req: ScoreRequest):
    try:
        result = ScoreRules.calculate_score(
            enemy_type=req.enemy_type,
            wave=req.wave,
            game_mode=req.game_mode,
            is_graze=req.is_graze,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/quiz")
def evaluate_quiz(req: QuizRequest):
    try:
        result = HackingRules.evaluate_quiz_attempt(
            selected_option=req.selected_option,
            correct_option=req.correct_option,
            attempts_used=req.attempts_used,
            current_shields=req.current_shields,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rank")
def calculate_rank(req: RankRequest):
    try:
        result = RankingRules.calculate_operator_rank(
            score=req.score,
            max_wave=req.max_wave,
            game_mode=req.game_mode,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/identity")
def resolve_identity(req: IdentityRequest):
    try:
        result = UserIdentityRules.resolve_operator_identity(
            input_username=req.username,
            candidate_id=req.candidate_id,
            existing_users_map=req.existing_users,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
