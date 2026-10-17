-- name: GetStoreSettings :one
SELECT * FROM store_settings WHERE id = 1;

-- name: UpdateStoreSettings :one
UPDATE store_settings SET
    name = $1, logo_url = $2, accent_color = $3, currency = $4, contact_phone = $5,
    contact_email = $6, vat_enabled = $7, vat_rate_bp = $8, prices_include_vat = $9,
    vat_bin = $10, updated_at = now()
WHERE id = 1
RETURNING *;
