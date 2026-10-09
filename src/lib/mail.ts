import nodemailer from 'nodemailer';
import { ApiError } from './api';

export function applicationUrl() {
  const configured = process.env.APP_URL;
  if (!configured) throw new ApiError(503, 'APP_URL and email delivery must be configured before sending invitations');
  const url = new URL(configured);
  if (url.username || url.password || (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost','127.0.0.1'].includes(url.hostname)))) throw new ApiError(503, 'APP_URL must use HTTPS');
  return url.origin;
}
export async function sendVerificationEmail(email: string, name: string, token: string, purpose: string) {
  const origin = applicationUrl();
  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) throw new ApiError(503, 'Email delivery is not configured. Configure SMTP_HOST and MAIL_FROM, then resend the invitation.');
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port,
    secure: port === 465,
    requireTLS: process.env.NODE_ENV === 'production' || process.env.SMTP_REQUIRE_TLS === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  const link = `${origin}/verify?token=${encodeURIComponent(token)}`;
  const subject = purpose === 'RESET' ? 'Reset your MoiMashinani password' : 'Verify your MoiMashinani business account';
  const text = `Hello ${name},\n\n${purpose === 'RESET' ? 'Use this link to reset your password' : 'Your business account is ready. Verify your email and set up your password'}:\n${link}\n\nThis link expires in 24 hours and can be used once. After verification, sign in to manage your business details, photos, products, customer requests and promotions.\n\nIf you did not request this, you can ignore this email.\nMoiMashinani`;
  const result = await transport.sendMail({ from: process.env.MAIL_FROM, to: email, subject, text });
  if (!result.accepted?.length) throw new ApiError(503, 'The email provider did not accept the invitation');
}
