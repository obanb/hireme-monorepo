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
