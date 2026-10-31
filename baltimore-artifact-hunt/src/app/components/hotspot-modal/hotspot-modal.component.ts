import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Hotspot } from '../../models/game.models';
import { GameApiService } from '../../services/game-api.service';
import { ProgressService } from '../../services/progress.service';
import { TriviaChallengeComponent } from '../trivia-challenge/trivia-challenge.component';
import { TriviaOnlineComponent } from '../trivia-online/trivia-online.component';

type ModalView = 'guide' | 'story' | 'challenge';

@Component({
  selector: 'app-hotspot-modal',
  standalone: true,
  imports: [CommonModule, TriviaChallengeComponent, TriviaOnlineComponent],
  templateUrl: './hotspot-modal.component.html',
  styleUrl: './hotspot-modal.component.css',
})
export class HotspotModalComponent {
  @Input({ required: true }) hotspot!: Hotspot;
  @Input() active = false;
  @Output() closed = new EventEmitter<void>();

  view: ModalView = 'guide';

  constructor(public progress: ProgressService, public api: GameApiService) {}

  ngOnChanges() {
    // Reset to the guide view every time a new hotspot is opened.
    if (this.active) this.view = 'guide';
  }

  showGuide() {
    this.view = 'guide';
  }
  showStory() {
    this.view = 'story';
  }
  showChallenge() {
    this.view = 'challenge';
  }

  close() {
    this.closed.emit();
  }

  onChallengeFinished() {
    // Stay on the results screen inside the trivia component; user closes via modal close button.
  }
}
