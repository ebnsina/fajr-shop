-- +goose Up
-- The newsletter sign-up was taken out of the shop.
DROP TABLE newsletter_subscribers;

-- +goose Down
CREATE TABLE newsletter_subscribers (
    email      text PRIMARY KEY CHECK (email = lower(email)),
    created_at timestamptz NOT NULL DEFAULT now()
);
