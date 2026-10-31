import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { LeaderboardRow } from '../../models/api.models';
import { AuthUiService } from '../../services/auth-ui.service';
import { GameApiService } from '../../services/game-api.service';

/** Real leaderboard from the server (registered players only). Same look as the original LeaderboardComponent. */
@Component({
  selector: 'app-leaderboard-online',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="leaderboard">
      <h3>Top 10 — {{ locationName() }}</h3>
      <p class="empty-state" *ngIf="loading">Loading…</p>
      <p class="empty-state" *ngIf="!loading && failed">Couldn't load the leaderboard. Try again in a moment.</p>
      <ol *ngIf="!loading && !failed && entries.length > 0">
        <li *ngFor="let entry of entries" [class.me]="api.signedIn() && entry.playerName === api.playerName()">
          <span class="rank">#{{ entry.rank }}</span>
          <span class="name">{{ entry.playerName }}</span>
          <span class="score">{{ entry.score }} pts</span>
        </li>
      </ol>
      <p class="empty-state" *ngIf="!loading && !failed && entries.length === 0">
        No scores yet — be the first to complete a challenge here!
      </p>
      <p class="guest-hint" *ngIf="!api.signedIn()">
        Only players with an account appear here.
        <a href="#" (click)="signUp($event)">Sign up to join the leaderboard</a>
      </p>
    </div>
  `,
  styles: [
    `
      .leaderboard {
        background: rgba(122, 90, 52, 0.08);
        border: 1px solid rgba(122, 90, 52, 0.25);
        border-radius: 12px;
        padding: 16px;
      }
      h3 {
        margin: 0 0 10px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #a8641a;
      }
      ol {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      li {
        display: flex;
        gap: 10px;
        font-size: 14px;
        color: #4a3320;
      }
      li.me {
        font-weight: bold;
        background: rgba(168, 100, 26, 0.15);
        border-radius: 6px;
        padding: 0 4px;
      }
      .rank {
        font-weight: bold;
        width: 28px;
      }
      .name {
        flex: 1;
      }
      .score {
        font-weight: bold;
      }
      .empty-state {
        font-size: 13px;
        opacity: 0.7;
        margin: 0;
      }
      .guest-hint {
        margin: 12px 0 0;
        font-size: 12px;
        color: #4a3320;
      }
      a {
        color: #a8641a;
        font-weight: bold;
      }
    `,
  ],
})
export class LeaderboardOnlineComponent implements OnChanges {
  @Input({ required: true }) locationId!: string;

  entries: LeaderboardRow[] = [];
  loading = true;
  failed = false;

  constructor(public api: GameApiService, private authUi: AuthUiService) {}

  /** "Federal Hill" rather than the internal id "federal-hill". */
  locationName(): string {
    return this.api.locations().find((l) => l.id === this.locationId)?.name ?? this.locationId;
  }

  ngOnChanges() {
    void this.load();
  }

  signUp(event: Event) {
    event.preventDefault();
    this.authUi.show('signup');
  }

  private async load() {
    const id = this.locationId;
    this.loading = true;
    this.failed = false;
    try {
      const rows = await this.api.getLeaderboard(id);
      if (id !== this.locationId) return;
      this.entries = rows;
    } catch {
      this.failed = true;
    } finally {
      this.loading = false;
    }
  }
}
