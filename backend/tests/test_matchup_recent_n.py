"""Tests for the `recent_n` rolling-window param on /matchup_stats.

Added for the Session Command Center redesign's on-deck matchup card, which
shows an all-time / last-50 / this-session split. Only the seed row exists for
Fox vs Falco (a Matt win), so most cases log extra games first.
"""


def _log(client, winner, stage="Battlefield"):
    return client.post(
        "/api/log_game",
        json={
            "shayneCharacter": "Fox",
            "mattCharacter": "Falco",
            "winner": winner,
            "stage": stage,
            "stocksRemaining": 2,
        },
    )


class TestRecentN:
    def test_absent_param_omits_key(self, client) -> None:
        body = client.get(
            "/matchup_stats?shayne_character=Fox&matt_character=Falco"
        ).get_json()
        assert body["total_games"] == 1
        assert body["matt_wins"] == 1
        assert "recent_n" not in body

    def test_window_larger_than_total_mirrors_all_time(self, client) -> None:
        body = client.get(
            "/matchup_stats?shayne_character=Fox&matt_character=Falco&recent_n=50"
        ).get_json()
        assert body["recent_n"]["n"] == 50
        assert body["recent_n"]["games"] == body["total_games"] == 1
        assert body["recent_n"]["shayne_wins"] == body["shayne_wins"]
        assert body["recent_n"]["matt_wins"] == body["matt_wins"] == 1

    def test_window_caps_to_recent_n(self, client) -> None:
        # Seed has 1 game; add 3 more -> 4 total for this matchup.
        _log(client, "Shayne")
        _log(client, "Shayne")
        _log(client, "Matt")
        body = client.get(
            "/matchup_stats?shayne_character=Fox&matt_character=Falco&recent_n=2"
        ).get_json()
        assert body["total_games"] == 4
        assert body["recent_n"]["games"] == 2
        # The window is exactly 2 games; the split sums to the window size.
        assert body["recent_n"]["shayne_wins"] + body["recent_n"]["matt_wins"] == 2

    def test_empty_matchup_returns_zeroed_window(self, client) -> None:
        body = client.get(
            "/matchup_stats?shayne_character=Kirby&matt_character=Bowser&recent_n=50"
        ).get_json()
        assert body["total_games"] == 0
        assert body["recent_n"] == {
            "n": 50,
            "games": 0,
            "shayne_wins": 0,
            "matt_wins": 0,
        }

    def test_invalid_recent_n_rejected(self, client) -> None:
        assert (
            client.get(
                "/matchup_stats?shayne_character=Fox&matt_character=Falco&recent_n=0"
            ).status_code
            == 400
        )
        assert (
            client.get(
                "/matchup_stats?shayne_character=Fox&matt_character=Falco&recent_n=abc"
            ).status_code
            == 400
        )
