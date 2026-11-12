// The two lists you tweak. Plain data, no logic.
// The browser has an identical copy (baltimore-artifact-hunt/src/app/utils/name-rules.ts);
// a test fails if the two copies drift apart, so edit both (or copy this file over the other).
//
// PATTERN SYNTAX (from the "obscenity" package):
//   word        matches anywhere, even inside other words ("ass" would also hit "Classic": avoid!)
//   |word|      whole word only ("|ass|" matches "ass" but not "Classic")
//   |word       must START a word      word|   must END a word
//   wo[r]d      [ ] = optional: matches both "word" and "wod"
//   f?ck        ?   = any one character: matches "fuck", "fack", "f@ck" (but not "fck")
// Matching already ignores capitals, repeated letters ("fuuuck") and look-alike symbols ("sh1t", "@ss").

/** Extra things to block, on top of the package's built-in English list. */
export const EXTRA_BLOCKED: string[] = [
  // The package only catches words that stand alone, so glued-together compounds slip through.
  // These are safe to match anywhere because no ordinary name or word contains them.
  'asshole',
  'dumbass',
  'jackass',
  'bullshit',
  'motherfuck',
  '|jew|',

  // '|examplebadword|',   <- whole-word form, for short words that appear inside innocent ones
];

/**
 * Words that are fine even though the filter might flag them (whole text must match one of these,
 * or contain it, for the flag to be ignored). Use this when a real name gets blocked by mistake.
 */
export const ALLOWED_WORDS: string[] = [
  // 'examplename',
];
