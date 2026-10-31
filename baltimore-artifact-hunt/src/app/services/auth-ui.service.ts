import { Injectable, signal } from '@angular/core';

export type AuthMode = 'signup' | 'login' | 'confirm';

/** Lets any component open the sign-up / log-in dialog (rendered once by AuthModalComponent). */
@Injectable({ providedIn: 'root' })
export class AuthUiService {
  readonly isOpen = signal(false);
  readonly mode = signal<AuthMode>('signup');
  /** Optional line shown at the top of the dialog, e.g. "Sign up to unlock Pigtown". */
  readonly notice = signal('');

  show(mode: AuthMode, notice = '') {
    this.mode.set(mode);
    this.notice.set(notice);
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.notice.set('');
  }
}
