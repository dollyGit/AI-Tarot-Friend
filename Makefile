# ============================================================
# TarotFriend Monorepo — Makefile
# ============================================================

.DEFAULT_GOAL := help
SHELL := /bin/bash

# Colors
CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

# ── Infrastructure ──────────────────────────────────────────

.PHONY: up
up: ## Start all infrastructure (Docker Compose)
	docker compose up -d

.PHONY: down
down: ## Stop all infrastructure
	docker compose down

.PHONY: down-v
down-v: ## Stop all infrastructure and remove volumes
	docker compose down -v

.PHONY: ps
ps: ## Show running containers
	docker compose ps

.PHONY: logs
logs: ## Follow all container logs
	docker compose logs -f

.PHONY: logs-%
logs-%: ## Follow logs for a specific service (e.g., make logs-postgres)
	docker compose logs -f $*

# ── Per-Service Dev ─────────────────────────────────────────

.PHONY: dev-tarot
dev-tarot: ## Start TarotReading dev server (port 3000)
	cd TarotReading/backend && npm run dev

.PHONY: dev-customer
dev-customer: ## Start CustomerManagement dev server (port 3010)
	cd CustomerManagement && npm run dev

.PHONY: dev-caring
dev-caring: ## Start CaringService dev server (port 3020)
	cd CaringService && uvicorn app.main:app --reload --port 3020

.PHONY: dev-shopping
dev-shopping: ## Start ShoppingCart dev server (port 3030)
	cd ShoppingCart && npm run dev

.PHONY: dev-scheduler
dev-scheduler: ## Start TarotistScheduler dev server (port 3040)
	cd TarotistScheduler && npm run dev

.PHONY: dev-dal
dev-dal: ## Start DataAccessLayer dev server (port 4000)
	cd DataAccessLayer && go run cmd/dal-server/main.go

# ── Testing ─────────────────────────────────────────────────

.PHONY: test-all
test-all: test-tarot test-customer test-shopping test-scheduler test-caring test-dal ## Run all tests

.PHONY: test-tarot
test-tarot: ## Run TarotReading tests
	cd TarotReading/backend && npm test

.PHONY: test-customer
test-customer: ## Run CustomerManagement tests
	cd CustomerManagement && npm test

.PHONY: test-shopping
test-shopping: ## Run ShoppingCart tests
	cd ShoppingCart && npm test

.PHONY: test-scheduler
test-scheduler: ## Run TarotistScheduler tests
	cd TarotistScheduler && npm test

.PHONY: test-caring
test-caring: ## Run CaringService tests
	cd CaringService && python -m pytest

.PHONY: test-dal
test-dal: ## Run DataAccessLayer tests
	cd DataAccessLayer && go test ./...

# ── Linting ─────────────────────────────────────────────────

.PHONY: lint-all
lint-all: lint-tarot lint-customer lint-shopping lint-scheduler lint-caring lint-dal lint-proto ## Run all linters

.PHONY: lint-tarot
lint-tarot: ## Lint TarotReading
	cd TarotReading/backend && npm run lint

.PHONY: lint-customer
lint-customer: ## Lint CustomerManagement
	cd CustomerManagement && npm run lint

.PHONY: lint-shopping
lint-shopping: ## Lint ShoppingCart
	cd ShoppingCart && npm run lint

.PHONY: lint-scheduler
lint-scheduler: ## Lint TarotistScheduler
	cd TarotistScheduler && npm run lint

.PHONY: lint-caring
lint-caring: ## Lint CaringService
	cd CaringService && ruff check .

.PHONY: lint-dal
lint-dal: ## Lint DataAccessLayer
	cd DataAccessLayer && go vet ./...

.PHONY: lint-proto
lint-proto: ## Lint Protobuf definitions
	cd proto && buf lint

# ── Protobuf ────────────────────────────────────────────────

.PHONY: proto
proto: ## Compile Protobuf definitions → Go/TS/Python stubs
	cd proto && buf generate

.PHONY: proto-lint
proto-lint: ## Lint Protobuf definitions
	cd proto && buf lint

# ── Database ────────────────────────────────────────────────

.PHONY: db-migrate-customer
db-migrate-customer: ## Run CustomerManagement Prisma migrations
	cd CustomerManagement && npx prisma migrate dev

.PHONY: db-migrate-shopping
db-migrate-shopping: ## Run ShoppingCart Prisma migrations
	cd ShoppingCart && npx prisma migrate dev

.PHONY: db-migrate-scheduler
db-migrate-scheduler: ## Run TarotistScheduler Prisma migrations
	cd TarotistScheduler && npx prisma migrate dev

.PHONY: db-migrate-caring
db-migrate-caring: ## Run CaringService Alembic migrations
	cd CaringService && alembic upgrade head

# ── Utilities ───────────────────────────────────────────────

.PHONY: clean
clean: ## Remove all build artifacts
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	find . -name "dist" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	find . -name "__pycache__" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	find . -name ".mypy_cache" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	find . -name ".ruff_cache" -type d -prune -exec rm -rf '{}' + 2>/dev/null || true
	cd DataAccessLayer 2>/dev/null && rm -rf bin/ || true

.PHONY: health
health: ## Check health of all running services
	@echo "$(CYAN)Checking service health...$(RESET)"
	@curl -sf http://localhost:3000/health > /dev/null 2>&1 && echo "$(GREEN)✓$(RESET) TarotReading     :3000" || echo "✗ TarotReading     :3000"
	@curl -sf http://localhost:3010/health > /dev/null 2>&1 && echo "$(GREEN)✓$(RESET) CustomerMgmt     :3010" || echo "✗ CustomerMgmt     :3010"
	@curl -sf http://localhost:3020/health > /dev/null 2>&1 && echo "$(GREEN)✓$(RESET) CaringService    :3020" || echo "✗ CaringService    :3020"
	@curl -sf http://localhost:3030/health > /dev/null 2>&1 && echo "$(GREEN)✓$(RESET) ShoppingCart     :3030" || echo "✗ ShoppingCart     :3030"
	@curl -sf http://localhost:3040/health > /dev/null 2>&1 && echo "$(GREEN)✓$(RESET) TarotistSched    :3040" || echo "✗ TarotistSched    :3040"
	@grpcurl -plaintext localhost:4000 grpc.health.v1.Health/Check > /dev/null 2>&1 && echo "$(GREEN)✓$(RESET) DAL (gRPC)       :4000" || echo "✗ DAL (gRPC)       :4000"

# ── Help ────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "$(CYAN)TarotFriend Monorepo$(RESET)"
	@echo "$(CYAN)════════════════════$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_%-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
