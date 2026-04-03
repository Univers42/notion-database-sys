SHELL := /bin/bash
-include .env
export

CYAN  := \033[36m
GREEN := \033[32m
RED   := \033[31m
RESET := \033[0m

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

# ── Docker services (shared) ────────────────────────────────────────────────

pull: ## Pull latest Docker images
	@docker compose pull --quiet
	@echo -e "$(GREEN)✔ Images pulled$(RESET)"

up: ## Start containers
	docker compose up -d
	@echo -e "$(GREEN)✔ Containers up$(RESET)"

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

status: db-status

psql: ## Open psql shell
	docker compose exec postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db}

mongo-shell: ## Open mongosh shell
	docker compose exec mongodb mongosh \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin"

# ── Packages ─────────────────────────────────────────────────────────────────

build-packages: ## Build all packages (types → core → api)
	@echo -e "$(CYAN)Building packages…$(RESET)"
	pnpm run build
	@echo -e "$(GREEN)✔ All packages built$(RESET)"

# ── Cleanup ──────────────────────────────────────────────────────────────────

clean: ## Remove containers, volumes, node_modules, dist
	docker compose down -v 2>/dev/null || true
	rm -rf node_modules dist .vite .turbo packages/*/dist
	@echo -e "$(GREEN)✔ Cleaned$(RESET)"

.PHONY: help pull up down restart logs db-reset db-status status psql mongo-shell \
	build-packages clean
