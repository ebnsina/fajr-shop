-- +goose Up
-- One row: the shop this install serves. Edited from admin, read by every client via GET /v1/store.
CREATE TABLE store_settings (
    id                 smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name               text NOT NULL CHECK (name <> ''),
    logo_url           text,
    accent_color       text CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'),
    currency           char(3) NOT NULL DEFAULT 'BDT',
    contact_phone      text,
    contact_email      text,
    vat_enabled        boolean NOT NULL DEFAULT false,
    vat_rate_bp        integer NOT NULL DEFAULT 0 CHECK (vat_rate_bp BETWEEN 0 AND 10000),
    prices_include_vat boolean NOT NULL DEFAULT true,
    vat_bin            text,
    updated_at         timestamptz NOT NULL DEFAULT now()
);

INSERT INTO store_settings (name) VALUES ('My shop');

-- +goose Down
DROP TABLE store_settings;
