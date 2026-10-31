import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApi } from '../src/api.js';
import { getHotspot } from '../src/content.js';
import { MemoryRepo } from './memoryRepo.js';

const SECRET = 'x'.repeat(40);

let repo: MemoryRepo;
let clock: number;
let idCounter: number;
let api: ReturnType<typeof createApi>;

beforeEach(() => {
  repo = new MemoryRepo();
  clock = 1_700_000_000_000;
  idCounter = 0;
  api = createApi({
    repo,
    now: () => clock,
    rand: () => 0.5,
    newId: () => `id${++idCounter}`,
    guestSecret: SECRET,
    // Test "Cognito": token "user:<sub>:<email>" is valid.
    verifyUserToken: async (token) => {
      const [kind, sub, email] = token.split(':');
      return kind === 'user' && sub ? { sub, email } : null;
    },
  });
});

async function call(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string> } = {}) {
  const event = {
    rawPath: path,
    headers: opts.headers ?? {},
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    isBase64Encoded: false,
    requestContext: { http: { method } },
  } as unknown as APIGatewayProxyEventV2;
  const res = (await api(event)) as { statusCode: number; body: string };
  return { status: res.statusCode, json: JSON.parse(res.body) as any };
}

async function newGuest() {
  const res = await call('POST', '/guest');
  expect(res.status).toBe(201);
  return { 'x-guest-token': res.json.guestToken as string };
}

const user = (sub: string, email = `${sub}@example.com`) => ({ authorization: `Bearer user:${sub}:${email}` });

/** Plays a whole hotspot run, answering every question correctly after `secondsPerQuestion`. */
async function playRun(headers: Record<string, string>, hotspotId: string, opts: { allCorrect?: boolean; secondsPerQuestion?: number } = {}) {
  const { allCorrect = true, secondsPerQuestion = 2 } = opts;
  const hotspot = getHotspot(hotspotId)!;
  const start = await call('POST', `/challenges/${hotspotId}/start`, { headers });
  expect(start.status).toBe(200);
  const attemptId = start.json.attemptId as string;
  let question = start.json.question;
  let last: any;
  for (let i = 0; i < hotspot.questions.length; i++) {
    const original = hotspot.questions.find((q) => q.id === question.id)!;
    const correctText = original.choices[original.correctIndex];
    const choiceIndex = allCorrect ? question.choices.indexOf(correctText) : (question.choices.indexOf(correctText) + 1) % question.choices.length;
    clock += secondsPerQuestion * 1000;
    last = await call('POST', `/challenges/${hotspotId}/answer`, { headers, body: { attemptId, choiceIndex } });
    expect(last.status).toBe(200);
    question = last.json.next;
  }
  expect(last.json.done).toBe(true);
  return last.json;
}

describe('guest flow', () => {
  it('creates a guest who can play only Federal Hill', async () => {
    const guest = await newGuest();
    const { json } = await call('GET', '/locations', { headers: guest });
    const byId = Object.fromEntries(json.locations.map((l: any) => [l.id, l.accessible]));
    expect(byId).toEqual({ 'federal-hill': true, 'inner-harbor': false, pigtown: false });
  });

  it('blocks guests from other locations with the list of what signing up unlocks', async () => {
    const guest = await newGuest();
    const res = await call('POST', '/challenges/inner-harbor-beacon/start', { headers: guest });
    expect(res.status).toBe(403);
    expect(res.json.error.code).toBe('LOCATION_LOCKED');
    expect(res.json.error.unlockedBySignUp.map((l: any) => l.id)).toEqual(['inner-harbor', 'pigtown']);
  });

  it('never sends correct answers to the client when a run starts', async () => {
    const guest = await newGuest();
    const start = await call('POST', '/challenges/federal-hill-beacon/start', { headers: guest });
    expect(JSON.stringify(start.json)).not.toContain('correctIndex');
    expect(start.json.question.choices).toHaveLength(4);
  });

  it('scores on the server: 100 + 10/sec left, perfect run at 2s each = 5 * 180', async () => {
    const guest = await newGuest();
    const result = (await playRun(guest, 'federal-hill-beacon')).result;
    expect(result).toMatchObject({ correctAnswers: 5, totalQuestions: 5, score: 900, completed: true, badgeEarned: true });
    expect(result.badge.id).toBe('hilltop-adventurer');
  });

  it('shows the sign-up prompt with unlocked locations when a guest completes Federal Hill', async () => {
    const guest = await newGuest();
    const result = (await playRun(guest, 'federal-hill-beacon')).result;
    expect(result.locationCompleted).toBe(true);
    expect(result.signUpPrompt.badges.map((b: any) => b.id)).toEqual(['hilltop-adventurer']);
    expect(result.signUpPrompt.unlockedLocations.map((l: any) => l.name)).toEqual(['Inner Harbor', 'Pigtown']);
  });

  it('does not show the sign-up prompt to signed-in users', async () => {
    const result = (await playRun(user('u1'), 'federal-hill-beacon')).result;
    expect(result.signUpPrompt).toBeUndefined();
  });

  it('ignores answers that arrive after the time limit', async () => {
    const guest = await newGuest();
    const start = await call('POST', '/challenges/federal-hill-beacon/start', { headers: guest });
    clock += 30_000;
    const res = await call('POST', '/challenges/federal-hill-beacon/answer', {
      headers: guest,
      body: { attemptId: start.json.attemptId, choiceIndex: 0 },
    });
    expect(res.json).toMatchObject({ correct: false, timedOut: true, pointsAwarded: 0 });
  });

  it('rejects answers for a replaced or unknown attempt', async () => {
    const guest = await newGuest();
    const first = await call('POST', '/challenges/federal-hill-beacon/start', { headers: guest });
    await call('POST', '/challenges/federal-hill-beacon/start', { headers: guest });
    const res = await call('POST', '/challenges/federal-hill-beacon/answer', {
      headers: guest,
      body: { attemptId: first.json.attemptId, choiceIndex: 0 },
    });
    expect(res.status).toBe(409);
  });

  it('rejects forged guest tokens and requests with no identity', async () => {
    expect((await call('GET', '/me', { headers: { 'x-guest-token': 'bad.token.here' } })).status).toBe(401);
    expect((await call('GET', '/me')).status).toBe(401);
  });
});

describe('question timing', () => {
  it('does not charge the 0.9s feedback pause against the next question', async () => {
    const headers = user('timer');
    const start = await call('POST', '/challenges/federal-hill-beacon/start', { headers });
    const hs = getHotspot('federal-hill-beacon')!;
    const answer = async (q: any, idx: number) =>
      call('POST', '/challenges/federal-hill-beacon/answer', { headers, body: { attemptId: start.json.attemptId, choiceIndex: idx } });
    const correctShown = (q: any) => q.choices.indexOf(hs.questions.find((x) => x.id === q.id)!.choices[hs.questions.find((x) => x.id === q.id)!.correctIndex]);

    clock += 1000; // Q1 answered after 1s -> 100 + 9*10
    const r1 = await answer(start.json.question, correctShown(start.json.question));
    expect(r1.json.pointsAwarded).toBe(190);

    clock += 900; // client is still showing feedback; Q2 has not even appeared yet
    const r2 = await answer(r1.json.next, correctShown(r1.json.next));
    expect(r2.json.pointsAwarded).toBe(200); // elapsed clamps to 0, full 10s left
  });
});

describe('accounts and leaderboard', () => {
  it('lets signed-in users play every location', async () => {
    const res = await call('POST', '/challenges/pigtown-beacon/start', { headers: user('u1') });
    expect(res.status).toBe(200);
  });

  it('keeps only the best score per hotspot', async () => {
    const headers = user('u1');
    await playRun(headers, 'federal-hill-beacon', { secondsPerQuestion: 2 }); // 900
    const worse = (await playRun(headers, 'federal-hill-beacon', { secondsPerQuestion: 8 })).result; // 5 * 120
    expect(worse).toMatchObject({ score: 600, bestScore: 900, isNewBest: false });
  });

  it('ranks registered players and leaves guests off the leaderboard', async () => {
    await call('PATCH', '/me', { headers: user('fast', 'fast@example.com'), body: { playerName: 'fast' } });
    await call('PATCH', '/me', { headers: user('slow', 'slow@example.com'), body: { playerName: 'slow' } });
    await playRun(user('fast', 'fast@example.com'), 'federal-hill-beacon', { secondsPerQuestion: 1 });
    await playRun(user('slow', 'slow@example.com'), 'federal-hill-beacon', { secondsPerQuestion: 7 });
    await playRun(await newGuest(), 'federal-hill-beacon', { secondsPerQuestion: 0 });
    const board = await call('GET', '/leaderboard/federal-hill');
    expect(board.json.entries.map((e: any) => [e.rank, e.playerName])).toEqual([
      [1, 'fast'],
      [2, 'slow'],
    ]);
  });

  it('validates display names and updates leaderboard rows when renamed', async () => {
    const headers = user('u1', 'someone@example.com');
    await playRun(headers, 'federal-hill-beacon');
    expect((await call('PATCH', '/me', { headers, body: { playerName: 'x' } })).status).toBe(400);
    expect((await call('PATCH', '/me', { headers, body: { playerName: '<script>' } })).status).toBe(400);
    expect((await call('PATCH', '/me', { headers, body: { playerName: 'Crab Cakes' } })).status).toBe(200);
    const board = await call('GET', '/leaderboard/federal-hill');
    expect(board.json.entries[0].playerName).toBe('Crab Cakes');
  });
});

describe('claiming guest progress on sign-up', () => {
  it('moves the guest badge and score into the new account and puts it on the leaderboard', async () => {
    const guest = await newGuest();
    await playRun(guest, 'federal-hill-beacon');

    const claim = await call('POST', '/account/claim', { headers: { ...user('newbie', 'newbie@example.com'), ...guest } });
    expect(claim.status).toBe(200);
    expect(claim.json.claimed).toBe(1);
    expect(claim.json.badges.map((b: any) => b.id)).toEqual(['hilltop-adventurer']);
    expect(claim.json.player.isGuest).toBe(false);
    expect(claim.json.player.name).toMatch(/^Explorer-\d{4}$/); // never derived from the email

    const board = await call('GET', '/leaderboard/federal-hill');
    expect(board.json.entries).toHaveLength(1);
    expect(board.json.entries[0]).toMatchObject({ rank: 1, score: 900 });
    expect(JSON.stringify(board.json)).not.toContain('newbie');

    // The guest profile is gone, and the guest can no longer see old progress.
    const guestMe = await call('GET', '/me', { headers: guest });
    expect(guestMe.json.results).toEqual([]);
  });

  it('merges with an existing account, keeping the best of each', async () => {
    const guest = await newGuest();
    await playRun(guest, 'federal-hill-beacon', { secondsPerQuestion: 1 }); // 950
    const headers = user('vet', 'vet@example.com');
    await playRun(headers, 'federal-hill-beacon', { secondsPerQuestion: 6 }); // 700
    await playRun(headers, 'pigtown-beacon', { secondsPerQuestion: 2 });

    const claim = await call('POST', '/account/claim', { headers: { ...headers, ...guest } });
    const fh = claim.json.results.find((r: any) => r.hotspotId === 'federal-hill-beacon');
    expect(fh.score).toBe(950);
    expect(claim.json.badges).toHaveLength(2);
  });

  it('keeps a name the guest chose, and requires both identities', async () => {
    const guest = await newGuest();
    await call('PATCH', '/me', { headers: guest, body: { playerName: 'Hon' } });
    const claim = await call('POST', '/account/claim', { headers: { ...user('n1'), ...guest } });
    expect(claim.json.player.name).toBe('Hon');

    expect((await call('POST', '/account/claim', { headers: guest })).status).toBe(401);
    expect((await call('POST', '/account/claim', { headers: user('n2') })).status).toBe(400);
  });
});
