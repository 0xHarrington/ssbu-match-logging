"""Regression tests for plan 004 — backend small-bore hardening bundle.

Each class below corresponds to one lettered lever in
plans/004-backend-hardening-bundle.md. Fixtures per conftest.py; assertion
style per test_match_editor.py.
"""

from pathlib import Path

import pandas as pd


class TestStreakNonContiguousIndex:
    """(a) `_load_data` filters rows without `reset_index`, leaving gaps in
    the DataFrame's integer index. `reversed(df["winner"])` calls
    `__getitem__` positionally, but pandas resolves bare integer keys as
    *labels* on an integer index — with a gap, that raises KeyError.
    """

    def test_streak_survives_non_contiguous_index(self, client, data_dir: Path) -> None:
        # Middle row has an empty matt_character, so _load_data filters it
        # out, leaving surviving rows at index positions 0 and 2 (a gap at 1).
        rows = [
            {
                "datetime": "2025-12-10 10:00:00",
                "shayne_character": "Fox",
                "matt_character": "Falco",
                "winner": "Matt",
                "stocks_remaining": 2,
                "stage": "Battlefield",
                "timestamp": 1765368000.0,
                "session_id": "2025-12-10-10",
                "match_id": "streak0001",
            },
            {
                "datetime": "2025-12-10 11:00:00",
                "shayne_character": "Fox",
                "matt_character": "",  # filtered by _load_data
                "winner": "Shayne",
                "stocks_remaining": 1,
                "stage": "Battlefield",
                "timestamp": 1765371600.0,
                "session_id": "2025-12-10-11",
                "match_id": "streak0002",
            },
            {
                "datetime": "2025-12-10 12:00:00",
                "shayne_character": "Fox",
                "matt_character": "Falco",
                "winner": "Shayne",
                "stocks_remaining": 3,
                "stage": "Battlefield",
                "timestamp": 1765375200.0,
                "session_id": "2025-12-10-12",
                "match_id": "streak0003",
            },
        ]
        pd.DataFrame(rows).to_csv(data_dir / "game_results.csv", index=False)

        res = client.get("/api/stats")
        assert res.status_code == 200
        body = res.get_json()
        assert body["success"] is True
        # Chronologically last two surviving rows are both Shayne wins in a
        # row after the Matt win at the start.
        assert body["stats"]["current_streak"] == {"player": "Shayne", "length": 1}
