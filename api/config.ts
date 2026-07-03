import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withMethods } from '../lib/api-handler';
import { config } from '../lib/config';

export default withMethods({
  GET: async (_req: VercelRequest, res: VercelResponse) => {
    // Expose only non-sensitive public configuration needed by the admin client
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    res.status(200).json({
      SUPABASE_URL: config.SUPABASE_URL,
      SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY,
    });
  },
});
