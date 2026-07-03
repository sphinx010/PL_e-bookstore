-- Migration 001: products
-- Server-authoritative product catalogue.
-- Prices are stored in kobo (smallest NGN unit) to avoid floating-point errors.

create type product_format as enum ('PHYSICAL', 'EBOOK');
create type sales_mode as enum ('AVAILABLE', 'WAITLIST', 'SOLD_OUT');

create table products (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  format       product_format not null,
  description  text not null default '',
  price_kobo   integer not null check (price_kobo >= 0),
  currency     text not null default 'NGN',
  sales_mode   sales_mode not null default 'AVAILABLE',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- RLS: public can read active products; only service role can write
alter table products enable row level security;

create policy "Active products are publicly readable"
  on products for select
  using (is_active = true);

-- PROVISIONAL seed data — update prices before going live
-- price_kobo: 1000000 = ₦10,000 | 500000 = ₦5,000
insert into products (code, name, format, description, price_kobo, sales_mode) values
  (
    'PURPOSEFUL_LIVING_SIGNED',
    'Purposeful Living — Signed Physical Copy',
    'PHYSICAL',
    'Hardcover edition, personally signed by the author with custom inscription and premium bookmark.',
    1000000,
    'WAITLIST'  -- PROVISIONAL: change to AVAILABLE when ready to take orders
  ),
  (
    'PURPOSEFUL_LIVING_EBOOK',
    'Purposeful Living — E-book',
    'EBOOK',
    'Secure PDF edition, delivered by email after payment.',
    500000,
    'AVAILABLE'
  );
