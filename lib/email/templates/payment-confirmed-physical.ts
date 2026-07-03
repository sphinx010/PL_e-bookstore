import type { Order } from '../../db/types';

/** Sent after Monnify webhook confirms payment on a physical copy order. */
export function paymentConfirmedPhysicalHtml(order: Order, productName: string): string {
  const amount = `₦${(order.total_amount_kobo / 100).toLocaleString('en-NG')}`;
  const inscription = order.inscription_request
    ? `<p><strong>Inscription:</strong> "${order.inscription_request}"</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Payment Confirmed</title>
<style>
  body{margin:0;background:#F7F1E7;font-family:Georgia,"Times New Roman",serif;color:#2B2A28}
  .wrap{max-width:560px;margin:40px auto;background:#FCF9F3;border:1px solid rgba(16,40,63,.1);padding:48px 40px}
  .brand{font-size:18px;font-weight:600;color:#10283F;letter-spacing:.02em}
  .brand span{color:#B88A43}
  .badge{display:inline-block;background:#10283F;color:#fff;font-family:Arial,sans-serif;font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;margin:20px 0 8px}
  h1{font-size:26px;color:#10283F;margin:0 0 20px;line-height:1.2}
  p{font-size:15px;line-height:1.6;color:#31475A;margin:10px 0}
  .detail-row{background:#F0EAE0;padding:16px 20px;margin:18px 0;border-left:3px solid #B88A43}
  .divider{border:0;border-top:1px solid rgba(16,40,63,.1);margin:28px 0}
  .footer{font-size:11px;color:#8a9aab;font-family:Arial,sans-serif;margin-top:32px}
</style></head>
<body>
<div class="wrap">
  <div class="brand">PURPOSEFUL<span>LIVING</span></div>
  <div class="badge">Payment Confirmed</div>
  <h1>Your copy is on its way.</h1>
  <p>Thank you, <strong>${order.customer_name}</strong>. Your payment of <strong>${amount}</strong> has been confirmed.</p>
  <div class="detail-row">
    <p><strong>Order:</strong> ${order.order_reference}</p>
    <p><strong>Book:</strong> ${productName}</p>
    ${order.delivery_address ? `<p><strong>Delivery to:</strong><br>${order.delivery_address}${order.delivery_state ? ', ' + order.delivery_state : ''}</p>` : ''}
    ${inscription}
  </div>
  <p>Your signed copy will be prepared, inscribed and dispatched. We will keep you updated on the status.</p>
  <hr class="divider">
  <p>Questions? Contact us at hello@purposefullivingbook.com</p>
  <div class="footer">Purposeful Living · Lagos, Nigeria</div>
</div>
</body></html>`;
}
