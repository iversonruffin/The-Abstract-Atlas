// Tests the REAL DynamoRepo (the code that talks to DynamoDB) against a tiny in-memory fake of the
// DynamoDB client. The other API tests use MemoryRepo, which can't catch bugs in how items are
// stored, such as the one that lost a guest's progress when they signed up.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { createApi } from '../src/api.js';
import { getHotspot } from '../src/content.js';
import { DynamoRepo } from '../src/dynamoRepo.js';
import { HotspotResult } from '../src/types.js';
import { FakeDoc } from './fakeDoc.js';

const result: HotspotResult = {
  hotspotId: 'federal-hill-beacon',
  completed: true,
  correctAnswers: 5,
  totalQuestions: 5,
  score: 950,
  badgeEarned: true,
  updatedAt: 1,
};

describe('DynamoRepo item storage', () => {
  it('a result read back from the database can be written to ANOTHER player without moving or leaking keys', async () => {
    const doc = new FakeDoc();
    const repo = new DynamoRepo('T', doc as any);
    await repo.putResult('g_1', result, true);

    const [fromGuest] = await repo.getResults('g_1');
    expect(fromGuest).toEqual(result); // no PK/SK/ttl leaking out of the repo

    await repo.putResult('user-1', fromGuest!, false);
    expect(await repo.getResults('user-1')).toEqual([result]);

    // An account's results must not inherit the guest's 90-day expiry.
    expect(doc.items.get(doc.key('PLAYER#user-1', 'RESULT#federal-hill-beacon'))?.['ttl']).toBeUndefined();

    // Removing the guest afterwards must not remove the copy.
    await repo.deletePlayer('g_1');
    expect(await repo.getResults('g_1')).toEqual([]);
    expect(await repo.getResults('user-1')).toEqual([result]);
  });

  it('profiles read back without database keys too', async () => {
    const repo = new DynamoRepo('T', new FakeDoc() as any);
    const profile = { playerId: 'user-1', playerName: 'Crab Cake', isGuest: false, createdAt: 5 };
    await repo.putProfile(profile);
    expect(await repo.getProfile('user-1')).toEqual(profile);
  });
});

describe('guest -> account claim against the real DynamoRepo', () => {
  it('keeps the guest badge and score, and puts the new account on the leaderboard', async () => {
    const doc = new FakeDoc();
    let clock = 1_700_000_000_000;
    let n = 0;
    const api = createApi({
      repo: new DynamoRepo('T', doc as any),
      now: () => clock,
      rand: () => 0.5,
      newId: () => `id${++n}`,
      guestSecret: 'x'.repeat(40),
      verifyUserToken: async (token) => {
        const [kind, sub, email] = token.split(':');
        return kind === 'user' && sub ? { sub, email } : null;
      },
    });
    const call = async (method: string, path: string, headers: Record<string, string> = {}, body?: unknown) => {
      const res = (await api({
        rawPath: path,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        isBase64Encoded: false,
        requestContext: { http: { method } },
      } as unknown as APIGatewayProxyEventV2)) as { statusCode: number; body: string };
      return { status: res.statusCode, json: JSON.parse(res.body) as any };
    };

    // Guest plays Federal Hill perfectly.
    const guest = { 'x-guest-token': (await call('POST', '/guest')).json.guestToken as string };
    const hotspot = getHotspot('federal-hill-beacon')!;
    const start = await call('POST', '/challenges/federal-hill-beacon/start', guest);
    let question = start.json.question;
    for (let i = 0; i < hotspot.questions.length; i++) {
      const original = hotspot.questions.find((q) => q.id === question.id)!;
      const choiceIndex = question.choices.indexOf(original.choices[original.correctIndex]);
      clock += 2000;
      const res = await call('POST', '/challenges/federal-hill-beacon/answer', guest, { attemptId: start.json.attemptId, choiceIndex });
      question = res.json.next;
    }

    // Sign up (an account), claim the guest's progress.
    const user = { authorization: 'Bearer user:user-1:me@example.com' };
    const claim = await call('POST', '/account/claim', { ...user, ...guest });
    expect(claim.status).toBe(200);
    expect(claim.json.claimed).toBe(1);
    expect(claim.json.badges.map((b: any) => b.id)).toEqual(['hilltop-adventurer']);

    // It sticks: a fresh request as the account still has the badge and score.
    const me = await call('GET', '/me', user);
    expect(me.json.results).toHaveLength(1);
    expect(me.json.results[0]).toMatchObject({ hotspotId: 'federal-hill-beacon', completed: true, badgeEarned: true, score: 900 });
    expect(doc.items.get(doc.key('PLAYER#user-1', 'RESULT#federal-hill-beacon'))?.['ttl']).toBeUndefined();

    const board = await call('GET', '/leaderboard/federal-hill');
    expect(board.json.entries).toHaveLength(1);
    expect(board.json.entries[0].score).toBe(900);
  });
});
