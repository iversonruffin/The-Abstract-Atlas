// Minimal HS256 token for guests. Guests have no Cognito account, so the server
// issues its own signed token that proves "this browser owns guest profile X".

import { createHmac, timingSafeEqual } from 'node:crypto';

const GUEST_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60; // matches the 90-day expiry of guest data

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url');

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function signGuestToken(guestId: string, secret: string, nowMs: number): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const iat = Math.floor(nowMs / 1000);
  const payload = b64url(JSON.stringify({ sub: guestId, typ: 'guest', iat, exp: iat + GUEST_TOKEN_TTL_SECONDS }));
  return `${header}.${payload}.${sign(`${header}.${payload}`, secret)}`;
}

/** Returns the guest id, or null if the token is malformed, forged, or expired. */
export function verifyGuestToken(token: string, secret: string, nowMs: number): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];

  const expected = Buffer.from(sign(`${header}.${payload}`, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
      typ?: unknown;
      exp?: unknown;
    };
    if (claims.typ !== 'guest' || typeof claims.sub !== 'string' || !claims.sub.startsWith('g_')) return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < nowMs) return null;
    return claims.sub;
  } catch {
    return null;
  }
}
