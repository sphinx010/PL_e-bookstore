import type { Order } from '../../db/types';

/** Sent with secure, expiring download link after ebook payment confirmed. */
export function ebookDeliveryHtml(order: Order, downloadUrl: string, expiresHours: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your E-book Download</title>
<style>
  body{margin:0;background:#F7F1E7;font-family:Georgia,"Times New Roman",serif;color:#2B2A28}
  .wrap{max-width:560px;margin:40px auto;background:#FCF9F3;border:1px solid rgba(16,40,63,.1);padding:48px 40px}
  .brand{font-size:18px;font-weight:600;color:#10283F;letter-spacing:.02em}
  .brand span{color:#B88A43}
  .badge{display:inline-block;background:#B88A43;color:#fff;font-family:Arial,sans-serif;font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;margin:20px 0 8px}
  h1{font-size:26px;color:#10283F;margin:0 0 20px;line-height:1.2}
  p{font-size:15px;line-height:1.6;color:#31475A;margin:10px 0}
  .cta{display:block;width:fit-content;background:#10283F;color:#fff;text-decoration:none;font-family:Arial,sans-serif;font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding:16px 32px;margin:28px 0}
  .notice{background:#F0EAE0;padding:14px 18px;font-size:13px;border-left:3px solid rgba(184,138,67,.5);margin:20px 0;color:#45596B}
  .divider{border:0;border-top:1px solid rgba(16,40,63,.1);margin:28px 0}
  .footer{font-size:11px;color:#8a9aab;font-family:Arial,sans-serif;margin-top:32px}
</style></head>
<body>
<div class="wrap">
  <div class="brand">PURPOSEFUL<span>LIVING</span></div>
  <div class="badge">E-book Ready</div>
  <h1>Your download is ready.</h1>
  <p>Thank you, <strong>${order.customer_name}</strong>. Your payment has been confirmed and your e-book is ready to download.</p>
  <a class="cta" href="${downloadUrl}">Download Purposeful Living →</a>
  <div class="notice">
    This link expires in <strong>${expiresHours} hours</strong> and can be used up to 5 times.
    Do not share this link — it is personal to your order.
  </div>
  <p><strong>Order reference:</strong> ${order.order_reference}</p>
  <hr class="divider">
  <p>If your link has expired or you encounter a problem, contact us at hello@purposefullivingbook.com with your order reference.</p>
  <div class="footer">Purposeful Living · Lagos, Nigeria</div>
</div>
</body></html>`;
}
