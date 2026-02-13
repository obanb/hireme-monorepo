import { templateCount, createTemplate } from './template-repository';
import { getPool } from '../event-sourcing/database';

/* ================================================================
   WELCOME — confirmation with hero image area, room details card,
   checklist of what to bring, social links
   ================================================================ */
const WELCOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1c1917 0%,#292524 100%);padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <span style="display:inline-block;background:#a3e635;color:#1c1917;width:42px;height:42px;line-height:42px;text-align:center;border-radius:12px;font-weight:900;font-size:22px;">H</span>
        <span style="color:#ffffff;font-size:18px;font-weight:700;margin-left:12px;vertical-align:middle;letter-spacing:0.5px;">HIREME HOTEL</span>
      </td>
      <td style="text-align:right;">
        <span style="color:#a3e635;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Reservation Confirmed</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- HERO -->
  <tr><td style="background:linear-gradient(135deg,#365314 0%,#3f6212 50%,#4d7c0f 100%);padding:48px 40px;text-align:center;">
    <p style="color:#d9f99d;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:3px;margin:0 0 12px;">Welcome to</p>
    <h1 style="color:#ffffff;font-size:36px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">{{hotel_name}}</h1>
    <p style="color:#bef264;font-size:16px;margin:0;">Your home away from home</p>
  </td></tr>

  <!-- GREETING -->
  <tr><td style="padding:40px 40px 20px;">
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 12px;">Hello, {{guest_name}}!</h2>
    <p style="color:#57534e;font-size:15px;line-height:1.7;margin:0;">Your reservation has been confirmed and we are thrilled to welcome you. Below you will find everything you need for a seamless arrival.</p>
  </td></tr>

  <!-- RESERVATION CARD -->
  <tr><td style="padding:0 40px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:20px 24px;border-right:1px solid #e7e5e4;width:50%;">
          <p style="color:#a8a29e;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;">Check-in</p>
          <p style="color:#1c1917;font-size:18px;font-weight:800;margin:0;">{{check_in_date}}</p>
          <p style="color:#78716c;font-size:13px;margin:4px 0 0;">From 15:00</p>
        </td>
        <td style="padding:20px 24px;width:50%;">
          <p style="color:#a8a29e;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;">Check-out</p>
          <p style="color:#1c1917;font-size:18px;font-weight:800;margin:0;">{{check_out_date}}</p>
          <p style="color:#78716c;font-size:13px;margin:4px 0 0;">Until 11:00</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- WHAT TO EXPECT -->
  <tr><td style="padding:0 40px 32px;">
    <h3 style="color:#1c1917;font-size:16px;font-weight:700;margin:0 0 16px;">What awaits you</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:12px 16px;background:#f0fdf4;border-radius:12px;width:33%;vertical-align:top;">
          <p style="font-size:24px;margin:0 0 8px;">&#9832;</p>
          <p style="color:#1c1917;font-size:13px;font-weight:700;margin:0 0 4px;">Wellness & Spa</p>
          <p style="color:#57534e;font-size:12px;line-height:1.5;margin:0;">Indoor pool, sauna, massages</p>
        </td>
        <td width="12"></td>
        <td style="padding:12px 16px;background:#fefce8;border-radius:12px;width:33%;vertical-align:top;">
          <p style="font-size:24px;margin:0 0 8px;">&#9733;</p>
          <p style="color:#1c1917;font-size:13px;font-weight:700;margin:0 0 4px;">Fine Dining</p>
          <p style="color:#57534e;font-size:12px;line-height:1.5;margin:0;">Farm-to-table restaurant, bar</p>
        </td>
        <td width="12"></td>
        <td style="padding:12px 16px;background:#eff6ff;border-radius:12px;width:33%;vertical-align:top;">
          <p style="font-size:24px;margin:0 0 8px;">&#9968;</p>
          <p style="color:#1c1917;font-size:13px;font-weight:700;margin:0 0 4px;">Activities</p>
          <p style="color:#57534e;font-size:12px;line-height:1.5;margin:0;">Hiking, cycling, golf nearby</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 40px 32px;text-align:center;">
    <a href="https://hireme.dev" style="display:inline-block;background:#1c1917;color:#a3e635;padding:16px 40px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">View My Reservation</a>
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="padding:0 40px;"><div style="border-top:1px solid #e7e5e4;"></div></td></tr>

  <!-- CONTACT -->
  <tr><td style="padding:24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top;">
        <p style="color:#78716c;font-size:13px;line-height:1.6;margin:0;">
          <strong style="color:#44403c;">Need help?</strong><br>
          +420 123 456 789<br>
          reception@hireme.dev
        </p>
      </td>
      <td style="text-align:right;vertical-align:top;">
        <p style="color:#78716c;font-size:13px;line-height:1.6;margin:0;">
          <strong style="color:#44403c;">Address</strong><br>
          123 Hotel Street<br>
          Prague, Czech Republic
        </p>
      </td>
    </tr></table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#fafaf9;padding:24px 40px;text-align:center;border-top:1px solid #e7e5e4;">
    <p style="color:#a8a29e;font-size:11px;margin:0 0 8px;">
      &copy; 2026 {{hotel_name}} &bull; All rights reserved
    </p>
    <p style="margin:0;">
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Privacy</a>
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Terms</a>
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

/* ================================================================
   POST-STAY FEEDBACK — star rating visual, NPS prompt, highlights
   ================================================================ */
const POST_STAY_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1c1917 0%,#292524 100%);padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <span style="display:inline-block;background:#a3e635;color:#1c1917;width:42px;height:42px;line-height:42px;text-align:center;border-radius:12px;font-weight:900;font-size:22px;">H</span>
        <span style="color:#ffffff;font-size:18px;font-weight:700;margin-left:12px;vertical-align:middle;">HIREME HOTEL</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- HERO -->
  <tr><td style="background:linear-gradient(135deg,#7c2d12 0%,#9a3412 50%,#c2410c 100%);padding:48px 40px;text-align:center;">
    <p style="font-size:48px;margin:0 0 12px;">&#9734;</p>
    <h1 style="color:#ffffff;font-size:32px;font-weight:900;margin:0 0 8px;">How was your stay?</h1>
    <p style="color:#fed7aa;font-size:15px;margin:0;">We'd love to hear your thoughts, {{guest_name}}</p>
  </td></tr>

  <!-- MESSAGE -->
  <tr><td style="padding:40px 40px 24px;">
    <p style="color:#57534e;font-size:15px;line-height:1.7;margin:0 0 24px;">Thank you for choosing {{hotel_name}}. Your experience matters to us, and your feedback directly helps us create better stays for guests like you.</p>

    <!-- STAR RATING -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;margin:0 0 24px;">
      <tr><td style="padding:28px;text-align:center;">
        <p style="color:#44403c;font-size:14px;font-weight:600;margin:0 0 16px;">Rate your experience</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td style="padding:0 4px;"><a href="https://hireme.dev/feedback?r=1" style="text-decoration:none;font-size:36px;color:#d4d4d8;">&#9733;</a></td>
          <td style="padding:0 4px;"><a href="https://hireme.dev/feedback?r=2" style="text-decoration:none;font-size:36px;color:#d4d4d8;">&#9733;</a></td>
          <td style="padding:0 4px;"><a href="https://hireme.dev/feedback?r=3" style="text-decoration:none;font-size:36px;color:#d4d4d8;">&#9733;</a></td>
          <td style="padding:0 4px;"><a href="https://hireme.dev/feedback?r=4" style="text-decoration:none;font-size:36px;color:#d4d4d8;">&#9733;</a></td>
          <td style="padding:0 4px;"><a href="https://hireme.dev/feedback?r=5" style="text-decoration:none;font-size:36px;color:#d4d4d8;">&#9733;</a></td>
        </tr></table>
        <p style="color:#a8a29e;font-size:12px;margin:12px 0 0;">Click a star to rate</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- CATEGORIES -->
  <tr><td style="padding:0 40px 32px;">
    <p style="color:#44403c;font-size:14px;font-weight:600;margin:0 0 16px;">Tell us more about:</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:14px 16px;background:#f0fdf4;border-radius:12px;text-align:center;width:25%;">
          <p style="font-size:20px;margin:0 0 4px;">&#128719;</p>
          <p style="color:#1c1917;font-size:12px;font-weight:600;margin:0;">Room</p>
        </td>
        <td width="8"></td>
        <td style="padding:14px 16px;background:#eff6ff;border-radius:12px;text-align:center;width:25%;">
          <p style="font-size:20px;margin:0 0 4px;">&#127869;</p>
          <p style="color:#1c1917;font-size:12px;font-weight:600;margin:0;">Dining</p>
        </td>
        <td width="8"></td>
        <td style="padding:14px 16px;background:#fefce8;border-radius:12px;text-align:center;width:25%;">
          <p style="font-size:20px;margin:0 0 4px;">&#128588;</p>
          <p style="color:#1c1917;font-size:12px;font-weight:600;margin:0;">Service</p>
        </td>
        <td width="8"></td>
        <td style="padding:14px 16px;background:#fdf2f8;border-radius:12px;text-align:center;width:25%;">
          <p style="font-size:20px;margin:0 0 4px;">&#9832;</p>
          <p style="color:#1c1917;font-size:12px;font-weight:600;margin:0;">Wellness</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 40px 32px;text-align:center;">
    <a href="https://hireme.dev/feedback" style="display:inline-block;background:#1c1917;color:#a3e635;padding:16px 40px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;">Write a Review</a>
    <p style="color:#a8a29e;font-size:12px;margin:12px 0 0;">Takes only 2 minutes</p>
  </td></tr>

  <!-- INCENTIVE -->
  <tr><td style="padding:0 40px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fef9c3,#fef08a);border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 28px;text-align:center;">
        <p style="color:#854d0e;font-size:13px;font-weight:700;margin:0 0 4px;">Thank you reward</p>
        <p style="color:#713f12;font-size:22px;font-weight:900;margin:0 0 4px;">10% OFF</p>
        <p style="color:#92400e;font-size:12px;margin:0;">your next booking when you complete the survey</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#fafaf9;padding:24px 40px;text-align:center;border-top:1px solid #e7e5e4;">
    <p style="color:#a8a29e;font-size:11px;margin:0 0 8px;">
      &copy; 2026 {{hotel_name}} &bull; All rights reserved
    </p>
    <p style="margin:0;">
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Privacy</a>
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

/* ================================================================
   SPECIAL OFFER — bold discount badge, urgency timer, room showcase
   ================================================================ */
const SPECIAL_OFFER_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1c1917 0%,#292524 100%);padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <span style="display:inline-block;background:#a3e635;color:#1c1917;width:42px;height:42px;line-height:42px;text-align:center;border-radius:12px;font-weight:900;font-size:22px;">H</span>
        <span style="color:#ffffff;font-size:18px;font-weight:700;margin-left:12px;vertical-align:middle;">HIREME HOTEL</span>
      </td>
      <td style="text-align:right;">
        <span style="display:inline-block;background:#ef4444;color:#fff;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Limited Time</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- HERO WITH OFFER -->
  <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4338ca 100%);padding:48px 40px;text-align:center;">
    <p style="color:#c7d2fe;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:3px;margin:0 0 16px;">Exclusive offer for returning guests</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td style="background:rgba(255,255,255,0.15);border-radius:20px;padding:20px 40px;">
        <span style="color:#a3e635;font-size:56px;font-weight:900;letter-spacing:-2px;">25%</span>
        <span style="color:#e0e7ff;font-size:20px;font-weight:600;margin-left:8px;">OFF</span>
      </td>
    </tr></table>
    <p style="color:#c7d2fe;font-size:16px;margin:16px 0 0;">Your next stay with us</p>
  </td></tr>

  <!-- GREETING -->
  <tr><td style="padding:40px 40px 24px;">
    <h2 style="color:#1c1917;font-size:22px;font-weight:800;margin:0 0 12px;">Dear {{guest_name}},</h2>
    <p style="color:#57534e;font-size:15px;line-height:1.7;margin:0;">As a valued guest of {{hotel_name}}, we have prepared something special for your next getaway. Enjoy 25% off any room category for stays booked within the next 30 days.</p>
  </td></tr>

  <!-- ROOM SHOWCASE -->
  <tr><td style="padding:0 40px 24px;">
    <h3 style="color:#1c1917;font-size:16px;font-weight:700;margin:0 0 16px;">Featured rooms</h3>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:33%;vertical-align:top;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:14px;overflow:hidden;">
            <tr><td style="background:linear-gradient(135deg,#d9f99d,#a3e635);padding:32px 16px;text-align:center;">
              <span style="font-size:32px;">&#127968;</span>
            </td></tr>
            <tr><td style="padding:14px;">
              <p style="color:#1c1917;font-size:13px;font-weight:700;margin:0 0 2px;">Deluxe Suite</p>
              <p style="color:#78716c;font-size:11px;margin:0 0 8px;">King bed, city view, 45m&sup2;</p>
              <p style="margin:0;"><span style="color:#a8a29e;font-size:12px;text-decoration:line-through;">&#8364;280</span> <span style="color:#16a34a;font-size:14px;font-weight:800;">&#8364;210</span><span style="color:#78716c;font-size:11px;">/night</span></p>
            </td></tr>
          </table>
        </td>
        <td width="12"></td>
        <td style="width:33%;vertical-align:top;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:14px;overflow:hidden;">
            <tr><td style="background:linear-gradient(135deg,#e0e7ff,#a5b4fc);padding:32px 16px;text-align:center;">
              <span style="font-size:32px;">&#127747;</span>
            </td></tr>
            <tr><td style="padding:14px;">
              <p style="color:#1c1917;font-size:13px;font-weight:700;margin:0 0 2px;">Superior Room</p>
              <p style="color:#78716c;font-size:11px;margin:0 0 8px;">Queen bed, garden view, 32m&sup2;</p>
              <p style="margin:0;"><span style="color:#a8a29e;font-size:12px;text-decoration:line-through;">&#8364;180</span> <span style="color:#16a34a;font-size:14px;font-weight:800;">&#8364;135</span><span style="color:#78716c;font-size:11px;">/night</span></p>
            </td></tr>
          </table>
        </td>
        <td width="12"></td>
        <td style="width:33%;vertical-align:top;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:14px;overflow:hidden;">
            <tr><td style="background:linear-gradient(135deg,#fce7f3,#f9a8d4);padding:32px 16px;text-align:center;">
              <span style="font-size:32px;">&#10024;</span>
            </td></tr>
            <tr><td style="padding:14px;">
              <p style="color:#1c1917;font-size:13px;font-weight:700;margin:0 0 2px;">Penthouse</p>
              <p style="color:#78716c;font-size:11px;margin:0 0 8px;">Panoramic view, jacuzzi, 80m&sup2;</p>
              <p style="margin:0;"><span style="color:#a8a29e;font-size:12px;text-decoration:line-through;">&#8364;450</span> <span style="color:#16a34a;font-size:14px;font-weight:800;">&#8364;338</span><span style="color:#78716c;font-size:11px;">/night</span></p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- PROMO CODE -->
  <tr><td style="padding:0 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:2px dashed #d6d3d1;border-radius:14px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="color:#78716c;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 8px;">Your promo code</p>
        <p style="color:#1c1917;font-size:28px;font-weight:900;font-family:'Courier New',monospace;letter-spacing:4px;margin:0;">WELCOME25</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:0 40px 32px;text-align:center;">
    <a href="https://hireme.dev/book" style="display:inline-block;background:linear-gradient(135deg,#1c1917,#292524);color:#a3e635;padding:18px 48px;border-radius:14px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">Book Now &amp; Save</a>
  </td></tr>

  <!-- URGENCY -->
  <tr><td style="padding:0 40px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;">
      <tr><td style="padding:16px 20px;text-align:center;">
        <p style="color:#dc2626;font-size:13px;font-weight:700;margin:0;">&#9200; Offer expires in 30 days &bull; Book before availability runs out</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#fafaf9;padding:24px 40px;text-align:center;border-top:1px solid #e7e5e4;">
    <p style="color:#a8a29e;font-size:11px;margin:0 0 8px;">
      &copy; 2026 {{hotel_name}} &bull; All rights reserved
    </p>
    <p style="margin:0;">
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Privacy</a>
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Terms</a>
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

/* ================================================================
   SEASONAL / NEWSLETTER — seasonal content blocks, social, weather
   ================================================================ */
const SEASONAL_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:40px 20px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#1c1917 0%,#292524 100%);padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <span style="display:inline-block;background:#a3e635;color:#1c1917;width:42px;height:42px;line-height:42px;text-align:center;border-radius:12px;font-weight:900;font-size:22px;">H</span>
        <span style="color:#ffffff;font-size:18px;font-weight:700;margin-left:12px;vertical-align:middle;">HIREME HOTEL</span>
      </td>
      <td style="text-align:right;">
        <span style="color:#a8a29e;font-size:12px;font-weight:500;">Newsletter &bull; Spring 2026</span>
      </td>
    </tr></table>
  </td></tr>

  <!-- HERO -->
  <tr><td style="background:linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%);padding:56px 40px;text-align:center;">
    <p style="font-size:48px;margin:0 0 8px;">&#127800;</p>
    <h1 style="color:#ffffff;font-size:34px;font-weight:900;margin:0 0 8px;">Spring has arrived</h1>
    <p style="color:#a7f3d0;font-size:16px;margin:0;">New season, new experiences at {{hotel_name}}</p>
  </td></tr>

  <!-- GREETING -->
  <tr><td style="padding:40px 40px 24px;">
    <p style="color:#57534e;font-size:15px;line-height:1.7;margin:0;">Hello {{guest_name}}, spring is in full bloom and we have exciting news to share. From new wellness treatments to seasonal menus, there is something for everyone.</p>
  </td></tr>

  <!-- NEWS BLOCKS -->
  <tr><td style="padding:0 40px 24px;">

    <!-- Block 1 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td style="width:80px;vertical-align:top;">
          <div style="background:linear-gradient(135deg,#d9f99d,#a3e635);width:68px;height:68px;border-radius:16px;text-align:center;line-height:68px;font-size:28px;">&#127807;</div>
        </td>
        <td style="vertical-align:top;padding-left:16px;">
          <h3 style="color:#1c1917;font-size:16px;font-weight:700;margin:0 0 4px;">New Botanical Spa Treatment</h3>
          <p style="color:#57534e;font-size:13px;line-height:1.6;margin:0;">Rejuvenate with our new herb-infused massage using locally sourced botanicals. Available from March through June.</p>
        </td>
      </tr>
    </table>

    <!-- Block 2 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td style="width:80px;vertical-align:top;">
          <div style="background:linear-gradient(135deg,#fef08a,#facc15);width:68px;height:68px;border-radius:16px;text-align:center;line-height:68px;font-size:28px;">&#127860;</div>
        </td>
        <td style="vertical-align:top;padding-left:16px;">
          <h3 style="color:#1c1917;font-size:16px;font-weight:700;margin:0 0 4px;">Spring Tasting Menu</h3>
          <p style="color:#57534e;font-size:13px;line-height:1.6;margin:0;">Chef Martin has crafted a 7-course seasonal menu featuring wild garlic, asparagus, and Moravian wines. Reserve your table today.</p>
        </td>
      </tr>
    </table>

    <!-- Block 3 -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:80px;vertical-align:top;">
          <div style="background:linear-gradient(135deg,#bfdbfe,#60a5fa);width:68px;height:68px;border-radius:16px;text-align:center;line-height:68px;font-size:28px;">&#127947;</div>
        </td>
        <td style="vertical-align:top;padding-left:16px;">
          <h3 style="color:#1c1917;font-size:16px;font-weight:700;margin:0 0 4px;">Outdoor Activities Open</h3>
          <p style="color:#57534e;font-size:13px;line-height:1.6;margin:0;">Hiking trails, cycling routes, and our rooftop yoga sessions are back. Equipment rental available at the reception.</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:8px 40px 32px;text-align:center;">
    <a href="https://hireme.dev/book" style="display:inline-block;background:#1c1917;color:#a3e635;padding:16px 40px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;">Plan Your Spring Escape</a>
  </td></tr>

  <!-- SOCIAL -->
  <tr><td style="padding:0 40px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:14px;">
      <tr><td style="padding:20px;text-align:center;">
        <p style="color:#44403c;font-size:13px;font-weight:600;margin:0 0 12px;">Follow our journey</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td style="padding:0 6px;"><a href="#" style="display:inline-block;background:#1c1917;color:#fff;width:36px;height:36px;line-height:36px;text-align:center;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;">in</a></td>
          <td style="padding:0 6px;"><a href="#" style="display:inline-block;background:#1c1917;color:#fff;width:36px;height:36px;line-height:36px;text-align:center;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;">fb</a></td>
          <td style="padding:0 6px;"><a href="#" style="display:inline-block;background:#1c1917;color:#fff;width:36px;height:36px;line-height:36px;text-align:center;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;">ig</a></td>
          <td style="padding:0 6px;"><a href="#" style="display:inline-block;background:#1c1917;color:#fff;width:36px;height:36px;line-height:36px;text-align:center;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;">yt</a></td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#fafaf9;padding:24px 40px;text-align:center;border-top:1px solid #e7e5e4;">
    <p style="color:#a8a29e;font-size:11px;margin:0 0 8px;">
      &copy; 2026 {{hotel_name}} &bull; All rights reserved
    </p>
    <p style="margin:0;">
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Privacy</a>
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Terms</a>
      <a href="#" style="color:#78716c;text-decoration:none;font-size:11px;margin:0 8px;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

/* ================================================================
   SEED FUNCTION — re-seeds if template count < 4
   ================================================================ */
export async function seedDefaultTemplates(): Promise<void> {
  const count = await templateCount();
  if (count >= 4) return;

  // Clear old templates and re-seed
  if (count > 0) {
    await getPool().query('DELETE FROM email_templates');
  }

  await createTemplate({
    name: 'Welcome & Confirmation',
    subject: 'Your stay at {{hotel_name}} is confirmed, {{guest_name}}!',
    htmlBody: WELCOME_HTML,
    previewText: 'Reservation confirmed — check-in details inside',
  });

  await createTemplate({
    name: 'Post-Stay Feedback',
    subject: 'How was your stay, {{guest_name}}? We\'d love to know',
    htmlBody: POST_STAY_HTML,
    previewText: 'Rate your experience and get 10% off your next booking',
  });

  await createTemplate({
    name: 'Exclusive Offer',
    subject: '{{guest_name}}, 25% off your next stay at {{hotel_name}}',
    htmlBody: SPECIAL_OFFER_HTML,
    previewText: 'Limited time: 25% off any room — book now',
  });

  await createTemplate({
    name: 'Spring Newsletter',
    subject: 'What\'s new at {{hotel_name}} this spring, {{guest_name}}',
    htmlBody: SEASONAL_HTML,
    previewText: 'New spa treatments, seasonal menu & outdoor activities',
  });

  console.log('[campaigns] Seeded 4 email templates');
}
