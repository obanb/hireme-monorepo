import { authConfig } from './config';

let resendClient: any = null;

async function getResend() {
  if (!authConfig.resendApiKey) return null;
  if (!resendClient) {
    const { Resend } = await import('resend');
    resendClient = new Resend(authConfig.resendApiKey);
  }
  return resendClient;
}

export async function sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
  const verifyUrl = `${authConfig.frontendUrl}/verify-email?token=${token}`;
  const resend = await getResend();

  if (!resend) {
    console.log(`[auth:email] Verification email for ${email}:`);
    console.log(`  URL: ${verifyUrl}`);
    return;
  }

  await resend.emails.send({
    from: 'HireMe Hotel CMS <noreply@hireme.dev>',
    to: email,
    subject: 'Verify your email',
    html: `<p>Hi ${name},</p><p>Click the link below to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
}

export async function sendReceptionEmail(
  to: string,
  toName: string | null,
  subject: string,
  body: string,
): Promise<void> {
  const resend = await getResend();
  const htmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  if (!resend) {
    console.log(`[reception:email] Would send email to ${to} — Subject: ${subject}`);
    console.log(`  Body: ${body}`);
    return;
  }

  await resend.emails.send({
    from: 'HireMe Reception <reception@hireme.dev>',
    to,
    subject,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
      ${toName ? `<p>Dear ${toName},</p>` : ''}
      <div>${htmlBody}</div>
      <hr style="margin-top:32px;border:none;border-top:1px solid #eee;">
      <p style="color:#999;font-size:12px;">This message was sent from the hotel reception.</p>
    </div>`,
  });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
  const resetUrl = `${authConfig.frontendUrl}/reset-password?token=${token}`;
  const resend = await getResend();

  if (!resend) {
    console.log(`[auth:email] Password reset email for ${email}:`);
    console.log(`  URL: ${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: 'HireMe Hotel CMS <noreply@hireme.dev>',
    to: email,
    subject: 'Reset your password',
    html: `<p>Hi ${name},</p><p>Click the link below to reset your password (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}
