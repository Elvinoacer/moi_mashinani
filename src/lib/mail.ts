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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) throw new ApiError(503, 'Email delivery is not configured. Configure RESEND_API_KEY and EMAIL_FROM, then resend the invitation.');
  const link = `${origin}/verify?token=${encodeURIComponent(token)}`;
  const subject = purpose === 'RESET' ? 'Reset your MoiMashinani password' : 'Verify your MoiMashinani business account';
  const text = `Hello ${name},\n\n${purpose === 'RESET' ? 'Use this link to reset your password' : 'Your business account is ready. Verify your email and set up your password'}:\n${link}\n\nThis link expires in 24 hours and can be used once. After verification, sign in to manage your business details, photos, products, customer requests and promotions.\n\nIf you did not request this, you can ignore this email.\nMoiMashinani`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject, text }),
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new ApiError(503, 'The email provider did not accept the invitation');
    const result = await response.json() as { id?: unknown };
    if (typeof result.id !== 'string' || !result.id) throw new ApiError(503, 'The email provider did not accept the invitation');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, 'Email delivery is temporarily unavailable. Please resend the invitation.');
  }
}
