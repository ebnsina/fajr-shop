-- Run inside Server.scoped: orders are counted under their row-level security.

-- name: AdminCustomers :many
SELECT u.id, u.name, u.email, u.phone, u.created_at, u.disabled_at,
    count(o.id)::int AS order_count,
    coalesce(sum(o.total) FILTER (WHERE o.status <> 'cancelled'), 0)::bigint AS spent,
    max(o.created_at)::timestamptz AS last_order_at
FROM users u LEFT JOIN orders o ON o.user_id = u.id
WHERE u.role = 'customer'
  AND (sqlc.narg(q)::text IS NULL
       OR u.name ILIKE '%' || sqlc.narg(pattern)::text || '%'
       OR u.email ILIKE '%' || sqlc.narg(pattern) || '%'
       OR (sqlc.narg(digits)::text IS NOT NULL AND u.phone LIKE '%' || sqlc.narg(digits) || '%'))
  AND (sqlc.narg(before_at)::timestamptz IS NULL OR (u.created_at, u.id) < (sqlc.narg(before_at), sqlc.narg(before_id)::uuid))
GROUP BY u.id
ORDER BY u.created_at DESC, u.id DESC
LIMIT sqlc.arg(lim);

-- name: AdminCustomer :one
SELECT u.id, u.name, u.email, u.phone, u.created_at, u.disabled_at,
    count(o.id)::int AS order_count,
    coalesce(sum(o.total) FILTER (WHERE o.status <> 'cancelled'), 0)::bigint AS spent,
    max(o.created_at)::timestamptz AS last_order_at
FROM users u LEFT JOIN orders o ON o.user_id = u.id
WHERE u.id = $1 AND u.role = 'customer'
GROUP BY u.id;

-- name: CustomerOrders :many
SELECT o.*, (SELECT coalesce(sum(i.quantity), 0) FROM order_items i WHERE i.order_id = o.id)::int AS item_count
FROM orders o WHERE o.user_id = $1
ORDER BY o.created_at DESC LIMIT 100;
