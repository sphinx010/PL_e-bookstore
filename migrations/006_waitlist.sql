-- Migration 006: waitlist_entries

create table waitlist_entries (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  phone        text not null default '',
  product_code text not null,
  source       text not null default 'website',
  created_at   timestamptz not null default now(),

  -- Prevent obvious duplicate submissions per product
  unique (email, product_code)
);

create index waitlist_entries_product_idx on waitlist_entries(product_code);
create index waitlist_entries_email_idx on waitlist_entries(email);

alter table waitlist_entries enable row level security;
