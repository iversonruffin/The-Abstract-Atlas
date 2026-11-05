// Input rules shared by every endpoint. The browser checks the same things for friendly messages
// (baltimore-artifact-hunt/src/app/utils/input-guard.ts), but THIS file is the one that counts:
// anything a person (or a script) sends to the API passes through here.
//
// Why these rules stop injection: the API never builds queries or HTML from text a person types.
// Names are stored as DynamoDB *values* (never as part of a key or an expression) and the site
// prints them with Angular's escaping. On top of that, we only accept a small safe alphabet and
// short lengths, so odd input is rejected before it is stored anywhere.

import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';
import { HttpError } from './httpError.js';

export const NAME_MIN = 2;
export const NAME_MAX = 20;
/** Letters, numbers, space and _ . ' - only. No < > & " / \ ; = ( ) { } or control/invisible characters. */
export const NAME_PATTERN = /^[\p{L}\p{N} _.'-]+$/u;

const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

/** True if the text contains a curse word or slur, including spaced-out / symbol-swapped versions. */
export function containsProfanity(text: string): boolean {
  const folded = text.normalize('NFKC');
  if (matcher.hasMatch(folded)) return true;
  // Catch "f u c k", "s.h.i.t" and "b_i_t_c_h": run the filter again with separators removed.
  const squashed = folded.replace(/[\s_.'-]+/g, '');
  return squashed !== folded && matcher.hasMatch(squashed);
}

/** Returns the cleaned name, or throws a 400 BAD_NAME with a message that is safe to show people. */
export function validatePlayerName(input: unknown): string {
  if (typeof input !== 'string') throw new HttpError(400, 'BAD_NAME', 'playerName is required.');
  // Collapse runs of spaces so "A    B" and "A B" are the same name.
  const name = input.normalize('NFKC').trim().replace(/ {2,}/g, ' ');
  if (name.length < NAME_MIN || name.length > NAME_MAX || !NAME_PATTERN.test(name)) {
    throw new HttpError(400, 'BAD_NAME', "Names are 2-20 characters: letters, numbers, spaces, and _ . ' -");
  }
  if (!/[\p{L}\p{N}]/u.test(name)) {
    throw new HttpError(400, 'BAD_NAME', 'Names need at least one letter or number.');
  }
  if (containsProfanity(name)) {
    throw new HttpError(400, 'BAD_NAME', 'Please choose a name without offensive language.');
  }
  return name;
}

// ---- Limits applied to everything else the API reads --------------------------------------------
export const LIMITS = {
  /** API Gateway paths we serve are all short. */
  pathMax: 200,
  /** Guest tokens are ~150 chars; Cognito ID tokens are 1-2 KB. */
  guestTokenMax: 512,
  authorizationMax: 4096,
  attemptIdMax: 64,
};

export function assertSaneRequest(path: string, headers: Record<string, string | undefined>): void {
  if (path.length > LIMITS.pathMax) throw new HttpError(414, 'PATH_TOO_LONG', 'Request path too long.');
  const guest = headers['x-guest-token'];
  if (guest !== undefined && guest.length > LIMITS.guestTokenMax) {
    throw new HttpError(400, 'BAD_REQUEST', 'Invalid guest token.');
  }
  const auth = headers['authorization'];
  if (auth !== undefined && auth.length > LIMITS.authorizationMax) {
    throw new HttpError(400, 'BAD_REQUEST', 'Invalid authorization header.');
  }
}
