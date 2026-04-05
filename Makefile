# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/04/04 18:15:22 by dlesieur          #+#    #+#              #
#    Updated: 2026/07/25 02:00:00 by dlesieur         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

SHELL := /bin/bash
-include .env
export

CYAN  := \033[36m
GREEN := \033[32m
RED   := \033[31m
YELLOW:= \033[33m
RESET := \033[0m

DC  := docker compose
ALL := --profile src --profile playground --profile sonar

.DEFAULT_GOAL := help
help: ## Show available targets (root + sub-projects)
	@echo -e "$(CYAN)── Root (shared infrastructure) ──$(RESET)"
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' Makefile | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(CYAN)── src/ ──$(RESET)"
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' src/Makefile | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(CYAN)── playground/ ──$(RESET)"
	@grep -hE '^[a-zA-Z_-]+:.*## .*$$' playground/Makefile | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  $(CYAN)%-18s$(RESET) %s\n", $$1, $$2}'

build: ## Build Docker images (cached, ~7 s on warm)
	@$(DC) build
	@echo -e "$(GREEN)✔ Images built$(RESET)"

up: ## Start infra services (postgres, mongodb, redis)
	@$(DC) $(ALL) up -d postgres mongodb redis
	@echo -e "$(GREEN)✔ Infrastructure up$(RESET)"

down: ## Stop all containers (all profiles)
	@$(DC) $(ALL) down --remove-orphans
	@echo -e "$(GREEN)✔ All containers stopped$(RESET)"

clean: ## Remove containers, volumes, images, build artefacts
	@$(DC) $(ALL) down -v --remove-orphans --rmi local 2>/dev/null || true
	@rm -rf build/ dist/ .vite .turbo .scannerwork packages/*/dist
	@echo -e "$(GREEN)✔ Cleaned$(RESET)"

restart: down up ## Restart infrastructure

logs: ## Tail container logs
	@$(DC) $(ALL) logs -f --tail=50

status: ## Show container and DB health
	@$(DC) $(ALL) ps
	@echo ""
	@echo "PostgreSQL:"
	@$(DC) exec -T postgres pg_isready -U $${POSTGRES_USER:-notion_user} 2>/dev/null \
		&& echo -e "  $(GREEN)✔ Accepting connections$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"
	@echo "MongoDB:"
	@$(DC) exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" 2>/dev/null \
		&& echo -e "  $(GREEN)✔ Accepting connections$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"
	@echo "Redis:"
	@$(DC) exec -T redis redis-cli ping 2>/dev/null \
		&& echo -e "  $(GREEN)✔ PONG$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"

psql: ## Open psql shell
	@$(DC) exec postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db}

mongo-shell: ## Open mongosh shell
	@$(DC) exec mongodb mongosh \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin"

redis-cli: ## Open redis-cli shell
	@$(DC) exec redis redis-cli

typecheck: ## TypeScript type-checking (in Docker)
	@echo -e "$(CYAN)Type-checking…$(RESET)"
	@$(DC) run --rm src-app sh -c 'pnpm turbo run build --filter="./packages/*" && pnpm tsc --noEmit'
	@echo -e "$(GREEN)✔ No type errors$(RESET)"

lint: ## ESLint on all source directories (in Docker)
	@echo -e "$(CYAN)Linting…$(RESET)"
	@$(DC) run --rm src-app pnpm eslint src/ packages/ playground/ docker/services/dbms/ --max-warnings=0
	@echo -e "$(GREEN)✔ No lint errors$(RESET)"

lint-fix: ## ESLint with --fix (in Docker)
	@$(DC) run --rm src-app pnpm eslint src/ packages/ playground/ docker/services/dbms/ --max-warnings=0 --fix
	@echo -e "$(GREEN)✔ Lint fix complete$(RESET)"

ci: typecheck lint ## Run the same checks as GitHub Actions CI

up-sonar: ## Start SonarQube + Redis
	@$(DC) --profile sonar up -d sonarqube redis
	@echo -e "$(GREEN)✔ SonarQube starting (takes ~60 s)$(RESET)"

sonar-status: ## Check SonarQube server status
	@curl -sf http://localhost:$${SONAR_PORT:-9000}/api/system/status 2>/dev/null \
		&& echo "" \
		|| echo -e "$(RED)✘ SonarQube unreachable$(RESET)"

.PHONY: help build up down clean restart logs status \
	psql mongo-shell redis-cli typecheck lint lint-fix ci \
	up-sonar sonar-status
