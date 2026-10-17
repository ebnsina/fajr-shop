-- name: ListCategories :many
SELECT c.*, COALESCE(u.key, '')::text AS image_key, COALESCE(u.width, 0)::int AS image_width, COALESCE(u.height, 0)::int AS image_height
FROM categories c LEFT JOIN uploads u ON u.id = c.image_id
ORDER BY c.position, c.name LIMIT 500;

-- name: CategoryByID :one
SELECT c.*, COALESCE(u.key, '')::text AS image_key, COALESCE(u.width, 0)::int AS image_width, COALESCE(u.height, 0)::int AS image_height
FROM categories c LEFT JOIN uploads u ON u.id = c.image_id
WHERE c.id = $1;

-- name: CategorySubtree :many
WITH RECURSIVE tree AS (
    SELECT c.id FROM categories c WHERE c.slug = $1
    UNION ALL
    SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
)
SELECT id FROM tree;

-- name: CreateCategory :one
INSERT INTO categories (parent_id, name, slug, position, image_id) VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: UpdateCategory :one
UPDATE categories SET parent_id = $2, name = $3, slug = $4, position = $5, image_id = $6 WHERE id = $1 RETURNING *;

-- name: DeleteCategory :one
DELETE FROM categories WHERE id = $1 RETURNING *;

-- name: CategoryIsAncestor :one
-- Whether ancestor is the category itself or above it, which would make moving it there a loop.
WITH RECURSIVE chain(id, parent_id) AS (
    SELECT c.id, c.parent_id FROM categories c WHERE c.id = sqlc.arg(category_id)
    UNION ALL
    SELECT c.id, c.parent_id FROM categories c JOIN chain ch ON c.id = ch.parent_id
)
SELECT EXISTS (SELECT 1 FROM chain WHERE chain.id = sqlc.arg(ancestor_id)::uuid);

-- name: SlugTaken :one
SELECT EXISTS (SELECT 1 FROM products p WHERE p.slug = sqlc.arg(slug) AND p.id <> sqlc.arg(id))
    OR EXISTS (SELECT 1 FROM categories c WHERE c.slug = sqlc.arg(slug) AND c.id <> sqlc.arg(id));

-- name: CreateUpload :one
INSERT INTO uploads (key, content_type, width, height, bytes) VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: UploadsByIDs :many
SELECT * FROM uploads WHERE id = ANY(sqlc.arg(ids)::uuid[]);

-- name: ProductByID :one
SELECT * FROM products WHERE id = $1;

-- name: ProductBySlug :one
SELECT * FROM products WHERE slug = $1 AND status = 'active';

-- name: CreateProduct :one
INSERT INTO products (slug, name, description, status, category_id, options, price_min, price_max, featured)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateProduct :one
UPDATE products SET slug = $2, name = $3, description = $4, status = $5, category_id = $6, options = $7,
    price_min = $8, price_max = $9, featured = $10, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteProduct :one
DELETE FROM products WHERE id = $1 RETURNING *;

-- name: VariantsByProduct :many
SELECT * FROM variants WHERE product_id = $1 ORDER BY position;

-- name: CreateVariant :one
INSERT INTO variants (product_id, sku, price, compare_at_price, stock, options, position)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: UpdateVariant :one
UPDATE variants SET sku = $3, price = $4, compare_at_price = $5, options = $6, position = $7
WHERE id = $1 AND product_id = $2
RETURNING *;

-- name: DeleteVariantsExcept :exec
DELETE FROM variants WHERE product_id = $1 AND NOT (id = ANY(sqlc.arg(keep)::uuid[]));

-- name: ImagesByProduct :many
SELECT u.*, pi.alt FROM product_images pi JOIN uploads u ON u.id = pi.upload_id
WHERE pi.product_id = $1 ORDER BY pi.position;

-- name: ClearProductImages :exec
DELETE FROM product_images WHERE product_id = $1;

-- name: SetProductImages :exec
INSERT INTO product_images (product_id, upload_id, position)
SELECT $1, u.id, u.ord - 1 FROM unnest(sqlc.arg(upload_ids)::uuid[]) WITH ORDINALITY AS u(id, ord);

-- name: AdjustStock :one
UPDATE variants SET stock = stock + sqlc.arg(delta)
WHERE id = sqlc.arg(id) AND stock + sqlc.arg(delta) >= 0
RETURNING *;

-- name: VariantExists :one
SELECT EXISTS (SELECT 1 FROM variants WHERE id = $1);

-- name: InsertStockMovement :exec
INSERT INTO stock_movements (variant_id, delta, reason, note, actor_user_id, actor_api_key_id)
VALUES ($1, $2, $3, $4, $5, $6);
