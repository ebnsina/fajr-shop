-- name: CreateUser :one
INSERT INTO users (role, name, email, phone, password_hash)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: UserByPhone :one
SELECT * FROM users WHERE phone = $1;

-- name: UserByID :one
SELECT * FROM users WHERE id = $1;

-- name: CreateSession :one
INSERT INTO sessions (user_id, access_hash, access_expires_at, refresh_hash, refresh_expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- name: SessionByAccess :one
SELECT s.id AS session_id, u.id AS user_id, u.role
FROM sessions s JOIN users u ON u.id = s.user_id
WHERE s.access_hash = $1 AND s.revoked_at IS NULL AND s.access_expires_at > now()
  AND u.disabled_at IS NULL;

-- name: RotateSession :one
UPDATE sessions s
SET previous_refresh_hash = s.refresh_hash,
    refresh_hash = sqlc.arg(new_refresh_hash),
    access_hash = sqlc.arg(new_access_hash),
    access_expires_at = sqlc.arg(access_expires_at)
FROM users u
WHERE s.refresh_hash = sqlc.arg(refresh_hash) AND s.revoked_at IS NULL AND s.refresh_expires_at > now()
  AND u.id = s.user_id AND u.disabled_at IS NULL
RETURNING s.user_id, s.refresh_expires_at;

-- name: RevokeReusedSession :execrows
UPDATE sessions SET revoked_at = now()
WHERE previous_refresh_hash = $1 AND revoked_at IS NULL;

-- name: RevokeSession :exec
UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL;

-- name: CreateApiKey :one
INSERT INTO api_keys (name, key_hash, hint, scopes, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListApiKeys :many
SELECT * FROM api_keys WHERE revoked_at IS NULL ORDER BY created_at DESC LIMIT 200;

-- name: RevokeApiKey :one
UPDATE api_keys SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING *;

-- name: ApiKeyByHash :one
SELECT * FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL;

-- name: InsertAudit :exec
INSERT INTO audit_log (actor_user_id, actor_api_key_id, action, entity, entity_id, before, after, ip)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);

-- name: ListAudit :many
SELECT a.*, COALESCE(u.name, k.name, '')::text AS actor_name
FROM audit_log a
LEFT JOIN users u ON u.id = a.actor_user_id
LEFT JOIN api_keys k ON k.id = a.actor_api_key_id
WHERE a.id < sqlc.arg(before_id)
ORDER BY a.id DESC
LIMIT sqlc.arg(row_limit);
