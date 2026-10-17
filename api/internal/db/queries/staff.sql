-- name: ListStaff :many
SELECT * FROM users WHERE role IN ('staff', 'admin') ORDER BY disabled_at IS NOT NULL, role DESC, created_at DESC LIMIT 200;

-- name: StaffByID :one
SELECT * FROM users WHERE id = $1 AND role IN ('staff', 'admin');

-- name: LockAdmins :exec
-- One change to the team at a time, so two can't each demote "another" admin and leave none.
SELECT pg_advisory_xact_lock(hashtext('staff'));

-- name: ActiveAdmins :one
SELECT count(*)::int FROM users WHERE role = 'admin' AND disabled_at IS NULL;

-- name: UpdateStaff :one
UPDATE users SET role = sqlc.arg(role),
    disabled_at = CASE WHEN sqlc.arg(disabled)::bool THEN coalesce(disabled_at, now()) END
WHERE id = sqlc.arg(id) AND role IN ('staff', 'admin')
RETURNING *;
