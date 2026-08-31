#!/usr/bin/env bash
# Domino App entry point (docs/poc-serving-patterns.md §3.2, written down this
# time): run from the repo root regardless of the caller's CWD, then hand the
# process over to Flask. Domino injects PORT; run.py honors it.
cd "$(dirname "$0")"
exec python run.py
