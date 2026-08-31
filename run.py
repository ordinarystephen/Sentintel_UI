"""Launch the Flask wrapper that serves the built Sentinel UI.

Domino runs the app under its own HTTP proxy and injects ``PORT``; tests and
Domino share the same ``create_app()`` factory (docs/poc-serving-patterns.md §3).
"""

import os

from server import create_app


def main() -> None:
    app = create_app()
    host = os.getenv("FLASK_RUN_HOST", "0.0.0.0")  # noqa: S104 — Domino proxies the bind
    # why: 8082 by default — 8080 is the parent app, 8081 the POC
    # (docs/poc-serving-patterns.md §4.6). PORT (Domino-injected) always wins.
    port = int(os.getenv("PORT", os.getenv("FLASK_RUN_PORT", "8082")))
    debug = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    main()
