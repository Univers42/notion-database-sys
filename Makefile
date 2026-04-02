.PHONY: help up down restart logs db-up db-down db-reset \
       seed-pg seed-mongo seed-all seed-state status psql mongo-shell \
       build-rust check-rust dev clean

SHELL := /bin/bash
-include .env
export

# ── Colours ──────────────────────────────────────────────
CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "$(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'

# ── Docker ───────────────────────────────────────────────
up: ## Start all containers (postgres + mongo)
	docker compose up -d
	@echo -e "$(GREEN)✔ Containers up$(RESET)"

down: ## Stop all containers
	docker compose down
	@echo -e "$(GREEN)✔ Containers down$(RESET)"

restart: down up ## Restart containers

logs: ## Tail container logs
	docker compose logs -f --tail=50

db-up: up ## Alias for up

db-down: down ## Alias for down

db-reset: ## Destroy volumes and recreate
	docker compose down -v
	docker compose up -d
	@echo -e "$(GREEN)✔ Volumes destroyed, containers recreated$(RESET)"

status: ## Show container status
	docker compose ps

# ── Seeding ──────────────────────────────────────────────
seed-pg: ## Seed PostgreSQL from SQL files
	@echo "Waiting for PostgreSQL..."
	@until docker compose exec -T postgres pg_isready -U $${POSTGRES_USER:-notion_user} > /dev/null 2>&1; do sleep 1; done
	docker compose exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db} \
		-f /docker-entrypoint-initdb.d/001_schema.sql
	docker compose exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db} \
		-f /docker-entrypoint-initdb.d/002_seed.sql
	@echo -e "$(GREEN)✔ PostgreSQL seeded$(RESET)"

seed-mongo: ## Seed MongoDB from JSON files
	@echo "Waiting for MongoDB..."
	@until docker compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; do sleep 1; done
	@for f in src/store/dbms/mongodb/*.seed.json; do \
		collection=$$(basename "$$f" .seed.json); \
		echo "  Importing $$collection..."; \
		docker compose exec -T mongodb mongoimport \
			--uri="mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin" \
			--collection="$$collection" --jsonArray --drop --file="/dev/stdin" < "$$f"; \
	done
	@echo -e "$(GREEN)✔ MongoDB seeded$(RESET)"

seed-all: seed-pg seed-mongo ## Seed all databases

# ── Interactive Shells ───────────────────────────────────
psql: ## Open PostgreSQL shell
	docker compose exec postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db}

mongo-shell: ## Open MongoDB shell
	docker compose exec mongodb mongosh \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin"

# ── Rust ─────────────────────────────────────────────────
RUST_CRATES := src/lib/rust/json_writer src/lib/rust/csv_writer

build-rust: ## Build Rust utilities (release)
	@for crate in $(RUST_CRATES); do \
		echo "Building $$crate..."; \
		(cd "$$crate" && cargo build --release) || exit 1; \
	done
	@echo -e "$(GREEN)✔ Rust crates built$(RESET)"

check-rust: ## Type-check Rust utilities
	@for crate in $(RUST_CRATES); do \
		echo "Checking $$crate..."; \
		(cd "$$crate" && cargo check) || exit 1; \
	done
	@echo -e "$(GREEN)✔ Rust crates ok$(RESET)"

# ── Dev ──────────────────────────────────────────────────
dev: ## Start Vite dev server (seeds state files on first run)
	@test -f src/store/dbms/json/_notion_state.json || $(MAKE) seed-state
	npm run dev

seed-state: ## Generate _notion_state.json for each DBMS source (overwrites changes!)
	@npx tsx scripts/generate-state-files.ts

clean: ## Remove build artifacts
	rm -rf dist
	@for crate in $(RUST_CRATES); do \
		(cd "$$crate" && cargo clean 2>/dev/null) || true; \
	done
	@echo -e "$(GREEN)✔ Cleaned$(RESET)"
