// Shapes of the JSON returned by the game server (server/src/api.ts).

import { Badge, PlayerHotspotResult } from './game.models';

export interface UnlockableLocation {
  id: string;
  name: string;
  tagline: string;
}

export interface LocationView extends UnlockableLocation {
  hotspotIds: string[];
  /** False for guests on locations that need an account. */
  accessible: boolean;
  progressPct: number;
  completed: boolean;
}

export interface MeResponse {
  player: { id: string; name: string; isGuest: boolean };
  results: PlayerHotspotResult[];
  badges: Badge[];
  locations: LocationView[];
  /** Guests only: locations that signing up unlocks. */
  signUpUnlocks?: UnlockableLocation[];
}

/** A question as the server sends it: choices already shuffled, no answer included. */
export interface ServerQuestion {
  index: number;
  total: number;
  id: string;
  prompt: string;
  choices: string[];
  timeLimitSeconds: number;
}

export interface StartResponse {
  attemptId: string;
  hotspotId: string;
  question: ServerQuestion;
}

export interface SignUpPrompt {
  message: string;
  badges: Badge[];
  unlockedLocations: UnlockableLocation[];
}

export interface ChallengeResult {
  hotspotId: string;
  completed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  score: number;
  bestScore: number;
  isNewBest: boolean;
  badgeEarned: boolean;
  badge: Badge | null;
  locationId: string;
  locationCompleted: boolean;
  /** Present when a guest finishes a location: drives the "sign up to save badges" screen. */
  signUpPrompt?: SignUpPrompt;
}

export interface AnswerResponse {
  correct: boolean;
  timedOut: boolean;
  /** Index of the right answer in the order the choices were shown. */
  correctIndex: number;
  pointsAwarded: number;
  secondsLeft: number;
  done: boolean;
  next?: ServerQuestion;
  result?: ChallengeResult;
}

export interface LeaderboardRow {
  rank: number;
  playerName: string;
  score: number;
}
