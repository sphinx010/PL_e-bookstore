-- Migration 005: fulfilment_events
-- Append-only audit log for every status change on an order.

create table fulfilment_events (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders(id),
  previous_status  fulfilment_status not null,
  new_status       fulfilment_status not null,
  note             text,
  created_by       text not null default 'system',
  created_at       timestamptz not null default now()
);

create index fulfilment_events_order_idx on fulfilment_events(order_id, created_at desc);

alter table fulfilment_events enable row level security;
