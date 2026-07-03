-- Migration 004: ebook_entitlements
-- One entitlement row per paid ebook order.
-- Raw download token is NEVER stored — only its SHA-256 hash.

create table ebook_entitlements (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null unique references orders(id),
  customer_email       text not null,
  storage_path         text not null,
  download_token_hash  text not null unique,
  expires_at           timestamptz not null,
  maximum_downloads    integer not null default 5 check (maximum_downloads > 0),
  download_count       integer not null default 0 check (download_count >= 0),
  revoked_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index ebook_entitlements_email_idx on ebook_entitlements(customer_email);
create index ebook_entitlements_token_idx on ebook_entitlements(download_token_hash);

create trigger ebook_entitlements_updated_at
  before update on ebook_entitlements
  for each row execute function set_updated_at();

alter table ebook_entitlements enable row level security;
