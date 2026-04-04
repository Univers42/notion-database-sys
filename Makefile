# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/04/04 18:15:22 by dlesieur          #+#    #+#              #
#    Updated: 2026/04/04 18:15:24 by dlesieur         ###   ########.fr        #
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

SONAR_URL := http://localhost:$${SONAR_PORT:-9000}

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

# Docker

pull: ## Pull latest Docker images
	@docker compose pull --quiet
	@echo -e "$(GREEN)✔ Images pulled$(RESET)"

up: ## Start containers (postgres, mongodb, redis, sonarqube)
	docker compose up -d
	@echo -e "$(GREEN)✔ Containers up$(RESET)"

up-db: ## Start only database containers (postgres, mongodb)
	docker compose up -d postgres mongodb
	@echo -e "$(GREEN)✔ Database containers up$(RESET)"

up-sonar: ## Start SonarQube + Redis
	docker compose up -d redis sonarqube
	@echo -e "$(GREEN)✔ SonarQube + Redis up$(RESET)"

down: ## Stop containers
	docker compose down
	@echo -e "$(GREEN)✔ Containers down$(RESET)"

restart: down up ## Restart containers

logs: ## Tail container logs
	docker compose logs -f --tail=50

db-reset: ## Destroy volumes + recreate containers
	docker compose down -v
	docker compose up -d
	@echo -e "$(GREEN)✔ Volumes destroyed, containers recreated$(RESET)"

db-status: ## Show container & DB health
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
	@echo "Redis:"
	@docker compose exec -T redis redis-cli ping 2>/dev/null \
		&& echo -e "  $(GREEN)✔ PONG$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"
	@echo "SonarQube:"
	@curl -sf $(SONAR_URL)/api/system/status 2>/dev/null | grep -q UP \
		&& echo -e "  $(GREEN)✔ UP$(RESET)" \
		|| echo -e "  $(YELLOW)⏳ Not ready (run 'make up-sonar' first)$(RESET)"

status: db-status ## Alias for db-status

psql: ## Open psql shell
	docker compose exec postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db}

mongo-shell: ## Open mongosh shell
	docker compose exec mongodb mongosh \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin"

redis-cli: ## Open redis-cli shell
	docker compose exec redis redis-cli

install: ## Install all dependencies
	@echo -e "$(CYAN)Installing dependencies…$(RESET)"
	pnpm install
	@echo -e "$(GREEN)✔ Dependencies installed$(RESET)"

build-packages: ## Build all packages (types → core → api)
	@echo -e "$(CYAN)Building packages…$(RESET)"
	pnpm run build
	@echo -e "$(GREEN)✔ All packages built$(RESET)"

typecheck: ## Run TypeScript type-checking (no emit)
	@echo -e "$(CYAN)Type-checking…$(RESET)"
	pnpm turbo run build --filter='./packages/*'
	pnpm tsc --noEmit
	@echo -e "$(GREEN)✔ No type errors$(RESET)"

lint: ## Run ESLint on all source directories
	@echo -e "$(CYAN)Linting…$(RESET)"
	pnpm eslint src/ packages/ playground/ services/dbms/ --max-warnings=0
	@echo -e "$(GREEN)✔ No lint errors$(RESET)"

lint-fix: ## Run ESLint with --fix
	pnpm eslint src/ packages/ playground/ services/dbms/ --max-warnings=0 --fix
	@echo -e "$(GREEN)✔ Lint fix complete$(RESET)"

audit: ## Run full static analysis: typecheck + lint + SonarQube scan
	@echo -e "$(CYAN)══════════════════════════════════════════════════$(RESET)"
	@echo -e "$(CYAN)  Full Audit — TypeScript + ESLint + SonarQube   $(RESET)"
	@echo -e "$(CYAN)══════════════════════════════════════════════════$(RESET)"
	@echo ""
	@echo -e "$(CYAN)[1/4] Type-checking…$(RESET)"
	@$(MAKE) typecheck
	@echo ""
	@echo -e "$(CYAN)[2/4] Linting…$(RESET)"
	@$(MAKE) lint
	@echo ""
	@echo -e "$(CYAN)[3/4] Ensuring SonarQube is running…$(RESET)"
	@if ! curl -sf $(SONAR_URL)/api/system/status 2>/dev/null | grep -q UP; then \
		echo -e "  $(YELLOW)SonarQube not running — starting it…$(RESET)"; \
		docker compose up -d redis sonarqube; \
		bash services/sonarqube/tools/wait-sonarqube.sh $(SONAR_URL) 180; \
	else \
		echo -e "  $(GREEN)✔ SonarQube already running$(RESET)"; \
	fi
	@echo ""
	@echo -e "$(CYAN)[4/4] Running SonarQube scanner…$(RESET)"
	@bash services/sonarqube/tools/run-scan.sh
	@echo ""
	@echo -e "$(GREEN)══════════════════════════════════════════════════$(RESET)"
	@echo -e "$(GREEN)  ✔ Full audit complete                          $(RESET)"
	@echo -e "$(GREEN)══════════════════════════════════════════════════$(RESET)"

sonar-up: up-sonar ## Alias — start SonarQube + Redis
	@bash services/sonarqube/tools/wait-sonarqube.sh $(SONAR_URL) 180

sonar-scan: ## Run SonarQube scanner only (SonarQube must be running)
	@bash services/sonarqube/tools/run-scan.sh

sonar-status: ## Check SonarQube server status
	@curl -sf $(SONAR_URL)/api/system/status 2>/dev/null \
		&& echo "" \
		|| echo -e "$(RED)✘ SonarQube unreachable at $(SONAR_URL)$(RESET)"

ci: typecheck lint build-packages ## Run the same checks as GitHub Actions CI

clean: ## Remove containers, volumes, node_modules, dist
	docker compose down -v 2>/dev/null || true
	rm -rf node_modules dist .vite .turbo packages/*/dist .scannerwork
	@echo -e "$(GREEN)✔ Cleaned$(RESET)"

.PHONY: help pull up up-db up-sonar down restart logs db-reset db-status status \
	psql mongo-shell redis-cli install build-packages typecheck lint lint-fix \
	audit sonar-up sonar-scan sonar-status ci clean
