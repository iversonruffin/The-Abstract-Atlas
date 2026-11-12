import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Character } from '../../models/game.models';

/** How the cover lands. Change COVER_ENTRANCE to try the others. */
export type CoverEntrance = 'slap' | 'spin' | 'paper';
export const COVER_ENTRANCE: CoverEntrance = 'slap';

/**
 * Your Abstract Atlas logo for the cover masthead (900 x 300 PNG, transparent).
 * Put the file in public/images/ and set this to its path, e.g. 'images/abstract-atlas-logo.png'.
 * While it's null, the cover shows a text placeholder.
 */
export const COVER_LOGO_SRC: string | null = null;

/**
 * A character's page, shown as a comic cover (11/11).
 * Two drawn layers make the cover art: coverBackground (the setting) and coverArt (the person, cut out).
 * The game adds the logo, name, city issue tag, location sticker, border and shine on top.
 * The person moves more than the background when you move the mouse over the cover, or tilt your phone.
 */
@Component({
  selector: 'app-character-cover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-cover.component.html',
  styleUrl: './character-cover.component.css',
})
export class CharacterCoverComponent implements OnInit, OnDestroy {
  @Input({ required: true }) character!: Character;
  /** Shown on the sticker and the back link, e.g. "Uptown". */
  @Input() locationName = '';
  /** Shown on the issue tag, e.g. "Queen City". */
  @Input() cityName = '';
  /** Issue number on the tag (No. 1, No. 2...). */
  @Input() issue = 1;
  @Input() entrance: CoverEntrance = COVER_ENTRANCE;
  @Output() closed = new EventEmitter<void>();

  readonly logoSrc = COVER_LOGO_SRC;
  logoFailed = false;
  bgFailed = false;
  artFailed = false;
  bgShift = '0px 0px';
  artShift = '0px 0px';

  private tiltBase: { beta: number; gamma: number } | null = null;
  private readonly onTilt = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    if (!this.tiltBase) this.tiltBase = { beta: e.beta, gamma: e.gamma };
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    this.shift(clamp((e.gamma - this.tiltBase.gamma) / 25) / 2, clamp((e.beta - this.tiltBase.beta) / 25) / 2);
  };

  constructor(
    private host: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) private doc: Document,
  ) {}

  ngOnInit() {
    // The field guide box is transformed, which would trap a full-screen overlay inside it, so the cover moves to <body>.
    this.doc.body.appendChild(this.host.nativeElement);
    // Comic lettering (Bangers). Loaded the first time a cover opens; the build can't inline it from index.html offline.
    if (!this.doc.getElementById('cc-bangers-font')) {
      const link = this.doc.createElement('link');
      link.id = 'cc-bangers-font';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bangers&display=swap';
      this.doc.head.appendChild(link);
    }
    window.addEventListener('deviceorientation', this.onTilt);
  }

  ngOnDestroy() {
    window.removeEventListener('deviceorientation', this.onTilt);
    this.host.nativeElement.remove();
  }

  /** The full story, split into paragraphs on blank lines. Falls back to the short story. */
  get paragraphs(): string[] {
    const text = this.character.fullStory ?? this.character.story ?? '';
    return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  }

  onMove(e: MouseEvent, cover: HTMLElement) {
    const r = cover.getBoundingClientRect();
    this.shift((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  }

  resetShift() {
    this.bgShift = '0px 0px';
    this.artShift = '0px 0px';
  }

  /** x, y from -0.5 to 0.5. The person moves the opposite way from the background, and further. */
  private shift(x: number, y: number) {
    this.bgShift = `${(x * -6).toFixed(1)}px ${(y * -6).toFixed(1)}px`;
    this.artShift = `${(x * 14).toFixed(1)}px ${(y * 10).toFixed(1)}px`;
  }

  @HostListener('document:keydown.escape')
  close() {
    this.closed.emit();
  }
}
