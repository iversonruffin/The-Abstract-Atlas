// Scoring rules, matching the existing frontend (trivia-challenge.component.ts):
//   correct answer = 100 base + 10 points per second remaining on the timer.
// The difference: the SERVER measures the time, so clients can't claim a faster answer.

/** Network + render slack before an answer counts as late (milliseconds). */
export const GRACE_MS = 1500;

/**
 * The client shows right/wrong feedback for this long before revealing the next question,
 * so the next question's clock starts this far in the future (answers can't be "early").
 */
export const FEEDBACK_MS = 900;

export interface AnswerOutcome {
  correct: boolean;
  timedOut: boolean;
  secondsLeft: number;
  points: number;
}

export function scoreAnswer(opts: {
  chosenIndex: number | null;
  correctIndex: number;
  timeLimitSeconds: number;
  elapsedMs: number;
}): AnswerOutcome {
  const { chosenIndex, correctIndex, timeLimitSeconds, elapsedMs } = opts;
  const timedOut = elapsedMs > timeLimitSeconds * 1000 + GRACE_MS;
  if (timedOut || chosenIndex === null) {
    return { correct: false, timedOut, secondsLeft: 0, points: 0 };
  }
  const secondsLeft = Math.max(0, Math.min(timeLimitSeconds, Math.floor(timeLimitSeconds - elapsedMs / 1000)));
  const correct = chosenIndex === correctIndex;
  return { correct, timedOut: false, secondsLeft, points: correct ? 100 + secondsLeft * 10 : 0 };
}

/** Same completion rule as the frontend: finished with at least one correct answer. */
export function isCompleted(correctAnswers: number, totalQuestions: number): boolean {
  return totalQuestions === 0 || correctAnswers > 0;
}

/** Fisher-Yates shuffle of [0..n-1]. `rand` is injectable for tests. */
export function shuffledOrder(n: number, rand: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}
