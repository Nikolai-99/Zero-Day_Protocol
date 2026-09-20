import datetime
import json

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.models import models
from backend.schemas import schemas
from backend.services.game_rules import RankingRules, ScoreRules, UserIdentityRules


def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def register_or_restore_user(
    db: Session, username: str, candidate_id: str
) -> tuple[models.User, bool]:
    """Registra un nuevo operador o restaura el ID original si el nombre ya existe.

    - Si el username coincide exactamente con uno existente en la base de datos,
      se retorna ese usuario existente junto con is_restored=True.
    - Si no existe, se crea un nuevo usuario con candidate_id e is_restored=False.
    """
    cleaned_name = UserIdentityRules.validate_username(username)

    existing_by_name = get_user_by_username(db, cleaned_name)
    if existing_by_name:
        return existing_by_name, True

    target_id = candidate_id
    existing_by_id = get_user(db, candidate_id)
    if existing_by_id:
        if existing_by_id.username == cleaned_name:
            return existing_by_id, False
        # Si candidate_id ya pertenece a otro operador, generar un nuevo ID único
        target_id, _ = UserIdentityRules.generate_random_operator(prefix="player_")

    new_user = models.User(id=target_id, username=cleaned_name)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user, False


def create_user(db: Session, user: schemas.UserCreate):
    db_user, _ = register_or_restore_user(db, username=user.username, candidate_id=user.id)
    return db_user


def get_leaderboard(db: Session, limit: int = 10):
    """Retorna la tabla de clasificación con un único registro por jugador (sin repeticiones),

    sumando la puntuación de sus partidas, calculando su rango y desglose por modo.
    """
    results = (
        db.query(
            func.min(models.Score.id).label("id"),
            models.Score.user_id,
            models.User.username,
            func.sum(models.Score.score).label("total_score"),
            func.max(models.Score.wave).label("max_wave"),
            func.max(models.Score.timestamp).label("last_timestamp"),
        )
        .join(models.User, models.Score.user_id == models.User.id)
        .group_by(models.Score.user_id, models.User.username)
        .order_by(desc("total_score"), desc("max_wave"))
        .limit(limit)
        .all()
    )

    if not results:
        return []

    user_ids = [str(r.user_id) for r in results]
    raw_scores = db.query(models.Score).filter(models.Score.user_id.in_(user_ids)).all()

    user_modes: dict[str, dict[str, int]] = {
        uid: {"NORMAL": 0, "HACKING": 0, "IMPOSSIBLE": 0} for uid in user_ids
    }
    impossible_waves: dict[str, int] = {uid: 1 for uid in user_ids}

    for s in raw_scores:
        uid = str(s.user_id)
        if uid in user_modes:
            mode = (s.game_mode or "NORMAL").upper()
            if mode not in user_modes[uid]:
                user_modes[uid][mode] = 0
            user_modes[uid][mode] += int(s.score)
            if mode == "IMPOSSIBLE" and int(s.wave) > impossible_waves[uid]:
                impossible_waves[uid] = int(s.wave)

    leaderboard = []
    for r in results:
        uid = str(r.user_id)
        modes = user_modes.get(uid, {"NORMAL": 0, "HACKING": 0, "IMPOSSIBLE": 0})
        total_pts = int(r.total_score)
        max_w = int(r.max_wave)

        # Determinar rango considerando vía rápida en IMPOSSIBLE si califica
        if modes.get("IMPOSSIBLE", 0) >= 5000 and impossible_waves.get(uid, 1) >= 3:
            rank_res = RankingRules.calculate_operator_rank(
                score=modes["IMPOSSIBLE"], max_wave=impossible_waves[uid], game_mode="IMPOSSIBLE"
            )
        else:
            rank_res = RankingRules.calculate_operator_rank(
                score=total_pts, max_wave=max_w, game_mode="NORMAL"
            )

        leaderboard.append(
            schemas.Score(
                id=int(r.id),
                score=total_pts,
                wave=max_w,
                game_mode="NORMAL",
                timestamp=r.last_timestamp,
                user_id=uid,
                username=str(r.username),
                mode_scores=modes,
                rank_name=rank_res.rank_name,
                clearance_level=rank_res.clearance_level,
            )
        )
    return leaderboard


def get_user_stats(db: Session, user_id: str) -> schemas.UserStats | None:
    """Retorna las estadísticas completas, desglose por modo y rango de un operador."""
    user = get_user(db, user_id)
    if not user:
        return None

    scores = db.query(models.Score).filter(models.Score.user_id == user_id).all()
    mode_scores = {"NORMAL": 0, "HACKING": 0, "IMPOSSIBLE": 0}
    total_score = 0
    max_wave = 1
    impossible_score = 0
    impossible_wave = 1

    for s in scores:
        mode = (s.game_mode or "NORMAL").upper()
        if mode not in mode_scores:
            mode_scores[mode] = 0
        mode_scores[mode] += int(s.score)
        total_score += int(s.score)
        if int(s.wave) > max_wave:
            max_wave = int(s.wave)
        if mode == "IMPOSSIBLE":
            impossible_score += int(s.score)
            if int(s.wave) > impossible_wave:
                impossible_wave = int(s.wave)

    if impossible_score >= 5000 and impossible_wave >= 3:
        rank_res = RankingRules.calculate_operator_rank(
            score=impossible_score, max_wave=impossible_wave, game_mode="IMPOSSIBLE"
        )
    else:
        rank_res = RankingRules.calculate_operator_rank(
            score=total_score, max_wave=max_wave, game_mode="NORMAL"
        )

    return schemas.UserStats(
        user_id=user.id,
        username=user.username,
        total_score=total_score,
        max_wave=max_wave,
        rank=schemas.UserRankInfo(
            rank_name=rank_res.rank_name,
            clearance_level=rank_res.clearance_level,
            description=rank_res.description,
        ),
        mode_scores=mode_scores,
    )


def create_or_accumulate_score(db: Session, score: schemas.ScoreCreate):
    """Guarda o acumula la puntuación en un único registro por modo para el jugador."""
    target_mode = (score.game_mode or "NORMAL").upper()
    db_user = get_user(db, score.user_id)
    username_str = str(db_user.username) if db_user else "Unknown"

    existing_score = (
        db.query(models.Score)
        .filter(models.Score.user_id == score.user_id, models.Score.game_mode == target_mode)
        .first()
    )

    if existing_score:
        accumulated_pts, max_wave = ScoreRules.accumulate_score(
            current_score=int(existing_score.score),
            additional_score=score.score,
            current_wave=int(existing_score.wave),
            additional_wave=score.wave,
        )
        existing_score.score = accumulated_pts
        existing_score.wave = max_wave
        existing_score.timestamp = datetime.datetime.utcnow()
        db.commit()
        db.refresh(existing_score)
        return schemas.Score(
            id=int(existing_score.id),
            score=int(existing_score.score),
            wave=int(existing_score.wave),
            game_mode=str(existing_score.game_mode),
            timestamp=existing_score.timestamp,
            user_id=str(existing_score.user_id),
            username=username_str,
        )

    db_score = models.Score(
        user_id=score.user_id,
        score=score.score,
        wave=score.wave,
        game_mode=target_mode,
    )
    db.add(db_score)
    db.commit()
    db.refresh(db_score)

    return schemas.Score(
        id=int(db_score.id),
        score=int(db_score.score),
        wave=int(db_score.wave),
        game_mode=str(db_score.game_mode),
        timestamp=db_score.timestamp,
        user_id=str(db_score.user_id),
        username=username_str,
    )


create_score = create_or_accumulate_score


def get_questions(db: Session):
    db_questions = db.query(models.Question).all()
    questions = []
    for q in db_questions:
        try:
            options_list = json.loads(str(q.options))
        except Exception:
            options_list = []
        questions.append(
            schemas.Question(
                id=str(q.id),
                question=str(q.question),
                options=options_list,
                correct_index=int(q.correct_index),
                hint=str(q.hint) if q.hint is not None else None,
            )
        )
    return questions


def seed_questions(db: Session, questions_data: list):
    # Comprobar si ya existen preguntas
    if db.query(models.Question).count() > 0:
        return

    for q in questions_data:
        options_str = json.dumps(q.get("options", []))
        db_question = models.Question(
            id=q.get("id"),
            question=q.get("question"),
            options=options_str,
            correct_index=q.get("correctIndex"),
            hint=q.get("hint"),
        )
        db.add(db_question)
    db.commit()
