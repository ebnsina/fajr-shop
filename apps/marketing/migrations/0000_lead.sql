create table if not exists lead (
	id text primary key,
	kind text not null,
	demo text,
	name text not null,
	phone text not null,
	shop text,
	orders_band text,
	selling text,
	message text,
	touches integer not null default 1,
	first_seen_at timestamptz not null default now(),
	last_seen_at timestamptz not null default now()
);

-- One row per person per channel: a repeat submission bumps touches instead of
-- inserting a duplicate, which is what makes the write idempotent.
create unique index if not exists lead_phone_kind_key on lead (phone, kind);
create index if not exists lead_last_seen_idx on lead (last_seen_at desc);
