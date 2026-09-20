from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    id: str
    username: str


class UserCreate(UserBase):
    pass


class User(UserBase):
    created_at: datetime
    is_restored: bool = False
    model_config = ConfigDict(from_attributes=True)


class ScoreBase(BaseModel):
    score: int
    wave: int
    game_mode: Optional[str] = "NORMAL"


class ScoreCreate(ScoreBase):
    user_id: str


class Score(ScoreBase):
    id: int
    user_id: str
    timestamp: datetime
    username: Optional[str] = None  # Útil para rankings ordenados
    mode_scores: Optional[dict[str, int]] = None
    rank_name: Optional[str] = None
    clearance_level: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class UserRankInfo(BaseModel):
    rank_name: str
    clearance_level: int
    description: str


class UserStats(BaseModel):
    user_id: str
    username: str
    total_score: int
    max_wave: int
    rank: UserRankInfo
    mode_scores: dict[str, int]


class QuestionBase(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_index: int
    hint: Optional[str] = None


class QuestionCreate(QuestionBase):
    pass


class Question(QuestionBase):
    model_config = ConfigDict(from_attributes=True)
