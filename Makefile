# Same verbs as the parent POC — muscle memory matters here.
#   make install  → python deps (Flask wrapper) + exact npm deps from the lockfile
#   make build    → production SPA into dist/
#   make run      → serve dist/ via the Flask wrapper (PORT → FLASK_RUN_PORT → 8082)
#   make dev      → Vite dev server with the client-side mock API (play-around path)

.PHONY: install build run dev

install:
	pip install -r requirements.txt
	npm ci

build:
	npm run build

run:
	python run.py

dev:
	npm run dev
