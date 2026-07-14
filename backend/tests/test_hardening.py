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


class TestSessionStatsDstAmbiguous:
    """(b) `dt.tz_localize("US/Eastern")` defaults to ambiguous="raise" /
    nonexistent="raise". A match logged during the 01:00-01:59 fall-back
    repeat hour poisons the whole /api/session_stats endpoint.
    """

    def test_ambiguous_local_time_does_not_500(self, client, data_dir: Path) -> None:
        # 2025-11-02 01:30:00 is the DST fall-back repeated hour in US/Eastern.
        rows = [
            {
                "datetime": "2025-11-02 01:30:00",
                "shayne_character": "Fox",
                "matt_character": "Falco",
                "winner": "Matt",
                "stocks_remaining": 2,
                "stage": "Battlefield",
                "timestamp": 1762061400.0,
                "session_id": "2025-11-02-01",
                "match_id": "dstmatch01",
            },
        ]
        pd.DataFrame(rows).to_csv(data_dir / "game_results.csv", index=False)

        res = client.get("/api/session_stats")
        assert res.status_code == 200
        assert res.get_json()["success"] is True


class TestListMatchesQueryParams:
    """(c) `int(request.args.get(...))` raises ValueError on non-numeric
    input, caught only by the generic handler -> 500. Mirror the recent_n
    pattern: explicit try/except -> 400 with a message.
    """

    def test_non_integer_limit_returns_400(self, client) -> None:
        res = client.get("/api/matches?limit=abc")
        assert res.status_code == 400
        assert "error" in res.get_json()

    def test_non_integer_offset_returns_400(self, client) -> None:
        res = client.get("/api/matches?offset=abc")
        assert res.status_code == 400
        assert "error" in res.get_json()

    def test_negative_offset_clamps_to_zero(self, client) -> None:
        res = client.get("/api/matches?offset=-5")
        assert res.status_code == 200
        body = res.get_json()
        assert body["success"] is True
        # Clamped to 0 -> identical page to an explicit offset=0 request.
        baseline = client.get("/api/matches?offset=0").get_json()
        assert body["matches"] == baseline["matches"]
