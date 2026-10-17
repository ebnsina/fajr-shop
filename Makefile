.DEFAULT_GOAL := help
.PHONY: help gen run web migrate seed test check

TEST_DB_URL ?= postgres://fajr_shop:fajr_shop@localhost:5432/fajr_shop_test?sslmode=disable

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-8s %s\n", $$1, $$2}'

gen: ## Regenerate Go and TypeScript code from openapi.yaml and the SQL queries
	cd api && go generate ./... && sqlc generate
	cd web && pnpm gen:api

run: ## Start the API (reads .env)
	set -a && . ./.env && set +a && cd api && go run ./cmd/fajr serve

web: ## Start the web app on :5173, talking to the API from .env
	set -a && . ./.env && set +a && cd web && FAJR_API_URL="http://$$FAJR_HTTP_ADDR" pnpm dev

migrate: ## Apply migrations (reads .env)
	set -a && . ./.env && set +a && cd api && go run ./cmd/fajr migrate

seed: ## Fill an empty shop with ~3,400 Bangladeshi demo products (reads .env)
	set -a && . ./.env && set +a && cd api && go run ./cmd/fajr seed

test: ## Run every test against the test database
	cd api && FAJR_TEST_DATABASE_URL="$(TEST_DB_URL)" go test ./... -race

check: gen test ## What CI runs: generated code must be committed, then vet, format, types and tests
	git diff --exit-code -- api/internal/apigen api/internal/db/dbq web/src/lib/api.d.ts
	cd api && go vet ./... && test -z "$$(gofmt -l .)"
	cd web && pnpm lint && pnpm check
