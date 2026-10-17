-- name: ListProviders :many
SELECT * FROM providers ORDER BY code;

-- name: ProviderByCode :one
SELECT * FROM providers WHERE code = $1;

-- name: LockProvider :exec
SELECT pg_advisory_xact_lock(hashtext('provider:' || sqlc.arg(code)::text));

-- name: UpsertProvider :one
INSERT INTO providers (code, enabled, live, settings, secrets, updated_at)
VALUES ($1, $2, $3, $4, $5, now())
ON CONFLICT (code) DO UPDATE SET enabled = EXCLUDED.enabled, live = EXCLUDED.live,
    settings = EXCLUDED.settings, secrets = EXCLUDED.secrets, updated_at = now()
RETURNING *;

-- name: DisableProvidersExcept :exec
-- One SMS gateway sends at a time; switching one on switches the rest off.
UPDATE providers SET enabled = false, updated_at = now()
WHERE enabled AND code <> sqlc.arg(keep) AND code = ANY(sqlc.arg(codes)::text[]);
