"""Shape-parity test for /api/stats — plan 007 step 5.

GameDataManager.get_stats() has two branches: an empty-data early return and
a populated-data build-out. The empty branch used to omit four keys the
populated branch adds (top_shayne_chars, top_matt_chars, avg_stocks_shayne,
avg_stocks_matt), so the client's shape changed depending on whether any
games had been logged yet. This pins the fix: both branches return the same
key set.
"""

from pathlib import Path
from typing import Any, Dict, List

import pandas as pd

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


def _write_empty(data_dir: Path) -> None:
    pd.DataFrame([], columns=COLUMNS).to_csv(
        data_dir / "game_results.csv", index=False
    )


class TestStatsShapeParity:
    def test_empty_and_populated_key_sets_match(
        self, client: Any, data_dir: Path
    ) -> None:
        populated_body: Dict[str, Any] = client.get("/api/stats").get_json()
        populated_keys = set(populated_body["stats"].keys())
        assert populated_keys, "populated branch returned no keys — seed broken"

        _write_empty(data_dir)
        empty_body: Dict[str, Any] = client.get("/api/stats").get_json()
        empty_keys = set(empty_body["stats"].keys())

        assert empty_keys == populated_keys
