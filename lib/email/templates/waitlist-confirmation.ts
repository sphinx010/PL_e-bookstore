export function waitlistConfirmationHtml(name: string, productName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>You're on the list</title>
<style>
  body{margin:0;background:#F7F1E7;font-family:Georgia,"Times New Roman",serif;color:#2B2A28}
  .wrap{max-width:560px;margin:40px auto;background:#FCF9F3;border:1px solid rgba(16,40,63,.1);padding:48px 40px}
  .brand{font-size:18px;font-weight:600;color:#10283F;letter-spacing:.02em}
  .brand span{color:#B88A43}
  h1{font-size:26px;color:#10283F;margin:28px 0 16px;line-height:1.2}
  p{font-size:15px;line-height:1.6;color:#31475A;margin:10px 0}
  .footer{font-size:11px;color:#8a9aab;font-family:Arial,sans-serif;margin-top:32px}
</style></head>
<body>
<div class="wrap">
  <div class="brand">PURPOSEFUL<span>LIVING</span></div>
  <h1>You're on the list.</h1>
  <p>Thank you, <strong>${name}</strong>. We have registered your interest in <strong>${productName}</strong>.</p>
  <p>We will notify you as soon as it becomes available to order.</p>
  <div class="footer">Purposeful Living · hello@purposefullivingbook.com · Lagos, Nigeria</div>
</div>
</body></html>`;
}
