-- +goose Up
-- A cart belongs to a customer, or to whoever holds its token (a guest). Never both.
CREATE TABLE carts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid UNIQUE REFERENCES users ON DELETE CASCADE,
    token_hash bytea UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((user_id IS NULL) <> (token_hash IS NULL))
);
CREATE INDEX carts_stale ON carts (updated_at) WHERE user_id IS NULL;

CREATE TABLE cart_items (
    cart_id    uuid NOT NULL REFERENCES carts ON DELETE CASCADE,
    variant_id uuid NOT NULL REFERENCES variants ON DELETE CASCADE,
    quantity   integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
    added_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (cart_id, variant_id)
);

-- +goose Down
DROP TABLE cart_items;
DROP TABLE carts;
