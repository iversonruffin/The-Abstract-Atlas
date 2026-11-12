import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Hotspot } from '../../models/game.models';
import { GameApiService } from '../../services/game-api.service';
import { GameDataService } from '../../services/game-data.service';
import { CharacterCoverComponent } from '../character-cover/character-cover.component';
import { ProgressService } from '../../services/progress.service';
import { TriviaChallengeComponent } from '../trivia-challenge/trivia-challenge.component';
import { TriviaOnlineComponent } from '../trivia-online/trivia-online.component';

export type ModalView = 'guide' | 'story' | 'challenge' | 'characters';

@Component({
  selector: 'app-hotspot-modal',
  standalone: true,
  imports: [CommonModule, TriviaChallengeComponent, TriviaOnlineComponent, CharacterCoverComponent],
  templateUrl: './hotspot-modal.component.html',
  styleUrl: './hotspot-modal.component.css',
})
export class HotspotModalComponent {
  @Input({ required: true }) hotspot!: Hotspot;
  @Input() active = false;
  /** Which view the modal opens on: the house that was clicked decides (trivia -> guide, story -> story, people -> characters). */
  @Input() startView: ModalView = 'guide';
  @Output() closed = new EventEmitter<void>();

  view: ModalView = 'guide';
  /** Which character's comic cover is open (index into hotspot.characters), or null. */
  coverIndex: number | null = null;

  constructor(public progress: ProgressService, public api: GameApiService, private gameData: GameDataService) {}

  openCover(index: number) {
    this.coverIndex = index;
  }
  closeCover() {
    this.coverIndex = null;
  }
  /** Location name for the cover sticker, e.g. "Uptown". */
  get coverLocationName(): string {
    return this.gameData.getLocation(this.hotspot.locationId)?.name ?? this.hotspot.name;
  }
  /** City name for the cover's issue tag, e.g. "Queen City". */
  get coverCityName(): string {
    const cityId = this.gameData.getLocation(this.hotspot.locationId)?.cityId;
    return (cityId && this.gameData.getCity(cityId)?.name) || '';
  }

  /** Seconds per trivia question, for the "Timed trivia" notice (every question uses the same limit). */
  get secondsPerQuestion(): number {
    return this.hotspot?.triviaQuestions?.[0]?.timeLimitSeconds ?? 10;
  }

  ngOnChanges() {
    // Reset every time a house is opened: to the view that house is for (the guide by default).
    if (this.active) this.view = this.startView;
    if (!this.active) this.coverIndex = null;
  }

  showGuide() {
    this.view = 'guide';
  }
  showStory() {
    this.view = 'story';
  }
  showCharacters() {
    // Always show the People list first; tapping a person there opens their comic cover (openCover).
    // (Tried 11/11: one character went straight to the cover. Kept for reference.)
    // if (this.hotspot.characters?.length === 1) {
    //   this.openCover(0);
    //   return;
    // }
    this.view = 'characters';
  }
  showChallenge() {
    this.view = 'challenge';
  }

  /** First letter(s) shown in place of a photo until one is uploaded. */
  initials(name: string): string {
    return name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  close() {
    this.closed.emit();
  }

  onChallengeFinished() {
    // Stay on the results screen inside the trivia component; user closes via modal close button.
  }
}
