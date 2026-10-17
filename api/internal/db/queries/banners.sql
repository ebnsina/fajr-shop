-- name: ListActiveBanners :many
SELECT b.*, u.key AS image_key, u.width AS image_width, u.height AS image_height
FROM banners b JOIN uploads u ON u.id = b.upload_id
WHERE b.active
ORDER BY b.placement, b.position, b.created_at
LIMIT 100;

-- name: ListAllBanners :many
SELECT b.*, u.key AS image_key, u.width AS image_width, u.height AS image_height
FROM banners b JOIN uploads u ON u.id = b.upload_id
ORDER BY b.placement, b.position, b.created_at
LIMIT 100;

-- name: BannerByID :one
SELECT b.*, u.key AS image_key, u.width AS image_width, u.height AS image_height
FROM banners b JOIN uploads u ON u.id = b.upload_id
WHERE b.id = $1;

-- name: CreateBanner :one
INSERT INTO banners (placement, upload_id, link, alt, position, active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;

-- name: UpdateBanner :one
UPDATE banners SET placement = $2, upload_id = $3, link = $4, alt = $5, position = $6, active = $7
WHERE id = $1 RETURNING id;

-- name: DeleteBanner :one
DELETE FROM banners WHERE id = $1 RETURNING id;
