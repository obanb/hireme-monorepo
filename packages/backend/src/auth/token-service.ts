import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { CookieOptions } from 'express';
import { authConfig } from './config';

export interface TokenPayload {
  userId: string;
  role: string;
}

export const COOKIE_ACCESS = 'hireme_access_token';
export const COOKIE_REFRESH = 'hireme_refresh_token';

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, authConfig.jwtSecret, { expiresIn: '15m' as const });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, authConfig.jwtRefreshSecret, { expiresIn: '7d' as const });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, authConfig.jwtSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, authConfig.jwtRefreshSecret) as TokenPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const isProduction = process.env.NODE_ENV === 'production';

export function accessCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes
  };
}

export function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: authConfig.refreshTokenTtlMs,
  };
}

export function clearCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}
