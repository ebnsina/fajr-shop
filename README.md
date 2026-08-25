# Fajr Shop

Ecommerce for Bangladesh. One deploy per merchant — see `plan.md`.

## Run it

```sh
cp .env.example .env
pnpm install
pnpm up            # Postgres on :5440 (5432 is taken by a local Postgres)
                   # plus MinIO on :9000, console :9001 (fajr / fajrfajr)
pnpm db:migrate
pnpm dev           # api :3001, web :5173, worker
```

`pnpm db:seed` creates the first admin and prints a generated password.
`pnpm test` runs the auth suite against the dev database.

`ORIGIN` must be set in production — SvelteKit's cross-site POST protection
compares against it, and the check is disabled in `vite dev`, so CSRF behaviour
is only observable in a production build.

## Deploying

```sh
deploy/provision.sh <slug> <domain>     # one merchant, from nothing to running
docker compose -f deploy/docker-compose.yml up -d
DATABASE_URL=... deploy/backup.sh       # nightly; verifies the restore, not just the dump
pnpm loadtest                           # against a production build, never the dev server
```

`GET /healthz` touches the database, so a process that is up but cannot reach
Postgres reports 503 and leaves rotation.

## Layout

| Path | What |
|---|---|
| `packages/db` | Drizzle schema + migrations. The only place tables are defined. |
| `packages/core` | Domain modules. Owns every write. |
| `packages/schemas` | Zod contracts shared by api, web and mobile. |
| `apps/api` | Hono. auth → validate → call core → serialise. |
| `apps/web` | SvelteKit storefront + admin. |
| `apps/worker` | pg-boss consumers. |

SvelteKit SSR imports `core` directly. Everything else goes through the API.
