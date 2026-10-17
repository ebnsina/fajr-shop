-- +goose Up
-- Codes are stored in capitals so "eid10" and "EID10" are the same code.
CREATE TABLE discounts (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code         text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,30}$'),
    description  text,
    kind         text NOT NULL CHECK (kind IN ('percent', 'fixed')),
    value        bigint NOT NULL CHECK (value > 0 AND (kind <> 'percent' OR value <= 100)),
    max_discount bigint CHECK (max_discount > 0),
    min_subtotal bigint NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
    starts_at    timestamptz,
    ends_at      timestamptz CHECK (ends_at > starts_at),
    usage_limit  integer CHECK (usage_limit > 0),
    used_count   integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    active       boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE carts ADD COLUMN discount_id uuid REFERENCES discounts ON DELETE SET NULL;

-- +goose Down
ALTER TABLE carts DROP COLUMN discount_id;
DROP TABLE discounts;
