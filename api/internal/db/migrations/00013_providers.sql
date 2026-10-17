-- +goose Up
-- The shop's own accounts with couriers, payment gateways and SMS gateways. Which providers exist,
-- and what each asks for, lives in code (internal/provider); a row appears once one is set up.
CREATE TABLE providers (
    code       text PRIMARY KEY,
    enabled    boolean NOT NULL DEFAULT false,
    live       boolean NOT NULL DEFAULT false,
    -- Fields that aren't secret, like a store id, readable as they are.
    settings   jsonb NOT NULL DEFAULT '{}',
    -- Keys and passwords as one JSON object, sealed with FAJR_SECRET_KEY.
    secrets    bytea,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE providers;
