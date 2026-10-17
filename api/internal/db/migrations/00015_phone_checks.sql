-- +goose Up
-- A courier's record of one phone number's past parcels, kept a day so opening an order doesn't
-- sign in to every courier's merchant panel again. Read and written only by staff who handle orders.
CREATE TABLE phone_checks (
    phone      text NOT NULL CHECK (phone ~ '^01[3-9][0-9]{8}$'),
    provider   text NOT NULL,
    delivered  integer NOT NULL CHECK (delivered >= 0),
    cancelled  integer NOT NULL CHECK (cancelled >= 0),
    checked_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (phone, provider)
);
ALTER TABLE phone_checks ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY handle ON phone_checks USING (app_orders()) WITH CHECK (app_orders());

-- +goose Down
DROP TABLE phone_checks;
