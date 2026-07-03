import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getActiveProducts } from '../lib/db/queries/products';
import { withMethods } from '../lib/api-handler';
import { config } from '../lib/config';

export default withMethods({
  GET: async (_req: VercelRequest, res: VercelResponse) => {
    const products = await getActiveProducts();

    // Apply env-controlled sales mode override for physical products.
    // The DB stores the default; env can override without a migration.
    const enriched = products.map(p => ({
      id:          p.id,
      code:        p.code,
      name:        p.name,
      format:      p.format,
      description: p.description,
      priceKobo:   p.price_kobo,
      priceNaira:  p.price_kobo / 100,
      currency:    p.currency,
      salesMode:   p.format === 'PHYSICAL' ? config.PHYSICAL_SALES_MODE : p.sales_mode,
    }));

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).json({ products: enriched });
  },
});
