// The whole API as one framework-free router, so it can run in Lambda (handler.ts)
// or be driven directly by the unit tests with an in-memory repo.
//
//   POST  /guest                              create a guest profile + guest token
//   GET   /me                                 profile, progress, badges, locations
//   PATCH /me                                 { playerName }
//   GET   /locations                          locations + whether the caller can play them
//   POST  /challenges/:hotspotId/start        begin a run, returns question 1
//   POST  /challenges/:hotspotId/answer       { attemptId, choiceIndex|null } -> result + next question
//   GET   /leaderboard/:locationId            top 10 registered players
//   POST  /account/claim                      move a guest's progress into the signed-in account
//
// Auth: signed-in users send `Authorization: Bearer <Cognito ID token>`;
//       guests send `X-Guest-Token: <token from POST /guest>`.

import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { canAccessLocation, isLocationCompleted, locationProgressPct, locationScore, locationsUnlockedBySignUp, mergeResults } from './access.js';
import { HOTSPOTS, LOCATIONS, Hotspot, getHotspot, getLocation } from './content.js';
import { HttpError } from './httpError.js';
import { signGuestToken, verifyGuestToken } from './guestToken.js';
import { Repo } from './repo.js';
import { FEEDBACK_MS, isCompleted, scoreAnswer, shuffledOrder } from './scoring.js';
import { Attempt, Caller, HotspotResult, Profile } from './types.js';
import { LIMITS, assertSaneRequest, validatePlayerName } from './validation.js';

export interface ApiDeps {
  repo: Repo;
  now: () => number;
  rand: () => number;
  newId: () => string;
  guestSecret: string;
  /** Verifies a Cognito ID token; returns null when invalid. */
  verifyUserToken: (token: string) => Promise<{ sub: string; email?: string } | null>;
}

// HttpError now lives in ./httpError.ts so validation.ts can share it.

const reply = (status: number, body: unknown): APIGatewayProxyStructuredResultV2 => ({
  statusCode: status,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export function createApi(deps: ApiDeps) {
  const { repo } = deps;

  // ------------------------------------------------------------- helpers
  async function resolveCaller(headers: Record<string, string | undefined>): Promise<Caller | null> {
    const auth = headers['authorization'];
    if (auth) {
      const token = auth.replace(/^Bearer\s+/i, '');
      const user = await deps.verifyUserToken(token);
      if (!user) throw new HttpError(401, 'INVALID_TOKEN', 'Your session has expired. Please sign in again.');
      return { kind: 'user', playerId: user.sub, email: user.email };
    }
    const guestToken = headers['x-guest-token'];
    if (guestToken) {
      const guestId = verifyGuestToken(guestToken, deps.guestSecret, deps.now());
      if (!guestId) throw new HttpError(401, 'INVALID_GUEST_TOKEN', 'Guest session is invalid. Start a new guest session.');
      return { kind: 'guest', playerId: guestId };
    }
    return null;
  }

  function requireCaller(caller: Caller | null): Caller {
    if (!caller) throw new HttpError(401, 'AUTH_REQUIRED', 'Start a guest session or sign in first.');
    return caller;
  }

  function guestName(): string {
    return `Explorer-${1000 + Math.floor(deps.rand() * 9000)}`;
  }

  async function ensureProfile(caller: Caller, fallbackName?: string): Promise<Profile> {
    const existing = await repo.getProfile(caller.playerId);
    if (existing) return existing;
    const profile: Profile = {
      playerId: caller.playerId,
      // Never derive public names from email addresses; players can pick their own with PATCH /me.
      playerName: fallbackName ?? guestName(),
      isGuest: caller.kind === 'guest',
      createdAt: deps.now(),
    };
    await repo.putProfile(profile);
    return profile;
  }

  function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
    if (!event.body) return {};
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    if (raw.length > 10_000) throw new HttpError(413, 'BODY_TOO_LARGE', 'Request body too large.');
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
      return parsed as Record<string, unknown>;
    } catch {
      throw new HttpError(400, 'BAD_JSON', 'Request body must be a JSON object.');
    }
  }

  const earnedBadges = (results: HotspotResult[]) =>
    HOTSPOTS.filter((h) => results.some((r) => r.hotspotId === h.id && r.badgeEarned)).map((h) => h.badge);

  function locationsView(caller: Caller | null, results: HotspotResult[]) {
    return LOCATIONS.map((l) => ({
      id: l.id,
      name: l.name,
      tagline: l.tagline,
      hotspotIds: l.hotspotIds,
      accessible: caller ? canAccessLocation(caller, l) : l.guestAccessible && !l.comingSoon,
      comingSoon: !!l.comingSoon,
      progressPct: locationProgressPct(l.id, results),
      completed: isLocationCompleted(l.id, results),
    }));
  }

  function questionPayload(attempt: Attempt, hotspot: Hotspot) {
    const question = hotspot.questions[attempt.questionIndex]!;
    const order = attempt.choiceOrders[attempt.questionIndex]!;
    return {
      index: attempt.questionIndex,
      total: hotspot.questions.length,
      id: question.id,
      prompt: question.prompt,
      choices: order.map((originalIndex) => question.choices[originalIndex]!),
      timeLimitSeconds: question.timeLimitSeconds,
      image: question.image,
    };
  }

  async function meView(caller: Caller, profile: Profile) {
    const results = await repo.getResults(caller.playerId);
    return {
      player: { id: profile.playerId, name: profile.playerName, isGuest: profile.isGuest },
      results,
      badges: earnedBadges(results),
      locations: locationsView(caller, results),
      ...(caller.kind === 'guest' ? { signUpUnlocks: locationsUnlockedBySignUp() } : {}),
    };
  }

  // ------------------------------------------------------------- routes
  async function route(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    const method = event.requestContext.http.method;
    const path = event.rawPath.replace(/\/+$/, '') || '/';
    const headers = event.headers as Record<string, string | undefined>;
    assertSaneRequest(path, headers); // reject absurdly long paths / tokens before doing any work
    const caller = await resolveCaller(headers);

    if (method === 'POST' && path === '/guest') {
      const playerId = `g_${deps.newId()}`;
      const profile = await ensureProfile({ kind: 'guest', playerId });
      return reply(201, {
        guestToken: signGuestToken(playerId, deps.guestSecret, deps.now()),
        player: { id: profile.playerId, name: profile.playerName, isGuest: true },
        signUpUnlocks: locationsUnlockedBySignUp(),
      });
    }

    if (method === 'GET' && path === '/me') {
      const c = requireCaller(caller);
      return reply(200, await meView(c, await ensureProfile(c)));
    }

    if (method === 'PATCH' && path === '/me') {
      const c = requireCaller(caller);
      // Length, allowed characters, and curse words / slurs are all checked in validatePlayerName.
      const trimmed = validatePlayerName(parseBody(event)['playerName']);
      const profile = await ensureProfile(c);
      await repo.putProfile({ ...profile, playerName: trimmed });
      // Keep existing leaderboard rows in sync with the new name.
      for (const total of await repo.getLocationTotals(c.playerId)) {
        await repo.putLocationTotal(c.playerId, { ...total, playerName: trimmed }, c.kind === 'guest');
      }
      return reply(200, await meView(c, { ...profile, playerName: trimmed }));
    }

    if (method === 'GET' && path === '/locations') {
      const results = caller ? await repo.getResults(caller.playerId) : [];
      return reply(200, { locations: locationsView(caller, results) });
    }

    const challenge = /^\/challenges\/([\w-]+)\/(start|answer)$/.exec(path);
    if (method === 'POST' && challenge) {
      const c = requireCaller(caller);
      const hotspot = getHotspot(challenge[1]!);
      if (!hotspot) throw new HttpError(404, 'HOTSPOT_NOT_FOUND', 'No such challenge.');
      const location = getLocation(hotspot.locationId);
      if (!location) throw new HttpError(404, 'HOTSPOT_NOT_FOUND', 'No such challenge.');
      if (!canAccessLocation(c, location)) {
        throw new HttpError(403, 'LOCATION_LOCKED', `Sign up to unlock ${location.name}.`, {
          unlockedBySignUp: locationsUnlockedBySignUp(),
        });
      }
      return challenge[2] === 'start' ? startChallenge(c, hotspot) : answerChallenge(c, hotspot, parseBody(event));
    }

    const board = /^\/leaderboard\/([\w-]+)$/.exec(path);
    if (method === 'GET' && board) {
      const location = getLocation(board[1]!);
      if (!location) throw new HttpError(404, 'LOCATION_NOT_FOUND', 'No such location.');
      return reply(200, { locationId: location.id, entries: await repo.getLeaderboard(location.id, 10) });
    }

    if (method === 'POST' && path === '/account/claim') {
      if (caller?.kind !== 'user') throw new HttpError(401, 'AUTH_REQUIRED', 'Sign in to save your guest progress.');
      return claimGuest(caller, headers['x-guest-token']);
    }

    throw new HttpError(404, 'NOT_FOUND', 'Route not found.');
  }

  // -------------------------------------------------------- challenge flow
  async function startChallenge(caller: Caller, hotspot: Hotspot) {
    await ensureProfile(caller);
    const attempt: Attempt = {
      attemptId: deps.newId(),
      hotspotId: hotspot.id,
      choiceOrders: hotspot.questions.map((q) => shuffledOrder(q.choices.length, deps.rand)),
      questionIndex: 0,
      servedAt: deps.now(),
      correct: 0,
      score: 0,
    };
    await repo.putAttempt(caller.playerId, attempt);
    return reply(200, { attemptId: attempt.attemptId, hotspotId: hotspot.id, question: questionPayload(attempt, hotspot) });
  }

  async function answerChallenge(caller: Caller, hotspot: Hotspot, body: Record<string, unknown>) {
    const { attemptId, choiceIndex } = body;
    if (typeof attemptId !== 'string' || attemptId.length > LIMITS.attemptIdMax) {
      throw new HttpError(400, 'BAD_REQUEST', 'attemptId is required.');
    }
    if (choiceIndex !== null && !Number.isInteger(choiceIndex)) {
      throw new HttpError(400, 'BAD_REQUEST', 'choiceIndex must be an integer, or null if time ran out.');
    }

    const attempt = await repo.getAttempt(caller.playerId, hotspot.id);
    if (!attempt || attempt.attemptId !== attemptId) {
      throw new HttpError(409, 'ATTEMPT_NOT_FOUND', 'This run has ended or was replaced. Start the challenge again.');
    }

    const question = hotspot.questions[attempt.questionIndex]!;
    const order = attempt.choiceOrders[attempt.questionIndex]!;
    let chosenOriginal: number | null = null;
    if (choiceIndex !== null) {
      const shown = choiceIndex as number;
      if (shown < 0 || shown >= order.length) throw new HttpError(400, 'BAD_REQUEST', 'choiceIndex out of range.');
      chosenOriginal = order[shown]!;
    }

    const outcome = scoreAnswer({
      chosenIndex: chosenOriginal,
      correctIndex: question.correctIndex,
      timeLimitSeconds: question.timeLimitSeconds,
      elapsedMs: Math.max(0, deps.now() - attempt.servedAt),
    });
    attempt.correct += outcome.correct ? 1 : 0;
    attempt.score += outcome.points;
    // The tailored line, if this question has one: a line for the picked choice wins, then right/wrong lines.
    const perChoice = chosenOriginal !== null ? question.choiceResponses?.[chosenOriginal] ?? undefined : undefined;
    const response =
      perChoice ?? (outcome.correct ? question.correctResponse : chosenOriginal !== null && !outcome.timedOut ? question.wrongResponse : undefined);
    const feedback = {
      correct: outcome.correct,
      timedOut: outcome.timedOut,
      correctIndex: order.indexOf(question.correctIndex),
      pointsAwarded: outcome.points,
      secondsLeft: outcome.secondsLeft,
      response,
    };

    if (attempt.questionIndex < hotspot.questions.length - 1) {
      attempt.questionIndex += 1;
      attempt.servedAt = deps.now() + FEEDBACK_MS;
      await repo.putAttempt(caller.playerId, attempt);
      return reply(200, { ...feedback, done: false, next: questionPayload(attempt, hotspot) });
    }

    const result = await finishChallenge(caller, hotspot, attempt);
    return reply(200, { ...feedback, done: true, result });
  }

  async function finishChallenge(caller: Caller, hotspot: Hotspot, attempt: Attempt) {
    const profile = await ensureProfile(caller);
    const total = hotspot.questions.length;
    const completed = isCompleted(attempt.correct, total);
    const fresh: HotspotResult = {
      hotspotId: hotspot.id,
      completed,
      correctAnswers: attempt.correct,
      totalQuestions: total,
      score: attempt.score,
      badgeEarned: completed,
      updatedAt: deps.now(),
    };

    const results = await repo.getResults(caller.playerId);
    const existing = results.find((r) => r.hotspotId === hotspot.id);
    const best = existing ? mergeResults(existing, fresh) : fresh;
    await repo.putResult(caller.playerId, best, caller.kind === 'guest');
    await repo.deleteAttempt(caller.playerId, hotspot.id);

    const updated = [...results.filter((r) => r.hotspotId !== hotspot.id), best];
    await repo.putLocationTotal(
      caller.playerId,
      { locationId: hotspot.locationId, playerName: profile.playerName, score: locationScore(hotspot.locationId, updated) },
      caller.kind === 'guest',
    );

    const locationCompleted = isLocationCompleted(hotspot.locationId, updated);
    return {
      hotspotId: hotspot.id,
      completed,
      correctAnswers: attempt.correct,
      totalQuestions: total,
      score: attempt.score,
      bestScore: best.score,
      isNewBest: !existing || attempt.score > existing.score,
      badgeEarned: completed,
      badge: completed ? hotspot.badge : null,
      locationId: hotspot.locationId,
      locationCompleted,
      // The "sign up to save your badges" screen for guests who finish a location.
      ...(caller.kind === 'guest' && locationCompleted
        ? {
            signUpPrompt: {
              message: 'Sign up to save your badges and unlock more places.',
              badges: earnedBadges(updated),
              unlockedLocations: locationsUnlockedBySignUp(),
            },
          }
        : {}),
    };
  }

  // ---------------------------------------------------------- guest -> account
  async function claimGuest(caller: Caller & { kind: 'user' }, guestTokenHeader: string | undefined) {
    const guestId = guestTokenHeader ? verifyGuestToken(guestTokenHeader, deps.guestSecret, deps.now()) : null;
    if (!guestId) throw new HttpError(400, 'NO_GUEST_TOKEN', 'Send the guest token (X-Guest-Token) to claim its progress.');

    const guestProfile = await repo.getProfile(guestId);
    const keepGuestName = guestProfile && !/^Explorer-\d{4}$/.test(guestProfile.playerName);
    const profile = await ensureProfile(caller, keepGuestName ? guestProfile.playerName : undefined);

    const guestResults = await repo.getResults(guestId);
    const userResults = await repo.getResults(caller.playerId);
    const merged = new Map(userResults.map((r) => [r.hotspotId, r]));
    for (const g of guestResults) {
      const existing = merged.get(g.hotspotId);
      merged.set(g.hotspotId, existing ? mergeResults(existing, g) : g);
    }
    const all = [...merged.values()];
    for (const result of all) await repo.putResult(caller.playerId, result, false);
    for (const location of LOCATIONS) {
      if (all.some((r) => getHotspot(r.hotspotId)?.locationId === location.id)) {
        await repo.putLocationTotal(
          caller.playerId,
          { locationId: location.id, playerName: profile.playerName, score: locationScore(location.id, all) },
          false,
        );
      }
    }
    await repo.deletePlayer(guestId);

    return reply(200, { claimed: guestResults.length, ...(await meView(caller, profile)) });
  }

  // ------------------------------------------------------------- entry point
  return async function handle(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try {
      return await route(event);
    } catch (err) {
      if (err instanceof HttpError) {
        return reply(err.status, { error: { code: err.code, message: err.message, ...err.extra } });
      }
      console.error('Unhandled error', err);
      return reply(500, { error: { code: 'INTERNAL', message: 'Something went wrong.' } });
    }
  };
}
