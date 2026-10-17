-- +goose Up
-- Who may see an order besides its customer: whoever holds its link (app.order_token, hex), and
-- staff who handle orders (app.orders). The API sets both per request, as it does app.user_id.
-- +goose StatementBegin
CREATE FUNCTION app_order_token() RETURNS bytea LANGUAGE sql STABLE AS $$
    SELECT decode(nullif(current_setting('app.order_token', true), ''), 'hex')
$$;
CREATE FUNCTION app_orders() RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT coalesce(current_setting('app.orders', true), '') = 'on'
$$;
-- +goose StatementEnd

CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled');
CREATE SEQUENCE order_numbers START 10001;

-- Everything a shopper saw when they ordered is copied here, so later edits never change an order.
CREATE TABLE orders (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    number          bigint NOT NULL UNIQUE DEFAULT nextval('order_numbers'),
    user_id         uuid REFERENCES users ON DELETE SET NULL,
    token_hash      bytea NOT NULL UNIQUE,
    status          order_status NOT NULL DEFAULT 'pending',
    payment_method  text NOT NULL CHECK (payment_method IN ('cod')),
    customer_name   text NOT NULL CHECK (customer_name <> ''),
    phone           text NOT NULL CHECK (phone ~ '^\+8801[3-9][0-9]{8}$'),
    email           text CHECK (email = lower(email)),
    district        text NOT NULL,
    area            text NOT NULL CHECK (area <> ''),
    address         text NOT NULL CHECK (address <> ''),
    note            text,
    subtotal        bigint NOT NULL CHECK (subtotal >= 0),
    discount_code   text,
    discount_total  bigint NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    zone_name       text NOT NULL,
    delivery_days   text NOT NULL,
    delivery_charge bigint NOT NULL CHECK (delivery_charge >= 0),
    vat_rate_bp     integer NOT NULL DEFAULT 0,
    vat_included    boolean NOT NULL DEFAULT true,
    vat_total       bigint NOT NULL DEFAULT 0 CHECK (vat_total >= 0),
    total           bigint NOT NULL CHECK (total >= 0),
    currency        text NOT NULL DEFAULT 'BDT',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user ON orders (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX orders_status ON orders (status, created_at DESC);

CREATE TABLE order_items (
    order_id   uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
    position   integer NOT NULL,
    variant_id uuid REFERENCES variants ON DELETE SET NULL,
    product_id uuid REFERENCES products ON DELETE SET NULL,
    slug       text NOT NULL,
    name       text NOT NULL,
    options    jsonb NOT NULL DEFAULT '{}',
    sku        text,
    unit_price bigint NOT NULL CHECK (unit_price >= 0),
    quantity   integer NOT NULL CHECK (quantity > 0),
    line_total bigint NOT NULL CHECK (line_total >= 0),
    PRIMARY KEY (order_id, position)
);

-- Each change of status, with who made it: the order's timeline.
CREATE TABLE order_events (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id      uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
    status        order_status NOT NULL,
    note          text,
    actor_user_id uuid REFERENCES users ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order ON order_events (order_id, id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY read ON orders FOR SELECT
    USING (user_id = app_user() OR token_hash = app_order_token() OR app_orders());
-- Placing an order: as the signed-in customer, or as a guest holding the new order's link.
CREATE POLICY place ON orders FOR INSERT
    WITH CHECK (user_id IS NOT DISTINCT FROM app_user() AND token_hash = app_order_token());
CREATE POLICY handle ON orders FOR UPDATE USING (app_orders());

-- Lines and events follow their order: visible where the order is.
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY follow ON order_items USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id));
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY read ON order_events FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id));
CREATE POLICY add ON order_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id));

-- Stock leaves when an order is placed and comes back when it is cancelled.
ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_reason_check,
    ADD CONSTRAINT stock_movements_reason_check
        CHECK (reason IN ('initial', 'received', 'damaged', 'lost', 'returned', 'correction', 'sold', 'cancelled')),
    ADD COLUMN order_id uuid REFERENCES orders ON DELETE SET NULL;

-- +goose Down
ALTER TABLE stock_movements DROP COLUMN order_id, DROP CONSTRAINT stock_movements_reason_check,
    ADD CONSTRAINT stock_movements_reason_check
        CHECK (reason IN ('initial', 'received', 'damaged', 'lost', 'returned', 'correction'));
DROP TABLE order_events;
DROP TABLE order_items;
DROP TABLE orders;
DROP SEQUENCE order_numbers;
DROP TYPE order_status;
DROP FUNCTION app_order_token, app_orders;
