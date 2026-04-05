SHELL := /bin/bash
-include .env
export

.DEFAULT_GOAL := stack

COMPOSE := docker compose
APP_IMAGE := notion-database-sys/app:local
APP_IMAGE_STAMP := .make/app-image.id
DB_SERVICES := postgres mongodb
SONAR_SERVICES := redis sonarqube
APP_SERVICES := api src playground
API_URL := http://localhost:$${API_PORT:-4000}
SRC_URL := http://localhost:$${SRC_PORT:-3000}
PLAYGROUND_URL := http://localhost:$${PLAYGROUND_PORT:-3001}
POSTGRES_HOST_URL := localhost:$${POSTGRES_PORT:-5432}
MONGO_HOST_URL := localhost:$${MONGO_PORT:-27017}
REDIS_HOST_URL := localhost:$${REDIS_PORT:-6379}
POSTGRES_IMAGE_REF := postgres:16-alpine
MONGO_IMAGE_REF := mongo:7.0
REDIS_IMAGE_REF := redis:7-alpine
SONARQUBE_IMAGE_REF := $(or $(SONARQUBE_IMAGE),sonarqube:26.3.0.120487-community)
APP_IMAGE_INPUTS := Dockerfile .dockerignore package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json eslint.config.js $(shell find packages src playground docker/services/dbms scripts -type f ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/.turbo/*' ! -name '*.tsbuildinfo' 2>/dev/null)

CYAN  := \033[36m
GREEN := \033[32m
RED   := \033[31m
YELLOW:= \033[33m
LBLUE := \033[94m
RESET := \033[0m

SONAR_URL := http://localhost:$${SONAR_PORT:-9000}

define CHECK_PORT_HELPERS
port_in_use() { \
	local port="$$1"; \
	if command -v ss >/dev/null 2>&1; then \
		ss -H -ltn "( sport = :$$port )" 2>/dev/null | grep -q .; \
		return $$?; \
	fi; \
	if command -v lsof >/dev/null 2>&1; then \
		lsof -nP -iTCP:$$port -sTCP:LISTEN >/dev/null 2>&1; \
		return $$?; \
	fi; \
	if command -v netstat >/dev/null 2>&1; then \
		netstat -an 2>/dev/null | grep -E "[\\.:]$$port[[:space:]].*LISTEN" >/dev/null 2>&1; \
		return $$?; \
	fi; \
	return 2; \
}; \
check_port() { \
	local service="$$1" container="$$2" port="$$3"; \
	local running rc; \
	running="$$(docker inspect -f '{{.State.Running}}' "$$container" 2>/dev/null || true)"; \
	if [ "$$running" = "true" ]; then \
		return 0; \
	fi; \
	if port_in_use "$$port"; then \
		rc=0; \
	else \
		rc="$$?"; \
	fi; \
	if [ "$$rc" -eq 0 ]; then \
		echo -e "$(RED)✘ Port $$port is already in use before starting $$service$(RESET)"; \
		return 1; \
	fi; \
	if [ "$$rc" -eq 2 ]; then \
		echo -e "$(YELLOW)⏳ No ss/lsof/netstat available; skipping host port check for $$service$(RESET)"; \
	fi; \
	return 0; \
};
endef

help: ## Show available targets (root + sub-projects)
	@echo -e "$(CYAN)Default target: make -> full Docker stack$(RESET)"
	@echo ""
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

preflight: check-docker check-compose check-ports ## Run the fast startup checks used by `make`
	@echo -e "$(GREEN)✔ Preflight checks passed$(RESET)"

check-docker: ## Check Docker Engine and Compose plugin availability
	@docker info >/dev/null 2>&1 \
		&& $(COMPOSE) version >/dev/null 2>&1 \
		&& echo -e "$(GREEN)✔ Docker engine and Compose available$(RESET)" \
		|| { echo -e "$(RED)✘ Docker engine or Compose plugin unavailable$(RESET)"; exit 1; }

check-compose: ## Validate docker-compose configuration resolution
	@$(COMPOSE) config >/dev/null \
		&& echo -e "$(GREEN)✔ Docker Compose configuration valid$(RESET)" \
		|| { echo -e "$(RED)✘ Docker Compose configuration invalid$(RESET)"; exit 1; }

check-db-ports: ## Check PostgreSQL + MongoDB host ports unless already owned by this stack
	@set -e; \
	$(CHECK_PORT_HELPERS) \
	check_port postgres notion_postgres $${POSTGRES_PORT:-5432}; \
	check_port mongodb notion_mongodb $${MONGO_PORT:-27017}; \
	echo -e "$(GREEN)✔ Database ports look good$(RESET)"

check-app-ports: ## Check API + src + playground host ports unless already owned by this stack
	@set -e; \
	$(CHECK_PORT_HELPERS) \
	check_port api notion_api $${API_PORT:-4000}; \
	check_port src notion_src $${SRC_PORT:-3000}; \
	check_port playground notion_playground $${PLAYGROUND_PORT:-3001}; \
	echo -e "$(GREEN)✔ App service ports look good$(RESET)"

check-sonar-ports: ## Check Redis + SonarQube host ports unless already owned by this stack
	@set -e; \
	$(CHECK_PORT_HELPERS) \
	check_port redis notion_redis $${REDIS_PORT:-6379}; \
	check_port sonarqube notion_sonarqube $${SONAR_PORT:-9000}; \
	echo -e "$(GREEN)✔ SonarQube/Redis ports look good$(RESET)"

check-ports: check-db-ports check-app-ports check-sonar-ports ## Check all configured host ports quickly
	@echo -e "$(GREEN)✔ Port checks passed$(RESET)"

stack: preflight up seed-playground show-endpoints ## Check, start the full stack, seed playground users, and print localhost endpoints
	@echo -e "$(GREEN)✔ Full stack ready$(RESET)"

check-app-image-cache:
	@if [ -f $(APP_IMAGE_STAMP) ] && ! docker image inspect $(APP_IMAGE) >/dev/null 2>&1; then \
		rm -f $(APP_IMAGE_STAMP); \
	fi

ensure-submodules: ## Initialise git submodules if absent
	@if [ ! -f src/lib/engine/Cargo.toml ]; then \
		echo -e "$(CYAN)Initialising git submodules…$(RESET)"; \
		git submodule update --init --recursive; \
		echo -e "$(GREEN)✔ Submodules ready$(RESET)"; \
	fi

$(APP_IMAGE_STAMP): $(APP_IMAGE_INPUTS)
	@mkdir -p $(@D)
	@echo -e "$(CYAN)Building shared app image…$(RESET)"
	docker build -t $(APP_IMAGE) .
	@docker image inspect $(APP_IMAGE) --format '{{.Id}}' > $(APP_IMAGE_STAMP)
	@echo -e "$(GREEN)✔ App image built$(RESET)"

build: build-app ## Alias for build-app

build-app: ensure-submodules check-app-image-cache $(APP_IMAGE_STAMP) ## Build the shared Docker image for src, api, and playground

pull: ## Pull latest stock images (postgres, mongodb, redis, sonarqube)
	@$(COMPOSE) pull --quiet $(DB_SERVICES) $(SONAR_SERVICES)
	@echo -e "$(GREEN)✔ Images pulled$(RESET)"

ensure-db-images: check-docker ## Pull PostgreSQL + MongoDB images only if missing locally
	@set -e; \
	for image in $(POSTGRES_IMAGE_REF) $(MONGO_IMAGE_REF); do \
		if docker image inspect $$image >/dev/null 2>&1; then \
			echo -e "$(GREEN)✔ Cached image available: $$image$(RESET)"; \
		else \
			echo -e "$(CYAN)Pulling missing image: $$image$(RESET)"; \
			docker pull $$image; \
		fi; \
	done

ensure-sonar-images: check-docker ## Pull Redis + SonarQube images only if missing locally
	@set -e; \
	for image in $(REDIS_IMAGE_REF) $(SONARQUBE_IMAGE_REF); do \
		if docker image inspect $$image >/dev/null 2>&1; then \
			echo -e "$(GREEN)✔ Cached image available: $$image$(RESET)"; \
		else \
			echo -e "$(CYAN)Pulling missing image: $$image$(RESET)"; \
			docker pull $$image; \
		fi; \
	done

ensure-stock-images: ensure-db-images ensure-sonar-images ## Ensure the heavy stock images are already cached locally

up: up-db up-sonar up-app ## Start the full stack (infra + app services)
	@echo -e "$(GREEN)✔ Full stack up$(RESET)"

up-db: check-docker check-compose check-db-ports ensure-db-images ## Start only PostgreSQL + MongoDB
	$(COMPOSE) up -d --remove-orphans $(DB_SERVICES)
	@echo -e "$(GREEN)✔ Database containers up$(RESET)"

up-sonar: check-docker check-compose check-sonar-ports ensure-sonar-images ## Start Redis + SonarQube
	$(COMPOSE) up -d --remove-orphans $(SONAR_SERVICES)
	@echo -e "$(GREEN)✔ SonarQube + Redis up$(RESET)"

up-app: check-docker check-compose check-app-ports build-app ## Start src, api, and playground
	@set -e; \
	desired_id="$$(docker image inspect $(APP_IMAGE) --format '{{.Id}}')"; \
	recreate=0; \
	for container in notion_api notion_src notion_playground; do \
		current_id="$$(docker inspect -f '{{.Image}}' $$container 2>/dev/null || true)"; \
		current_running="$$(docker inspect -f '{{.State.Running}}' $$container 2>/dev/null || true)"; \
		current_health="$$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $$container 2>/dev/null || true)"; \
		if [ -z "$$current_id" ] || [ "$$current_id" != "$$desired_id" ] || [ "$$current_running" != "true" ] || [ "$$current_health" != "healthy" ]; then \
			recreate=1; \
			break; \
		fi; \
	done; \
	if [ "$$recreate" -eq 0 ]; then \
		echo -e "$(GREEN)✔ App containers already match current image; reusing healthy containers$(RESET)"; \
		$(COMPOSE) up -d --no-recreate --remove-orphans $(APP_SERVICES); \
	else \
		$(COMPOSE) up -d --remove-orphans $(APP_SERVICES); \
	fi
	@echo -e "$(GREEN)✔ App services up$(RESET)"

down: ## Stop all containers
	$(COMPOSE) down
	@echo -e "$(GREEN)✔ Containers down$(RESET)"

restart: down stack ## Rebuild/restart the full stack

logs: ## Tail container logs
	$(COMPOSE) logs -f --tail=50

stack-status: ## Show full stack status
	@$(COMPOSE) ps

doctor: preflight app-image-status stack-status ## Run the fast diagnostics used by the bootstrap flow

app-image-status: ## Report whether the shared app image already exists locally
	@docker image inspect $(APP_IMAGE) >/dev/null 2>&1 \
		&& echo -e "$(GREEN)✔ Shared app image present: $(APP_IMAGE)$(RESET)" \
		|| echo -e "$(YELLOW)⏳ Shared app image missing; next 'make' will build it$(RESET)"

show-endpoints: ## Print the effective localhost URLs and ports for the current stack
	@echo ""
	@echo -e "$(CYAN)Local Endpoints$(RESET)"
	@echo -e "  Main app:      $(LBLUE)$(SRC_URL)$(RESET)"
	@echo -e "  Playground:    $(LBLUE)$(PLAYGROUND_URL)$(RESET)"
	@echo -e "  API health:    $(LBLUE)$(API_URL)/health$(RESET)"
	@echo -e "  SonarQube:     $(LBLUE)$(SONAR_URL)$(RESET)"
	@echo -e "  PostgreSQL TCP:$(LBLUE)$(POSTGRES_HOST_URL)$(RESET)"
	@echo -e "  MongoDB TCP:   $(LBLUE)$(MONGO_HOST_URL)$(RESET)"
	@echo -e "  Redis TCP:     $(LBLUE)$(REDIS_HOST_URL)$(RESET)"
	@echo -e "  Note: DB/Redis ports are not browser URLs; use a client or 'make psql' / 'make mongo-shell'."

db-reset: ## Destroy DB volumes and restart only PostgreSQL + MongoDB
	$(COMPOSE) down -v
	$(COMPOSE) up -d $(DB_SERVICES)
	@echo -e "$(GREEN)✔ Database volumes destroyed, DB containers recreated$(RESET)"

db-status: ## Show container & DB health
	@$(COMPOSE) ps
	@echo ""
	@echo "PostgreSQL:"
	@$(COMPOSE) exec -T postgres pg_isready -U $${POSTGRES_USER:-notion_user} 2>/dev/null \
		&& echo -e "  $(GREEN)✔ Accepting connections$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"
	@echo "MongoDB:"
	@$(COMPOSE) exec -T mongodb mongosh --quiet --eval "db.adminCommand('ping')" 2>/dev/null \
		&& echo -e "  $(GREEN)✔ Accepting connections$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"
	@echo "Redis:"
	@$(COMPOSE) exec -T redis redis-cli ping 2>/dev/null \
		&& echo -e "  $(GREEN)✔ PONG$(RESET)" \
		|| echo -e "  $(RED)✘ Not ready$(RESET)"
	@echo "SonarQube:"
	@curl -sf $(SONAR_URL)/api/system/status 2>/dev/null | grep -q UP \
		&& echo -e "  $(GREEN)✔ UP$(RESET)" \
		|| echo -e "  $(YELLOW)⏳ Not ready (run 'make up-sonar' first)$(RESET)"

status: stack-status ## Alias for stack-status

psql: ## Open psql shell
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-notion_user} -d $${POSTGRES_DB:-notion_db}

mongo-shell: ## Open mongosh shell
	$(COMPOSE) exec mongodb mongosh \
		"mongodb://$${MONGO_USER:-notion_user}:$${MONGO_PASSWORD:-notion_pass}@localhost:27017/$${MONGO_DB:-notion_db}?authSource=admin"

redis-cli: ## Open redis-cli shell
	$(COMPOSE) exec redis redis-cli

seed: seed-playground ## Safe default seed for the docker stack

seed-src: preflight up-db ## Seed PostgreSQL + MongoDB for src live DB sources
	@echo -e "$(CYAN)Seeding src live databases…$(RESET)"
	@$(MAKE) -C src seed --no-print-directory
	@echo -e "$(GREEN)✔ src live databases seeded$(RESET)"

ensure-api: ## Ensure the API-backed app services are reachable
	@if curl -sf $(API_URL)/health > /dev/null 2>&1; then \
		echo -e "$(GREEN)✔ API already healthy$(RESET)"; \
	else \
		$(MAKE) up-app --no-print-directory; \
		$(MAKE) wait-api --no-print-directory; \
	fi

wait-api: ## Wait until the API health endpoint responds
	@echo -e "$(CYAN)Waiting for API…$(RESET)"
	@until curl -sf $(API_URL)/health > /dev/null 2>&1; do sleep 0.5; done

seed-playground: preflight ensure-api ## Seed playground users/workspaces (idempotent)
	@echo -e "$(CYAN)Seeding playground data…$(RESET)"
	@$(COMPOSE) exec -T api node scripts/seed-playground.mjs
	@echo -e "$(GREEN)✔ Playground seeded$(RESET)"

seed-all: seed-src seed-playground ## Seed src live DBs and playground data

install: ## Install all local workspace dependencies with pnpm
	@echo -e "$(CYAN)Installing dependencies…$(RESET)"
	pnpm install
	@echo -e "$(GREEN)✔ Dependencies installed$(RESET)"

build-packages: build-app ## Build all packages (types → core → api) inside the shared app image
	@echo -e "$(CYAN)Building packages…$(RESET)"
	$(COMPOSE) run --rm --no-deps src pnpm turbo run build --filter='./packages/*'
	@echo -e "$(GREEN)✔ All packages built$(RESET)"

typecheck: build-app ## Run TypeScript type-checking (no emit) inside the shared app image
	@echo -e "$(CYAN)Type-checking…$(RESET)"
	$(COMPOSE) run --rm --no-deps src sh -c 'pnpm turbo run build --filter="./packages/*" && pnpm tsc --noEmit'
	@echo -e "$(GREEN)✔ No type errors$(RESET)"

lint: build-app ## Run ESLint on all source directories inside the shared app image
	@echo -e "$(CYAN)Linting…$(RESET)"
	$(COMPOSE) run --rm --no-deps src pnpm eslint src/ packages/ playground/ docker/services/dbms/ --max-warnings=0
	@echo -e "$(GREEN)✔ No lint errors$(RESET)"

lint-fix: build-app ## Run ESLint with --fix inside the shared app image
	$(COMPOSE) run --rm --no-deps src pnpm eslint src/ packages/ playground/ docker/services/dbms/ --max-warnings=0 --fix
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
		$(COMPOSE) up -d $(SONAR_SERVICES); \
		bash docker/services/sonarqube/tools/wait-sonarqube.sh $(SONAR_URL) 180; \
	else \
		echo -e "  $(GREEN)✔ SonarQube already running$(RESET)"; \
	fi
	@echo ""
	@echo -e "$(CYAN)[4/4] Running SonarQube scanner…$(RESET)"
	@bash docker/services/sonarqube/tools/run-scan.sh
	@echo ""
	@echo -e "$(GREEN)══════════════════════════════════════════════════$(RESET)"
	@echo -e "$(GREEN)  ✔ Full audit complete                          $(RESET)"
	@echo -e "$(GREEN)══════════════════════════════════════════════════$(RESET)"

wait-sonar: ## Wait until SonarQube reports UP
	@bash docker/services/sonarqube/tools/wait-sonarqube.sh $(SONAR_URL) 180

sonar-up: up-sonar wait-sonar ## Alias - start SonarQube + Redis

sonar-scan: ## Run SonarQube scanner only (SonarQube must be running)
	@bash docker/services/sonarqube/tools/run-scan.sh

sonar-status: ## Check SonarQube server status
	@curl -sf $(SONAR_URL)/api/system/status 2>/dev/null \
		&& echo "" \
		|| echo -e "$(RED)✘ SonarQube unreachable at $(SONAR_URL)$(RESET)"

ci: typecheck lint build-packages ## Run the same checks as GitHub Actions CI

clean: ## Remove containers, volumes, local image, node_modules, dist
	$(COMPOSE) down -v 2>/dev/null || true
	docker image rm $(APP_IMAGE) 2>/dev/null || true
	rm -rf node_modules dist .vite .turbo packages/*/dist .scannerwork \
		tsconfig.tsbuildinfo packages/*/tsconfig.tsbuildinfo .make
	@echo -e "$(GREEN)✔ Cleaned$(RESET)"

fclean: ## Full clean: stop+remove all containers (incl. orphans) + volumes, image, cache, and generated files
	$(COMPOSE) down -v --remove-orphans 2>/dev/null || true
	docker image rm $(APP_IMAGE) 2>/dev/null || true
	rm -rf node_modules dist .vite .turbo packages/*/dist .scannerwork \
		tsconfig.tsbuildinfo packages/*/tsconfig.tsbuildinfo .make
	@echo -e "$(GREEN)✔ Full clean done$(RESET)"

kill-ports: ## Kill any process occupying stack-related ports (3000, 3001, 4000, 5432, 6379, 9000, 27017)
	@echo -e "$(CYAN)Killing processes on stack ports…$(RESET)"
	@for port in 3000 3001 4000 5432 6379 9000 27017; do \
		pids=$$(lsof -ti :$$port 2>/dev/null || true); \
		if [ -n "$$pids" ]; then \
			echo -e "  $(RED)Killing PID(s) $$pids on :$$port$(RESET)"; \
			echo "$$pids" | xargs kill -9 2>/dev/null || true; \
		fi; \
	done
	@echo -e "$(GREEN)✔ Ports freed$(RESET)"

.PHONY: help preflight check-docker check-compose check-db-ports check-app-ports \
	check-sonar-ports check-ports stack check-app-image-cache ensure-submodules \
	build build-app pull \
	ensure-db-images ensure-sonar-images ensure-stock-images up up-db up-sonar up-app \
	down restart logs stack-status doctor app-image-status show-endpoints db-reset db-status \
	status psql mongo-shell redis-cli seed seed-src ensure-api wait-api \
	seed-playground seed-all install build-packages typecheck lint lint-fix \
	audit wait-sonar sonar-up sonar-scan sonar-status ci clean fclean kill-ports
