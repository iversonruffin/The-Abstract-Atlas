import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { ChallengeResult, ServerQuestion } from '../../models/api.models';
import { Hotspot } from '../../models/game.models';
import { ApiError, GameApiService } from '../../services/game-api.service';
import { AuthUiService } from '../../services/auth-ui.service';

type AnswerState = 'unanswered' | 'correct' | 'incorrect' | 'timeout';
type Phase = 'loading' | 'question' | 'done' | 'error';

/** How long right/wrong feedback shows before the next question. Must match FEEDBACK_MS in server/src/scoring.ts. */
const FEEDBACK_MS = 2500; // was 900: long enough to read a tailored line

/**
 * Server-driven version of TriviaChallengeComponent. The server supplies the questions,
 * times each answer and works out the score; this component just shows them.
 * (The original local-only TriviaChallengeComponent is untouched and still used in offline mode.)
 */
@Component({
  selector: 'app-trivia-online',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trivia-online.component.html',
  styleUrls: ['../trivia-challenge/trivia-challenge.component.css', './trivia-online.component.css'],
})
export class TriviaOnlineComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) hotspot!: Hotspot;
  @Output() finished = new EventEmitter<ChallengeResult>();

  phase: Phase = 'loading';
  question: ServerQuestion | null = null;
  answerState: AnswerState = 'unanswered';
  selectedChoice: number | null = null;
  correctChoice: number | null = null;
  /** Tailored line for the last answer, if the question has one. */
  responseLine: string | null = null;
  secondsLeft = 10;
  runningScore = 0;
  result: ChallengeResult | null = null;
  errorMessage = '';
  errorNeedsSignUp = false;

  private attemptId = '';
  private submitting = false;
  private runId = 0;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private advanceHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(public api: GameApiService, private authUi: AuthUiService) {}

  ngOnChanges() {
    void this.begin();
  }

  ngOnDestroy() {
    this.runId++;
    this.clearTimers();
  }

  async begin() {
    this.clearTimers();
    const run = ++this.runId;
    this.phase = 'loading';
    this.result = null;
    this.errorMessage = '';
    this.errorNeedsSignUp = false;
    this.runningScore = 0;
    try {
      const res = await this.api.startChallenge(this.hotspot.id);
      if (run !== this.runId) return;
      this.attemptId = res.attemptId;
      this.showQuestion(res.question);
    } catch (e) {
      if (run === this.runId) this.fail(e);
    }
  }

  select(choiceIndex: number) {
    if (this.answerState !== 'unanswered' || this.submitting) return;
    this.clearTimer();
    this.selectedChoice = choiceIndex;
    void this.submit(choiceIndex);
  }

  openSignUp() {
    this.authUi.show('signup');
  }

  openLogin() {
    this.authUi.show('login');
  }

  private showQuestion(q: ServerQuestion) {
    this.question = q;
    this.phase = 'question';
    this.answerState = 'unanswered';
    this.selectedChoice = null;
    this.correctChoice = null;
    this.responseLine = null;
    this.submitting = false;
    this.secondsLeft = q.timeLimitSeconds;
    this.clearTimer();
    this.timerHandle = setInterval(() => {
      this.secondsLeft -= 1;
      if (this.secondsLeft <= 0) {
        this.clearTimer();
        void this.submit(null); // time's up
      }
    }, 1000);
  }

  private async submit(choiceIndex: number | null) {
    this.submitting = true;
    const run = this.runId;
    try {
      const res = await this.api.answer(this.hotspot.id, this.attemptId, choiceIndex);
      if (run !== this.runId) return;
      this.correctChoice = res.correctIndex;
      this.answerState = choiceIndex === null || res.timedOut ? 'timeout' : res.correct ? 'correct' : 'incorrect';
      this.responseLine = res.response ?? null;
      this.runningScore += res.pointsAwarded;
      this.advanceHandle = setTimeout(() => {
        if (res.done && res.result) {
          this.result = res.result;
          this.phase = 'done';
          this.finished.emit(res.result);
        } else if (res.next) {
          this.showQuestion(res.next);
        }
      }, FEEDBACK_MS);
    } catch (e) {
      if (run === this.runId) this.fail(e);
    }
  }

  private fail(e: unknown) {
    this.clearTimers();
    this.phase = 'error';
    if (e instanceof ApiError) {
      this.errorMessage = e.message;
      this.errorNeedsSignUp = e.code === 'LOCATION_LOCKED';
      if (e.code === 'INVALID_TOKEN') {
        this.errorMessage = 'Your login expired. Please log in again.';
        this.authUi.show('login');
      }
      if (e.code === 'ATTEMPT_NOT_FOUND') this.errorMessage = 'That run ended. Start the challenge again.';
    } else {
      this.errorMessage = 'Something went wrong. Please try again.';
    }
  }

  private clearTimer() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  private clearTimers() {
    this.clearTimer();
    if (this.advanceHandle) {
      clearTimeout(this.advanceHandle);
      this.advanceHandle = null;
    }
  }
}
