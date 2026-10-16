import { describe, expect, it } from 'vitest';
import { mergeResults } from '../src/access.js';
import { signGuestToken, verifyGuestToken } from '../src/guestToken.js';
import { GRACE_MS, isCompleted, scoreAnswer, shuffledOrder } from '../src/scoring.js';

describe('scoreAnswer', () => {
  const base = { correctIndex: 2, timeLimitSeconds: 10 };

  it('gives 100 + 10 per second left for a correct answer', () => {
    expect(scoreAnswer({ ...base, chosenIndex: 2, elapsedMs: 0 }).points).toBe(200);
    expect(scoreAnswer({ ...base, chosenIndex: 2, elapsedMs: 3500 }).points).toBe(100 + 6 * 10);
    expect(scoreAnswer({ ...base, chosenIndex: 2, elapsedMs: 10_000 }).points).toBe(100);
  });

  it('gives nothing for a wrong answer, a skip, or a late answer', () => {
    expect(scoreAnswer({ ...base, chosenIndex: 1, elapsedMs: 1000 }).points).toBe(0);
    expect(scoreAnswer({ ...base, chosenIndex: null, elapsedMs: 1000 }).points).toBe(0);
    const late = scoreAnswer({ ...base, chosenIndex: 2, elapsedMs: 10_000 + GRACE_MS + 1 });
    expect(late).toMatchObject({ correct: false, timedOut: true, points: 0 });
  });

  it('allows a little network slack just past the limit', () => {
    expect(scoreAnswer({ ...base, chosenIndex: 2, elapsedMs: 10_000 + GRACE_MS }).correct).toBe(true);
  });
});

describe('completion + shuffle', () => {
  it('matches the frontend rule: at least one correct answer', () => {
    expect(isCompleted(0, 5)).toBe(false);
    expect(isCompleted(1, 5)).toBe(true);
  });

  it('shuffledOrder is a permutation', () => {
    const order = shuffledOrder(4);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('guest tokens', () => {
  const secret = 'a'.repeat(40);
  const now = 1_700_000_000_000;

  it('round-trips', () => {
    expect(verifyGuestToken(signGuestToken('g_abc', secret, now), secret, now + 1000)).toBe('g_abc');
  });

  it('rejects wrong secret, tampering, expiry, and non-guest subjects', () => {
    const token = signGuestToken('g_abc', secret, now);
    expect(verifyGuestToken(token, 'b'.repeat(40), now)).toBeNull();
    const [h, p, s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'g_other', typ: 'guest', exp: 9_999_999_999 })).toString('base64url');
    expect(verifyGuestToken(`${h}.${forged}.${s}`, secret, now)).toBeNull();
    expect(verifyGuestToken(token, secret, now + 91 * 24 * 3600 * 1000)).toBeNull();
    expect(verifyGuestToken(signGuestToken('user-123', secret, now), secret, now)).toBeNull();
    expect(verifyGuestToken('nonsense', secret, now)).toBeNull();
    expect(p).toBeTruthy();
  });
});

describe('mergeResults', () => {
  it('keeps best score, and the union of completion and badges', () => {
    const a = { hotspotId: 'x', completed: false, correctAnswers: 0, totalQuestions: 5, score: 300, badgeEarned: false, updatedAt: 1 };
    const b = { hotspotId: 'x', completed: true, correctAnswers: 2, totalQuestions: 5, score: 250, badgeEarned: true, updatedAt: 2 };
    expect(mergeResults(a, b)).toMatchObject({ score: 300, completed: true, badgeEarned: true, correctAnswers: 2, updatedAt: 2 });
  });
});
