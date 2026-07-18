"""Auto-logging V0: phone keyframes -> Claude Haiku vision extraction.

Implements plans/010. The /capture page samples the phone camera, detects
stable keyframes client-side, and POSTs them here. Each keyframe gets one
Haiku structured-output call that classifies the screen and extracts match
fields; a small per-capture-session state machine pairs the stage-select
frame with the results frame into a pending match, which the phone confirms
before anything touches the CSV (via the existing GameDataManager.add_game
path — the CSV schema is untouched by this module).

Provenance (frames + extractions + human confirm/edit/discard actions) is
appended to DATA_DIR/vision/log.jsonl with keyframes saved alongside; that
corpus is the labeled training set for the V1 local-CV swap.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import re
import threading
import time
import uuid
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from typing import Any

from flask import Blueprint, jsonify, request, send_from_directory

logger = logging.getLogger(__name__)

VISION_MODEL = os.environ.get("VISION_MODEL", "claude-haiku-4-5")
MAX_CALLS_PER_DAY = int(os.environ.get("VISION_MAX_CALLS_PER_DAY", "1500"))
MAX_FRAME_BYTES = 4 * 1024 * 1024
MAX_SAVED_FRAMES = 2000
FRAME_PRUNE_BATCH = 200
DUPLICATE_WINDOW_SECONDS = 180
PENDING_TTL_SECONDS = 30 * 60

# Every stage that has ever appeared in game_results.csv, plus the current
# picker set (frontend/src/lib/stages.ts). Extraction output is normalized
# against these; an unmatched stage is kept raw and flagged for review.
CANONICAL_STAGES = [
    "Battlefield",
    "Small Battlefield",
    "Final Destination",
    "Pokemon Stadium 2",
    "Smashville",
    "Town & City",
    "Kalos Pokemon League",
    "Hollow Bastion",
    "Yoshi's Story",
    "Northern Cave",
    "Yoshi's Island",
]

SCREEN_TYPES = [
    "character_select",
    "stage_select",
    "gameplay",
    "game_splash",
    "results",
    "other",
]

# Structured-output schema for the single classify+extract call per keyframe.
EXTRACTION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "screen_type": {"type": "string", "enum": SCREEN_TYPES},
        "stage": {"type": ["string", "null"]},
        "left_character": {"type": ["string", "null"]},
        "right_character": {"type": ["string", "null"]},
        "winner_side": {
            "anyOf": [{"type": "string", "enum": ["left", "right"]}, {"type": "null"}]
        },
        "winner_stocks_remaining": {"type": ["integer", "null"]},
        "left_tag": {"type": ["string", "null"]},
        "right_tag": {"type": ["string", "null"]},
        "confidence": {"type": "number"},
    },
    "required": [
        "screen_type",
        "stage",
        "left_character",
        "right_character",
        "winner_side",
        "winner_stocks_remaining",
        "left_tag",
        "right_tag",
        "confidence",
    ],
    "additionalProperties": False,
}


@dataclass(frozen=True)
class FrameExtraction:
    """Normalized result of one vision call on one keyframe."""

    screen_type: str
    stage: str | None = None
    left_character: str | None = None
    right_character: str | None = None
    winner_side: str | None = None
    winner_stocks_remaining: int | None = None
    left_tag: str | None = None
    right_tag: str | None = None
    confidence: float = 0.0


def _slug(value: str) -> str:
    """Case/punctuation-insensitive key for name matching."""
    return re.sub(r"[^a-z0-9]", "", value.lower())


def normalize_name(raw: str | None, canonical: list[str]) -> tuple[str | None, bool]:
    """Map a model-produced name onto a canonical list.

    Returns (name, matched). Unmatched names are returned raw so the confirm
    card shows what the model actually read.
    """
    if raw is None or not raw.strip():
        return None, False
    by_slug = {_slug(name): name for name in canonical}
    hit = by_slug.get(_slug(raw))
    if hit is not None:
        return hit, True
    return raw.strip(), False


def _build_prompt(known_characters: list[str]) -> str:
    stages = "\n".join(f"- {s}" for s in CANONICAL_STAGES)
    chars = ", ".join(known_characters) if known_characters else "(none logged yet)"
    return (
        "This is a phone-camera photo of a TV showing Super Smash Bros. "
        "Ultimate (or a menu around a match). Classify which screen it is and "
        "extract what is readable. The photo may be skewed, glarey, or blurry "
        "- that is expected.\n\n"
        "screen_type definitions:\n"
        "- character_select: the fighter selection grid\n"
        "- stage_select: the stage selection grid (one stage highlighted)\n"
        "- gameplay: a match in progress (damage percents visible)\n"
        "- game_splash: the full-screen GAME! moment when a match ends\n"
        "- results: the post-match results/victory screen (placements shown)\n"
        "- other: anything else (menus, loading, no TV visible)\n\n"
        "Field rules - never guess; use null when a field is not clearly "
        "readable on THIS screen:\n"
        "- stage: only from a stage_select screen (the highlighted stage) or "
        "when unmistakable. Known stages in this household:\n"
        f"{stages}\n"
        "- left_character / right_character: the fighters for the left (P1) "
        "and right (P2) player slots as displayed. Frequently played here: "
        f"{chars}. Any other SSBU fighter is also possible.\n"
        "- winner_side: on results/game_splash screens only - which side won "
        "(left or right).\n"
        "- winner_stocks_remaining: stock icons the winner still has "
        "(1, 2, or 3), if visible.\n"
        "- left_tag / right_tag: player name tags shown above the fighters or "
        "on the results placements, if any.\n"
        "- confidence: 0-1, your overall confidence in the extracted fields."
    )


class VisionExtractor:
    """One Haiku structured-output call per keyframe.

    The Anthropic client is created lazily so the app imports (and every
    non-vision route works) without the SDK key; `available` gates the
    endpoints with a 503 instead.
    """

    def __init__(
        self,
        api_key: str | None,
        known_characters: Callable[[], list[str]],
        model: str = VISION_MODEL,
    ) -> None:
        self._api_key = api_key
        self._known_characters = known_characters
        self._model = model
        self._client: Any = None
        self._client_lock = threading.Lock()

    @property
    def available(self) -> bool:
        return bool(self._api_key)

    def _get_client(self) -> Any:
        with self._client_lock:
            if self._client is None:
                import anthropic

                self._client = anthropic.Anthropic(api_key=self._api_key)
            return self._client

    def extract(self, jpeg_bytes: bytes) -> FrameExtraction:
        """Classify + extract one keyframe. Raises on API failure."""
        client = self._get_client()
        response = client.messages.create(
            model=self._model,
            max_tokens=1024,
            output_config={
                "format": {"type": "json_schema", "schema": EXTRACTION_SCHEMA}
            },
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": base64.standard_b64encode(jpeg_bytes).decode(
                                    "ascii"
                                ),
                            },
                        },
                        {
                            "type": "text",
                            "text": _build_prompt(self._known_characters()),
                        },
                    ],
                }
            ],
        )
        text = next(b.text for b in response.content if b.type == "text")
        data = json.loads(text)
        return FrameExtraction(
            screen_type=data.get("screen_type", "other"),
            stage=data.get("stage"),
            left_character=data.get("left_character"),
            right_character=data.get("right_character"),
            winner_side=data.get("winner_side"),
            winner_stocks_remaining=data.get("winner_stocks_remaining"),
            left_tag=data.get("left_tag"),
            right_tag=data.get("right_tag"),
            confidence=float(data.get("confidence") or 0.0),
        )


@dataclass
class _CaptureState:
    pending_stage: str | None = None
    last_result_key: tuple[Any, ...] | None = None
    last_result_at: float = 0.0


class MatchAssembler:
    """Pairs stage-select and results keyframes into pending matches.

    Keyed by capture session (one propped phone = one key). Consecutive
    results frames of the same match are deduplicated within a time window so
    a lingering results screen doesn't queue the same match twice.
    """

    def __init__(
        self,
        known_characters: Callable[[], list[str]],
        now: Callable[[], float] = time.time,
    ) -> None:
        self._known_characters = known_characters
        self._now = now
        self._states: dict[str, _CaptureState] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _tag_side(extraction: FrameExtraction, player: str) -> str | None:
        """Which side a player's nametag appears on, if identifiable."""
        target = _slug(player)
        for side, tag in (
            ("left", extraction.left_tag),
            ("right", extraction.right_tag),
        ):
            if tag and target in _slug(tag):
                return side
        return None

    def handle(
        self, capture_session_id: str, matt_side: str, extraction: FrameExtraction
    ) -> dict[str, Any] | None:
        """Feed one extraction; returns pending-match fields on a new result."""
        with self._lock:
            state = self._states.setdefault(capture_session_id, _CaptureState())

            if extraction.screen_type == "stage_select" and extraction.stage:
                stage, _ = normalize_name(extraction.stage, CANONICAL_STAGES)
                state.pending_stage = stage
                return None

            if extraction.screen_type != "results":
                return None

            if not (
                extraction.left_character
                and extraction.right_character
                and extraction.winner_side in ("left", "right")
            ):
                logger.info(
                    "vision: results frame missing fields (chars=%s/%s winner=%s)",
                    extraction.left_character,
                    extraction.right_character,
                    extraction.winner_side,
                )
                return None

            # Nametags, when readable, override the manual port toggle.
            side = self._tag_side(extraction, "matt") or matt_side
            if self._tag_side(extraction, "shayne") == side:
                side = matt_side  # contradictory tags -> trust the toggle

            known = self._known_characters()
            needs_review: list[str] = []
            left_char, left_ok = normalize_name(extraction.left_character, known)
            right_char, right_ok = normalize_name(extraction.right_character, known)
            if not left_ok:
                needs_review.append("left_character")
            if not right_ok:
                needs_review.append("right_character")

            if side == "left":
                matt_char, shayne_char = left_char, right_char
                winner = "Matt" if extraction.winner_side == "left" else "Shayne"
            else:
                matt_char, shayne_char = right_char, left_char
                winner = "Matt" if extraction.winner_side == "right" else "Shayne"

            stage = state.pending_stage
            if stage is None and extraction.stage:
                stage, stage_ok = normalize_name(extraction.stage, CANONICAL_STAGES)
                if not stage_ok:
                    needs_review.append("stage")
            if stage is None:
                needs_review.append("stage")

            stocks = extraction.winner_stocks_remaining
            if stocks is not None and not 1 <= stocks <= 3:
                stocks = None
            if stocks is None:
                needs_review.append("stocksRemaining")

            key = (matt_char, shayne_char, winner)
            now = self._now()
            if (
                state.last_result_key == key
                and now - state.last_result_at < DUPLICATE_WINDOW_SECONDS
            ):
                state.last_result_at = now
                return None
            state.last_result_key = key
            state.last_result_at = now
            state.pending_stage = None  # consumed by this match

            return {
                "shayneCharacter": shayne_char,
                "mattCharacter": matt_char,
                "winner": winner,
                "stocksRemaining": stocks,
                "stage": stage,
                "confidence": extraction.confidence,
                "needsReview": needs_review,
            }


class PendingQueue:
    """In-memory confirm queue. Lost on deploy by design (seconds-lived)."""

    def __init__(self, now: Callable[[], float] = time.time) -> None:
        self._items: dict[str, dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._now = now

    def add(self, fields: dict[str, Any], frame_name: str | None) -> dict[str, Any]:
        item = {
            **fields,
            "id": uuid.uuid4().hex[:12],
            "frameName": frame_name,
            "createdAt": self._now(),
        }
        with self._lock:
            self._prune()
            self._items[item["id"]] = item
        return item

    def list(self) -> list[dict[str, Any]]:
        with self._lock:
            self._prune()
            return sorted(self._items.values(), key=lambda i: i["createdAt"])

    def get(self, pending_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._items.get(pending_id)

    def pop(self, pending_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._items.pop(pending_id, None)

    def __len__(self) -> int:
        with self._lock:
            return len(self._items)

    def _prune(self) -> None:
        cutoff = self._now() - PENDING_TTL_SECONDS
        stale = [k for k, v in self._items.items() if v["createdAt"] < cutoff]
        for k in stale:
            del self._items[k]


class VisionStore:
    """Frame JPEGs + append-only JSONL provenance under DATA_DIR/vision/."""

    def __init__(self, data_dir: str) -> None:
        self.root = os.path.join(data_dir, "vision")
        self.frames_dir = os.path.join(self.root, "frames")
        self.log_path = os.path.join(self.root, "log.jsonl")
        os.makedirs(self.frames_dir, exist_ok=True)
        self._lock = threading.Lock()

    def save_frame(self, jpeg_bytes: bytes) -> str:
        name = f"{int(time.time())}-{uuid.uuid4().hex[:8]}.jpg"
        with open(os.path.join(self.frames_dir, name), "wb") as f:
            f.write(jpeg_bytes)
        self._prune_frames()
        return name

    def log(self, event: dict[str, Any]) -> None:
        record = {"ts": time.time(), **event}
        with self._lock:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, default=str) + "\n")

    def _prune_frames(self) -> None:
        try:
            names = sorted(os.listdir(self.frames_dir))
            if len(names) > MAX_SAVED_FRAMES:
                for name in names[:FRAME_PRUNE_BATCH]:
                    os.remove(os.path.join(self.frames_dir, name))
        except OSError:  # pruning is best-effort; never fail a capture over it
            logger.warning("vision: frame pruning failed", exc_info=True)


class DailyBudget:
    """Per-day VLM call cap. In-memory (resets on deploy) - a cost fuse, not
    an exact meter."""

    def __init__(self, limit: int = MAX_CALLS_PER_DAY) -> None:
        self.limit = limit
        self._day = ""
        self._count = 0
        self._lock = threading.Lock()

    def try_spend(self) -> bool:
        today = time.strftime("%Y-%m-%d")
        with self._lock:
            if self._day != today:
                self._day = today
                self._count = 0
            if self._count >= self.limit:
                return False
            self._count += 1
            return True

    @property
    def spent_today(self) -> int:
        with self._lock:
            return self._count


@dataclass
class VisionService:
    """Bundles the vision components; exposed on the app module so tests can
    swap the extractor for a fake."""

    extractor: VisionExtractor
    assembler: MatchAssembler
    queue: PendingQueue
    store: VisionStore
    budget: DailyBudget
    blueprint: Blueprint = field(init=False)


def create_vision_service(data_manager: Any, data_dir: str) -> VisionService:
    """Build the service + blueprint against the existing GameDataManager."""

    def known_characters() -> list[str]:
        try:
            return list(data_manager.get_characters().get("all_characters", []))
        except Exception:  # characters file problems must not kill capture
            logger.warning("vision: could not load character list", exc_info=True)
            return []

    service = VisionService(
        extractor=VisionExtractor(
            os.environ.get("ANTHROPIC_API_KEY"), known_characters
        ),
        assembler=MatchAssembler(known_characters),
        queue=PendingQueue(),
        store=VisionStore(data_dir),
        budget=DailyBudget(),
    )

    bp = Blueprint("vision", __name__, url_prefix="/api/vision")
    # send_from_directory needs an absolute path when the app cwd differs.
    frames_dir_abs = os.path.abspath(service.store.frames_dir)

    @bp.route("/keyframe", methods=["POST"])
    def vision_keyframe() -> Any:
        if not service.extractor.available:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Vision is not configured (ANTHROPIC_API_KEY unset)",
                    }
                ),
                503,
            )
        frame = request.files.get("frame")
        if frame is None:
            return jsonify({"success": False, "message": "Missing frame file"}), 400
        jpeg_bytes = frame.read()
        if not jpeg_bytes or len(jpeg_bytes) > MAX_FRAME_BYTES:
            return jsonify({"success": False, "message": "Bad frame size"}), 400
        matt_side = request.form.get("mattSide", "left")
        if matt_side not in ("left", "right"):
            return jsonify({"success": False, "message": "Bad mattSide"}), 400
        capture_session_id = request.form.get("captureSessionId", "default")[:64]

        if not service.budget.try_spend():
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Daily vision budget reached - log manually",
                    }
                ),
                429,
            )

        try:
            extraction = service.extractor.extract(jpeg_bytes)
        except Exception as e:
            logger.error(f"vision: extraction failed: {e}")
            service.store.log({"type": "extract_error", "error": str(e)})
            return (
                jsonify({"success": False, "message": "Vision extraction failed"}),
                502,
            )

        pending = service.assembler.handle(capture_session_id, matt_side, extraction)
        frame_name: str | None = None
        if extraction.screen_type in ("stage_select", "results"):
            frame_name = service.store.save_frame(jpeg_bytes)
        item = service.queue.add(pending, frame_name) if pending else None
        service.store.log(
            {
                "type": "keyframe",
                "captureSessionId": capture_session_id,
                "mattSide": matt_side,
                "frame": frame_name,
                "extraction": asdict(extraction),
                "pendingId": item["id"] if item else None,
            }
        )
        return jsonify(
            {
                "success": True,
                "screenType": extraction.screen_type,
                "pendingCount": len(service.queue),
                "callsToday": service.budget.spent_today,
            }
        )

    @bp.route("/pending", methods=["GET"])
    def vision_pending() -> Any:
        items = [
            {
                **item,
                "frameUrl": (
                    f"/api/vision/frames/{item['frameName']}"
                    if item.get("frameName")
                    else None
                ),
            }
            for item in service.queue.list()
        ]
        return jsonify({"success": True, "pending": items})

    @bp.route("/pending/<pending_id>/confirm", methods=["POST"])
    def vision_confirm(pending_id: str) -> Any:
        item = service.queue.get(pending_id)
        if item is None:
            return jsonify({"success": False, "message": "Unknown pending match"}), 404
        data = request.json or {}
        payload = {
            "shayneCharacter": data.get("shayneCharacter"),
            "mattCharacter": data.get("mattCharacter"),
            "winner": data.get("winner"),
            "stocksRemaining": data.get("stocksRemaining"),
            "stage": data.get("stage"),
        }
        if payload["winner"] not in ("Shayne", "Matt"):
            return jsonify({"success": False, "message": "Bad winner"}), 400
        if not all(
            isinstance(payload[k], str) and payload[k].strip()
            for k in ("shayneCharacter", "mattCharacter", "stage")
        ):
            return jsonify({"success": False, "message": "Missing fields"}), 400
        stocks = payload["stocksRemaining"]
        if stocks is not None and (not isinstance(stocks, int) or not 1 <= stocks <= 3):
            return jsonify({"success": False, "message": "Bad stocksRemaining"}), 400

        if not data_manager.add_game(payload):
            return jsonify({"success": False, "message": "Failed to log game"}), 500
        service.queue.pop(pending_id)

        match_id: str | None = None
        try:
            df = data_manager._load_data()
            if len(df):
                match_id = str(df.iloc[-1]["match_id"])
        except Exception:  # linkage is best-effort provenance, not correctness
            logger.warning("vision: could not resolve match_id", exc_info=True)
        service.store.log(
            {
                "type": "confirm",
                "pendingId": pending_id,
                "extracted": {
                    k: item.get(k)
                    for k in (
                        "shayneCharacter",
                        "mattCharacter",
                        "winner",
                        "stocksRemaining",
                        "stage",
                        "confidence",
                        "needsReview",
                    )
                },
                "final": payload,
                "frame": item.get("frameName"),
                "matchId": match_id,
            }
        )
        return jsonify({"success": True, "message": "Game logged successfully"})

    @bp.route("/pending/<pending_id>/discard", methods=["POST"])
    def vision_discard(pending_id: str) -> Any:
        item = service.queue.pop(pending_id)
        if item is None:
            return jsonify({"success": False, "message": "Unknown pending match"}), 404
        service.store.log(
            {"type": "discard", "pendingId": pending_id, "frame": item.get("frameName")}
        )
        return jsonify({"success": True})

    @bp.route("/frames/<filename>", methods=["GET"])
    def vision_frame(filename: str) -> Any:
        return send_from_directory(frames_dir_abs, filename)

    service.blueprint = bp
    return service
