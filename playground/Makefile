SHELL := /bin/bash
ROOT  := $(realpath $(dir $(lastword $(MAKEFILE_LIST)))/..)
-include $(ROOT)/.env
export

CYAN  := \033[36m
GREEN := \033[32m
RED   := \033[31m
RESET := \033[0m

DC := docker compose -f $(ROOT)/docker-compose.yml --profile playground

.DEFAULT_GOAL := dev
help: ## Show available targets
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "$(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'

# ── Development ──────────────────────────────────────────────────────────

dev: ## Start playground stack (Vite :3001 + API :4000 + Mongo)  [default]
	@echo -e "$(CYAN)Starting playground on http://localhost:3001$(RESET)"
	cd $(ROOT) && $(DC) up

dev-d: ## Start playground stack (detached)
	cd $(ROOT) && $(DC) up -d
	@echo -e "$(GREEN)✔ playground stack running (detached)$(RESET)"

stop: ## Stop playground stack
	cd $(ROOT) && $(DC) down --remove-orphans
	@echo -e "$(GREEN)✔ playground stack stopped$(RESET)"

# ── Build (destroy volumes, rebuild, seed) ───────────────────────────────

build: ## Full rebuild: destroy volumes, rebuild images, start + seed
	@echo -e "$(CYAN)══ playground: Full rebuild ══$(RESET)"
	cd $(ROOT) && docker compose --profile src --profile playground down -v --remove-orphans 2>/dev/null || true
	cd $(ROOT) && $(DC) up --build -d
	@sleep 2
	@$(MAKE) seed --no-print-directory
	@echo -e "$(GREEN)══ playground: Build complete ══$(RESET)"

# ── Seed ─────────────────────────────────────────────────────────────────

seed: ## Seed MongoDB with playground data (3 users + workspaces)
	@echo -e "$(CYAN)Seeding playground data…$(RESET)"
	cd $(ROOT) && $(DC) exec api node scripts/seed-playground.mjs
	@echo -e "$(GREEN)✔ Playground seeded$(RESET)"

# ── Reset ────────────────────────────────────────────────────────────────

re: ## Full restart: wipe DBs, re-seed
	@echo -e "$(CYAN)══ playground: Full restart ══$(RESET)"
	@echo "1/3  Stopping containers…"
	cd $(ROOT) && $(DC) down -v --remove-orphans
	@echo "2/3  Starting fresh containers…"
	cd $(ROOT) && $(DC) up -d
	@echo "3/3  Seeding playground database…"
	@sleep 3
	@$(MAKE) seed --no-print-directory
	@echo -e "$(GREEN)══ playground: restart complete ══$(RESET)"

# ── Packages ─────────────────────────────────────────────────────────────

build-packages: ## Build all packages (types → core → api)
	@echo -e "$(CYAN)Building packages…$(RESET)"
	cd $(ROOT) && $(DC) exec playground-app pnpm turbo run build --filter='./packages/*'
	@echo -e "$(GREEN)✔ All packages built$(RESET)"

logs: ## Tail playground stack logs
	cd $(ROOT) && $(DC) logs -f --tail=50

.PHONY: help dev dev-d stop build seed re build-packages logs
