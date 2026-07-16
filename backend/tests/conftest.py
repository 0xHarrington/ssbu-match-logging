"""Fixtures for backend API tests.

The app module holds a module-level GameDataManager bound to DATA_DIR at
import time, so DATA_DIR is pointed at a temp dir and the CSV seeded BEFORE
the one-and-only `import app`. Each test rewrites the seed and re-runs the
idempotent backfill for isolation.
"""

import importlib
import os
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pandas as pd
import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

SEED_ROWS: list[dict[str, Any]] = [
    {
        # Modern row: complete
        "datetime": "2025-12-11 21:05:18",
        "shayne_character": "Fox",
        "matt_character": "Falco",
        "winner": "Matt",
        "stocks_remaining": 2,
        "stage": "Battlefield",
        "timestamp": 1765505118.0,
        "session_id": "2025-12-11-21",
        "match_id": "seedmatch0001",
    },
    {
        # Legacy row: missing timestamp and match_id (the 218-row historical case)
        "datetime": "2025-10-25 18:54:03",
        "shayne_character": "Donkey Kong",
        "matt_character": "Kirby",
        "winner": "Shayne",
        "stocks_remaining": 1,
        "stage": "Smashville",
        "timestamp": None,
        "session_id": "2025-10-25-18",
        "match_id": None,
    },
]


def _write_seed(csv_path: Path) -> None:
    pd.DataFrame(SEED_ROWS).to_csv(csv_path, index=False)


@pytest.fixture(scope="session")
def appmod(tmp_path_factory: pytest.TempPathFactory) -> ModuleType:
    data_dir = tmp_path_factory.mktemp("ssbu-data")
    os.environ["DATA_DIR"] = str(data_dir)
    os.environ.pop("SITE_PASSWORD", None)
    # characters.json is resolved relative to cwd
    os.chdir(BACKEND_DIR)
    _write_seed(data_dir / "game_results.csv")
    module = importlib.import_module("app")
    return module


@pytest.fixture()
def client(appmod: ModuleType):
    """Fresh seed + backfill + test client per test."""
    _write_seed(Path(appmod.DATA_DIR) / "game_results.csv")
    edit_log = Path(appmod.DATA_DIR) / "edit_log.csv"
    if edit_log.exists():
        edit_log.unlink()
    appmod.data_manager._backfill_match_ids_and_timestamps()
    return appmod.app.test_client()


@pytest.fixture()
def data_dir(appmod: ModuleType) -> Path:
    return Path(appmod.DATA_DIR)
