import { templateCount, createTemplate } from './template-repository';

const WELCOME_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="background:#1c1917;padding:32px;text-align:center;">
    <span style="color:#a3e635;font-size:28px;font-weight:900;">H</span>
    <span style="color:#fff;font-size:20px;font-weight:700;margin-left:8px;">HIREME HOTEL</span>
  </td></tr>
  <tr><td style="padding:40px 32px;">
    <h1 style="color:#1c1917;font-size:24px;margin:0 0 16px;">Welcome, {{guest_name}}!</h1>
    <p style="color:#57534e;font-size:16px;line-height:1.6;margin:0 0 24px;">Your reservation is confirmed for <strong>{{check_in_date}}</strong>. We're looking forward to welcoming you!</p>
    <a href="https://hireme.dev" style="display:inline-block;background:#1c1917;color:#a3e635;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">View Reservation</a>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #e7e5e4;text-align:center;">
    <p style="color:#a8a29e;font-size:12px;margin:0;">{{hotel_name}} &bull; Thank you for choosing us</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const POST_STAY_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="background:#1c1917;padding:32px;text-align:center;">
    <span style="color:#a3e635;font-size:28px;font-weight:900;">H</span>
    <span style="color:#fff;font-size:20px;font-weight:700;margin-left:8px;">HIREME HOTEL</span>
  </td></tr>
  <tr><td style="padding:40px 32px;">
    <h1 style="color:#1c1917;font-size:24px;margin:0 0 16px;">How was your stay, {{guest_name}}?</h1>
    <p style="color:#57534e;font-size:16px;line-height:1.6;margin:0 0 24px;">We hope you enjoyed your time with us. Your feedback helps us improve and serve you better on your next visit.</p>
    <div style="text-align:center;margin:0 0 24px;">
      <span style="font-size:32px;letter-spacing:8px;">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
    </div>
    <a href="https://hireme.dev/feedback" style="display:inline-block;background:#1c1917;color:#a3e635;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Share Feedback</a>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #e7e5e4;text-align:center;">
    <p style="color:#a8a29e;font-size:12px;margin:0;">{{hotel_name}} &bull; We value your opinion</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const SPECIAL_OFFER_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <tr><td style="background:#1c1917;padding:32px;text-align:center;">
    <span style="color:#a3e635;font-size:28px;font-weight:900;">H</span>
    <span style="color:#fff;font-size:20px;font-weight:700;margin-left:8px;">HIREME HOTEL</span>
  </td></tr>
  <tr><td style="padding:40px 32px;">
    <h1 style="color:#1c1917;font-size:24px;margin:0 0 8px;">Exclusive Offer for You!</h1>
    <p style="color:#57534e;font-size:16px;line-height:1.6;margin:0 0 24px;">Dear {{guest_name}}, as a valued guest we have a special offer just for you.</p>
    <div style="background:#f5f5f4;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <span style="display:inline-block;background:#a3e635;color:#1c1917;padding:8px 16px;border-radius:8px;font-weight:800;font-size:24px;">20% OFF</span>
      <p style="color:#57534e;font-size:14px;margin:12px 0 0;">Your next stay with us</p>
    </div>
    <a href="https://hireme.dev/book" style="display:inline-block;background:#1c1917;color:#a3e635;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;font-size:14px;">Book Now</a>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #e7e5e4;text-align:center;">
    <p style="color:#a8a29e;font-size:12px;margin:0;">{{hotel_name}} &bull; Limited time offer</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export async function seedDefaultTemplates(): Promise<void> {
  const count = await templateCount();
  if (count > 0) return;

  await createTemplate({
    name: 'Welcome',
    subject: 'Welcome to {{hotel_name}}, {{guest_name}}!',
    htmlBody: WELCOME_HTML,
    previewText: 'Your reservation is confirmed',
  });

  await createTemplate({
    name: 'Post-Stay Feedback',
    subject: 'How was your stay, {{guest_name}}?',
    htmlBody: POST_STAY_HTML,
    previewText: 'We\'d love to hear about your experience',
  });

  await createTemplate({
    name: 'Special Offer',
    subject: 'Exclusive offer for you, {{guest_name}}!',
    htmlBody: SPECIAL_OFFER_HTML,
    previewText: 'A special deal just for you',
  });

  console.log('[campaigns] Seeded 3 default email templates');
}
