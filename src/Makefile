SHELL := /bin/bash
ROOT  := $(realpath $(dir $(lastword $(MAKEFILE_LIST)))/..)
-include $(ROOT)/.env
export

CYAN  := \033[36m
GREEN := \033[32m
RED   := \033[31m
RESET := \033[0m

DC := docker compose -f $(ROOT)/docker-compose.yml

.DEFAULT_GOAL := help
help: ## Show available targets
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "$(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'

# ── Development ──────────────────────────────────────────────────────────

dev: ## Start src dev stack (Vite :3000 + DBs)
	@echo -e "$(CYAN)Starting src on http://localhost:3000$(RESET)"
	cd $(ROOT) && $(DC) up -d postgres mongodb src
	@echo "Waiting for databases…"
	@until docker inspect --format='{{.State.Health.Status}}' notion_postgres 2>/dev/null | grep -q healthy; do sleep 2; done
	@until docker inspect --format='{{.State.Health.Status}}' notion_mongodb 2>/dev/null | grep -q healthy; do sleep 2; done
	@echo -e "$(GREEN)✔ Databases ready$(RESET)"
	@$(MAKE) check-seed --no-print-directory
	@echo -e "$(GREEN)✔ Stack up — tailing src logs (Ctrl-C to stop)$(RESET)"
	@trap '$(MAKE) -C $(ROOT)/src stop --no-print-directory' EXIT; \
	 cd $(ROOT) && $(DC) logs -f --tail=20 src || true

dev-d: ## Start src dev stack (detached)
	cd $(ROOT) && $(DC) up -d postgres mongodb src
	@echo -e "$(GREEN)✔ src stack running (detached)$(RESET)"

dev-verbose: ## Start with verbose DB query logging
	cd $(ROOT) && DBMS_VERBOSE=1 $(DC) up postgres mongodb src

stop: ## Stop src stack
	cd $(ROOT) && $(DC) stop src postgres mongodb
	@echo -e "$(GREEN)✔ src stack stopped$(RESET)"

# ── Build (destroy volumes, rebuild, seed) ───────────────────────────────

build: ## Full rebuild: destroy volumes, rebuild images, start + seed
	@echo -e "$(CYAN)══ src: Full rebuild ══$(RESET)"
	cd $(ROOT) && $(DC) down -v --remove-orphans 2>/dev/null || true
	cd $(ROOT) && $(MAKE) build-app --no-print-directory
	cd $(ROOT) && $(DC) up -d postgres mongodb src
	@sleep 2
	@$(MAKE) seed --no-print-directory
	@echo -e "$(GREEN)══ src: Build complete ══$(RESET)"

# ── Seed ─────────────────────────────────────────────────────────────────

check-seed: check-seed-pg check-seed-mongo ## Verify whether both databases have been seeded

check-seed-pg: ## Check if PostgreSQL has been seeded
	@count=$$(cd $(ROOT) && $(DC) exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${SRC_POSTGRES_DB:-notion_src_db} \
	  -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo 0); \
	if [ "$$count" -gt 0 ] 2>/dev/null; then \
	  echo -e "$(GREEN)✔ PostgreSQL seeded ($$count tables)$(RESET)"; \
	else \
	  echo -e "$(RED)⚠  PostgreSQL is NOT seeded — switching to 'postgresql' source will show empty data.$(RESET)"; \
	  echo -e "$(RED)   Run $(CYAN)make seed-pg$(RED) to populate tables.$(RESET)"; \
	fi

check-seed-mongo: ## Check if MongoDB has been seeded
	@count=$$(cd $(ROOT) && $(DC) exec -T mongodb mongosh --quiet \
	  "mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${SRC_MONGO_DB:-notion_src_db}?authSource=admin" \
	  --eval 'db.getCollectionNames().filter(function(c){return c.indexOf("system")!==0}).length' 2>/dev/null || echo 0); \
	if [ "$$count" -gt 0 ] 2>/dev/null; then \
	  echo -e "$(GREEN)✔ MongoDB seeded ($$count collections)$(RESET)"; \
	else \
	  echo -e "$(RED)⚠  MongoDB is NOT seeded — switching to 'mongodb' source will show empty data.$(RESET)"; \
	  echo -e "$(RED)   Run $(CYAN)make seed-mongo$(RED) to import collections.$(RESET)"; \
	fi

seed: seed-pg seed-mongo ## Seed both PostgreSQL and MongoDB

seed-pg: ## Seed PostgreSQL with src schema + data
	@echo "Waiting for PostgreSQL…"
	@until cd $(ROOT) && $(DC) exec -T postgres pg_isready -U $${POSTGRES_USER:-notion_user} > /dev/null 2>&1; do sleep 0.5; done
	cd $(ROOT) && $(DC) exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${SRC_POSTGRES_DB:-notion_src_db} -f /seed/001_schema.sql
	cd $(ROOT) && $(DC) exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${SRC_POSTGRES_DB:-notion_src_db} -f /seed/002_seed.sql
	@echo -e "$(GREEN)✔ PostgreSQL seeded (src)$(RESET)"

seed-mongo: ## Seed MongoDB with src collections
	@echo "Waiting for MongoDB…"
	@until cd $(ROOT) && $(DC) exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; do sleep 0.5; done
	@for f in store/dbms/mongodb/*.seed.json; do \
		collection=$$(basename "$$f" .seed.json); \
		echo "  Importing $$collection…"; \
		cd $(ROOT) && $(DC) exec -T mongodb mongoimport \
			--uri="mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${SRC_MONGO_DB:-notion_src_db}?authSource=admin" \
			--collection="$$collection" --jsonArray --drop --file="/seed/$$collection.seed.json"; \
	done
	@echo -e "$(GREEN)✔ MongoDB seeded (src)$(RESET)"

seed-state: ## Regenerate _notion_state.json
	cd $(ROOT) && $(DC) exec src npx tsx scripts/generate-state-files.ts

# ── Reset ────────────────────────────────────────────────────────────────

re: ## Full restart: wipe src DBs, re-seed, preserve standalone data
	@echo -e "$(CYAN)══ src: Full restart ══$(RESET)"
	@echo "1/4  Stopping containers…"
	cd $(ROOT) && $(DC) down -v --remove-orphans
	@echo "2/4  Starting fresh containers…"
	cd $(ROOT) && $(DC) up -d postgres mongodb src
	@echo "3/4  Waiting for databases…"
	@sleep 3
	@echo "4/4  Seeding databases…"
	@$(MAKE) seed --no-print-directory
	@echo -e "$(GREEN)══ src: restart complete ══$(RESET)"

# ── Verify ───────────────────────────────────────────────────────────────

verify-pg: ## Show PostgreSQL table counts (src DB)
	@echo "── PostgreSQL table counts (src) ──"
	@for tbl in tasks contacts content inventory projects products; do \
		count=$$(cd $(ROOT) && $(DC) exec -T postgres psql -U $${POSTGRES_USER:-notion_user} -d $${SRC_POSTGRES_DB:-notion_src_db} \
			-tAc "SELECT COUNT(*) FROM $$tbl" 2>/dev/null || echo "ERR"); \
		printf "  %-12s %s rows\n" "$$tbl" "$$count"; \
	done

verify-mongo: ## Show MongoDB collection counts (src DB)
	@echo "── MongoDB collection counts (src) ──"
	@cd $(ROOT) && $(DC) exec -T mongodb mongosh --quiet \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${SRC_MONGO_DB:-notion_src_db}?authSource=admin" \
		--eval 'db.getCollectionNames().filter(function(c){return c.indexOf("system")!==0}).forEach(function(c){print("  "+c+"  "+db[c].countDocuments()+" docs")})'

verify: verify-pg verify-mongo ## Verify both databases

logs: ## Tail src stack logs
	cd $(ROOT) && $(DC) logs -f --tail=50

.PHONY: help dev dev-d dev-verbose stop build check-seed check-seed-pg check-seed-mongo \
	seed seed-pg seed-mongo seed-state re verify-pg verify-mongo verify logs
