-- +goose Up
ALTER TABLE categories ADD COLUMN image_id uuid REFERENCES uploads ON DELETE SET NULL;

ALTER TABLE products ADD COLUMN featured boolean NOT NULL DEFAULT false;
CREATE INDEX products_featured ON products (status, created_at DESC, id DESC) WHERE featured;

CREATE TYPE banner_placement AS ENUM ('hero', 'side', 'wide');

CREATE TABLE banners (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    placement  banner_placement NOT NULL,
    upload_id  uuid NOT NULL REFERENCES uploads ON DELETE RESTRICT,
    link       text CHECK (link ~ '^(/|https://)'),
    alt        text NOT NULL CHECK (alt <> ''),
    position   integer NOT NULL DEFAULT 0 CHECK (position >= 0),
    active     boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX banners_order ON banners (placement, position, created_at);

-- +goose Down
DROP TABLE banners;
DROP TYPE banner_placement;
DROP INDEX products_featured;
ALTER TABLE products DROP COLUMN featured;
ALTER TABLE categories DROP COLUMN image_id;
