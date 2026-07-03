# Architecture Decision Record (ADR)

## Context
We are implementing the backend system for the book-launch website **Purposeful Living** by Pastor Samuel Victor Obembe. The frontend is a static HTML/CSS/JavaScript codebase. We need to integrate order management, secure e-book delivery, payment processing, and administrative controls without altering the established design.

## Decision
We choose the following architecture for simplicity, speed, security, and cost-efficiency:

1. **Backend Compute**: **Vercel Serverless Functions** written in TypeScript and placed under `/api`. This matches the deployment flow on Vercel, requires no dedicated running server instance, and handles auto-scaling out of the box.
2. **Database**: **Supabase PostgreSQL** for storing products, orders, payment events, e-book entitlements, and fulfilment logs. We leverage Supabase's managed Postgres instance, built-in connection pooling, and RESTful query capabilities where needed.
3. **Admin Authentication**: **Supabase Auth** is used to secure the administrative area. A static `admin/index.html` page connects directly to Supabase Auth to log in administrators, retrieve a JWT, and pass it in the `Authorization` header to protected serverless function endpoints.
4. **Payment Gateway**: **Monnify** is used as the primary Nigerian payment processor. Payments are initialized securely on the server side, checked against authoritative prices in the database, and confirmed via a cryptographically validated Monnify Webhook. The design uses a payment service abstraction layer (`PaymentGateway`) so that alternative providers (e.g. Paystack) can be integrated later without modifying the core business logic.
5. **E-Book Security**: The e-book is hosted in a **private Supabase Storage Bucket**. We never expose permanent public URLs. Instead:
   - When a payment is confirmed via webhook, we generate a cryptographically secure raw token.
   - We store the hash of this token in the database with an expiry (TTL) and download limit (max attempts).
   - The user receives an email containing a link to `/api/ebooks/download/[token]`.
   - When requested, the server validates the token hash, checks limits, and redirects the browser to a temporary signed Supabase Storage URL.
6. **Transactional Email**: **Resend** is used to dispatch transactional emails (Order Received, Payment Confirmed, Waitlist Confirmation). We wrap it in a clean adapter layer.
7. **Request Validation**: **Zod** is used on all endpoints to strictly validate input payloads, preventing invalid or malformed data from reaching database layers.
8. **Automated Testing**: **Vitest** is used for unit and integration testing. All external services (Supabase, Monnify, Resend) are mocked at the module level in tests, avoiding any network calls during automated test suite runs.

## Alternatives Considered
- **Next.js API Routes**: Rejected. While Next.js is powerful, migrating the static HTML/CSS/JS frontend to Next.js would require substantial rewriting of the frontend and could introduce client-side regressions. Vercel Serverless Functions under `/api` allow us to keep the static frontend completely untouched.
- **Express Backend on Heroku/AWS**: Rejected. Increases operational complexity, introduces server maintenance overhead, and is more expensive.

## Consequences
- The frontend remains light, fast, and simple.
- Security is tight: no payment amount is trusted from the client; all secrets remain on the server; and the private e-book is protected from unauthorized access.
- Deploying to Vercel requires zero complex setup: all serverless functions in the `/api` directory are automatically deployed.
- Safe, modular tests allow developer iteration without paying for live webhooks or emails.
