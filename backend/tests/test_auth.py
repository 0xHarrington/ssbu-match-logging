"""Multi-user Basic auth (SITE_USERS), the legacy SITE_PASSWORD gate, and
the /api/me identity endpoint."""

import base64

import pytest


def _basic(username: str, password: str) -> dict[str, str]:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


class TestDevMode:
    def test_no_credentials_configured_passes(self, client):
        assert client.get("/api/me").status_code == 200

    def test_me_defaults_to_matt(self, client):
        data = client.get("/api/me").get_json()
        assert data == {"success": True, "username": "matt", "player": "Matt"}

    def test_me_honors_dev_user(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("DEV_USER", "shayne")
        data = client.get("/api/me").get_json()
        assert data["username"] == "shayne"
        assert data["player"] == "Shayne"


class TestSiteUsers:
    USERS = "matt:pw-matt,shayne:pw-shayne"

    def test_valid_user_passes_and_identifies(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_USERS", self.USERS)
        resp = client.get("/api/me", headers=_basic("shayne", "pw-shayne"))
        assert resp.status_code == 200
        assert resp.get_json() == {"success": True, "username": "shayne", "player": "Shayne"}

    def test_other_user_identifies_as_matt(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_USERS", self.USERS)
        resp = client.get("/api/me", headers=_basic("matt", "pw-matt"))
        assert resp.get_json()["player"] == "Matt"

    def test_wrong_password_rejected(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_USERS", self.USERS)
        resp = client.get("/api/me", headers=_basic("matt", "pw-shayne"))
        assert resp.status_code == 401

    def test_unknown_user_rejected(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_USERS", self.USERS)
        resp = client.get("/api/me", headers=_basic("intruder", "pw-matt"))
        assert resp.status_code == 401

    def test_missing_credentials_prompt(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_USERS", self.USERS)
        resp = client.get("/api/stats")
        assert resp.status_code == 401
        assert resp.headers["WWW-Authenticate"].startswith("Basic")

    def test_username_case_insensitive(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_USERS", self.USERS)
        resp = client.get("/api/me", headers=_basic("Shayne", "pw-shayne"))
        assert resp.status_code == 200
        assert resp.get_json()["player"] == "Shayne"

    def test_password_may_contain_colon(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_USERS", "matt:pw:with:colons")
        resp = client.get("/api/me", headers=_basic("matt", "pw:with:colons"))
        assert resp.status_code == 200

    def test_gates_every_route(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_USERS", self.USERS)
        assert client.get("/api/sessions").status_code == 401
        assert client.post("/api/log_game", json={}).status_code == 401


class TestLegacySitePassword:
    def test_shared_password_any_username(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_PASSWORD", "shared-pw")
        assert client.get("/api/me", headers=_basic("whoever", "shared-pw")).status_code == 200
        assert client.get("/api/me", headers=_basic("", "shared-pw")).status_code == 200

    def test_unknown_username_falls_back_to_matt(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_PASSWORD", "shared-pw")
        data = client.get("/api/me", headers=_basic("whoever", "shared-pw")).get_json()
        assert data["player"] == "Matt"

    def test_wrong_shared_password_rejected(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_PASSWORD", "shared-pw")
        assert client.get("/api/me", headers=_basic("matt", "nope")).status_code == 401

    def test_site_users_supersedes_shared_password(self, client, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("SITE_PASSWORD", "shared-pw")
        monkeypatch.setenv("SITE_USERS", "matt:pw-matt")
        assert client.get("/api/me", headers=_basic("matt", "shared-pw")).status_code == 401
        assert client.get("/api/me", headers=_basic("matt", "pw-matt")).status_code == 200
