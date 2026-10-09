import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { ApiError } from './api';
import type { Business } from './types';

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'mm_session';
export const SESSION_SECONDS = 7 * 24 * 3600;
export type AuthUser = { id: string; email: string; name: string; role: 'ADMIN' | 'BUSINESS' };
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) throw new ApiError(400, 'A valid owner email is required');
  return value.trim().toLowerCase();
}
export function validatePassword(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw new ApiError(400, 'Use a password between 12 and 128 characters');
}
export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (password.length > 128) return false;
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(key, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
export function publicUser(account: { id: string; email: string; name: string; role: string }): AuthUser {
  return { id: account.id, email: account.email, name: account.name, role: account.role as AuthUser['role'] };
}
export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.accountSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { account: true } });
  if (!session || session.expiresAt <= new Date() || !session.account.emailVerifiedAt) return null;
  return publicUser(session.account);
}
export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const user = await getCurrentUser(req);
  if (!user) throw new ApiError(401, 'Please sign in to continue');
  return user;
}
export async function requireAdmin(req: NextRequest) {
  const user = await requireUser(req);
  if (user.role !== 'ADMIN') throw new ApiError(403, 'Administrator access is required');
  return user;
}
export async function requireBusinessAccess(req: NextRequest, business: Business) {
  const user = await requireUser(req);
  if (user.role !== 'ADMIN' && business.ownerId !== user.id) throw new ApiError(403, 'You can only manage your own business');
  return user;
}
export async function newSession(accountId: string) {
  const token = randomBytes(32).toString('hex');
  await prisma.accountSession.create({ data: { accountId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) } });
  return token;
}
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
