.PHONY: help up down restart logs build db-up db-down db-reset db-build db-status \
	seed-pg seed-mongo seed-all seed-state psql mongo-shell \
	build-rust check-rust dev clean verify smoke-test

SHELL := /bin/bash
-include .env
export

CYAN  := \033[36m
GREEN := \033[32m
RED   := \033[31m
RESET := \033[0m

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "$(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'

db-build: ## Build custom Docker images (postgres + mongo)
	docker compose build
	@echo -e "$(GREEN)✔ Docker images built$(RESET)"

build: db-build ## Alias for db-build

up: ## Start all containers (builds if needed)
	docker compose up -d --build
	@echo -e "$(GREEN)✔ Containers up$(RESET)"

down: ## Stop all containers
	docker compose down
	@echo -e "$(GREEN)✔ Containers down$(RESET)"

restart: down up ## Restart containers

logs: ## Tail container logs
	docker compose logs -f --tail=50

db-up: up ## Alias for up

db-down: down ## Alias for down

db-reset: ## Destroy volumes and recreate (fresh DB)
	docker compose down -v
	docker compose up -d --build
	@echo -e "$(GREEN)✔ Volumes destroyed, containers recreated$(RESET)"

db-status: ## Show container status + health
	@docker compose ps
	@echo ""
	@echo "PostgreSQL:"
	@docker compose exec -T postgres pg_isready -U $${POSTGRES_USER:-notion_user} 2>/dev/null \
		&& echo -e "  $(GREEN)✔ Accepting connections$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"
	@echo "MongoDB:"
	@docker compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" 2>/dev/null \
		&& echo -e "  $(GREEN)✔ Accepting connections$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"

status: db-status ## Alias for db-status

seed-pg: ## Seed PostgreSQL from SQL files
	@echo "Waiting for PostgreSQL..."
	@until docker compose exec -T postgres pg_isready -U $${POSTGRES_USER:-notion_user} > /dev/null 2>&1; do sleep 1; done
	docker compose exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db} \
		-f /docker-entrypoint-initdb.d/001_schema.sql
	docker compose exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db} \
		-f /docker-entrypoint-initdb.d/002_seed.sql
	@echo -e "$(GREEN)✔ PostgreSQL seeded$(RESET)"

seed-mongo: ## Seed MongoDB from JSON seed files
	@echo "Waiting for MongoDB..."
	@until docker compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; do sleep 1; done
	@for f in src/store/dbms/mongodb/*.seed.json; do \
		collection=$$(basename "$$f" .seed.json); \
		echo "  Importing $$collection..."; \
		docker compose exec -T mongodb mongoimport \
			--uri="mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin" \
			--collection="$$collection" --jsonArray --drop --file="/seed/$$collection.seed.json"; \
	done
	@echo -e "$(GREEN)✔ MongoDB seeded$(RESET)"

seed-all: seed-pg seed-mongo ## Seed all databases

seed-state: ## Generate _notion_state.json for each DBMS source
	@npx tsx scripts/generate-state-files.ts

verify-pg: ## Verify PostgreSQL has data in all tables
	@echo "── PostgreSQL table counts ──"
	@for tbl in tasks contacts content inventory projects products; do \
		count=$$(docker compose exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db} \
			-tAc "SELECT COUNT(*) FROM $$tbl" 2>/dev/null || echo "ERR"); \
		printf "  %-12s %s rows\n" "$$tbl" "$$count"; \
	done

verify-mongo: ## Verify MongoDB has data in all collections
	@echo "── MongoDB collection counts ──"
	@docker compose exec -T mongodb mongosh --quiet \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin" \
		--eval 'db.getCollectionNames().filter(function(c){return c.indexOf("system")!==0}).forEach(function(c){print("  "+c+"  "+db[c].countDocuments()+" docs")})'

verify: verify-pg verify-mongo ## Verify data in both databases

psql: ## Open PostgreSQL shell
	docker compose exec postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db}

mongo-shell: ## Open MongoDB shell
	docker compose exec mongodb mongosh \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin"

smoke-test: ## End-to-end: build, up, seed, verify
	@echo -e "$(CYAN)══ Smoke Test ══$(RESET)"
	@echo "1/4  Building images..."
	@$(MAKE) db-build --no-print-directory 2>&1 | tail -1
	@echo "2/4  Starting containers..."
	@$(MAKE) up --no-print-directory 2>&1 | tail -1
	@echo "3/4  Seeding databases..."
	@sleep 5
	@$(MAKE) seed-all --no-print-directory
	@echo "4/4  Verifying data..."
	@$(MAKE) verify --no-print-directory
	@echo ""
	@echo -e "$(GREEN)══ Smoke Test PASSED ══$(RESET)"

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

dev: ## Start Vite dev server
	@test -f src/store/dbms/json/_notion_state.json || $(MAKE) seed-state
	npm run dev

clean: ## Remove build artifacts, node_modules, Docker volumes
	docker compose down -v 2>/dev/null || true
	rm -rf node_modules dist .vite
	@echo -e "$(GREEN)✔ Cleaned$(RESET)"
