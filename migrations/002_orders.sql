-- Migration 002: orders

create type payment_status as enum (
  'PENDING',
  'INITIALISED',
  'PAID',
  'FAILED',
  'REFUNDED',
  'CANCELLED'
);

create type fulfilment_status as enum (
  -- shared
  'NOT_APPLICABLE',
  'AWAITING_PAYMENT',
  -- physical only
  'AWAITING_INSCRIPTION',
  'SIGNED',
  'PACKAGED',
  'DISPATCHED',
  'DELIVERED',
  -- ebook only
  'ACCESS_PENDING',
  'ACCESS_ISSUED',
  'ACCESS_REVOKED',
  -- shared terminal
  'CANCELLED'
);

create table orders (
  id                  uuid primary key default gen_random_uuid(),
  order_reference     text not null unique,
  customer_name       text not null,
  email               text not null,
  phone               text not null,
  product_id          uuid not null references products(id),
  quantity            integer not null default 1 check (quantity > 0),
  unit_price_kobo     integer not null check (unit_price_kobo >= 0),
  subtotal_kobo       integer not null check (subtotal_kobo >= 0),
  delivery_fee_kobo   integer not null default 0 check (delivery_fee_kobo >= 0),
  total_amount_kobo   integer not null check (total_amount_kobo >= 0),
  currency            text not null default 'NGN',
  payment_status      payment_status not null default 'PENDING',
  fulfilment_status   fulfilment_status not null default 'AWAITING_PAYMENT',
  delivery_address    text,
  delivery_state      text,
  recipient_name      text,
  inscription_request text,
  gateway             text,
  gateway_reference   text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index orders_email_idx on orders(email);
create index orders_payment_status_idx on orders(payment_status);
create index orders_fulfilment_status_idx on orders(fulfilment_status);
create index orders_created_at_idx on orders(created_at desc);
create index orders_gateway_reference_idx on orders(gateway_reference) where gateway_reference is not null;

create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- RLS: no public read/write; all access through service role
alter table orders enable row level security;
