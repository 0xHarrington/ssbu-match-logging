"""Tests for match identity backfill and the match-editor API."""

from pathlib import Path

import pandas as pd


def _read_csv(data_dir: Path) -> pd.DataFrame:
    return pd.read_csv(data_dir / "game_results.csv")


class TestBackfill:
    def test_assigns_match_ids_and_timestamps(self, client, data_dir: Path) -> None:
        df = _read_csv(data_dir)
        assert df["match_id"].notna().all()
        assert df["match_id"].nunique() == len(df)
        assert df["timestamp"].notna().all()
        # Existing ids are preserved
        assert "seedmatch0001" in set(df["match_id"])

    def test_idempotent(self, client, appmod, data_dir: Path) -> None:
        before = _read_csv(data_dir)
        appmod.data_manager._backfill_match_ids_and_timestamps()
        after = _read_csv(data_dir)
        assert list(before["match_id"]) == list(after["match_id"])
        assert list(before["timestamp"]) == list(after["timestamp"])


class TestListMatches:
    def test_lists_newest_first_with_ids(self, client) -> None:
        res = client.get("/api/matches")
        body = res.get_json()
        assert res.status_code == 200 and body["success"]
        assert body["total"] == 2
        assert body["matches"][0]["match_id"] == "seedmatch0001"
        assert all(m["match_id"] for m in body["matches"])

    def test_session_filter(self, client) -> None:
        body = client.get("/api/matches?session_id=2025-10-25-18").get_json()
        assert body["total"] == 1
        assert body["matches"][0]["shayne_character"] == "Donkey Kong"


class TestUpdateMatch:
    def test_updates_fields(self, client, data_dir: Path) -> None:
        res = client.put(
            "/api/matches/seedmatch0001",
            json={"winner": "Shayne", "stocksRemaining": 3, "stage": "Yoshi's Story"},
        )
        body = res.get_json()
        assert res.status_code == 200 and body["success"]
        assert body["match"]["winner"] == "Shayne"
        row = _read_csv(data_dir).set_index("match_id").loc["seedmatch0001"]
        assert row["winner"] == "Shayne"
        assert int(row["stocks_remaining"]) == 3
        assert row["stage"] == "Yoshi's Story"

    def test_writes_edit_log(self, client, data_dir: Path) -> None:
        client.put("/api/matches/seedmatch0001", json={"winner": "Shayne"})
        log = pd.read_csv(data_dir / "edit_log.csv")
        assert len(log) == 1
        assert log.iloc[0]["action"] == "update"
        assert log.iloc[0]["match_id"] == "seedmatch0001"

    def test_validation_errors(self, client) -> None:
        cases = [
            {"shayneCharacter": "NotACharacter"},
            {"winner": "Jaspreet"},
            {"stage": "Fountain of Dreams"},
            {"stocksRemaining": 5},
            {"bogusField": 1},
            {},
        ]
        for payload in cases:
            res = client.put("/api/matches/seedmatch0001", json=payload)
            assert res.status_code == 400, payload
            assert res.get_json()["success"] is False

    def test_empty_stage_canonicalizes_to_no_stage(
        self, client, data_dir: Path
    ) -> None:
        res = client.put("/api/matches/seedmatch0001", json={"stage": ""})
        assert res.status_code == 200
        row = _read_csv(data_dir).set_index("match_id").loc["seedmatch0001"]
        assert row["stage"] == "No Stage"

    def test_unknown_id_404(self, client) -> None:
        res = client.put("/api/matches/doesnotexist", json={"winner": "Matt"})
        assert res.status_code == 404


class TestDeleteMatch:
    def test_deletes_and_logs(self, client, data_dir: Path) -> None:
        res = client.delete("/api/matches/seedmatch0001")
        assert res.status_code == 200 and res.get_json()["success"]
        df = _read_csv(data_dir)
        assert len(df) == 1
        assert "seedmatch0001" not in set(df["match_id"])
        log = pd.read_csv(data_dir / "edit_log.csv")
        assert log.iloc[0]["action"] == "delete"

    def test_double_delete_404(self, client) -> None:
        assert client.delete("/api/matches/seedmatch0001").status_code == 200
        assert client.delete("/api/matches/seedmatch0001").status_code == 404


class TestLogGame:
    def test_new_games_get_match_ids(self, client, data_dir: Path) -> None:
        res = client.post(
            "/api/log_game",
            json={
                "shayneCharacter": "Fox",
                "mattCharacter": "Marth",
                "stage": "Battlefield",
                "winner": "Matt",
                "stocksRemaining": 1,
            },
        )
        assert res.status_code == 200
        df = _read_csv(data_dir)
        assert len(df) == 3
        newest = df.loc[pd.to_numeric(df["timestamp"]).idxmax()]
        assert isinstance(newest["match_id"], str) and len(newest["match_id"]) == 12
