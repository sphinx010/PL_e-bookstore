import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * Service-role Supabase client.
 * Bypasses RLS — used only in server-side API functions.
 * Never expose this client or its key to the browser.
 */
export const db = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
