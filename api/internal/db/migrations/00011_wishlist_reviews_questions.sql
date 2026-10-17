-- +goose Up
-- Who is asking, as the API sets it at the start of each scoped transaction. Row-level security
-- reads these; FORCE makes it apply to the table owner (the API's own role) too.
-- +goose StatementBegin
CREATE FUNCTION app_user() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;
CREATE FUNCTION app_moderator() RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT coalesce(current_setting('app.moderator', true), '') = 'on'
$$;
-- +goose StatementEnd

CREATE TABLE wishlist_items (
    user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products ON DELETE CASCADE,
    added_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY own ON wishlist_items USING (user_id = app_user()) WITH CHECK (user_id = app_user());

CREATE TABLE reviews (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES products ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body       text NOT NULL DEFAULT '' CHECK (length(body) <= 2000),
    hidden     boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, user_id)
);
CREATE INDEX reviews_product ON reviews (product_id, created_at DESC, id DESC) WHERE NOT hidden;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY read ON reviews FOR SELECT USING (NOT hidden OR user_id = app_user() OR app_moderator());
CREATE POLICY write ON reviews FOR INSERT WITH CHECK (user_id = app_user() AND NOT hidden);
CREATE POLICY edit ON reviews FOR UPDATE USING (user_id = app_user() OR app_moderator());
CREATE POLICY remove ON reviews FOR DELETE USING (user_id = app_user() OR app_moderator());

CREATE TABLE questions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  uuid NOT NULL REFERENCES products ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    body        text NOT NULL CHECK (body <> '' AND length(body) <= 500),
    answer      text CHECK (answer <> '' AND length(answer) <= 2000),
    answered_at timestamptz,
    hidden      boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_product ON questions (product_id, created_at DESC);
CREATE INDEX questions_waiting ON questions (created_at) WHERE answer IS NULL AND NOT hidden;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY read ON questions FOR SELECT
    USING ((answer IS NOT NULL AND NOT hidden) OR user_id = app_user() OR app_moderator());
CREATE POLICY ask ON questions FOR INSERT WITH CHECK (user_id = app_user() AND answer IS NULL AND NOT hidden);
CREATE POLICY answer ON questions FOR UPDATE USING (app_moderator());
CREATE POLICY remove ON questions FOR DELETE USING (user_id = app_user() OR app_moderator());

-- A customer edits their review's words and stars; only the shop hides or shows it.
-- +goose StatementBegin
CREATE FUNCTION reviews_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.hidden IS DISTINCT FROM OLD.hidden AND NOT app_moderator() THEN
        RAISE EXCEPTION 'only the shop can hide or show a review' USING ERRCODE = '42501';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END $$;
-- +goose StatementEnd
CREATE TRIGGER reviews_guard BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION reviews_guard();

-- Each product keeps its visible reviews' count and star total, so lists show ratings cheaply.
ALTER TABLE products
    ADD COLUMN rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    ADD COLUMN rating_total integer NOT NULL DEFAULT 0 CHECK (rating_total >= 0);
-- +goose StatementBegin
CREATE FUNCTION reviews_tally() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    pid uuid := coalesce(NEW.product_id, OLD.product_id);
BEGIN
    -- Visible reviews are readable by everyone, so this counts the same whoever triggered it.
    UPDATE products SET
        rating_count = (SELECT count(*) FROM reviews WHERE product_id = pid AND NOT hidden),
        rating_total = (SELECT coalesce(sum(rating), 0) FROM reviews WHERE product_id = pid AND NOT hidden)
    WHERE id = pid;
    RETURN NULL;
END $$;
-- +goose StatementEnd
CREATE TRIGGER reviews_tally AFTER INSERT OR UPDATE OR DELETE ON reviews FOR EACH ROW EXECUTE FUNCTION reviews_tally();

-- +goose Down
DROP TABLE questions;
DROP TABLE reviews;
DROP TABLE wishlist_items;
DROP FUNCTION reviews_tally, reviews_guard, app_user, app_moderator;
ALTER TABLE products DROP COLUMN rating_count, DROP COLUMN rating_total;
