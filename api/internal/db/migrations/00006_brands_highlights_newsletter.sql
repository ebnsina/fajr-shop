-- +goose Up
ALTER TABLE products ADD COLUMN brand text CHECK (brand <> '');
CREATE INDEX products_brand ON products (brand) WHERE brand IS NOT NULL;

ALTER TABLE store_settings ADD COLUMN highlights jsonb NOT NULL DEFAULT '[]';

-- Signed up through the shop's newsletter form. Only the address is kept.
CREATE TABLE newsletter_subscribers (
    email      text PRIMARY KEY CHECK (email = lower(email)),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE newsletter_subscribers;
ALTER TABLE store_settings DROP COLUMN highlights;
DROP INDEX products_brand;
ALTER TABLE products DROP COLUMN brand;
