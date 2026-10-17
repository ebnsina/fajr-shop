-- +goose Up
ALTER TABLE variants ADD COLUMN weight_g integer NOT NULL DEFAULT 500 CHECK (weight_g >= 0);

-- Districts are checked against the fixed list in the shipping package, and a district may be
-- in only one active zone; both are enforced when a zone is saved.
CREATE TABLE shipping_zones (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL CHECK (name <> ''),
    districts     text[] NOT NULL CHECK (cardinality(districts) > 0),
    base_charge   bigint NOT NULL CHECK (base_charge >= 0),
    base_weight_g integer NOT NULL DEFAULT 1000 CHECK (base_weight_g >= 0),
    extra_per_kg  bigint NOT NULL DEFAULT 0 CHECK (extra_per_kg >= 0),
    free_over     bigint CHECK (free_over >= 0),
    delivery_days text NOT NULL CHECK (delivery_days <> ''),
    position      integer NOT NULL DEFAULT 0 CHECK (position >= 0),
    active        boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shipping_zones_districts ON shipping_zones USING gin (districts);

-- +goose Down
DROP TABLE shipping_zones;
ALTER TABLE variants DROP COLUMN weight_g;
