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

dev: ## Start playground Vite dev server (port 3001)
	@echo -e "$(CYAN)Starting playground on http://localhost:3001$(RESET)"
	cd $(ROOT) && npx vite --config playground/vite.config.ts --port 3001 --host 0.0.0.0

dev-api: ## Start Fastify API server (packages/api)
	@echo -e "$(CYAN)Starting API server…$(RESET)"
	cd $(ROOT)/packages/api && pnpm dev

dev-all: ## Start playground + API in parallel
	@echo -e "$(CYAN)Starting playground + API…$(RESET)"
	$(MAKE) dev-api &
	$(MAKE) dev &
	wait

# ── Seed (playground uses its own database: notion_playground_db) ────────────

seed: ## Seed MongoDB with 3 users + workspaces for playground
	@echo -e "$(CYAN)Seeding playground data…$(RESET)"
	cd $(ROOT) && node scripts/seed-playground.mjs
	@echo -e "$(GREEN)✔ Playground seeded$(RESET)"

# ── Reset ────────────────────────────────────────────────────────────────────

re: ## Full restart — wipe playground DB, re-seed
	@echo -e "$(CYAN)══ playground: Full restart ══$(RESET)"
	@echo "1/4  Pulling latest images..."
	@docker compose -f $(ROOT)/docker-compose.yml pull --quiet
	@echo "2/4  Wiping volumes and stopping containers..."
	@docker compose -f $(ROOT)/docker-compose.yml down -v
	@echo "3/4  Starting fresh containers..."
	@docker compose -f $(ROOT)/docker-compose.yml up -d
	@echo "4/4  Seeding playground database..."
	@sleep 4
	@$(MAKE) seed --no-print-directory
	@echo -e "$(GREEN)══ playground: restart complete ══$(RESET)"

# ── Packages ─────────────────────────────────────────────────────────────────

build-packages: ## Build all packages (types → core → api)
	@echo -e "$(CYAN)Building packages…$(RESET)"
	cd $(ROOT) && pnpm run build
	@echo -e "$(GREEN)✔ All packages built$(RESET)"

.PHONY: help dev dev-api dev-all seed re build-packages
