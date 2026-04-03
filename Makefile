SHELL := /bin/bash
-include .env
export

CYAN  := \033[36m
GREEN := \033[32m
RED   := \033[31m
RESET := \033[0m

help:
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "$(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'

pull:
	@docker compose pull --quiet
	@echo -e "$(GREEN)✔ Images pulled$(RESET)"

up:
	docker compose up -d
	@echo -e "$(GREEN)✔ Containers up$(RESET)"

down:
	docker compose down
	@echo -e "$(GREEN)✔ Containers down$(RESET)"

restart: down up

re: ## Restart: re-seed live DBs (mongo/pg), preserve standalone (json/csv) data
	@echo -e "$(CYAN)══ Full restart ══$(RESET)"
	@echo "1/5  Restoring live-DB seed files..."
	@git checkout -- src/store/dbms/mongodb/ src/store/dbms/relational/ src/store/dbms/hardcoded/ 2>/dev/null || true
	@echo "2/5  Pulling latest images..."
	@docker compose pull --quiet
	@echo "3/5  Wiping volumes and stopping containers..."
	@docker compose down -v
	@echo "4/5  Starting fresh containers..."
	@docker compose up -d
	@echo "5/5  Seeding databases..."
	@sleep 4
	@$(MAKE) seed-all --no-print-directory
	@echo -e "$(GREEN)══ Full restart complete — live DBs re-seeded, standalone data preserved ══$(RESET)"

re-all: ## Hard reset: wipe EVERYTHING including standalone json/csv data
	@echo -e "$(CYAN)══ Hard reset (all sources) ══$(RESET)"
	@echo "1/5  Restoring ALL seed/state files from git..."
	@git checkout -- src/store/dbms/ 2>/dev/null || true
	@echo "2/5  Pulling latest images..."
	@docker compose pull --quiet
	@echo "3/5  Wiping volumes and stopping containers..."
	@docker compose down -v
	@echo "4/5  Starting fresh containers..."
	@docker compose up -d
	@echo "5/5  Seeding databases..."
	@sleep 4
	@$(MAKE) seed-all --no-print-directory
	@echo -e "$(GREEN)══ Hard reset complete — ALL sources back to default ══$(RESET)"

re-standalone: ## Reset only standalone json/csv data back to defaults
	@echo -e "$(CYAN)══ Reset standalone sources ══$(RESET)"
	@git checkout -- src/store/dbms/json/ src/store/dbms/csv/ 2>/dev/null || true
	@echo -e "$(GREEN)══ Standalone json/csv data restored to defaults ══$(RESET)"

logs:
	docker compose logs -f --tail=50

db-up: up

db-down: down

db-reset:
	docker compose down -v
	docker compose up -d
	@echo -e "$(GREEN)✔ Volumes destroyed, containers recreated$(RESET)"

db-status:
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

status: db-status

seed-pg:
	@echo "Waiting for PostgreSQL..."
	@until docker compose exec -T postgres pg_isready -U $${POSTGRES_USER:-notion_user} > /dev/null 2>&1; do sleep 0.5; done
	docker compose exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db} \
		-f /seed/001_schema.sql
	docker compose exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db} \
		-f /seed/002_seed.sql
	@echo -e "$(GREEN)✔ PostgreSQL seeded$(RESET)"

seed-mongo:
	@echo "Waiting for MongoDB..."
	@until docker compose exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; do sleep 0.5; done
	@for f in src/store/dbms/mongodb/*.seed.json; do \
		collection=$$(basename "$$f" .seed.json); \
		echo "  Importing $$collection..."; \
		docker compose exec -T mongodb mongoimport \
			--uri="mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin" \
			--collection="$$collection" --jsonArray --drop --file="/seed/$$collection.seed.json"; \
	done
	@echo -e "$(GREEN)✔ MongoDB seeded$(RESET)"

seed-all: seed-pg seed-mongo

seed-state: ## Regenerate _notion_state.json (skips standalone files that already exist)
	@npx tsx scripts/generate-state-files.ts

seed-state-force: ## Force-regenerate ALL _notion_state.json (overwrites standalone data)
	@npx tsx scripts/generate-state-files.ts --force

verify-pg:
	@echo "── PostgreSQL table counts ──"
	@for tbl in tasks contacts content inventory projects products; do \
		count=$$(docker compose exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db} \
			-tAc "SELECT COUNT(*) FROM $$tbl" 2>/dev/null || echo "ERR"); \
		printf "  %-12s %s rows\n" "$$tbl" "$$count"; \
	done

verify-mongo:
	@echo "── MongoDB collection counts ──"
	@docker compose exec -T mongodb mongosh --quiet \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin" \
		--eval 'db.getCollectionNames().filter(function(c){return c.indexOf("system")!==0}).forEach(function(c){print("  "+c+"  "+db[c].countDocuments()+" docs")})'

verify: verify-pg verify-mongo

psql:
	docker compose exec postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db}

mongo-shell:
	docker compose exec mongodb mongosh \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin"

smoke-test:
	@echo -e "$(CYAN)══ Smoke Test ══$(RESET)"
	@echo "1/4  Pulling images..."
	@$(MAKE) pull --no-print-directory 2>&1 | tail -1
	@echo "2/4  Starting containers..."
	@$(MAKE) up --no-print-directory 2>&1 | tail -1
	@echo "3/4  Seeding databases..."
	@sleep 3
	@$(MAKE) seed-all --no-print-directory
	@echo "4/4  Verifying data..."
	@$(MAKE) verify --no-print-directory
	@echo ""
	@echo -e "$(GREEN)══ Smoke Test PASSED ══$(RESET)"

RUST_CRATES := src/lib/rust/json_writer src/lib/rust/csv_writer

build-rust:
	@for crate in $(RUST_CRATES); do \
		echo "Building $$crate..."; \
		(cd "$$crate" && cargo build --release) || exit 1; \
	done
	@echo -e "$(GREEN)✔ Rust crates built$(RESET)"

check-rust:
	@for crate in $(RUST_CRATES); do \
		echo "Checking $$crate..."; \
		(cd "$$crate" && cargo check) || exit 1; \
	done
	@echo -e "$(GREEN)✔ Rust crates ok$(RESET)"

dev: ## Start Vite dev server (compact query logs)
	@test -f src/server/logger/native/build/Release/libcpp_logger.node || $(MAKE) build-native --no-print-directory
	@test -f src/store/dbms/json/_notion_state.json || $(MAKE) seed-state
	npm run dev

dev-verbose: ## Start Vite dev server (detailed query logs with colors & boxes)
	@test -f src/server/logger/native/build/Release/libcpp_logger.node || $(MAKE) build-native --no-print-directory
	@test -f src/store/dbms/json/_notion_state.json || $(MAKE) seed-state
	DBMS_VERBOSE=1 npm run dev

build-native: ## Build the libcpp N-API logger addon (cmake-js)
	@echo -e "$(CYAN)Building native logger addon…$(RESET)"
	npx cmake-js compile -d src/server/logger/native
	@echo -e "$(GREEN)✔ libcpp_logger.node built$(RESET)"

clean:
	docker compose down -v 2>/dev/null || true
	rm -rf node_modules dist .vite
	@echo -e "$(GREEN)✔ Cleaned$(RESET)"

.PHONY: help up down restart re re-all re-standalone logs pull db-up db-down db-reset db-status \
	seed-pg seed-mongo seed-all seed-state seed-state-force psql mongo-shell \
	build-rust check-rust build-native dev dev-verbose clean verify smoke-test
