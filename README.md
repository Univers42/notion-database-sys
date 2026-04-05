# notion-database-sys

Full-stack Notion clone with 10+ database views, a block-based page editor, a Rust/WASM formula engine, and multi-user real-time collaboration via WebSocket.

## Quick start

Primary workflow: `make` boots the full Dockerized stack for this repository.

**Prerequisites for the main workflow**: Docker + Docker Compose plugin + GNU Make

```bash
# Clone & configure
git clone <repo-url> && cd notion-database-sys
cp .env.example .env

# Boot the full stack
make
```

`make` is the default bootstrap flow in this branch. It runs the same sequence as
`make stack`:

- runs preflight checks for Docker, Compose, and host ports
- pulls stock images if they are missing locally
- builds or reuses the shared app image for `src`, `api`, and `playground`
- starts PostgreSQL, MongoDB, Redis, SonarQube, API, main app, and playground
- seeds the playground data through the API
- prints the effective localhost endpoints for the running stack

After `make` completes, the main endpoints are:

- `http://localhost:33000` for the main app
- `http://localhost:3001` for the playground
- `http://localhost:4000/health` for the API health endpoint
- `http://localhost:9000` for SonarQube

PostgreSQL, MongoDB, and Redis are exposed as TCP ports, not web pages.

## Local non-Docker workflow

If you want to run parts of the project directly with local Node.js tooling instead of
the main Docker bootstrap:

```bash
pnpm install

# Start only the infrastructure containers
make up-db

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

PostgreSQL, MongoDB and Redis are exposed as TCP ports, not web pages. Use a DB client,
`make psql`, `make mongo-shell`, or `make redis-cli` instead of opening those ports in a browser.

### Root

| Target | What it does |
|---|---|
| `make` | Default bootstrap: same as `make stack` |
| `make stack` | Full stack bootstrap: checks, start services, seed playground, print endpoints |
| `make up` | Start the full stack services without the extra bootstrap steps from `make stack` |
| `make up-db` | Start only PostgreSQL + MongoDB |
| `make up-sonar` | Start only Redis + SonarQube |
| `make up-app` | Start only API, main app, and playground |
| `make down` | Stop containers |
| `make restart` | Stop + start |
| `make db-reset` | Destroy volumes and recreate containers |
| `make db-status` | Show container health + DB connectivity |
| `make psql` | Open a `psql` shell inside the PostgreSQL container |
| `make mongo-shell` | Open a mongosh shell |
| `make build-packages` | Build all packages (types → core → api) |
| `make clean` | Remove containers, volumes, node_modules, dist |
| `make logs` | Tail container logs |
| `make typecheck` | TypeScript type-checking (no emit) |
| `make lint` | ESLint on all source directories (zero warnings) |
| `make audit` | Typecheck + lint + SonarQube scan (starts SonarQube if needed) |
| `make sonar-up` | Start SonarQube + Redis containers |
| `make sonar-scan` | Run SonarQube scanner only |
| `make ci` | Run the same checks as GitHub Actions locally |
| `make redis-cli` | Open a redis-cli shell |

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

If you override any published host port in `.env` (for example `POSTGRES_PORT=55432`),
update any host-side connection strings to use the same port.

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
| `SONAR_HOST_URL` | `https://sonarcloud.io` | SonarQube/SonarCloud server URL |
| `SONAR_TOKEN` | (none) | SonarCloud authentication token |
| `SONAR_PORT` | `9000` | Local SonarQube Docker port |
| `REDIS_PORT` | `6379` | Redis Docker port |

The API server also reads:

| Variable | Default | Purpose |
|---|---|---|
| `API_PORT` | `4000` | Fastify listen port |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT signing secret |
| `JWT_EXPIRES_IN` | `15m` | JWT token lifetime |
| `VITE_API_URL` | `http://localhost:4000` | API URL for the playground frontend |

## Code quality and static analysis

The CI pipeline runs TypeScript type-checking, ESLint, and SonarCloud analysis
on every push.  You can run the same checks locally:

```bash
make ci          # typecheck + lint + build (same as GitHub Actions)
make audit       # typecheck + lint + SonarQube scan (full analysis)
```

SonarCloud results are visible at:
[sonarcloud.io/dashboard?id=Univers42_notion-database-sys](https://sonarcloud.io/dashboard?id=Univers42_notion-database-sys)

For the complete SonarQube/SonarCloud setup guide, configuration reference,
and troubleshooting instructions, see **[docs/SONARQUBE.md](docs/SONARQUBE.md)**.

## Sub-READMEs

- [src/README.md](src/README.md) — Main frontend app
- [playground/README.md](playground/README.md) — Multi-user playground
- [packages/README.md](packages/README.md) — Backend packages (types, core, api)
- [services/README.md](services/README.md) — Docker service configs

## Community

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [SonarQube Guide](docs/SONARQUBE.md)
- [License](LICENSE)
- [Issue Templates](.github/ISSUE_TEMPLATE/)
- [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md)

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand · Fastify · Mongoose · @fastify/jwt · @fastify/websocket · Rust/WASM · Docker · pnpm workspaces · Turborepo
test
