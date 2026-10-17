-- +goose Up
CREATE TYPE user_role AS ENUM ('customer', 'staff', 'admin');

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role          user_role NOT NULL DEFAULT 'customer',
    name          text NOT NULL CHECK (name <> ''),
    email         text CHECK (email = lower(email)),
    phone         text CHECK (phone ~ '^\+8801[3-9][0-9]{8}$'),
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    disabled_at   timestamptz,
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE UNIQUE INDEX users_email ON users (email);
CREATE UNIQUE INDEX users_phone ON users (phone);

-- Tokens are random 256-bit values; only their SHA-256 is stored.
CREATE TABLE sessions (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    access_hash           bytea NOT NULL UNIQUE,
    access_expires_at     timestamptz NOT NULL,
    refresh_hash          bytea NOT NULL UNIQUE,
    -- The refresh token this one replaced. Seeing it again means it was stolen.
    previous_refresh_hash bytea UNIQUE,
    refresh_expires_at    timestamptz NOT NULL,
    created_at            timestamptz NOT NULL DEFAULT now(),
    revoked_at            timestamptz
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE api_keys (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL CHECK (name <> ''),
    key_hash   bytea NOT NULL UNIQUE,
    hint       text NOT NULL,
    scopes     text[] NOT NULL CHECK (cardinality(scopes) > 0),
    created_by uuid NOT NULL REFERENCES users,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz
);

CREATE TABLE audit_log (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id    uuid REFERENCES users ON DELETE SET NULL,
    actor_api_key_id uuid REFERENCES api_keys,
    action           text NOT NULL,
    entity           text NOT NULL,
    entity_id        text,
    before           jsonb,
    after            jsonb,
    ip               inet,
    created_at       timestamptz NOT NULL DEFAULT now()
);

-- +goose StatementBegin
CREATE FUNCTION audit_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    -- Erasing a user nulls their id on old entries; nothing else may change history.
    IF TG_OP = 'UPDATE' AND NEW.actor_user_id IS NULL AND OLD.actor_user_id IS NOT NULL
        AND (NEW.action, NEW.entity, NEW.entity_id, NEW.before, NEW.after, NEW.created_at)
            IS NOT DISTINCT FROM (OLD.action, OLD.entity, OLD.entity_id, OLD.before, OLD.after, OLD.created_at) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'audit_log is append-only';
END $$;
-- +goose StatementEnd
CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

-- +goose Down
DROP TABLE audit_log;
DROP FUNCTION audit_log_append_only;
DROP TABLE api_keys;
DROP TABLE sessions;
DROP TABLE users;
DROP TYPE user_role;
