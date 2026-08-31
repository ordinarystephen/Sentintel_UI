"""SPA catch-all: real file from dist/ -> index.html -> styled placeholder.

Inherited verbatim from the POC's server/api/spa.py
(docs/poc-serving-patterns.md §3.1). Three-tier resolution gives the app
SPA fallback (deep-link refresh works) and a helpful page instead of a 500
when the frontend has not been built in this workspace yet.
"""

from pathlib import Path

from flask import Blueprint, current_app, send_from_directory

bp = Blueprint("spa", __name__)

_PLACEHOLDER_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sentinel — frontend not built</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         color: #1c1917; background: #f8f7f5; margin: 0;
         display: grid; place-items: center; min-height: 100vh; }
  main { max-width: 40rem; padding: 2.5rem; background: #fdfdfc;
         border: 1px solid #e9e6e2; border-radius: 12px; }
  h1 { font-family: "New York", ui-serif, Georgia, serif; font-size: 1.4rem;
       margin: 0 0 .5rem; }
  p { color: #78716c; font-size: .9rem; line-height: 1.6; }
  pre { background: #f1efec; border-radius: 8px; padding: .8rem 1rem;
        font-size: .8rem; overflow-x: auto; }
</style>
</head>
<body>
<main>
  <h1>Backend ready — the frontend has not been built yet</h1>
  <p>The Flask wrapper is serving, but there is no <code>dist/</code> in this
  workspace. Build the SPA, then reload:</p>
  <pre>npm ci
npm run build            # add VITE_BASE_PATH=/proxy/8082/ for a published Domino App</pre>
  <p>See <code>docs/environment.md</code> ("Domino day one") for the full sequence.</p>
</main>
</body>
</html>
"""


def _build_dir() -> Path:
    return Path(current_app.root_path).parent / "dist"


@bp.route("/", defaults={"path": ""})
@bp.route("/<path:path>")
def serve_spa(path: str):
    """Serve the SPA build, falling back to ``index.html`` for client routes."""
    # Defensive only: API blueprints register first and win the route match.
    # Kept even though today's mock API is client-side — it future-proofs the
    # seam: an unknown /api/... path stays JSON-territory 404, never HTML.
    if path.startswith("api/"):
        return ("", 404)
    build_dir = _build_dir()
    if not build_dir.exists():
        return _PLACEHOLDER_HTML, 200, {"Content-Type": "text/html; charset=utf-8"}
    if path:
        candidate = build_dir / path
        if candidate.is_file():
            return send_from_directory(build_dir, path)
    if (build_dir / "index.html").is_file():
        return send_from_directory(build_dir, "index.html")
    return _PLACEHOLDER_HTML, 200, {"Content-Type": "text/html; charset=utf-8"}
