"""Launch the Flask wrapper that serves the built Sentinel UI.

The target environment runs the app under its own HTTP proxy and injects ``PORT``; tests and
the platform share the same ``create_app()`` factory (docs/poc-serving-patterns.md §3).
"""

import os
import re
import subprocess
from pathlib import Path

from server import create_app


def _discover_via_node() -> str:
    """Ask scripts/workspace.mjs for the rest of the chain: a pin written
    under an earlier file name, then the discovery probes.

    why shell out: the legacy-pin rule and the probes (environment, process
    table, jupyter config) live in one place so JS and Python cannot drift.
    Failure is silent and non-fatal — serving must never depend on discovery
    succeeding.
    """
    try:
        out = subprocess.run(
            [
                "node",
                "-e",
                "import('./scripts/workspace.mjs').then(m=>console.log(m.workspacePath()))",
            ],
            cwd=Path(__file__).resolve().parent,
            capture_output=True,
            text=True,
            timeout=10,
        )
        return out.stdout.strip()
    except Exception:
        return ""


def _workspace_path() -> str:
    """The workspace prefix (explicit, pinned or discovered), or "" locally.

    why a pin and discovery rather than platform-variable detection: the real
    target workspace exports none of the platform's variables (verified
    2026-09-22), so anything keyed off them silently takes the laptop path.
    Mirrors scripts/workspace.mjs — keep the two in step.
    """
    raw = os.getenv("SENTINEL_WORKSPACE_PATH", "")
    if not raw:
        pin = Path(__file__).resolve().parent / ".sentinel-workspace-path"
        if pin.is_file():
            raw = pin.read_text().strip()
    if not raw:
        raw = _discover_via_node()
    raw = raw.strip()
    if not raw:
        return ""
    # accept a full URL pasted straight out of the address bar
    raw = re.sub(r"^[a-z][a-z0-9+.-]*://[^/]+", "", raw, flags=re.I)
    raw = raw.split("?")[0].split("#")[0]
    raw = re.sub(r"/proxy/\d+/?$", "", raw).rstrip("/")
    if raw and not raw.startswith("/"):
        raw = "/" + raw
    return raw


def _in_workspace() -> bool:
    target = os.getenv("SENTINEL_TARGET", "")
    if target == "workspace":
        return True
    if target == "local":
        return False
    return bool(_workspace_path())


def _announce(port: int) -> None:
    """Print the URL to actually open.

    why: nothing auto-opens in a workspace, and the app is not at
    localhost:<port> from the browser's point of view — it is behind the
    workspace proxy. Printing the path removes the guesswork that makes
    `make run` look like it did nothing.
    """
    if not _in_workspace():
        return
    workspace = _workspace_path()
    print()
    if workspace:
        print(f"  Open:  <your-workspace-host>{workspace}/proxy/{port}/")
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
