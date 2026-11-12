import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { Hotspot, TriviaQuestion } from '../../models/game.models';
import { ProgressService } from '../../services/progress.service';

type AnswerState = 'unanswered' | 'correct' | 'incorrect' | 'timeout';

@Component({
  selector: 'app-trivia-challenge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trivia-challenge.component.html',
  styleUrl: './trivia-challenge.component.css',
})
export class TriviaChallengeComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) hotspot!: Hotspot;
  @Output() finished = new EventEmitter<{ correct: number; total: number; score: number }>();

  questionIndex = 0;
  answerState: AnswerState = 'unanswered';
  selectedChoice: number | null = null;
  secondsLeft = 10;
  correctCount = 0;
  score = 0;
  isDone = false;

  private timerHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private progress: ProgressService) {}

  ngOnChanges() {
    this.startChallenge();
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  get questions(): TriviaQuestion[] {
    return this.hotspot?.triviaQuestions ?? [];
  }

  get currentQuestion(): TriviaQuestion | undefined {
    return this.questions[this.questionIndex];
  }

  /** Tailored line for the current answer, if the question has one (same rules as the server). */
  get responseLine(): string | null {
    const q = this.currentQuestion;
    if (!q || this.answerState === 'unanswered' || this.answerState === 'timeout') return null;
    const perChoice = this.selectedChoice !== null ? q.choiceResponses?.[this.selectedChoice] ?? undefined : undefined;
    return perChoice ?? (this.answerState === 'correct' ? q.correctResponse : q.wrongResponse) ?? null;
  }

  startChallenge() {
    this.clearTimer();
    this.questionIndex = 0;
    this.correctCount = 0;
    this.score = 0;
    this.isDone = false;
    if (this.questions.length > 0) this.startQuestionTimer();
  }

  private startQuestionTimer() {
    this.answerState = 'unanswered';
    this.selectedChoice = null;
    this.secondsLeft = this.currentQuestion?.timeLimitSeconds ?? 10;
    this.clearTimer();
    this.timerHandle = setInterval(() => {
      this.secondsLeft -= 1;
      if (this.secondsLeft <= 0) {
        this.clearTimer();
        this.answerState = 'timeout';
        setTimeout(() => this.advance(), 2500); // was 900
      }
    }, 1000);
  }

  selectAnswer(choiceIndex: number) {
    if (this.answerState !== 'unanswered') return; // already locked in
    this.clearTimer();
    this.selectedChoice = choiceIndex;
    const question = this.currentQuestion;
    if (!question) return;

    const isCorrect = choiceIndex === question.correctIndex;
    this.answerState = isCorrect ? 'correct' : 'incorrect';

    if (isCorrect) {
      this.correctCount += 1;
      // Base 100 points + up to 100 bonus for speed (10 pts per second remaining).
      this.score += 100 + this.secondsLeft * 10;
    }

    setTimeout(() => this.advance(), 2500); // was 900
  }

  private advance() {
    if (this.questionIndex < this.questions.length - 1) {
      this.questionIndex += 1;
      this.startQuestionTimer();
    } else {
      this.finishChallenge();
    }
  }

  private finishChallenge() {
    this.isDone = true;
    this.progress.recordHotspotResult(this.hotspot.id, this.correctCount, this.questions.length, this.score);
    this.finished.emit({ correct: this.correctCount, total: this.questions.length, score: this.score });
  }

  private clearTimer() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
