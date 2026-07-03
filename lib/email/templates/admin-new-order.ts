import type { Order } from '../../db/types';

export function adminNewOrderHtml(order: Order, productName: string, appUrl: string): string {
  const amount = `₦${(order.total_amount_kobo / 100).toLocaleString('en-NG')}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8">
<title>New Paid Order</title>
<style>
  body{margin:0;background:#f0f4f8;font-family:Arial,sans-serif;color:#1a202c}
  .wrap{max-width:560px;margin:32px auto;background:#fff;border:1px solid #e2e8f0;padding:36px}
  h1{font-size:20px;margin:0 0 20px;color:#10283F}
  table{width:100%;border-collapse:collapse;font-size:14px}
  td{padding:9px 12px;border-bottom:1px solid #edf2f7}
  td:first-child{color:#718096;width:40%}
  .cta{display:inline-block;background:#10283F;color:#fff;text-decoration:none;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:12px 24px;margin-top:24px}
</style></head>
<body>
<div class="wrap">
  <h1>New paid order — action required</h1>
  <table>
    <tr><td>Reference</td><td><strong>${order.order_reference}</strong></td></tr>
    <tr><td>Customer</td><td>${order.customer_name}</td></tr>
    <tr><td>Email</td><td>${order.email}</td></tr>
    <tr><td>Phone</td><td>${order.phone}</td></tr>
    <tr><td>Product</td><td>${productName}</td></tr>
    <tr><td>Amount</td><td>${amount}</td></tr>
    ${order.delivery_address ? `<tr><td>Address</td><td>${order.delivery_address}, ${order.delivery_state ?? ''}</td></tr>` : ''}
    ${order.inscription_request ? `<tr><td>Inscription</td><td>${order.inscription_request}</td></tr>` : ''}
  </table>
  <a class="cta" href="${appUrl}/admin/">View in admin panel →</a>
</div>
</body></html>`;
}
