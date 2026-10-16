// Shared server-side types.

export type Caller =
  | { kind: 'guest'; playerId: string }
  | { kind: 'user'; playerId: string; email?: string };

export interface Profile {
  playerId: string;
  playerName: string;
  isGuest: boolean;
  createdAt: number;
}

/** Best result a player has for one hotspot (mirrors the frontend's PlayerHotspotResult). */
export interface HotspotResult {
  hotspotId: string;
  completed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  /** Best score across all attempts. */
  score: number;
  badgeEarned: boolean;
  updatedAt: number;
}

/** An in-progress challenge run. One active attempt per player per hotspot. */
export interface Attempt {
  attemptId: string;
  hotspotId: string;
  /** For each question, the original choice indexes in the order they were shown to the player. */
  choiceOrders: number[][];
  questionIndex: number;
  /** Server clock time (ms) the current question was served. */
  servedAt: number;
  correct: number;
  score: number;
}

export interface LocationTotal {
  locationId: string;
  playerName: string;
  score: number;
}

export interface LeaderboardRow {
  rank: number;
  playerName: string;
  score: number;
}
