import type { Order } from '../../db/types';

/** Sent immediately after order creation (before payment). */
export function orderReceivedHtml(order: Order, productName: string): string {
  const amount = `₦${(order.total_amount_kobo / 100).toLocaleString('en-NG')}`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Received</title>
<style>
  body{margin:0;background:#F7F1E7;font-family:Georgia,"Times New Roman",serif;color:#2B2A28}
  .wrap{max-width:560px;margin:40px auto;background:#FCF9F3;border:1px solid rgba(16,40,63,.1);padding:48px 40px}
  .brand{font-size:18px;font-weight:600;color:#10283F;letter-spacing:.02em}
  .brand span{color:#B88A43}
  h1{font-size:26px;color:#10283F;margin:28px 0 8px;line-height:1.2}
  .ref{font-size:11px;font-family:Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#B88A43;margin-bottom:20px}
  p{font-size:15px;line-height:1.6;color:#31475A;margin:12px 0}
  .amount{font-size:28px;font-weight:700;color:#10283F;margin:20px 0}
  .divider{border:0;border-top:1px solid rgba(16,40,63,.1);margin:28px 0}
  .footer{font-size:11px;color:#8a9aab;font-family:Arial,sans-serif;margin-top:32px}
</style></head>
<body>
<div class="wrap">
  <div class="brand">PURPOSEFUL<span>LIVING</span></div>
  <h1>Order received.</h1>
  <p class="ref">Reference: ${order.order_reference}</p>
  <p>Thank you, ${order.customer_name}. We have received your order for <strong>${productName}</strong>.</p>
  <p>Please complete your payment to confirm the order. Your order reference is:</p>
  <p class="amount">${order.order_reference}</p>
  <p>Amount due: <strong>${amount}</strong></p>
  <hr class="divider">
  <p>If you did not place this order, no action is needed — it will expire automatically.</p>
  <div class="footer">Purposeful Living · hello@purposefullivingbook.com · Lagos, Nigeria</div>
</div>
</body></html>`;
}
