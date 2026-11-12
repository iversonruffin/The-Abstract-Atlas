// ---------------------------------------------------------------------------
// Domain models for Baltimore Artifact Hunt.
// Mirrors the structure from the game bible:
//   Location (Inner Harbor, Federal Hill, Pigtown, ...)
//     -> Hotspots (restaurants, bars, convenience stores, ...)
//         -> Challenge (trivia questions and/or a mini-game)
//         -> Badge earned on completion
//   Players scan a QR code at a hotspot's poster to open its challenge here.
// ---------------------------------------------------------------------------

export interface TriviaQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** Seconds allowed to answer (15s per question since 11/11; was 10). */
  timeLimitSeconds: number;
  /** Optional picture shown above the question. Path under public/, e.g. 'images/trivia/ctc-station.jpg'. */
  image?: string;
  /** Optional line shown after any wrong answer, e.g. "Ok, well that's DEFINITELY not right." */
  wrongResponse?: string;
  /** Optional line shown after the right answer. */
  correctResponse?: string;
  /** Optional line per choice (same order as choices; null = use the lines above). Wins over the others. */
  choiceResponses?: (string | null)[];
}

export interface Badge {
  id: string;
  name: string;
  /** Emoji or icon key used until real art is dropped in. */
  icon: string;
  description: string;
}

export interface HotspotStory {
  title: string;
  body: string;
  footer?: string;
}

/** A person from a location's lore: a picture and a short story about who they are. */
export interface Character {
  id: string;
  name: string;
  /** Image path under public/ (e.g. 'images/characters/jesus-saves-guy.jpg'). Omit until the photo is uploaded. */
  photo?: string;
  /** Short story about who they are. */
  story: string;
}

export type ChallengeType = 'trivia' | 'mini-game';

export interface Hotspot {
  id: string;
  locationId: string;
  name: string;
  /** e.g. "restaurant" | "bar" | "convenience store" */
  category: string;
  founded?: string;
  knownFor?: string;
  guideBlurb: string;
  story: HotspotStory;
  challengeType: ChallengeType;
  triviaQuestions?: TriviaQuestion[];
  badge: Badge;
  /** People of this place (lore). Optional: the guide shows "coming soon" when empty. */
  characters?: Character[];
  /** Hotspot ids that must be completed before this one unlocks. Empty = unlocked from the start. */
  unlockRequires: string[];
  /** Position of the beacon within the parallax scene, as % of scene width/height. */
  position: { xPct: number; yPct: number };
  /** Where this place's house sits in its CITY's scene (the city page shows every location's house). */
  cityPosition?: { xPct: number; yPct: number };
}

export interface CityLocation {
  id: string;
  name: string;
  tagline: string;
  /** Which city this location belongs to (see CITIES). */
  cityId?: string;
  /** 0-1 completion percentage, derived at runtime from hotspot progress. */
  hotspotIds: string[];
  /** Shown on the map as "Coming soon" and can't be opened by anyone (guests or accounts) yet. */
  comingSoon?: boolean;
}

export interface LeaderboardEntry {
  playerName: string;
  locationId: string;
  score: number;
  rank?: number;
}

export interface PlayerHotspotResult {
  hotspotId: string;
  completed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  /** Sum of per-question time-based points. */
  score: number;
  badgeEarned: boolean;
}

/** A city on the home page. Clicking it opens its parallax scene, with one house per location. */
export interface City {
  id: string;
  name: string;
  tagline: string;
  locationIds: string[];
}
