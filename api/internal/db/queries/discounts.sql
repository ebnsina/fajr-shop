-- name: ListDiscounts :many
SELECT * FROM discounts ORDER BY created_at DESC, code LIMIT 500;

-- name: DiscountByID :one
SELECT * FROM discounts WHERE id = $1;

-- name: DiscountByCode :one
SELECT * FROM discounts WHERE code = upper(sqlc.arg(code)::text);

-- name: CreateDiscount :one
INSERT INTO discounts (code, description, kind, value, max_discount, min_subtotal, starts_at, ends_at, usage_limit, active)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: UpdateDiscount :one
UPDATE discounts SET code = $2, description = $3, kind = $4, value = $5, max_discount = $6, min_subtotal = $7,
    starts_at = $8, ends_at = $9, usage_limit = $10, active = $11
WHERE id = $1
RETURNING *;

-- name: DeleteDiscount :one
DELETE FROM discounts WHERE id = $1 RETURNING *;

-- name: SetCartDiscount :exec
UPDATE carts SET discount_id = $2, updated_at = now() WHERE id = $1;

-- name: CartDiscount :one
SELECT d.* FROM carts c JOIN discounts d ON d.id = c.discount_id WHERE c.id = $1;

-- name: MergeCartDiscount :exec
-- A guest's code moves over only when the customer's cart has none.
UPDATE carts SET discount_id = COALESCE(carts.discount_id, g.discount_id)
FROM carts g WHERE carts.id = sqlc.arg(into_cart) AND g.id = sqlc.arg(from_cart);
