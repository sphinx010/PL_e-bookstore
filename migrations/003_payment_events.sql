-- Migration 003: payment_events
-- Raw log of every webhook/callback received from any payment gateway.
-- Processing is idempotent: duplicate gateway_event_id is rejected at DB level.

create table payment_events (
  id                 uuid primary key default gen_random_uuid(),
  gateway            text not null,
  event_type         text not null,
  gateway_event_id   text not null,
  order_reference    text,
  payload            jsonb not null,
  signature_valid    boolean not null default false,
  processed          boolean not null default false,
  processing_error   text,
  created_at         timestamptz not null default now(),
  processed_at       timestamptz,

  -- Prevent duplicate processing of the same gateway event
  unique (gateway, gateway_event_id)
);

create index payment_events_order_ref_idx on payment_events(order_reference) where order_reference is not null;
create index payment_events_processed_idx on payment_events(processed) where processed = false;

alter table payment_events enable row level security;
