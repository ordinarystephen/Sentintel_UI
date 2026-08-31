"""Flask wrapper tests — ported from the POC's tests/test_spa_routes.py
(docs/poc-serving-patterns.md §3.1). Run: python -m pytest tests/ -q
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from server import create_app
from server import spa


@pytest.fixture()
def client():
    app = create_app()
    app.testing = True
    return app.test_client()


def test_api_paths_not_intercepted(client):
    """Unknown /api/... paths must 404 as JSON-territory, never fall through to HTML."""
    resp = client.get("/api/definitely-not-a-route")
    assert resp.status_code == 404
    assert b"<html" not in resp.data.lower()


def test_client_routes_fall_back_to_index(client, tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text("<!doctype html><title>app</title>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "x.js").write_text("// asset")
    monkeypatch.setattr(spa, "_build_dir", lambda: tmp_path)

    assert client.get("/").status_code == 200
    deep = client.get("/review/rev-meridian-2026-08")
    assert deep.status_code == 200
    assert b"<title>app</title>" in deep.data          # index.html, not 404
    asset = client.get("/assets/x.js")
    assert asset.status_code == 200
    assert b"// asset" in asset.data                   # real file wins over fallback


def test_placeholder_when_frontend_not_built(client, tmp_path, monkeypatch):
    monkeypatch.setattr(spa, "_build_dir", lambda: tmp_path / "missing")
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"has not been built" in resp.data
    assert b"npm run build" in resp.data
