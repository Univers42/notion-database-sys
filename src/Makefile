SHELL := /bin/bash
ROOT  := $(realpath $(dir $(lastword $(MAKEFILE_LIST)))/..)
-include $(ROOT)/.env
export

CYAN  := \033[36m
GREEN := \033[32m
RED   := \033[31m
RESET := \033[0m

help: ## Show available targets
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "$(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'

# ── Development ──────────────────────────────────────────────────────────────

dev: ## Start Vite dev server (compact query logs)
	@test -f server/logger/native/build/Release/libcpp_logger.node || $(MAKE) build-native --no-print-directory
	@test -f store/dbms/json/_notion_state.json || $(MAKE) seed-state
	cd $(ROOT) && npx vite --config src/vite.config.ts --port 3000 --host 0.0.0.0

dev-verbose: ## Start Vite dev server (detailed query logs w/ colors & boxes)
	@test -f server/logger/native/build/Release/libcpp_logger.node || $(MAKE) build-native --no-print-directory
	@test -f store/dbms/json/_notion_state.json || $(MAKE) seed-state
	cd $(ROOT) && DBMS_VERBOSE=1 npx vite --config src/vite.config.ts --port 3000 --host 0.0.0.0

# ── Seed / reset (src uses its own databases: notion_src_db) ─────────────────

seed-pg: ## Seed PostgreSQL with src schema + data
	@echo "Waiting for PostgreSQL..."
	@until docker compose -f $(ROOT)/docker-compose.yml exec -T postgres pg_isready -U $${POSTGRES_USER:-notion_user} > /dev/null 2>&1; do sleep 0.5; done
	docker compose -f $(ROOT)/docker-compose.yml exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${SRC_POSTGRES_DB:-notion_src_db} \
		-f /seed/001_schema.sql
	docker compose -f $(ROOT)/docker-compose.yml exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${SRC_POSTGRES_DB:-notion_src_db} \
		-f /seed/002_seed.sql
	@echo -e "$(GREEN)✔ PostgreSQL seeded (src)$(RESET)"

seed-mongo: ## Seed MongoDB with src collections
	@echo "Waiting for MongoDB..."
	@until docker compose -f $(ROOT)/docker-compose.yml exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; do sleep 0.5; done
	@for f in store/dbms/mongodb/*.seed.json; do \
		collection=$$(basename "$$f" .seed.json); \
		echo "  Importing $$collection..."; \
		docker compose -f $(ROOT)/docker-compose.yml exec -T mongodb mongoimport \
			--uri="mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${SRC_MONGO_DB:-notion_src_db}?authSource=admin" \
			--collection="$$collection" --jsonArray --drop --file="/seed/$$collection.seed.json"; \
	done
	@echo -e "$(GREEN)✔ MongoDB seeded (src)$(RESET)"

seed-all: seed-pg seed-mongo ## Seed both PostgreSQL and MongoDB

seed-state: ## Regenerate _notion_state.json (skips existing standalone files)
	@cd $(ROOT) && npx tsx scripts/generate-state-files.ts

seed-state-force: ## Force-regenerate ALL _notion_state.json (overwrites)
	@cd $(ROOT) && npx tsx scripts/generate-state-files.ts --force

re: ## Full restart — wipe src DBs, re-seed, preserve standalone data
	@echo -e "$(CYAN)══ src: Full restart ══$(RESET)"
	@echo "1/5  Restoring live-DB seed files..."
	@git -C $(ROOT) checkout -- src/store/dbms/mongodb/ src/store/dbms/relational/ src/store/dbms/hardcoded/ 2>/dev/null || true
	@echo "2/5  Pulling latest images..."
	@docker compose -f $(ROOT)/docker-compose.yml pull --quiet
	@echo "3/5  Wiping volumes and stopping containers..."
	@docker compose -f $(ROOT)/docker-compose.yml down -v
	@echo "4/5  Starting fresh containers..."
	@docker compose -f $(ROOT)/docker-compose.yml up -d
	@echo "5/5  Seeding databases..."
	@sleep 4
	@$(MAKE) seed-all --no-print-directory
	@echo -e "$(GREEN)══ src: re-seed complete ══$(RESET)"

re-all: ## Hard reset — wipe EVERYTHING including standalone json/csv data
	@echo -e "$(CYAN)══ src: Hard reset (all sources) ══$(RESET)"
	@git -C $(ROOT) checkout -- src/store/dbms/ 2>/dev/null || true
	@docker compose -f $(ROOT)/docker-compose.yml pull --quiet
	@docker compose -f $(ROOT)/docker-compose.yml down -v
	@docker compose -f $(ROOT)/docker-compose.yml up -d
	@sleep 4
	@$(MAKE) seed-all --no-print-directory
	@echo -e "$(GREEN)══ src: Hard reset complete ══$(RESET)"

re-standalone: ## Reset only standalone json/csv data back to defaults
	@echo -e "$(CYAN)══ Reset standalone sources ══$(RESET)"
	@git -C $(ROOT) checkout -- src/store/dbms/json/ src/store/dbms/csv/ 2>/dev/null || true
	@echo -e "$(GREEN)══ Standalone json/csv data restored ══$(RESET)"

# ── Verify ───────────────────────────────────────────────────────────────────

verify-pg: ## Show PostgreSQL table counts (src DB)
	@echo "── PostgreSQL table counts (src) ──"
	@for tbl in tasks contacts content inventory projects products; do \
		count=$$(docker compose -f $(ROOT)/docker-compose.yml exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${SRC_POSTGRES_DB:-notion_src_db} \
			-tAc "SELECT COUNT(*) FROM $$tbl" 2>/dev/null || echo "ERR"); \
		printf "  %-12s %s rows\n" "$$tbl" "$$count"; \
	done

verify-mongo: ## Show MongoDB collection counts (src DB)
	@echo "── MongoDB collection counts (src) ──"
	@docker compose -f $(ROOT)/docker-compose.yml exec -T mongodb mongosh --quiet \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${SRC_MONGO_DB:-notion_src_db}?authSource=admin" \
		--eval 'db.getCollectionNames().filter(function(c){return c.indexOf("system")!==0}).forEach(function(c){print("  "+c+"  "+db[c].countDocuments()+" docs")})'

verify: verify-pg verify-mongo ## Verify both databases

smoke-test: ## Smoke test: pull, start, seed, verify
	@echo -e "$(CYAN)══ src: Smoke Test ══$(RESET)"
	@docker compose -f $(ROOT)/docker-compose.yml pull --quiet
	@docker compose -f $(ROOT)/docker-compose.yml up -d
	@sleep 3
	@$(MAKE) seed-all --no-print-directory
	@$(MAKE) verify --no-print-directory
	@echo -e "$(GREEN)══ Smoke Test PASSED ══$(RESET)"

# ── Build (Rust / Native) ───────────────────────────────────────────────────

RUST_CRATES := lib/rust/json_writer lib/rust/csv_writer

build-rust: ## Build Rust WASM crates
	@for crate in $(RUST_CRATES); do \
		echo "Building $$crate..."; \
		(cd "$$crate" && cargo build --release) || exit 1; \
	done
	@echo -e "$(GREEN)✔ Rust crates built$(RESET)"

check-rust: ## Cargo check on Rust crates
	@for crate in $(RUST_CRATES); do \
		echo "Checking $$crate..."; \
		(cd "$$crate" && cargo check) || exit 1; \
	done
	@echo -e "$(GREEN)✔ Rust crates ok$(RESET)"

build-native: ## Build the libcpp N-API logger addon (cmake-js)
	@echo -e "$(CYAN)Building native logger addon…$(RESET)"
	cd $(ROOT) && npx cmake-js compile -d src/server/logger/native
	@echo -e "$(GREEN)✔ libcpp_logger.node built$(RESET)"

.PHONY: help dev dev-verbose seed-pg seed-mongo seed-all seed-state seed-state-force \
	re re-all re-standalone verify-pg verify-mongo verify smoke-test \
	build-rust check-rust build-native
