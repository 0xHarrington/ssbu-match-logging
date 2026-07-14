"""Tests for GET /api/users/<username>/stats.

Regression coverage for the production 500: the endpoint used to read
`game_results.csv` relative to cwd instead of going through
`data_manager._load_data()` (which honors DATA_DIR). In prod, cwd has no
CSV at all, so this raised an unhandled FileNotFoundError. These tests
assert the totals match the 2-row seed (not whatever CSV might happen to
sit in backend/'s cwd), which only holds if the read goes through
DATA_DIR.
"""


class TestGetUserStats:
    def test_matt_stats_200_with_seed_totals(self, client) -> None:
        res = client.get("/api/users/Matt/stats")
        assert res.status_code == 200
        body = res.get_json()
        # Seed: 2 games total, Matt wins 1 (vs Fox/Falco), Shayne wins 1.
        assert body["totalGames"] == 2
        assert body["overallWinRate"] == 50.0

    def test_shayne_stats_200_with_seed_totals(self, client) -> None:
        res = client.get("/api/users/Shayne/stats")
        assert res.status_code == 200
        body = res.get_json()
        assert body["totalGames"] == 2
        assert body["overallWinRate"] == 50.0

    def test_reads_through_data_dir_not_cwd(self, client, data_dir) -> None:
        """Regression trigger: cwd is backend/ during tests (see conftest),
        which may contain a stale dev game_results.csv with a different row
        count. Asserting totalGames == 2 (the seed, written under DATA_DIR)
        proves the endpoint reads via data_manager._load_data() and not a
        bare relative-path pd.read_csv("game_results.csv")."""
        res = client.get("/api/users/Matt/stats")
        body = res.get_json()
        assert body["totalGames"] == 2
