-- +goose Up
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE categories (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id  uuid REFERENCES categories ON DELETE RESTRICT,
    name       text NOT NULL CHECK (name <> ''),
    slug       text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    position   integer NOT NULL DEFAULT 0 CHECK (position >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (parent_id <> id)
);
CREATE INDEX categories_parent ON categories (parent_id);

-- Uploaded files. A product's images point here; unreferenced rows are uploads never used.
CREATE TABLE uploads (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key          text NOT NULL UNIQUE,
    content_type text NOT NULL,
    width        integer NOT NULL,
    height       integer NOT NULL,
    bytes        integer NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');

CREATE TABLE products (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    name        text NOT NULL CHECK (name <> ''),
    description text NOT NULL DEFAULT '',
    status      product_status NOT NULL DEFAULT 'draft',
    category_id uuid REFERENCES categories ON DELETE RESTRICT,
    -- [{"name": "Size", "values": ["S", "M"]}]; each variant picks one value per option.
    options     jsonb NOT NULL DEFAULT '[]',
    -- Kept equal to the cheapest and dearest variant on every save, so lists sort by an index.
    price_min   bigint NOT NULL DEFAULT 0,
    price_max   bigint NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_newest ON products (status, created_at DESC, id DESC);
CREATE INDEX products_price_min ON products (status, price_min, id);
CREATE INDEX products_price_max ON products (status, price_max DESC, id DESC);
CREATE INDEX products_name ON products (status, name, id);
CREATE INDEX products_category ON products (category_id);
-- The list query must use this exact expression for the index to apply.
CREATE INDEX products_search ON products USING gin (
    (setweight(to_tsvector('simple', name), 'A') || setweight(to_tsvector('simple', description), 'B'))
);
CREATE INDEX products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE TABLE variants (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id       uuid NOT NULL REFERENCES products ON DELETE CASCADE,
    sku              text UNIQUE,
    price            bigint NOT NULL CHECK (price >= 0),
    compare_at_price bigint CHECK (compare_at_price > price),
    stock            integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    -- {"Size": "M", "Color": "Red"}
    options          jsonb NOT NULL DEFAULT '{}',
    position         integer NOT NULL DEFAULT 0,
    -- Checked at commit, so one save can swap two variants' options.
    CONSTRAINT variants_product_options UNIQUE (product_id, options) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX variants_product ON variants (product_id, position);
CREATE INDEX variants_options ON variants USING gin (options jsonb_path_ops);

CREATE TABLE product_images (
    product_id uuid NOT NULL REFERENCES products ON DELETE CASCADE,
    upload_id  uuid NOT NULL REFERENCES uploads ON DELETE RESTRICT,
    position   integer NOT NULL,
    alt        text NOT NULL DEFAULT '',
    PRIMARY KEY (product_id, upload_id)
);
CREATE INDEX product_images_order ON product_images (product_id, position);

-- Every change to stock, so a count can always be explained.
CREATE TABLE stock_movements (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    variant_id       uuid NOT NULL REFERENCES variants ON DELETE CASCADE,
    delta            integer NOT NULL CHECK (delta <> 0),
    reason           text NOT NULL CHECK (reason IN ('initial', 'received', 'damaged', 'lost', 'returned', 'correction')),
    note             text,
    actor_user_id    uuid REFERENCES users ON DELETE SET NULL,
    actor_api_key_id uuid REFERENCES api_keys,
    created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_variant ON stock_movements (variant_id, id DESC);

-- +goose Down
DROP TABLE stock_movements;
DROP TABLE product_images;
DROP TABLE variants;
DROP TABLE products;
DROP TYPE product_status;
DROP TABLE uploads;
DROP TABLE categories;
