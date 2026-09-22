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


def test_forwarded_proxy_prefix_still_serves_assets(client, tmp_path, monkeypatch):
    """A workspace proxy that forwards its own prefix must not break asset serving.

    Domino exposes a port at `<workspace>/proxy/<port>/`. Some proxies strip
    that prefix before forwarding, some pass the whole path through. In the
    second case the catch-all previously saw
    `u/me/proj/r/notebookSession/abc/proxy/8082/assets/x.js`, found no such
    file, and returned index.html — so the browser got HTML where it asked for
    JavaScript and the page died on a MIME error rather than a 404.
    """
    (tmp_path / "index.html").write_text("<!doctype html><title>app</title>")
    (tmp_path / "assets").mkdir()
    (tmp_path / "assets" / "x.js").write_text("// asset")
    monkeypatch.setattr(spa, "_build_dir", lambda: tmp_path)

    prefix = "/u/me/proj/r/notebookSession/abc123/proxy/8082"
    asset = client.get(f"{prefix}/assets/x.js")
    assert asset.status_code == 200
    assert b"// asset" in asset.data

    # the prefix root, and a deep client route under it, both reach the SPA
    assert b"<title>app</title>" in client.get(f"{prefix}/").data
    assert b"<title>app</title>" in client.get(f"{prefix}/crr/review/rev-1").data


def test_forwarded_proxy_prefix_keeps_api_guard(client, tmp_path, monkeypatch):
    """Stripping the prefix must not smuggle /api/... past the JSON-territory guard."""
    monkeypatch.setattr(spa, "_build_dir", lambda: tmp_path)
    resp = client.get("/u/me/proj/r/notebookSession/abc123/proxy/8082/api/nope")
    assert resp.status_code == 404
    assert b"<html" not in resp.data.lower()
