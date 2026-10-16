// Who can play what.
//   Guests:   only locations marked guestAccessible (Federal Hill).
//   Accounts: every location.
// Locations are not GPS-gated for now - players don't have to be physically there.

import { LOCATIONS, Location, getHotspotsForLocation } from './content.js';
import { Caller, HotspotResult } from './types.js';

export function canAccessLocation(caller: Caller, location: Location): boolean {
  return caller.kind === 'user' || location.guestAccessible;
}

/** The locations a guest gets by signing up (shown on the "sign up to save badges" screen). */
export function locationsUnlockedBySignUp(): Pick<Location, 'id' | 'name' | 'tagline'>[] {
  return LOCATIONS.filter((l) => !l.guestAccessible).map(({ id, name, tagline }) => ({ id, name, tagline }));
}

export function isLocationCompleted(locationId: string, results: HotspotResult[]): boolean {
  const hotspots = getHotspotsForLocation(locationId);
  if (hotspots.length === 0) return false;
  return hotspots.every((h) => results.some((r) => r.hotspotId === h.id && r.completed));
}

export function locationProgressPct(locationId: string, results: HotspotResult[]): number {
  const hotspots = getHotspotsForLocation(locationId);
  if (hotspots.length === 0) return 0;
  const done = hotspots.filter((h) => results.some((r) => r.hotspotId === h.id && r.completed)).length;
  return Math.round((done / hotspots.length) * 100);
}

/** A player's score for a location = sum of their best score on each of its hotspots. */
export function locationScore(locationId: string, results: HotspotResult[]): number {
  const ids = new Set(getHotspotsForLocation(locationId).map((h) => h.id));
  return results.filter((r) => ids.has(r.hotspotId)).reduce((sum, r) => sum + r.score, 0);
}

/** Combine two results for the same hotspot: keep the best of each field. */
export function mergeResults(a: HotspotResult, b: HotspotResult): HotspotResult {
  const best = a.score >= b.score ? a : b;
  return {
    ...best,
    completed: a.completed || b.completed,
    badgeEarned: a.badgeEarned || b.badgeEarned,
    correctAnswers: Math.max(a.correctAnswers, b.correctAnswers),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}
