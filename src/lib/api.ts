import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  console.error('API request failed', error instanceof Error ? error.message : 'Unknown error');
  return NextResponse.json({ error: 'The request could not be completed. Please try again.' }, { status: 500 });
}
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const allowed = process.env.APP_URL ? new URL(process.env.APP_URL).origin : new URL(req.url).origin;
  if (origin && origin !== allowed && origin !== new URL(req.url).origin) throw new ApiError(403, 'Request origin is not allowed');
  if (req.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'Cross-site requests are not allowed');
}
export function textField(value: unknown, label: string, max = 1000, required = false): string {
  if (value === undefined || value === null) { if (required) throw new ApiError(400, `${label} is required`); return ''; }
  if (typeof value !== 'string' || value.length > max) throw new ApiError(400, `${label} must be text, at most ${max} characters`);
  const text = value.trim();
  if (required && !text) throw new ApiError(400, `${label} is required`);
  return text;
}
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  if (Number(req.headers.get('content-length') || 0) > 65536) throw new ApiError(413, 'Request is too large');
  const text = await req.text();
  if (text.length > 65536) throw new ApiError(413, 'Request is too large');
  const body = JSON.parse(text);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'Expected an object');
  return body;
}
