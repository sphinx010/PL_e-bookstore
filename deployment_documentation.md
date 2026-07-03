# Deployment and Testing Documentation

This document provides step-by-step setup instructions for deploying the **Purposeful Living** backend, configuring external services, testing in the sandbox, and going live.

---

## 1. Supabase Setup

### Step 1.1: Project Creation
1. Go to [Supabase](https://supabase.com/) and sign in.
2. Click **New Project** and select your organization.
3. Set the project name (e.g., `Purposeful Living Website`), database password, and region (e.g., London or Ireland).
4. Wait for the database instance to provision.

### Step 1.2: Database Migrations
1. In the Supabase Dashboard, navigate to the **SQL Editor**.
2. Click **New Query**.
3. Copy and execute the contents of the files in `migrations/` in order:
   - `001_products.sql`
   - `002_orders.sql`
   - `003_payment_events.sql`
   - `004_ebook_entitlements.sql`
   - `005_fulfilment_events.sql`
   - `006_waitlist.sql`
4. Confirm that all tables, enums, triggers, and RLS policies are successfully created.

### Step 1.3: Private Storage Bucket Setup
1. In the Supabase Dashboard, navigate to **Storage**.
2. Click **New Bucket**.
3. Set the name to `ebooks` (or the name configured in `EBOOK_BUCKET`).
4. Ensure the **Public** toggle is **disabled** (it must be a private bucket).
5. Click **Create Bucket**.
6. Upload the secure e-book PDF file (e.g., `purposeful_living_ebook.pdf`).
7. Keep note of the file name, as it must match `EBOOK_STORAGE_PATH` in your environment configuration.

### Step 1.4: Admin User Creation
1. In the Supabase Dashboard, navigate to **Authentication** -> **Users**.
2. Click **Add User** -> **Create User**.
3. Enter the administrator's email and password.
4. Uncheck **Auto-confirm user** if you want to verify via email, or keep it checked to activate immediately.
5. Record this email address. You must add it to the `ADMIN_EMAIL` comma-separated whitelist in Vercel environment variables.

---

## 2. Resend Setup (Email Flows)

1. Sign up at [Resend](https://resend.com/).
2. Navigate to **Domains** and click **Add Domain**.
3. Add your custom domain (e.g., `purposefullivingbook.com`).
4. Add the generated DNS records (SPF, DKIM, MX) to your domain registrar (e.g., Namecheap, GoDaddy).
5. Once DNS status is **Verified**, you can send transactional emails from addresses like `orders@purposefullivingbook.com`.
6. Go to **API Keys** and click **Create API Key**. Copy this value; it will be your `RESEND_API_KEY`.

---

## 3. Monnify Setup

### Step 3.1: Sandbox Environment (Testing)
1. Register for a sandbox developer account at [Monnify Sandbox](https://sandbox.monnify.com/).
2. Navigate to **Settings** -> **API Keys** to retrieve:
   - `API Key`
   - `Secret Key`
3. Navigate to **Settlement Accounts** or **Profile** to find your:
   - `Contract Code`
4. Set the API URL to: `https://sandbox.monnify.com`

### Step 3.2: Redirect and Webhook URLs
- **Allowed Payment Methods**: Card, Bank Transfer, USSD, Internet Banking. (Monnify supports all of these automatically within the checkout page).
- **Redirect URL**: Where Monnify redirects the customer after checkout. Point this to:
  `https://your-domain.vercel.app/order-confirmation.html`
  *(Ensure this exact URL is registered under Allowed Redirect URLs in your Monnify Developer settings).*
- **Webhook URL**: Where Monnify sends payment notifications. Configure this under Webhook Settings in the Monnify dashboard:
  `https://your-domain.vercel.app/api/webhooks/monnify`
  *(Set the webhook transaction type trigger to: `Successful Transactions` & `Failed Transactions`).*

### Step 3.3: Production Setup (Going Live)
1. Complete merchant onboarding and approval steps at [Monnify Live](https://monnify.com/).
2. Submit business documents (e.g., CAC certificate, corporate bank details) for approval.
3. Switch your dashboard view to **Live Mode**.
4. Retrieve your live **API Key**, **Secret Key**, and **Contract Code**.
5. Update your Vercel environment variables with these live credentials and update `MONNIFY_BASE_URL` to: `https://api.monnify.com`.

---

## 4. Vercel Deployment

Deploy the repository to Vercel. Ensure the following environment variables are configured.

### Environment Variables List

| Variable Name | Sandbox / Dev Value | Production Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` | `production` | Run environment |
| `APP_URL` | `http://localhost:3000` | `https://yourdomain.com` | Base site URL for emails |
| `SUPABASE_URL` | *From Supabase API page* | *From Supabase API page* | Supabase project API endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | *From Supabase API page* | *From Supabase API page* | DB admin key (server-only) |
| `SUPABASE_ANON_KEY` | *From Supabase API page* | *From Supabase API page* | Public Anon Key (shared with admin UI) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *From Supabase API page* | *From Supabase API page* | Alias for Supabase Anon Key |
| `MONNIFY_BASE_URL` | `https://sandbox.monnify.com` | `https://api.monnify.com` | Monnify gateway URL |
| `MONNIFY_API_KEY` | *From Sandbox dashboard* | *From Live dashboard* | Monnify API Key |
| `MONNIFY_SECRET_KEY` | *From Sandbox dashboard* | *From Live dashboard* | Monnify Secret Key |
| `MONNIFY_CONTRACT_CODE` | *From Sandbox dashboard* | *From Live dashboard* | Monnify Contract Code |
| `MONNIFY_REDIRECT_URL` | *Your dev/preview URL* | *Your live confirmation URL* | Target checkout redirect page |
| `RESEND_API_KEY` | *From Resend dashboard* | *From Resend dashboard* | Resend API Key |
| `RESEND_FROM` | `orders@yourdomain.com` | `orders@yourdomain.com` | Verified sender address |
| `ADMIN_EMAIL` | `admin@example.com` | `admin1@com, admin2@com` | Comma-separated admin whitelist |
| `EBOOK_BUCKET` | `ebooks` | `ebooks` | Private storage bucket name |
| `EBOOK_STORAGE_PATH` | `purposeful_living_ebook.pdf` | `purposeful_living_ebook.pdf` | File name in storage bucket |
| `EBOOK_LINK_TTL_SECONDS` | `172800` | `172800` | Secure link lifespan (48 hrs) |
| `EBOOK_MAX_DOWNLOADS` | `5` | `5` | Download count cap per user |
| `PHYSICAL_SALES_MODE` | `AVAILABLE` | `AVAILABLE` or `WAITLIST` | Mode: `AVAILABLE`, `WAITLIST`, `SOLD_OUT` |

---

## 5. End-to-End Testing Procedure

Follow this checklist in the **Monnify Sandbox** environment before going live:

### Test Case 1: Order E-Book
1. Go to your local/preview site and click **Buy E-book**.
2. Fill out the order form (Name, Email, Phone) and click **Continue to Payment**.
3. Verify that:
   - You are redirected to the Monnify Sandbox Checkout Page.
   - The checkout displays the correct product name and price (provisional: `₦8,000`).
4. Select **Card** payment on the sandbox checkout page, enter test credentials, and complete the transaction.
5. After payment, you are redirected back to `/order-confirmation.html`.
6. Monnify sends a webhook notification to your server.
7. Verify that:
   - You receive an email via Resend containing the secure expiring download link.
   - In the DB, the order is marked `PAID` and fulfilment status is `ACCESS_ISSUED`.
   - An entry is made in `ebook_entitlements`.

### Test Case 2: Download E-Book
1. Click the download link in the received email.
2. Confirm you are redirected and the PDF file downloads successfully.
3. Try downloading the file 6 times. Verify that on the 6th attempt, access is denied (exceeds limit of 5).
4. Copy the download link, wait 48 hours (or manually change the `expires_at` column in the database to a past timestamp), and click it again. Verify that access is denied (expired).

### Test Case 3: Order Signed Copy (Physical Book)
1. Set `PHYSICAL_SALES_MODE` to `AVAILABLE`.
2. Go to the site and click **Order Signed Copy**.
3. Fill out the form (Name, Email, Phone, Address, State, Inscription request). Click **Continue to Payment**.
4. Complete the checkout on Monnify Sandbox.
5. Verify that:
   - You receive an email confirming your physical order.
   - The admin dashboard registers the paid order.
   - The order's payment status is `PAID` and fulfilment status is `AWAITING_INSCRIPTION`.

### Test Case 4: Admin Dashboard Operations
1. Open `/admin/index.html`.
2. Sign in with the administrator user created in Step 1.4.
3. Verify you can view the paid physical order in the list.
4. Click **View** to open order details.
5. In the dropdown, advance the status to `SIGNED` -> write an optional note -> click **Update Status**.
6. Verify that:
   - The status changes to `SIGNED`.
   - The action is logged in the fulfilment history list.
   - Progress the order through `PACKAGED`, `DISPATCHED`, and `DELIVERED`.
7. Confirm that exporting orders as CSV downloads all paid physical orders correctly.

---

## 6. Settlement and Merchant Considerations

- **Settlement Cycles**: In Nigeria, Monnify typically settles merchants on a `T+1` basis (next business day) for card payments. Local bank transfer payments are often settled on the same day or next day.
- **Transaction Fees**: Monnify charges transaction fees (typically 1.5% for cards capped at ₦2,000, and ₦100-₦300 flat for bank transfers). The backend takes this into account by using authoritative pricing, but you should adjust selling prices if you want to absorb or pass down transaction costs.
- **Refunds**: Currently, refunds must be processed manually from the Monnify Merchant Portal. Once refunded, change the order payment status to `REFUNDED` via the database or by API request.
