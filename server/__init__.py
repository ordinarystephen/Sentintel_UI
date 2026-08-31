"""Flask serving wrapper for the built Sentinel UI (Domino-style).

Pattern inherited verbatim from the parent POC — see
docs/poc-serving-patterns.md §3: one process serves the static build and
(future) API on one port, same-origin, no CORS ever.

Registration order is the routing contract: API blueprints mount under /api
FIRST and win the route match; the SPA catch-all registers LAST. The mock API
is client-side today, so no API blueprint exists yet — when src/api/http/
gets its Flask counterpart, it mounts here, above the catch-all.
"""

from flask import Flask

from server.spa import bp as spa_bp


def create_app() -> Flask:
    # why: the SPA catch-all owns asset serving; Flask's default static
    # handler would collide with it, so it is disabled entirely.
    app = Flask(__name__, static_folder=None, template_folder=None)
    # (future) API blueprints register here, before the catch-all.
    app.register_blueprint(spa_bp)  # catch-all — must be last
    return app
