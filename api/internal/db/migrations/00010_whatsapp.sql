-- +goose Up
-- A Bangladeshi mobile number, 01XXXXXXXXX; product pages offer "Order on WhatsApp" when set.
ALTER TABLE store_settings ADD COLUMN whatsapp text CHECK (whatsapp ~ '^01[3-9][0-9]{8}$');

-- +goose Down
ALTER TABLE store_settings DROP COLUMN whatsapp;
