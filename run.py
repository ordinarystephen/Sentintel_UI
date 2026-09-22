"""Launch the Flask wrapper that serves the built Sentinel UI.

The target environment runs the app under its own HTTP proxy and injects ``PORT``; tests and
the platform share the same ``create_app()`` factory (docs/poc-serving-patterns.md §3).
"""

import os

from server import create_app


def _announce(port: int) -> None:
    """Print the URL to actually open.

    why: nothing auto-opens in a Domino workspace, and the app is not at
    localhost:<port> from the browser's point of view — it is behind the
    workspace proxy. Printing the path removes the guesswork that makes
    `make run` look like it did nothing.
    """
    workspace = os.getenv("SENTINEL_WORKSPACE_PATH") or os.getenv("DOMINO_RUN_HOST_PATH") or ""
    if not any(k.startswith("DOMINO_") for k in os.environ):
        return
    workspace = workspace.rstrip("/")
    print()
    if workspace:
        print(f"  Open:  <your-domino-host>{workspace}/proxy/{port}/")
    else:
        print(f"  Open your workspace URL with  /proxy/{port}/  appended.")
    print("  A blank page means dist/ was built for the wrong base path — see")
    print("  docs/environment.md and rebuild with: make build")
    print()


def main() -> None:
    app = create_app()
    host = os.getenv("FLASK_RUN_HOST", "0.0.0.0")  # noqa: S104 — the platform proxies the bind
    # why: 8082 by default — 8080 is the parent app, 8081 the POC
    # (docs/poc-serving-patterns.md §4.6). PORT (platform-injected) always wins.
    port = int(os.getenv("PORT", os.getenv("FLASK_RUN_PORT", "8082")))
    debug = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    _announce(port)
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    main()
