You are acting as the lead backend engineer for the **Purposeful Living** book-launch website.

Your task is to inspect the existing frontend repository, design the backend sprint, and implement a production-ready payment, order-management, fulfilment, and e-book delivery system.

Do not redesign the frontend or alter the established visual identity unless a backend integration requires a small UI change.

## Product context

The website sells two formats of the book **Purposeful Living** by Pastor Samuel Victor Obembe:

1. Signed physical copy
2. E-book

The physical copy may include:

* Author’s signature
* Personal inscription
* Premium bookmark
* Nationwide delivery

The e-book must be delivered securely after confirmed payment.

The website already has:

* Product buttons
* A signed-copy or waitlist flow
* Product and author sections
* Order forms or modal structures
* Responsive desktop and mobile layouts

Inspect the existing implementation before deciding how to connect the backend.

## Required technology stack

Use:

* Node.js
* TypeScript
* Vercel serverless functions or Next.js API routes, depending on the existing repository
* Supabase PostgreSQL
* Supabase Storage for the private e-book file
* Monnify as the primary Nigerian payment gateway
* Resend for transactional email
* Zod for request validation
* Vitest or Jest for automated tests

Use current stable versions compatible with the existing repository.

Do not introduce a large framework unnecessarily.

## Core engineering rules

1. Never trust payment amounts received from the browser.
2. The backend must determine the product and expected amount.
3. Do not mark an order as paid based only on a browser redirect.
4. Payment confirmation must come through a validated Monnify webhook and, where necessary, transaction verification.
5. Webhook processing must be idempotent.
6. Duplicate webhook events must not create duplicate fulfilment actions.
7. Payment secrets must never appear in frontend code.
8. Do not expose the e-book through a permanent public URL.
9. Do not hardcode production credentials.
10. Do not invent shipping integrations, merchant credentials, prices, legal policies, or operational workflows that have not been supplied.
11. Unsupported or unconfigured functionality must be clearly marked as pending.
12. Keep the payment provider behind a service abstraction so Paystack can be added later without rewriting the order domain.

## First phase: repository audit

Before implementing anything:

1. Inspect the repository structure.
2. Identify:

   * Framework
   * Build system
   * Existing forms
   * Existing product buttons
   * Existing order modal
   * Existing environment-variable pattern
   * Existing deployment target
   * Existing API structure
3. Determine whether the project should use:

   * Next.js route handlers
   * Vercel serverless functions
   * Express
   * Another existing backend structure
4. Do not migrate the application to another framework unless technically necessary.
5. Produce a concise implementation plan before writing major code.

## Sprint objective

At the end of the sprint, a customer must be able to:

### Physical-copy journey

1. Select the signed physical copy.
2. Provide:

   * Full name
   * Email address
   * Phone number
   * Delivery address
   * State
   * Recipient name, where applicable
   * Optional inscription request
3. Receive a server-generated order reference.
4. Complete payment through Monnify.
5. Receive payment confirmation after the webhook is verified.
6. Receive an order-confirmation email.
7. Have the paid order appear in the protected administrative order view.
8. Have the fulfilment status tracked through:

   * Paid
   * Awaiting inscription
   * Signed
   * Packaged
   * Dispatched
   * Delivered
   * Cancelled

### E-book journey

1. Select the e-book.
2. Provide:

   * Full name
   * Email address
   * Phone number where required
3. Receive a server-generated order reference.
4. Complete payment through Monnify.
5. Receive payment confirmation only after webhook validation.
6. Receive a secure, expiring download link.
7. Download the e-book without exposing a permanent public file URL.
8. Have download issuance and usage recorded.

## Product pricing

Do not take prices from the browser.

Create a server-side product catalogue.

Suggested product codes:

```text
PURPOSEFUL_LIVING_SIGNED
PURPOSEFUL_LIVING_EBOOK
```

Prices must be configurable through the database or validated server-side configuration.

Do not assume the final production price unless it already exists in the repository or environment configuration.

Provide development seed values only when clearly marked as temporary.

## Database schema

Create migrations for at least the following entities.

### products

```text
id
code
name
format
description
price_kobo
currency
is_active
created_at
updated_at
```

### orders

```text
id
order_reference
customer_name
email
phone
product_id
quantity
unit_price_kobo
subtotal_kobo
delivery_fee_kobo
total_amount_kobo
currency
payment_status
fulfilment_status
delivery_address
delivery_state
recipient_name
inscription_request
gateway
gateway_reference
paid_at
created_at
updated_at
```

### payment_events

```text
id
gateway
event_type
gateway_event_id
order_reference
payload
signature_valid
processed
processing_error
created_at
processed_at
```

### ebook_entitlements

```text
id
order_id
customer_email
storage_path
download_token_hash
expires_at
maximum_downloads
download_count
revoked_at
created_at
updated_at
```

### fulfilment_events

```text
id
order_id
previous_status
new_status
note
created_by
created_at
```

### waitlist_entries

```text
id
name
email
phone
product_code
source
created_at
```

Use appropriate:

* Foreign keys
* Unique constraints
* Indexes
* Enum or constrained status values
* Timestamps
* Row-level security where appropriate

## Required API endpoints

Adapt paths to the existing framework, but provide equivalent functionality.

### Product catalogue

```text
GET /api/products
```

Return active products and server-authoritative prices.

### Create order

```text
POST /api/orders
```

Responsibilities:

* Validate the request with Zod
* Resolve the product server-side
* Calculate the total server-side
* Generate a collision-resistant order reference
* Create a pending order
* Return the order summary

### Initialise payment

```text
POST /api/payments/monnify/initialize
```

Responsibilities:

* Accept an existing valid order reference
* Read the expected amount from the database
* Reject paid, cancelled, missing, or invalid orders
* Initialise Monnify checkout
* Save the gateway transaction reference
* Return only the safe checkout details required by the frontend

### Monnify webhook

```text
POST /api/webhooks/monnify
```

Responsibilities:

* Read the raw request body where required
* Validate Monnify’s signature or transaction hash
* Store every payment event
* Reject invalid events
* Match the event to an order
* Verify the expected amount and currency
* Process successful payment only once
* Mark the order as paid
* Set the correct fulfilment status
* Trigger the correct email or e-book fulfilment action
* Return a successful response promptly
* Record processing errors for later inspection

### Payment status

```text
GET /api/orders/:orderReference/status
```

Return a safe subset of the order state.

Do not expose private customer or internal payment data.

### Waitlist

```text
POST /api/waitlist
```

Responsibilities:

* Validate name, email, phone, and product
* Prevent obvious duplicate submissions
* Store the waitlist entry
* Send a confirmation email where configured

### Secure e-book access

```text
GET /api/ebooks/download/:token
```

Responsibilities:

* Hash and validate the supplied token
* Confirm the entitlement is active
* Check expiry
* Check download limits
* Record the download
* Return a short-lived signed Supabase Storage URL or stream the file securely

Never return the permanent Supabase storage path.

## Payment service abstraction

Create an interface similar to:

```ts
interface PaymentGateway {
  initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verifyTransaction(reference: string): Promise<VerifiedTransaction>;
  validateWebhook(input: WebhookValidationInput): Promise<boolean>;
  parseWebhook(payload: unknown): Promise<PaymentWebhookEvent>;
}
```

Implement:

```text
MonnifyPaymentGateway
```

Do not implement Paystack unless requested, but structure the code so a future:

```text
PaystackPaymentGateway
```

can be added cleanly.

## Monnify integration requirements

Use Monnify’s official documentation and sandbox environment.

Required environment variables may include:

```text
MONNIFY_API_KEY
MONNIFY_SECRET_KEY
MONNIFY_CONTRACT_CODE
MONNIFY_BASE_URL
MONNIFY_REDIRECT_URL
```

Confirm the exact current variable requirements from the official Monnify documentation before implementation.

Do not guess field names or signature algorithms.

Document:

* Sandbox setup
* Production switch
* Webhook URL
* Redirect URL
* Allowed payment methods
* Settlement considerations
* Required merchant approval steps

## E-book security

The e-book file must be stored in a private Supabase Storage bucket.

After successful payment:

1. Generate a cryptographically secure random token.
2. Store only the token hash.
3. Set an expiry period.
4. Set a configurable download limit.
5. Email the customer a download URL containing the raw token.
6. Validate every request.
7. Increment the download count transactionally.
8. Allow administrators to revoke or regenerate access.
9. Prevent path traversal and arbitrary-file access.

The email must not contain the permanent storage URL.

## Email flows

Use Resend for:

1. Order received
2. Payment confirmed
3. Physical-order confirmation
4. E-book secure download delivery
5. Waitlist confirmation
6. Administrator notification of new paid physical order

Email templates should match the brand:

* Ivory background
* Deep navy
* Restrained muted gold
* Clear typography
* Minimal decoration

Do not embed huge images or unnecessary assets.

## Administrative order view

Create a protected administrative view or API.

Minimum functionality:

* List orders
* Search by:

  * Order reference
  * Customer name
  * Email
  * Phone
* Filter by:

  * Product
  * Payment status
  * Fulfilment status
  * Date
* View:

  * Customer details
  * Delivery address
  * Inscription request
  * Payment details
  * Fulfilment history
* Update fulfilment status
* Add fulfilment notes
* Export physical orders as CSV

Do not build an elaborate CMS.

Use secure authentication already present in the repository. If none exists, use Supabase Auth and document the admin-account setup.

## Required statuses

### Payment status

```text
PENDING
INITIALISED
PAID
FAILED
REFUNDED
CANCELLED
```

### Physical fulfilment status

```text
NOT_APPLICABLE
AWAITING_PAYMENT
PAID
AWAITING_INSCRIPTION
SIGNED
PACKAGED
DISPATCHED
DELIVERED
CANCELLED
```

### E-book fulfilment status

```text
NOT_APPLICABLE
AWAITING_PAYMENT
ACCESS_PENDING
ACCESS_ISSUED
ACCESS_REVOKED
```

Use domain-safe transition rules.

Do not allow invalid status jumps silently.

## Frontend integration

Connect the existing UI without redesigning it.

Required behaviour:

* “Get Your Copy” scrolls to or opens product selection.
* “Order Signed Copy” creates or begins the signed-copy flow.
* “Join the Waitlist” submits to the waitlist endpoint when sales are not active.
* “Buy E-book” starts the e-book order flow.
* Buttons must show:

  * Loading state
  * Disabled state
  * Validation error
  * Payment-initialisation failure
  * Successful redirection
* Order forms must work on mobile.
* Do not embed a payment button as part of a static hero image.
* All payment controls must remain real interactive HTML elements.

## Validation and security

Implement:

* Zod validation
* Server-side price verification
* Rate limiting for:

  * Order creation
  * Waitlist submission
  * Payment initialisation
  * Download attempts
* Secure headers
* Input sanitisation
* Webhook signature validation
* Idempotency
* Structured logging
* Sensitive-data redaction
* CSRF protection where applicable
* Safe error responses
* No stack traces in production
* No secrets in client bundles
* No unauthenticated administrative endpoints

## Automated tests

Create tests for at least:

1. Order creation with a valid product
2. Rejection of a manipulated frontend amount
3. Rejection of an inactive product
4. Payment initialisation for a valid pending order
5. Rejection of payment initialisation for an already-paid order
6. Valid Monnify webhook
7. Invalid webhook signature
8. Amount mismatch
9. Duplicate webhook processing
10. E-book entitlement creation
11. Expired download token
12. Exhausted download allowance
13. Invalid token
14. Successful physical-order status update
15. Invalid fulfilment-status transition
16. Duplicate waitlist submission
17. Unauthenticated admin access

Mock external services in unit and integration tests.

Do not call live Monnify or Resend services during automated tests.

## Observability

Add structured logs for:

* Order creation
* Payment initialisation
* Webhook receipt
* Webhook validation failure
* Payment confirmation
* E-book entitlement generation
* Email failure
* Download access
* Fulfilment status change

Never log:

* API secrets
* Full payment payloads containing sensitive data
* Raw download tokens
* Unnecessary personal information

## Environment configuration

Create:

```text
.env.example
```

Include all required variables without real values.

Document separate values for:

* Local development
* Test
* Monnify sandbox
* Production

Add startup validation so the application fails clearly when required environment variables are missing.

## Deployment

Prepare the application for deployment to Vercel.

Document:

1. Supabase project creation
2. Migration execution
3. Private storage bucket setup
4. Product seeding
5. Resend domain or sender verification
6. Monnify sandbox setup
7. Monnify production credentials
8. Webhook registration
9. Vercel environment variables
10. Test transaction procedure
11. Production verification checklist

## Sprint backlog

Create the sprint as implementable tickets.

Use this structure:

```text
Ticket ID
Title
Objective
Scope
Dependencies
Implementation notes
Acceptance criteria
Test requirements
Status
```

Suggested ticket groups:

```text
BE-001 Repository and architecture audit
BE-002 Environment and configuration layer
BE-003 Supabase schema and migrations
BE-004 Product catalogue
BE-005 Order creation
BE-006 Monnify payment initialisation
BE-007 Monnify webhook validation
BE-008 Payment reconciliation and idempotency
BE-009 E-book entitlement and secure download
BE-010 Transactional email
BE-011 Waitlist
BE-012 Admin authentication
BE-013 Administrative order management
BE-014 Frontend integration
BE-015 Automated test suite
BE-016 Logging and security hardening
BE-017 Deployment documentation
BE-018 Sandbox end-to-end verification
```

Order the tickets according to dependency.

## Definition of done

The sprint is complete only when:

* Database migrations run successfully.
* Products are server-authoritative.
* A pending order can be created.
* Monnify sandbox checkout can be initialised.
* Valid webhooks mark an order as paid.
* Invalid or duplicate webhooks cannot duplicate fulfilment.
* Paid e-book orders receive secure expiring access.
* Paid physical orders appear in the admin view.
* Fulfilment statuses can be updated safely.
* Emails are sent through a configurable adapter.
* Mobile order flows work.
* Tests pass.
* Linting and type checking pass.
* Environment variables are documented.
* Sandbox setup and production deployment are documented.
* No secrets are committed.
* No fake payment success flow exists.

## Required output

Work in the following order:

1. Repository audit
2. Architecture decision
3. Sprint backlog
4. Database design
5. API contract
6. Implementation
7. Tests
8. Deployment documentation
9. Final gap report

At completion, provide:

* Files created
* Files changed
* Database migrations
* API endpoints
* Environment variables
* Test results
* Sandbox-testing steps
* Pending merchant or business configuration
* Known risks
* Recommended next sprint

Do not claim that a flow is complete unless it has been implemented and tested.
