"""Tests for the non-destructive GET /api/sessions read path and the
startup session-id backfill (plan 001).

The old get_sessions() loaded through _load_data (which drops malformed rows)
and persisted the filtered frame back to disk on every call. These tests pin
the fix: reads never write, and session-id persistence lives only in the
startup repair pass.
"""

import re
from pathlib import Path
from types import ModuleType
from typing import Any, Dict, List

import pandas as pd

SESSION_ID_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-\d{2}$")

COLUMNS: List[str] = [
    "datetime",
    "shayne_character",
    "matt_character",
    "winner",
    "stocks_remaining",
    "stage",
    "timestamp",
    "session_id",
    "match_id",
]


def _write_rows(data_dir: Path, rows: List[Dict[str, Any]]) -> None:
    pd.DataFrame(rows, columns=COLUMNS).to_csv(
        data_dir / "game_results.csv", index=False
    )


def _read_csv(data_dir: Path) -> pd.DataFrame:
    return pd.read_csv(data_dir / "game_results.csv")


def _valid_row() -> Dict[str, Any]:
    return {
        "datetime": "2025-12-11 21:05:18",
        "shayne_character": "Fox",
        "matt_character": "Falco",
        "winner": "Matt",
        "stocks_remaining": 2,
        "stage": "Battlefield",
        "timestamp": 1765505118.0,
        "session_id": "2025-12-11-21",
        "match_id": "seedmatch0001",
    }


class TestGetSessionsNonDestructive:
    def test_get_preserves_malformed_rows(self, client, data_dir: Path) -> None:
        malformed = {
            # Empty matt_character — _load_data drops it from the served
            # result, but a GET must not delete it from disk.
            "datetime": "2025-12-11 21:10:00",
            "shayne_character": "Jigglypuff",
            "matt_character": "",
            "winner": "Shayne",
            "stocks_remaining": 1,
            "stage": "Smashville",
            "timestamp": 1765505400.0,
            "session_id": "2025-12-11-21",
            "match_id": "seedmatch0002",
        }
        _write_rows(data_dir, [_valid_row(), malformed])

        res = client.get("/api/sessions")
        assert res.status_code == 200

        after = _read_csv(data_dir)
        assert len(after) == 2
        assert "Jigglypuff" in set(after["shayne_character"])
        # The malformed cell is still empty/NaN — untouched on disk.
        row = after[after["shayne_character"] == "Jigglypuff"].iloc[0]
        assert pd.isna(row["matt_character"])

    def test_get_does_not_write(self, client, data_dir: Path) -> None:
        # No session_id: the old code would persist an assigned id here.
        row = {**_valid_row(), "session_id": None}
        _write_rows(data_dir, [row])

        csv_path = data_dir / "game_results.csv"
        before = csv_path.read_bytes()
        assert client.get("/api/sessions").status_code == 200
        assert client.get("/api/sessions").status_code == 200
        assert csv_path.read_bytes() == before


class TestBackfillSessionIds:
    def test_assigns_missing_session_id(
        self, appmod: ModuleType, data_dir: Path
    ) -> None:
        _write_rows(data_dir, [{**_valid_row(), "session_id": None}])

        appmod.data_manager._backfill_session_ids()

        df = _read_csv(data_dir)
        assert df["session_id"].notna().all()
        assert SESSION_ID_RE.match(str(df.iloc[0]["session_id"]))

    def test_idempotent(self, appmod: ModuleType, data_dir: Path) -> None:
        _write_rows(data_dir, [{**_valid_row(), "session_id": None}])

        appmod.data_manager._backfill_session_ids()
        after_first = (data_dir / "game_results.csv").read_bytes()
        appmod.data_manager._backfill_session_ids()
        after_second = (data_dir / "game_results.csv").read_bytes()
        assert after_first == after_second
