-- Order queries run inside Server.scoped, so row-level security sees the caller.

-- name: LockOrderVariants :many
-- Locked in id order, so two checkouts sharing products never wait on each other in a circle.
SELECT v.id, v.stock, v.price, v.sku, v.options, v.weight_g, p.id AS product_id, p.slug, p.name, p.status
FROM variants v JOIN products p ON p.id = v.product_id
WHERE v.id = ANY(sqlc.arg(ids)::uuid[])
ORDER BY v.id
FOR UPDATE OF v;

-- name: TakeStock :execrows
UPDATE variants SET stock = stock - sqlc.arg(quantity) WHERE id = sqlc.arg(id) AND stock >= sqlc.arg(quantity);

-- name: ReturnStock :exec
UPDATE variants SET stock = stock + sqlc.arg(quantity) WHERE id = sqlc.arg(id);

-- name: OrderStockMovement :exec
INSERT INTO stock_movements (variant_id, delta, reason, order_id, actor_user_id) VALUES ($1, $2, $3, $4, $5);

-- name: UseDiscount :execrows
UPDATE discounts SET used_count = used_count + 1
WHERE id = $1 AND (usage_limit IS NULL OR used_count < usage_limit);

-- name: CreateOrder :one
INSERT INTO orders (user_id, token_hash, payment_method, customer_name, phone, email, district, area, address, note,
    subtotal, discount_code, discount_total, zone_name, delivery_days, delivery_charge, vat_rate_bp, vat_included,
    vat_total, total)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
RETURNING *;

-- name: AddOrderItem :exec
INSERT INTO order_items (order_id, position, variant_id, product_id, slug, name, options, sku, unit_price, quantity, line_total)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);

-- name: AddOrderEvent :exec
INSERT INTO order_events (order_id, status, note, actor_user_id) VALUES ($1, $2, $3, $4);

-- name: EmptyCart :exec
WITH gone AS (DELETE FROM cart_items WHERE cart_id = $1)
UPDATE carts SET discount_id = NULL, updated_at = now() WHERE id = $1;

-- name: OrderByNumber :one
SELECT * FROM orders WHERE number = $1;

-- name: OrderItems :many
SELECT * FROM order_items WHERE order_id = $1 ORDER BY position;

-- name: OrderEvents :many
SELECT e.status, e.note, e.created_at, u.name AS actor
FROM order_events e LEFT JOIN users u ON u.id = e.actor_user_id
WHERE e.order_id = $1 ORDER BY e.id;

-- name: MyOrders :many
SELECT o.*, (SELECT coalesce(sum(i.quantity), 0) FROM order_items i WHERE i.order_id = o.id)::int AS item_count
FROM orders o WHERE o.user_id = app_user()
ORDER BY o.created_at DESC LIMIT 100;

-- name: AdminOrders :many
SELECT o.*, (SELECT coalesce(sum(i.quantity), 0) FROM order_items i WHERE i.order_id = o.id)::int AS item_count
FROM orders o
WHERE (sqlc.narg(status)::order_status IS NULL OR o.status = sqlc.narg(status))
  AND (sqlc.narg(before)::bigint IS NULL OR o.number < sqlc.narg(before))
ORDER BY o.number DESC
LIMIT sqlc.arg(lim);

-- name: SetOrderStatus :one
-- Only from the status the caller saw, so two people handling one order can't both move it.
UPDATE orders SET status = sqlc.arg(status), updated_at = now()
WHERE id = sqlc.arg(id) AND status = sqlc.arg(was)
RETURNING *;
