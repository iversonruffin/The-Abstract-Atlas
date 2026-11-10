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

import { containsProfanity, validatePlayerName } from '../src/validation.js';
import { HOTSPOTS as ALL_HOTSPOTS, LOCATIONS as ALL_LOCATIONS } from '../src/content.js';

describe('player name rules', () => {
  it('accepts normal names', () => {
    for (const n of ['Crab Cake', "O'Malley", 'Mr. T', 'Queen_City-1', 'José']) expect(validatePlayerName(n)).toBe(n);
  });
  it('rejects curse words, slurs and common disguises', () => {
    for (const n of ['shit', 'sh1t', 'f u c k', 's.h.i.t', 'b_i_t_c_h', 'n1gger', 'FUCK']) {
      expect(() => validatePlayerName(n), n).toThrow(/offensive/);
    }
  });
  it('does not block innocent look-alikes', () => {
    for (const n of ['Scunthorpe', 'Assistant', 'Class', 'Charlotte']) expect(containsProfanity(n), n).toBe(false);
  });
  it('rejects markup, injection characters, control characters, and long text', () => {
    for (const n of ['<script>alert(1)</script>', "Robert'); DROP TABLE", 'a{b}', '${x}', 'a;b', 'name\u0000x', 'zero​width', 'a'.repeat(21), '', ' ', '__', '--', '../etc'])
      expect(() => validatePlayerName(n), JSON.stringify(n)).toThrow();
  });
  it('rejects non-strings', () => {
    for (const n of [undefined, null, 5, {}, ['a'], true]) expect(() => validatePlayerName(n)).toThrow();
  });
});

describe('content integrity', () => {
  it('every location hotspot exists, and ids are unique', () => {
    for (const l of ALL_LOCATIONS) for (const id of l.hotspotIds) expect(ALL_HOTSPOTS.find((h) => h.id === id)?.locationId).toBe(l.id);
    const ids = ALL_HOTSPOTS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
    const badges = ALL_HOTSPOTS.map((h) => h.badge.id);
    expect(new Set(badges).size).toBe(badges.length);
  });
  it('every question has a valid correct answer and 4 distinct choices', () => {
    for (const h of ALL_HOTSPOTS) {
      // Question counts vary per location now (Ridgely's has 4, Uptown 7); every challenge needs at least 3.
      expect(h.questions.length).toBeGreaterThanOrEqual(3);
      for (const q of h.questions) {
        expect(q.choices.length).toBe(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
      }
    }
  });
});

import { readFileSync } from 'node:fs';
import { allowed as okNames, badShape as shapeNames, blocked as badNames } from './nameCases.js';

describe('name case lists (test/nameCases.ts)', () => {
  it('blocked names are refused', () => { for (const n of badNames) expect(() => validatePlayerName(n), n).toThrow(); });
  it('allowed names are accepted', () => { for (const n of okNames) expect(() => validatePlayerName(n), n).not.toThrow(); });
  it('badly shaped names are refused', () => { for (const n of shapeNames) expect(() => validatePlayerName(n), JSON.stringify(n)).toThrow(); });
  it('the browser copy of nameRules matches the server copy', () => {
    const a = readFileSync(new URL('../src/nameRules.ts', import.meta.url), 'utf8');
    const b = readFileSync(new URL('../../baltimore-artifact-hunt/src/app/utils/name-rules.ts', import.meta.url), 'utf8');
    expect(b).toBe(a);
  });
});
