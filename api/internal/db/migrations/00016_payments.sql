-- +goose Up
-- Paying online: the order is placed unpaid, then paid through the shop's payment gateway.
ALTER TABLE orders DROP CONSTRAINT orders_payment_method_check,
    ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod', 'online')),
    ADD COLUMN paid_at timestamptz;

-- Each try at paying an order; tran_id is ours, sent to the gateway and echoed back by it.
CREATE TABLE payments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
    provider    text NOT NULL,
    tran_id     text NOT NULL UNIQUE,
    amount      bigint NOT NULL CHECK (amount > 0),
    status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    gateway_ref text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order ON payments (order_id);

-- Payments follow their order: whoever may see the order may start paying it.
ALTER TABLE payments ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY follow ON payments USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id))
    WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id));

-- +goose Down
DROP TABLE payments;
ALTER TABLE orders DROP COLUMN paid_at, DROP CONSTRAINT orders_payment_method_check,
    ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod'));
