import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AuthUiService } from '../../services/auth-ui.service';
import { GameApiService } from '../../services/game-api.service';

/** Small fixed pill (bottom-right) showing who is playing, with sign up / log in / log out. */
@Component({
  selector: 'app-account-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="account-bar" *ngIf="api.enabled">
      <ng-container *ngIf="api.signedIn(); else guest">
        <button class="who" type="button" (click)="rename()" title="Change your player name">👤 {{ api.playerName() || 'Player' }}</button>
        <button type="button" (click)="api.logout()">Log out</button>
      </ng-container>
      <ng-template #guest>
        <span class="guest-note" *ngIf="api.guestHasBadges()">Your badges aren't saved yet</span>
        <button class="primary" type="button" (click)="ui.show('signup')">Sign up</button>
        <button type="button" (click)="ui.show('login')">Log in</button>
      </ng-template>
      <span class="error" *ngIf="error">{{ error }}</span>
    </div>
  `,
  styles: [
    `
      .account-bar {
        position: fixed;
        right: 14px;
        bottom: 14px;
        z-index: 45;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        max-width: calc(100vw - 28px);
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(253, 246, 227, 0.95);
        border: 2px solid #7a5a34;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        color: #4a3320;
        font-size: 13px;
      }
      button {
        border: 2px solid #7a5a34;
        border-radius: 999px;
        background: transparent;
        color: #4a3320;
        padding: 4px 12px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
      }
      button:hover {
        background: rgba(122, 90, 52, 0.15);
      }
      button.primary {
        background: #a8641a;
        border-color: #a8641a;
        color: #fff;
      }
      button.primary:hover {
        background: #8d5314;
      }
      .who {
        border-color: transparent;
      }
      .guest-note {
        font-weight: bold;
        color: #a8641a;
      }
      .error {
        width: 100%;
        text-align: right;
        color: #c0392b;
      }
    `,
  ],
})
export class AccountBarComponent {
  error = '';

  constructor(public api: GameApiService, public ui: AuthUiService) {}

  async rename() {
    const current = this.api.playerName();
    const next = window.prompt('Player name (shown on leaderboards):', current);
    if (next === null || next.trim() === '' || next.trim() === current) return;
    this.error = '';
    try {
      await this.api.rename(next.trim());
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
}
