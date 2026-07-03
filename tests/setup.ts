/**
 * Vitest setup — inject all required environment variables before any test runs.
 * External services (Supabase, Monnify, Resend) are mocked at the module level.
 */

process.env['SUPABASE_URL']              = 'https://test.supabase.co';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-role-key';
process.env['SUPABASE_ANON_KEY']         = 'test-anon-key';
process.env['MONNIFY_BASE_URL']          = 'https://sandbox.monnify.com';
process.env['MONNIFY_API_KEY']           = 'test-api-key';
process.env['MONNIFY_SECRET_KEY']        = 'test-secret-key';
process.env['MONNIFY_CONTRACT_CODE']     = 'test-contract-code';
process.env['MONNIFY_REDIRECT_URL']      = 'http://localhost:3000/order-confirmation.html';
process.env['RESEND_API_KEY']            = 'test-resend-key';
process.env['RESEND_FROM']               = 'test@example.com';
process.env['ADMIN_EMAIL']               = 'admin@example.com';
process.env['EBOOK_BUCKET']              = 'ebooks';
process.env['EBOOK_STORAGE_PATH']        = 'test-ebook.pdf';
process.env['EBOOK_LINK_TTL_SECONDS']    = '172800';
process.env['EBOOK_MAX_DOWNLOADS']       = '5';
process.env['PHYSICAL_SALES_MODE']       = 'AVAILABLE';
process.env['APP_URL']                   = 'http://localhost:3000';
process.env['NODE_ENV']                  = 'test';

import { vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn().mockReturnValue({
      auth: {
        getUser: vi.fn().mockImplementation((token: string) => {
          if (token === 'valid-admin-token') {
            return Promise.resolve({ data: { user: { id: 'admin-id', email: 'admin@example.com' } }, error: null });
          }
          if (token === 'valid-non-admin-token') {
            return Promise.resolve({ data: { user: { id: 'user-id', email: 'user@example.com' } }, error: null });
          }
          return Promise.resolve({ data: { user: null }, error: new Error('Invalid token') });
        }),
      },
    }),
  };
});

