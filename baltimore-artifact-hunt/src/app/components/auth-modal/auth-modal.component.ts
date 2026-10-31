import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthError, AuthService } from '../../services/auth.service';
import { AuthMode, AuthUiService } from '../../services/auth-ui.service';
import { GameApiService } from '../../services/game-api.service';

const NAME_PATTERN = /^[\p{L}\p{N} _.'-]{2,20}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign up / confirm email / log in dialog. Rendered once in AppComponent; open it with AuthUiService.show(). */
@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-overlay" *ngIf="ui.isOpen()" (click)="onBackdrop($event)">
      <div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button class="auth-close" aria-label="Close" (click)="close()">&times;</button>

        <p class="auth-notice" *ngIf="ui.notice()">{{ ui.notice() }}</p>

        <!-- SIGN UP -->
        <form *ngIf="ui.mode() === 'signup'" (ngSubmit)="submitSignUp()" novalidate>
          <div class="auth-kicker">Save your progress</div>
          <h2 id="auth-title">Create your account</h2>
          <label>Email
            <input type="email" name="email" [(ngModel)]="email" autocomplete="email" required />
          </label>
          <label>Player name <span class="hint">(shown on leaderboards)</span>
            <input type="text" name="name" [(ngModel)]="name" maxlength="20" autocomplete="nickname" required />
          </label>
          <label>Password
            <input type="password" name="password" [(ngModel)]="password" autocomplete="new-password" required />
            <span class="hint">8+ characters with a lowercase letter and a number.</span>
          </label>
          <p class="auth-error" *ngIf="error">{{ error }}</p>
          <button class="auth-primary" type="submit" [disabled]="busy">{{ busy ? 'Creating…' : 'Sign up' }}</button>
          <p class="auth-privacy">
            We only use your email to sign you in. Other players only ever see your player name, never your email.
            Guest progress on this device is added to your account.
          </p>
          <p class="auth-switch">Already have an account? <a href="#" (click)="go($event, 'login')">Log in</a></p>
        </form>

        <!-- CONFIRM EMAIL -->
        <form *ngIf="ui.mode() === 'confirm'" (ngSubmit)="submitConfirm()" novalidate>
          <div class="auth-kicker">Almost there</div>
          <h2 id="auth-title">Check your email</h2>
          <p class="auth-info">We sent a 6-digit code to <strong>{{ email }}</strong>. It can take a minute, and it may land in spam.</p>
          <label>Confirmation code
            <input type="text" name="code" [(ngModel)]="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
          </label>
          <p class="auth-info ok" *ngIf="info">{{ info }}</p>
          <p class="auth-error" *ngIf="error">{{ error }}</p>
          <button class="auth-primary" type="submit" [disabled]="busy">{{ busy ? 'Confirming…' : 'Confirm' }}</button>
          <p class="auth-switch"><a href="#" (click)="resend($event)">Send a new code</a> · <a href="#" (click)="go($event, 'login')">Back to log in</a></p>
        </form>

        <!-- LOG IN -->
        <form *ngIf="ui.mode() === 'login'" (ngSubmit)="submitLogin()" novalidate>
          <div class="auth-kicker">Welcome back</div>
          <h2 id="auth-title">Log in</h2>
          <label>Email
            <input type="email" name="email" [(ngModel)]="email" autocomplete="email" required />
          </label>
          <label>Password
            <input type="password" name="password" [(ngModel)]="password" autocomplete="current-password" required />
          </label>
          <p class="auth-info ok" *ngIf="info">{{ info }}</p>
          <p class="auth-error" *ngIf="error">{{ error }}</p>
          <button class="auth-primary" type="submit" [disabled]="busy">{{ busy ? 'Logging in…' : 'Log in' }}</button>
          <p class="auth-switch">New here? <a href="#" (click)="go($event, 'signup')">Create an account</a></p>
          <p class="auth-switch"><a href="#" (click)="go($event, 'confirm')">I have a confirmation code</a></p>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 20, 30, 0.65);
        padding: 16px;
      }
      .auth-card {
        position: relative;
        width: min(420px, 100%);
        max-height: 92vh;
        overflow-y: auto;
        box-sizing: border-box;
        background: linear-gradient(180deg, #fdf6e3 0%, #f3e6c4 100%);
        border: 6px solid #7a5a34;
        border-radius: 20px;
        padding: 28px 26px 22px;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
        color: #4a3320;
      }
      .auth-close {
        position: absolute;
        top: 12px;
        right: 14px;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 50%;
        background: rgba(122, 90, 52, 0.15);
        color: #4a3320;
        font-size: 20px;
        cursor: pointer;
        line-height: 1;
      }
      .auth-kicker {
        text-transform: uppercase;
        letter-spacing: 2px;
        font-size: 12px;
        font-weight: bold;
        color: #a8641a;
        margin-bottom: 4px;
      }
      h2 {
        margin: 0 0 14px;
        font-size: 24px;
      }
      label {
        display: block;
        margin-bottom: 12px;
        font-size: 13px;
        font-weight: bold;
      }
      .hint {
        font-weight: normal;
        opacity: 0.7;
        font-size: 12px;
      }
      input {
        display: block;
        width: 100%;
        box-sizing: border-box;
        margin-top: 4px;
        padding: 10px 12px;
        border: 2px solid #7a5a34;
        border-radius: 10px;
        background: #fff;
        color: #4a3320;
        font-size: 16px;
      }
      input:focus {
        outline: 3px solid rgba(168, 100, 26, 0.4);
      }
      .auth-primary {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 10px;
        background: #a8641a;
        color: #fff;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
      }
      .auth-primary:hover:not(:disabled) {
        background: #8d5314;
      }
      .auth-primary:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .auth-notice {
        margin: 0 0 14px;
        padding: 8px 12px;
        border-radius: 10px;
        background: rgba(168, 100, 26, 0.15);
        font-size: 14px;
      }
      .auth-error {
        margin: 0 0 10px;
        color: #c0392b;
        font-size: 14px;
      }
      .auth-info {
        margin: 0 0 12px;
        font-size: 14px;
        line-height: 1.4;
      }
      .auth-info.ok {
        color: #2e6b3a;
      }
      .auth-switch {
        margin: 12px 0 0;
        text-align: center;
        font-size: 14px;
      }
      .auth-privacy {
        margin: 12px 0 0;
        font-size: 12px;
        line-height: 1.4;
        opacity: 0.75;
      }
      a {
        color: #a8641a;
        font-weight: bold;
      }
    `,
  ],
})
export class AuthModalComponent {
  email = '';
  password = '';
  name = '';
  code = '';
  busy = false;
  error = '';
  info = '';

  constructor(public ui: AuthUiService, private auth: AuthService, private api: GameApiService) {}

  /**
   * Close when the dark backdrop itself is clicked. This must be a method that returns nothing:
   * an inline `a && b()` template expression returns `false` for clicks inside the dialog, and Angular
   * treats a `false` return as preventDefault(), which silently cancels the form's submit button.
   */
  onBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) this.close();
  }

  close() {
    this.ui.close();
    this.error = '';
    this.info = '';
    this.password = '';
    this.code = '';
  }

  go(event: Event, mode: AuthMode) {
    event.preventDefault();
    this.error = '';
    this.info = '';
    this.ui.mode.set(mode);
  }

  async submitSignUp() {
    this.error = '';
    if (!EMAIL_PATTERN.test(this.email.trim())) return this.fail('Please enter a valid email address.');
    if (!NAME_PATTERN.test(this.name.trim())) {
      return this.fail("Player names are 2–20 characters: letters, numbers, spaces, and _ . ' -");
    }
    if (this.password.length < 8 || !/[a-z]/.test(this.password) || !/\d/.test(this.password)) {
      return this.fail('Password needs at least 8 characters, a lowercase letter, and a number.');
    }
    await this.run(async () => {
      await this.auth.signUp(this.email, this.password);
      this.api.setPendingName(this.name);
      this.info = '';
      this.ui.mode.set('confirm');
    });
  }

  async submitConfirm() {
    this.error = '';
    if (!/^\d{6}$/.test(this.code.trim())) return this.fail('Enter the 6-digit code from the email.');
    await this.run(async () => {
      await this.auth.confirm(this.email, this.code);
      if (this.password) {
        await this.auth.signIn(this.email, this.password);
        await this.finish();
      } else {
        // Confirmed in an earlier session: we no longer have the password, so ask for it again.
        this.info = 'Email confirmed! Log in to continue.';
        this.ui.mode.set('login');
      }
    });
  }

  async submitLogin() {
    this.error = '';
    if (!EMAIL_PATTERN.test(this.email.trim()) || !this.password) return this.fail('Enter your email and password.');
    await this.run(async () => {
      try {
        await this.auth.signIn(this.email, this.password);
      } catch (e) {
        if (e instanceof AuthError && e.code === 'UserNotConfirmedException') {
          await this.auth.resendCode(this.email).catch(() => undefined);
          this.info = 'Please confirm your email first. We sent you a new code.';
          this.ui.mode.set('confirm');
          return;
        }
        throw e;
      }
      await this.finish();
    });
  }

  async resend(event: Event) {
    event.preventDefault();
    this.error = '';
    if (!EMAIL_PATTERN.test(this.email.trim())) return this.fail('Enter your email first.');
    await this.run(async () => {
      await this.auth.resendCode(this.email);
      this.info = 'A new code is on its way.';
    });
  }

  /** Signed in: move guest progress into the account, then close. */
  private async finish() {
    await this.api.afterSignIn().catch(() => undefined); // login itself worked; progress sync retries on next load
    this.password = '';
    this.code = '';
    this.info = '';
    this.ui.close();
  }

  private async run(action: () => Promise<void>) {
    this.busy = true;
    try {
      await action();
    } catch (e) {
      this.error = e instanceof AuthError ? e.message : 'Something went wrong. Please try again.';
    } finally {
      this.busy = false;
    }
  }

  private fail(message: string) {
    this.error = message;
  }
}
