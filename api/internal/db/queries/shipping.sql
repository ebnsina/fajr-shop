-- name: ListShippingZones :many
SELECT * FROM shipping_zones WHERE active OR sqlc.arg(include_inactive)::bool
ORDER BY position, name LIMIT 100;

-- name: ShippingZoneByID :one
SELECT * FROM shipping_zones WHERE id = $1;

-- name: ZoneForDistrict :one
SELECT * FROM shipping_zones WHERE active AND $1::text = ANY(districts) LIMIT 1;

-- name: LockShippingZones :exec
-- Saving zones one at a time keeps two saves from both claiming the same district.
LOCK TABLE shipping_zones IN SHARE ROW EXCLUSIVE MODE;

-- name: DistrictsTakenElsewhere :many
SELECT d::text AS district, z.name
FROM shipping_zones z, unnest(z.districts) AS d
WHERE z.active AND z.id <> sqlc.arg(id) AND d = ANY(sqlc.arg(districts)::text[]);

-- name: CreateShippingZone :one
INSERT INTO shipping_zones (name, districts, base_charge, base_weight_g, extra_per_kg, free_over, delivery_days, position, active)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: UpdateShippingZone :one
UPDATE shipping_zones SET name = $2, districts = $3, base_charge = $4, base_weight_g = $5, extra_per_kg = $6,
    free_over = $7, delivery_days = $8, position = $9, active = $10
WHERE id = $1
RETURNING *;

-- name: DeleteShippingZone :one
DELETE FROM shipping_zones WHERE id = $1 RETURNING *;

-- name: CartWeight :one
SELECT COALESCE(sum(v.weight_g * ci.quantity), 0)::int AS weight_g
FROM cart_items ci JOIN variants v ON v.id = ci.variant_id JOIN products p ON p.id = v.product_id
WHERE ci.cart_id = $1 AND p.status = 'active' AND v.stock >= ci.quantity;
