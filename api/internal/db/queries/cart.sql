-- name: CartByUser :one
SELECT * FROM carts WHERE user_id = $1;

-- name: CartByToken :one
SELECT * FROM carts WHERE token_hash = $1;

-- name: CreateUserCart :one
INSERT INTO carts (user_id) VALUES ($1)
ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
RETURNING *;

-- name: CreateGuestCart :one
INSERT INTO carts (token_hash) VALUES ($1) RETURNING *;

-- name: TouchCart :exec
UPDATE carts SET updated_at = now() WHERE id = $1;

-- name: SetCartItem :exec
INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, $3)
ON CONFLICT (cart_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- name: RemoveCartItem :exec
DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2;

-- name: VariantForSale :one
SELECT v.id, v.stock, p.status FROM variants v JOIN products p ON p.id = v.product_id WHERE v.id = $1;

-- name: CartLines :many
SELECT ci.variant_id, ci.quantity, v.price, v.compare_at_price, v.stock, v.options,
       p.id AS product_id, p.slug, p.name, p.status,
       -- No photo comes back as an empty key.
       COALESCE(img.id, '00000000-0000-0000-0000-000000000000')::uuid AS image_id, COALESCE(img.key, '')::text AS image_key,
       COALESCE(img.width, 0)::int AS image_width, COALESCE(img.height, 0)::int AS image_height
FROM cart_items ci
JOIN variants v ON v.id = ci.variant_id
JOIN products p ON p.id = v.product_id
LEFT JOIN LATERAL (
    SELECT u.id, u.key, u.width, u.height FROM product_images pi JOIN uploads u ON u.id = pi.upload_id
    WHERE pi.product_id = p.id ORDER BY pi.position LIMIT 1
) img ON true
WHERE ci.cart_id = $1
ORDER BY ci.added_at, ci.variant_id;

-- name: MergeCartItems :exec
INSERT INTO cart_items (cart_id, variant_id, quantity)
SELECT sqlc.arg(into_cart), g.variant_id, g.quantity FROM cart_items g WHERE g.cart_id = sqlc.arg(from_cart)
ON CONFLICT (cart_id, variant_id) DO UPDATE SET quantity = LEAST(99, cart_items.quantity + EXCLUDED.quantity);

-- name: DeleteCart :exec
DELETE FROM carts WHERE id = $1;
