-- Migration 007: ebook download UUIDs
-- Stable customer-facing access handles for post-payment download pages.
-- The UUID is not a Supabase Storage path; it resolves through the backend,
-- which still checks entitlement state and returns only a short-lived signed URL.

alter table ebook_entitlements
  add column if not exists download_uuid uuid;

update ebook_entitlements
set download_uuid = gen_random_uuid()
where download_uuid is null;

alter table ebook_entitlements
  alter column download_uuid set default gen_random_uuid(),
  alter column download_uuid set not null;

create unique index if not exists ebook_entitlements_download_uuid_idx
  on ebook_entitlements(download_uuid);

update products
set description = 'Secure PDF edition, unlocked instantly after confirmed payment.'
where code = 'PURPOSEFUL_LIVING_EBOOK'
  and description = 'Secure PDF edition, delivered by email after payment.';
