# Same verbs as the parent POC — muscle memory matters here.
#   make install  → python deps (Flask wrapper) + exact npm deps from the lockfile
#   make build    → production SPA into dist/
#   make run      → serve dist/ via the Flask wrapper (PORT → FLASK_RUN_PORT → 8082)
#   make dev      → Vite dev server with the client-side mock API (play-around path)
#   make doctor   → why the app is unreachable in a Domino workspace
#
# All four detect a Domino workspace on their own (it exports DOMINO_* into
# every shell) and adjust — there is no separate Domino verb to remember.

.PHONY: install build run dev doctor

install:
	pip install -r requirements.txt
	npm ci

build:
	npm run build

run:
	python run.py

# why: a bare `vite` binds 127.0.0.1, serves at '/', and rejects proxied Host
# headers — invisible from the terminal, and fatal behind a workspace proxy.
# scripts/dev.mjs is a passthrough on a laptop and fixes all three in Domino.
dev:
	node scripts/dev.mjs

doctor:
	sh scripts/domino-doctor.sh
