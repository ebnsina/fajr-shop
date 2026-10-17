-- +goose Up
-- An order's parcel with a courier. The row is written before the courier is called, so a second
-- click can't book the same order twice; courier_status 'booking' means that call is under way.
CREATE TABLE shipments (
    order_id       uuid PRIMARY KEY REFERENCES orders ON DELETE CASCADE,
    provider       text NOT NULL,
    consignment_id text,
    tracking_code  text,
    courier_status text NOT NULL DEFAULT 'booking',
    cod_amount     bigint NOT NULL CHECK (cod_amount >= 0),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Seen wherever its order is; written only by staff who handle orders.
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY read ON shipments FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id));
CREATE POLICY handle ON shipments USING (app_orders()) WITH CHECK (app_orders());

-- +goose Down
DROP TABLE shipments;
