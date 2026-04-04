# notion-database-sys

Full-stack Notion clone with 10+ database views, a block-based page editor, a Rust/WASM formula engine, and multi-user real-time collaboration via WebSocket.

## Quick start

**Prerequisites**: Node.js 20+, pnpm 10+, Docker

```bash
# Clone & install
git clone <repo-url> && cd notion-database-sys
cp .env.example .env
pnpm install

# Start databases (MongoDB + PostgreSQL)
make up

# Seed data for the main app
cd src && make seed-all && cd ..

# Run the main frontend
pnpm dev:src          # http://localhost:3000
```

To run the multi-user playground instead:

```bash
pnpm dev:api          # Fastify API on :4000
pnpm dev:playground   # Playground UI on :3001
```

## Project structure

| Directory | What it is |
|---|---|
| `src/` | Main frontend React app (Vite) — full Notion DBMS clone |
| `playground/` | Multi-user sandbox app, connects to the Fastify API |
| `packages/api/` | Fastify REST API — auth (JWT), CRUD, WebSocket real-time sync |
| `packages/core/` | Shared MongoDB models (Mongoose), services, ABAC permissions |
| `packages/types/` | Shared TypeScript type definitions |
| `services/` | Docker configs for MongoDB 7 and PostgreSQL 16 |
| `services/dbms/` | Database adapter layer (JSON, CSV, MongoDB, PostgreSQL) |
| `scripts/` | Build helpers, seed scripts, code generation |
| `docker/` | SQL init scripts for Docker entrypoints |

## Make targets

Run `make help` at root for the full list. Here are the main ones:

### Root

| Target | What it does |
|---|---|
| `make up` | Start Docker containers (MongoDB + PostgreSQL) |
| `make down` | Stop containers |
| `make restart` | Stop + start |
| `make db-reset` | Destroy volumes and recreate containers |
| `make db-status` | Show container health + DB connectivity |
| `make psql` | Open a psql shell |
| `make mongo-shell` | Open a mongosh shell |
| `make build-packages` | Build all packages (types → core → api) |
| `make clean` | Remove containers, volumes, node_modules, dist |
| `make logs` | Tail container logs |

### src/ (run from `src/`)

| Target | What it does |
|---|---|
| `make dev` | Vite dev server on :3000 |
| `make seed-all` | Seed both PostgreSQL and MongoDB |
| `make re` | Full reset — wipe DBs, re-seed |
| `make verify` | Show row/doc counts in both databases |
| `make build-rust` | Build Rust WASM crates |

### playground/ (run from `playground/`)

| Target | What it does |
|---|---|
| `make dev` | Playground Vite on :3001 |
| `make dev-api` | Start Fastify API server |
| `make dev-all` | Start playground + API in parallel |
| `make seed` | Seed MongoDB with 3 users + workspaces |
| `make re` | Full restart — wipe DB, re-seed |

## Environment variables

Copy `.env.example` → `.env` at project root:

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `notion_user` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `notion_pass` | PostgreSQL password |
| `POSTGRES_DB` | `notion_db` | PostgreSQL database |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `DATABASE_URL` | `postgresql://...` | Full PostgreSQL connection string |
| `MONGO_USER` | `notion_user` | MongoDB username |
| `MONGO_PASSWORD` | `notion_pass` | MongoDB password |
| `MONGO_DB` | `notion_db` | MongoDB database |
| `MONGO_PORT` | `27017` | MongoDB port |
| `MONGO_URI` | `mongodb://...` | Full MongoDB connection string |
| `JSON_DB_PATH` | `./src/store/dbms/json` | JSON flat-file DB path |
| `CSV_DB_PATH` | `./src/store/dbms/csv` | CSV flat-file DB path |
| `ACTIVE_DB_SOURCE` | `json` | Active backend: `json` / `csv` / `mongodb` / `postgresql` |

The API server also reads:

| Variable | Default | Purpose |
|---|---|---|
| `API_PORT` | `4000` | Fastify listen port |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT signing secret |
| `JWT_EXPIRES_IN` | `15m` | JWT token lifetime |
| `VITE_API_URL` | `http://localhost:4000` | API URL for the playground frontend |

## Sub-READMEs

- [src/README.md](src/README.md) — Main frontend app
- [playground/README.md](playground/README.md) — Multi-user playground
- [packages/README.md](packages/README.md) — Backend packages (types, core, api)
- [services/README.md](services/README.md) — Docker service configs

## Community

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [License](LICENSE)
- [Issue Templates](.github/ISSUE_TEMPLATE/)
- [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md)

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand · Fastify · Mongoose · @fastify/jwt · @fastify/websocket · Rust/WASM · Docker · pnpm workspaces · Turborepo
# osionos
