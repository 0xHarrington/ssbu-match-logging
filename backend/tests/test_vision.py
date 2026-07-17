"""Auto-logging V0 (plans/010): assembler state machine, normalization, and
the /api/vision/* routes with the Anthropic call faked out."""

import io
import json
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

import vision
from vision import (
    CANONICAL_STAGES,
    DailyBudget,
    FrameExtraction,
    MatchAssembler,
    PendingQueue,
    normalize_name,
)

KNOWN_CHARACTERS = ["Captain Falcon", "Donkey Kong", "Fox", "Kirby", "Falco"]


def known() -> list[str]:
    return KNOWN_CHARACTERS


# --- normalization --------------------------------------------------------


def test_normalize_name_exact_and_insensitive():
    assert normalize_name("Fox", KNOWN_CHARACTERS) == ("Fox", True)
    assert normalize_name("donkey kong", KNOWN_CHARACTERS) == ("Donkey Kong", True)
    assert normalize_name("CAPTAIN-FALCON", KNOWN_CHARACTERS) == (
        "Captain Falcon",
        True,
    )
    assert normalize_name("pokemon stadium 2", CANONICAL_STAGES) == (
        "Pokemon Stadium 2",
        True,
    )
    assert normalize_name("yoshis story", CANONICAL_STAGES) == ("Yoshi's Story", True)


def test_normalize_name_unknown_kept_raw():
    assert normalize_name("Piranha Plant", KNOWN_CHARACTERS) == ("Piranha Plant", False)
    assert normalize_name(None, KNOWN_CHARACTERS) == (None, False)
    assert normalize_name("   ", KNOWN_CHARACTERS) == (None, False)


# --- assembler ------------------------------------------------------------


def results_frame(**overrides: Any) -> FrameExtraction:
    base: dict[str, Any] = {
        "screen_type": "results",
        "left_character": "Captain Falcon",
        "right_character": "Donkey Kong",
        "winner_side": "left",
        "winner_stocks_remaining": 2,
        "confidence": 0.9,
    }
    base.update(overrides)
    return FrameExtraction(**base)


def test_assembler_pairs_stage_with_results_matt_left():
    clock = [1000.0]
    asm = MatchAssembler(known, now=lambda: clock[0])
    assert (
        asm.handle("s1", "left", FrameExtraction("stage_select", stage="battlefield"))
        is None
    )
    pending = asm.handle("s1", "left", results_frame())
    assert pending == {
        "shayneCharacter": "Donkey Kong",
        "mattCharacter": "Captain Falcon",
        "winner": "Matt",
        "stocksRemaining": 2,
        "stage": "Battlefield",
        "confidence": 0.9,
        "needsReview": [],
    }


def test_assembler_matt_right_side_mapping():
    asm = MatchAssembler(known)
    pending = asm.handle("s1", "right", results_frame(stage="Smashville"))
    assert pending is not None
    assert pending["mattCharacter"] == "Donkey Kong"
    assert pending["shayneCharacter"] == "Captain Falcon"
    assert pending["winner"] == "Shayne"  # left side won; Matt is on the right
    assert pending["stage"] == "Smashville"


def test_assembler_nametag_overrides_toggle():
    asm = MatchAssembler(known)
    pending = asm.handle("s1", "right", results_frame(left_tag="MATT H"))
    assert pending is not None
    # Tag puts Matt on the left despite the toggle saying right.
    assert pending["mattCharacter"] == "Captain Falcon"
    assert pending["winner"] == "Matt"


def test_assembler_incomplete_results_ignored():
    asm = MatchAssembler(known)
    assert asm.handle("s1", "left", results_frame(winner_side=None)) is None
    assert asm.handle("s1", "left", results_frame(left_character=None)) is None
    assert asm.handle("s1", "left", FrameExtraction("gameplay")) is None


def test_assembler_dedupes_lingering_results_screen():
    clock = [1000.0]
    asm = MatchAssembler(known, now=lambda: clock[0])
    assert asm.handle("s1", "left", results_frame(stage="Battlefield")) is not None
    clock[0] += 30
    assert asm.handle("s1", "left", results_frame(stage="Battlefield")) is None
    # A different result is a new match even inside the window.
    assert asm.handle("s1", "left", results_frame(winner_side="right")) is not None
    # And the same result far outside the window is a legitimate rematch.
    clock[0] += vision.DUPLICATE_WINDOW_SECONDS + 1
    assert asm.handle("s1", "left", results_frame(stage="Battlefield")) is not None


def test_assembler_flags_missing_fields_for_review():
    asm = MatchAssembler(known)
    pending = asm.handle(
        "s1",
        "left",
        results_frame(
            left_character="Piranha Plant", winner_stocks_remaining=7, stage=None
        ),
    )
    assert pending is not None
    assert pending["stocksRemaining"] is None
    assert set(pending["needsReview"]) == {
        "left_character",
        "stage",
        "stocksRemaining",
    }


def test_assembler_stage_consumed_by_match():
    asm = MatchAssembler(known)
    asm.handle("s1", "left", FrameExtraction("stage_select", stage="Battlefield"))
    first = asm.handle("s1", "left", results_frame())
    assert first is not None and first["stage"] == "Battlefield"
    second = asm.handle("s1", "left", results_frame(winner_side="right"))
    assert second is not None and second["stage"] is None
    assert "stage" in second["needsReview"]


# --- budget / queue -------------------------------------------------------


def test_daily_budget_caps():
    budget = DailyBudget(limit=2)
    assert budget.try_spend() and budget.try_spend()
    assert not budget.try_spend()
    assert budget.spent_today == 2


def test_pending_queue_ttl_prune():
    clock = [1000.0]
    q = PendingQueue(now=lambda: clock[0])
    q.add({"winner": "Matt"}, None)
    clock[0] += vision.PENDING_TTL_SECONDS + 1
    assert q.list() == []


# --- routes ---------------------------------------------------------------


class FakeExtractor:
    """Scripted stand-in for VisionExtractor."""

    available = True

    def __init__(self, extractions: list[FrameExtraction]):
        self.extractions = list(extractions)

    def extract(self, jpeg_bytes: bytes) -> FrameExtraction:
        return self.extractions.pop(0)


@pytest.fixture()
def vision_env(appmod: ModuleType, client):
    """Fresh vision state per test; extractor restored afterwards."""
    service = appmod.vision_service
    original_extractor = service.extractor
    original_budget = service.budget
    service.assembler = MatchAssembler(lambda: KNOWN_CHARACTERS)
    service.queue = PendingQueue()
    service.budget = DailyBudget()
    log_path = Path(service.store.log_path)
    if log_path.exists():
        log_path.unlink()
    yield service, client
    service.extractor = original_extractor
    service.budget = original_budget


def post_keyframe(client, **form: Any):
    data = {"frame": (io.BytesIO(b"\xff\xd8fakejpeg"), "frame.jpg"), **form}
    return client.post(
        "/api/vision/keyframe", data=data, content_type="multipart/form-data"
    )


def test_keyframe_503_when_unconfigured(vision_env):
    service, client = vision_env  # test env has no ANTHROPIC_API_KEY
    assert not service.extractor.available
    res = post_keyframe(client)
    assert res.status_code == 503


def test_keyframe_to_confirm_full_flow(vision_env, appmod: ModuleType):
    service, client = vision_env
    service.extractor = FakeExtractor(
        [
            FrameExtraction("stage_select", stage="Hollow Bastion"),
            FrameExtraction("gameplay"),
            results_frame(),
        ]
    )

    for expected_screen in ("stage_select", "gameplay", "results"):
        res = post_keyframe(client, mattSide="left", captureSessionId="t1")
        assert res.status_code == 200
        assert res.get_json()["screenType"] == expected_screen

    pending = client.get("/api/vision/pending").get_json()["pending"]
    assert len(pending) == 1
    item = pending[0]
    assert item["stage"] == "Hollow Bastion"
    assert item["winner"] == "Matt"
    assert item["frameUrl"].startswith("/api/vision/frames/")

    before = len(appmod.data_manager._load_data())
    res = client.post(
        f"/api/vision/pending/{item['id']}/confirm",
        json={
            "shayneCharacter": item["shayneCharacter"],
            "mattCharacter": item["mattCharacter"],
            "winner": item["winner"],
            "stocksRemaining": item["stocksRemaining"],
            "stage": item["stage"],
        },
    )
    assert res.status_code == 200 and res.get_json()["success"]

    # CSV row matches the manual-form contract (app.py add_game payload).
    df = appmod.data_manager._load_data()
    assert len(df) == before + 1
    row = df.iloc[-1]
    assert row["shayne_character"] == "Donkey Kong"
    assert row["matt_character"] == "Captain Falcon"
    assert row["winner"] == "Matt"
    assert float(row["stocks_remaining"]) == 2.0
    assert row["stage"] == "Hollow Bastion"

    # Queue drained; provenance written with extraction + final + linkage.
    assert client.get("/api/vision/pending").get_json()["pending"] == []
    events = [
        json.loads(line)
        for line in Path(service.store.log_path).read_text().splitlines()
    ]
    types = [e["type"] for e in events]
    assert types.count("keyframe") == 3
    confirm = next(e for e in events if e["type"] == "confirm")
    assert confirm["final"]["stage"] == "Hollow Bastion"
    assert confirm["matchId"] == str(
        appmod.data_manager._load_data().iloc[-1]["match_id"]
    )

    # The saved results keyframe is servable.
    frame_res = client.get(item["frameUrl"])
    assert frame_res.status_code == 200


def test_confirm_with_edits_and_validation(vision_env):
    service, client = vision_env
    service.extractor = FakeExtractor([results_frame(stage="Battlefield")])
    post_keyframe(client, mattSide="left")
    item = client.get("/api/vision/pending").get_json()["pending"][0]

    bad = client.post(
        f"/api/vision/pending/{item['id']}/confirm",
        json={**item, "winner": "Nobody"},
    )
    assert bad.status_code == 400

    edited = client.post(
        f"/api/vision/pending/{item['id']}/confirm",
        json={
            "shayneCharacter": "Kirby",
            "mattCharacter": "Fox",
            "winner": "Shayne",
            "stocksRemaining": 1,
            "stage": "Smashville",
        },
    )
    assert edited.status_code == 200


def test_discard_and_unknown_pending(vision_env):
    service, client = vision_env
    service.extractor = FakeExtractor([results_frame()])
    post_keyframe(client)
    item = client.get("/api/vision/pending").get_json()["pending"][0]
    assert client.post(f"/api/vision/pending/{item['id']}/discard").status_code == 200
    assert client.post(f"/api/vision/pending/{item['id']}/discard").status_code == 404
    assert client.post("/api/vision/pending/nope/confirm", json={}).status_code == 404


def test_keyframe_budget_429(vision_env):
    service, client = vision_env
    service.extractor = FakeExtractor([results_frame()])
    service.budget = DailyBudget(limit=0)
    assert post_keyframe(client).status_code == 429


def test_keyframe_bad_requests(vision_env):
    service, client = vision_env
    service.extractor = FakeExtractor([])
    res = client.post(
        "/api/vision/keyframe", data={}, content_type="multipart/form-data"
    )
    assert res.status_code == 400  # no frame
    assert post_keyframe(client, mattSide="middle").status_code == 400
