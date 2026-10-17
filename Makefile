.DEFAULT_GOAL := help
.PHONY: help gen run migrate test check

TEST_DB_URL ?= postgres://fajr_shop:fajr_shop@localhost:5432/fajr_shop_test?sslmode=disable

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-8s %s\n", $$1, $$2}'

gen: ## Regenerate Go code from openapi.yaml and the SQL queries
	cd api && go generate ./... && sqlc generate

run: ## Start the API (reads .env)
	set -a && . ./.env && set +a && cd api && go run ./cmd/fajr serve

migrate: ## Apply migrations (reads .env)
	set -a && . ./.env && set +a && cd api && go run ./cmd/fajr migrate

test: ## Run every test against the test database
	cd api && FAJR_TEST_DATABASE_URL="$(TEST_DB_URL)" go test ./... -race

check: gen test ## What CI runs: generated code must be committed, then vet, format and tests
	git diff --exit-code -- api/internal/apigen api/internal/db/dbq
	cd api && go vet ./... && test -z "$$(gofmt -l .)"
