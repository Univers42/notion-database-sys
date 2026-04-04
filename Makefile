# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2026/04/04 18:15:22 by dlesieur          #+#    #+#              #
#    Updated: 2026/04/04 19:27:16 by dlesieur         ###   ########.fr        #
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

audit: ## Run full audit: typecheck + lint + SonarCloud scan → audit-report.json
	@bash scripts/audit.sh || true

audit-strict: ## Same as audit but exit 1 if any issues found
	@bash scripts/audit.sh

audit-no-scan: ## Audit without re-scanning (fetch cached SonarCloud results only)
	@bash scripts/audit.sh --no-scan || true

sonar-scan: ## Push a fresh analysis to SonarCloud (no Docker needed)
	@bash services/sonarqube/tools/run-scan.sh --cloud

sonar-status: ## Check SonarQube server status
	@curl -sf $(SONAR_URL)/api/system/status 2>/dev/null \
		&& echo "" \
		|| echo -e "$(RED)✘ SonarQube unreachable at $(SONAR_URL)$(RESET)"

ci: typecheck lint build-packages ## Run the same checks as GitHub Actions CI

clean: ## Remove containers, volumes, node_modules, dist
	docker compose down -v 2>/dev/null || true
	rm -rf node_modules dist .vite .turbo packages/*/dist .scannerwork
	@echo -e "$(GREEN)✔ Cleaned$(RESET)"

sonar-issues: ## Fetch all SonarCloud issues into sonarcloud-report.txt + sonarcloud-issues.json
	@SONAR_TOKEN=$${SONAR_TOKEN:-$$(grep SONAR_TOKEN .env 2>/dev/null | cut -d= -f2)} \
		python3 scripts/fetch-sonar-issues.py
	@echo -e "$(GREEN)✔ Reports saved: sonarcloud-report.txt  sonarcloud-issues.json$(RESET)"

.PHONY: help pull up up-db up-sonar down restart logs db-reset db-status status \
	psql mongo-shell redis-cli install build-packages typecheck lint lint-fix \
	audit audit-strict audit-no-scan sonar-scan sonar-issues sonar-status ci clean
