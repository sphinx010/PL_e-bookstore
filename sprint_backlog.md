# Sprint Backlog

This document outlines the implementation plan and the current completion status of all backend sprint tickets.

---

### BE-001: Repository and architecture audit
* **Objective**: Understand existing repository layout, static files, and compile patterns.
* **Scope**: Audit files, determine if Vercel serverless functions are appropriate, check dependencies and bundlers.
* **Status**: **COMPLETED**
* **Notes**: Audited. We confirmed that using Vercel Serverless functions under `/api/` in combination with TypeScript is fully supported and matches the project structure. No Next.js migration is needed.

---

### BE-002: Environment and configuration layer
* **Objective**: Establish central config layer with startup validation.
* **Scope**: Implement `lib/config.ts` to load and validate environment variables at startup. Include Supabase, Monnify, Resend, e-book bucket, and sales mode.
* **Status**: **COMPLETED**
* **Notes**: Implemented. The config layer checks for required keys and throws early if any are missing. Added `SUPABASE_ANON_KEY` to configuration for dynamic client-side authorization.

---

### BE-003: Supabase schema and migrations
* **Objective**: Design and implement database schema.
* **Scope**: Create SQL migration scripts for tables: `products`, `orders`, `payment_events`, `ebook_entitlements`, `fulfilment_events`, `waitlist_entries`.
* **Status**: **COMPLETED**
* **Notes**: Implemented under `migrations/`. Added RLS, unique constraints, foreign keys, and indexes. Seeded provisional product and pricing data.

---

### BE-004: Product catalogue API
* **Objective**: Expose server-authoritative products and prices.
* **Scope**: Implement `GET /api/products` and DB query layer. Integrate `PHYSICAL_SALES_MODE` env override.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `api/products.ts` and `lib/db/queries/products.ts`. Returns cached results and applies sales mode logic.

---

### BE-005: Order creation API
* **Objective**: Accept, validate, and store new orders.
* **Scope**: Implement `POST /api/orders`. Validate input with Zod. Resolve authoritative price. Prevent physical order placement if mode is not `AVAILABLE`. Require address only for physical copies.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `api/orders.ts` and `lib/orders/create.ts`. Uses atomic references and returns collision-resistant transaction references (`PL-YYYYMMDD-XXXX`).

---

### BE-006: Monnify payment initialisation API
* **Objective**: Initialise payment checkout session on Monnify.
* **Scope**: Implement `POST /api/payments/monnify/initialize`. Load order, verify status, request transaction checkout URL from Monnify sandbox/production API, update order with gateway reference.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `api/payments/monnify/initialize.ts` and `lib/payments/monnify.ts`.

---

### BE-007: Monnify webhook validation and parsing
* **Objective**: Securely receive and parse Monnify webhooks.
* **Scope**: Implement signature verification using Monnify request hash. Save all webhook event payloads to `payment_events` table.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `api/webhooks/monnify.ts` and `lib/payments/monnify.ts`.

---

### BE-008: Payment reconciliation and idempotency
* **Objective**: Safely process payment confirmation exactly once.
* **Scope**: Match webhook events to orders, verify paid amounts, mark orders as `PAID`, record fulfilment logs, handle duplicate webhooks idempotently.
* **Status**: **COMPLETED**
* **Notes**: Implemented. Webhook processes events, verifies kobo amounts match exactly, and skips already-processed transactions.

---

### BE-009: E-book entitlement and secure download
* **Objective**: Issue and serve the private e-book securely.
* **Scope**: Generate random tokens upon payment, save hashes, send expiring links. Implement `GET /api/ebooks/download/[token]`. Validate limits/expiry, redirect to signed Supabase Storage URLs.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `api/ebooks/download/[token].ts` and `lib/ebooks/entitlement.ts`. Permanent file paths are never exposed to the client.

---

### BE-010: Transactional email Integration
* **Objective**: Connect Resend email delivery.
* **Scope**: Create email HTML templates matching brand design (Ivory, Navy, Gold). Implement client delivery for Order Received, Payment Confirmed, Waitlist, and Admin Alert.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `lib/email/client.ts` and templates under `lib/email/templates/`.

---

### BE-011: Waitlist API
* **Objective**: Store waitlist entries when sales are inactive.
* **Scope**: Implement `POST /api/waitlist`. Validate fields, prevent duplicate email/product code combinations, and send confirmation emails.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `api/waitlist.ts` and query layer in `lib/db/queries/waitlist.ts`.

---

### BE-012: Admin authentication and security
* **Objective**: Secure administrative APIs and views.
* **Scope**: Create `requireAdminAuth` middleware. Validate Supabase JWTs, verify user emails against whitelist in `ADMIN_EMAIL`.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `lib/api-handler.ts`. Any API query to admin endpoints enforces Bearer tokens.

---

### BE-013: Administrative order management
* **Objective**: Provide operations endpoints for admins.
* **Scope**: Implement `GET /api/admin/orders` (filtering, search, pagination), `GET /api/admin/[reference]` (detail, history), and `PATCH /api/admin/[reference]` (status transitions and notes).
* **Status**: **COMPLETED**
* **Notes**: Implemented. Added status transition validation rules to prevent illegal jumps (e.g. from AWAITING_PAYMENT directly to DELIVERED).

---

### BE-014: Frontend integration
* **Objective**: Connect HTML buttons and forms to APIs.
* **Scope**: Connect `Get Your Copy`, `Order Signed Copy`, `Join the Waitlist`, and `Buy E-book` in the UI to the backend. Update `admin/index.html` to pull config dynamically and communicate with endpoints.
* **Status**: **COMPLETED**
* **Notes**: Main site `script.js` and order form are connected. Updated `admin/index.html` with dynamic config pulling `/api/config` to support zero-build deployments.

---

### BE-015: Automated test suite
* **Objective**: Verify backend behaviors under unit and integration tests.
* **Scope**: Write tests in Vitest covering orders, payments, webhooks, entitlements, admin auth, waitlists.
* **Status**: **COMPLETED**
* **Notes**: All 27 tests in `tests/` pass successfully. No network requests are made.

---

### BE-016: Logging, rate limiting and hardening
* **Objective**: Protect endpoints and record operational trails.
* **Scope**: Implement rate limiting for orders, downloads, waitlist submissions. Set secure headers on API routes. Redact customer email in logs.
* **Status**: **COMPLETED**
* **Notes**: Implemented in `lib/api-handler.ts` and `lib/logger.ts`.

---

### BE-017: Deployment and testing documentation
* **Objective**: Guide project setup and go-live operations.
* **Scope**: Document Supabase setup, migrations, private storage, Resend, Monnify credentials, verifications, and sandbox testing.
* **Status**: **COMPLETED**
* **Notes**: Created `deployment_documentation.md` in the workspace root.
