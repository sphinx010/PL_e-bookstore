/**
 * Environment configuration with startup validation.
 * The application throws at boot if any required variable is absent.
 */

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function requireInt(key: string): number {
  const val = requireEnv(key);
  const n = parseInt(val, 10);
  if (isNaN(n)) throw new Error(`Environment variable ${key} must be an integer, got: ${val}`);
  return n;
}

export const config = {
  NODE_ENV: optional('NODE_ENV', 'development'),

  // Supabase
  SUPABASE_URL:               requireEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY:  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  SUPABASE_ANON_KEY:          process.env['SUPABASE_ANON_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || (() => { throw new Error('Missing required environment variable: SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY'); })(),

  // Monnify — PENDING: replace sandbox values with production before go-live
  MONNIFY_BASE_URL:       optional('MONNIFY_BASE_URL', 'https://sandbox.monnify.com'),
  MONNIFY_API_KEY:        requireEnv('MONNIFY_API_KEY'),
  MONNIFY_SECRET_KEY:     requireEnv('MONNIFY_SECRET_KEY'),
  MONNIFY_CONTRACT_CODE:  requireEnv('MONNIFY_CONTRACT_CODE'),
  MONNIFY_REDIRECT_URL:   requireEnv('MONNIFY_REDIRECT_URL'),

  // Paystack
  PAYSTACK_BASE_URL:      optional('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
  PAYSTACK_PUBLIC_KEY:    optional('PAYSTACK_PUBLIC_KEY', 'pk_test_placeholder'),
  PAYSTACK_SECRET_KEY:    optional('PAYSTACK_SECRET_KEY', 'sk_test_placeholder'),

  // Resend — optional. Direct e-book delivery no longer depends on email.
  RESEND_API_KEY: optional('RESEND_API_KEY', ''),
  RESEND_FROM:    optional('RESEND_FROM', 'Purposeful Living <orders@purposefullivingbook.com>'),
  ADMIN_EMAIL:    requireEnv('ADMIN_EMAIL'),

  // E-book — PENDING: upload file and confirm path
  EBOOK_BUCKET:        optional('EBOOK_BUCKET', 'ebooks'),
  EBOOK_STORAGE_PATH:  optional('EBOOK_STORAGE_PATH', 'PENDING_EBOOK_FILENAME.pdf'),
  EBOOK_LINK_TTL_SECONDS: parseInt(optional('EBOOK_LINK_TTL_SECONDS', '172800'), 10),
  EBOOK_MAX_DOWNLOADS:    parseInt(optional('EBOOK_MAX_DOWNLOADS', '5'), 10),

  // Sales configuration
  PHYSICAL_SALES_MODE: (optional('PHYSICAL_SALES_MODE', 'WAITLIST') as 'AVAILABLE' | 'WAITLIST' | 'SOLD_OUT'),

  // Application
  APP_URL: optional('APP_URL', 'http://localhost:3000'),
} as const;

export type Config = typeof config;
