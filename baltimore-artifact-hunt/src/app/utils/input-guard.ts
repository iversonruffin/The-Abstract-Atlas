// Browser-side checks for every text field, so people get a friendly message right away.
// The server (server/src/validation.ts) repeats the important ones and is the real gatekeeper.
//
// Angular already escapes anything it prints, and nothing here is ever put into HTML, a URL or a
// query. These checks add a second layer: short lengths and a small safe alphabet.

import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

export const MAX_EMAIL = 254;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;
export const NAME_MIN = 2;
export const NAME_MAX = 20;

const NAME_PATTERN = /^[\p{L}\p{N} _.'-]+$/u;
/** Plain addresses only: no spaces, quotes, angle brackets or other markup characters. */
const EMAIL_PATTERN = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// eslint-disable-next-line no-control-regex
// Built from hex ranges so the invisible characters are never typed into this file:
// C0/C1 control characters, zero-width and direction marks, line/paragraph separators, BOM.
const CONTROL_RANGES = ['0000-001f', '007f-009f', '200b-200f', '2028-202e', '2060-206f', 'feff-feff'];
const CONTROL_CHARS = new RegExp(
  '[' + CONTROL_RANGES.map((r) => r.split('-').map((h) => String.fromCharCode(parseInt(h, 16))).join('-')).join('') + ']',
);

const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

export function containsProfanity(text: string): boolean {
  const folded = text.normalize('NFKC');
  if (matcher.hasMatch(folded)) return true;
  const squashed = folded.replace(/[\s_.'-]+/g, ''); // catches "f u c k", "s.h.i.t"
  return squashed !== folded && matcher.hasMatch(squashed);
}

/** Returns an error message, or '' when the value is fine. */
export function checkEmail(value: string): string {
  const v = value.trim();
  if (v.length > MAX_EMAIL || !EMAIL_PATTERN.test(v)) return 'Please enter a valid email address.';
  return '';
}

export function checkPlayerName(value: string): string {
  const v = value.normalize('NFKC').trim().replace(/ {2,}/g, ' ');
  if (v.length < NAME_MIN || v.length > NAME_MAX || !NAME_PATTERN.test(v) || !/[\p{L}\p{N}]/u.test(v)) {
    return "Player names are 2–20 characters: letters, numbers, spaces, and _ . ' -";
  }
  if (containsProfanity(v)) return 'Please choose a name without offensive language.';
  return '';
}

export function checkPassword(value: string): string {
  if (value.length > MAX_PASSWORD || CONTROL_CHARS.test(value)) {
    return `Passwords can be up to ${MAX_PASSWORD} characters and can't include hidden characters.`;
  }
  if (value.length < MIN_PASSWORD || !/[a-z]/.test(value) || !/\d/.test(value)) {
    return 'Password needs at least 8 characters, a lowercase letter, and a number.';
  }
  return '';
}

/** For the log-in form: don't enforce the sign-up rules on old passwords, just keep input sane. */
export function checkLoginPassword(value: string): string {
  if (!value || value.length > MAX_PASSWORD || CONTROL_CHARS.test(value)) return 'Enter your email and password.';
  return '';
}

export function checkConfirmCode(value: string): string {
  return /^\d{6}$/.test(value.trim()) ? '' : 'Enter the 6-digit code from the email.';
}
