import { Injectable, computed, signal } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';

// Talks to Amazon Cognito directly over its public JSON API (no extra npm packages).
// The app client allows USER_PASSWORD_AUTH, so the password goes over HTTPS to Cognito only.

const STORAGE_KEY = 'baltimore-artifact-hunt:auth';
const REFRESH_MARGIN_MS = 60_000;

interface StoredAuth {
  email: string;
  idToken: string;
  refreshToken: string;
  /** Epoch ms when the ID token expires. */
  expiresAt: number;
}

interface AuthResult {
  IdToken: string;
  RefreshToken?: string;
  ExpiresIn: number;
}

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const FRIENDLY: Record<string, string> = {
  UsernameExistsException: 'An account with that email already exists. Try logging in instead.',
  InvalidPasswordException: 'Password needs at least 8 characters, a lowercase letter, and a number.',
  InvalidParameterException: 'Please check your email and password and try again.',
  CodeMismatchException: "That code doesn't match. Check the newest email and try again.",
  ExpiredCodeException: 'That code has expired. Tap "Send a new code".',
  NotAuthorizedException: 'Incorrect email or password.',
  UserNotFoundException: 'Incorrect email or password.',
  UserNotConfirmedException: 'Please confirm your email first.',
  LimitExceededException: 'Too many attempts. Please wait a few minutes and try again.',
  TooManyRequestsException: 'Too many attempts. Please wait a few minutes and try again.',
  TooManyFailedAttemptsException: 'Too many attempts. Please wait a few minutes and try again.',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<StoredAuth | null>(null);
  private refreshing: Promise<string | null> | null = null;

  readonly isSignedIn = computed(() => this.session() !== null);
  readonly email = computed(() => this.session()?.email ?? null);

  constructor() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredAuth;
        if (parsed.idToken && parsed.refreshToken && parsed.email) this.session.set(parsed);
      }
    } catch {
      // Storage unavailable or corrupt: start signed out.
    }
  }

  async signUp(email: string, password: string): Promise<void> {
    const e = normalize(email);
    await this.cognito('SignUp', {
      ClientId: APP_CONFIG.cognito.clientId,
      Username: e,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: e }],
    });
  }

  async confirm(email: string, code: string): Promise<void> {
    await this.cognito('ConfirmSignUp', {
      ClientId: APP_CONFIG.cognito.clientId,
      Username: normalize(email),
      ConfirmationCode: code.trim(),
    });
  }

  async resendCode(email: string): Promise<void> {
    await this.cognito('ResendConfirmationCode', {
      ClientId: APP_CONFIG.cognito.clientId,
      Username: normalize(email),
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    const e = normalize(email);
    const res = await this.cognito<{ AuthenticationResult?: AuthResult }>('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: APP_CONFIG.cognito.clientId,
      AuthParameters: { USERNAME: e, PASSWORD: password },
    });
    const result = res.AuthenticationResult;
    if (!result?.IdToken || !result.RefreshToken) {
      throw new AuthError('ChallengeRequired', 'This account needs an extra sign-in step that the game does not support yet.');
    }
    this.store({
      email: e,
      idToken: result.IdToken,
      refreshToken: result.RefreshToken,
      expiresAt: Date.now() + result.ExpiresIn * 1000,
    });
  }

  signOut() {
    this.session.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * A valid ID token for API calls, refreshing it if it is about to expire.
   * Returns null when signed out (or when the refresh token no longer works, which signs out).
   * Throws AuthError('NetworkError') if Cognito can't be reached.
   */
  async getIdToken(): Promise<string | null> {
    const s = this.session();
    if (!s) return null;
    if (Date.now() < s.expiresAt - REFRESH_MARGIN_MS) return s.idToken;
    if (!this.refreshing) {
      this.refreshing = this.refresh(s).finally(() => (this.refreshing = null));
    }
    return this.refreshing;
  }

  private async refresh(s: StoredAuth): Promise<string | null> {
    try {
      const res = await this.cognito<{ AuthenticationResult?: AuthResult }>('InitiateAuth', {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: APP_CONFIG.cognito.clientId,
        AuthParameters: { REFRESH_TOKEN: s.refreshToken },
      });
      const result = res.AuthenticationResult;
      if (!result?.IdToken) throw new AuthError('NotAuthorizedException', 'Session expired.');
      this.store({
        ...s,
        idToken: result.IdToken,
        // Cognito only returns a new refresh token if rotation is on; otherwise keep ours.
        refreshToken: result.RefreshToken ?? s.refreshToken,
        expiresAt: Date.now() + result.ExpiresIn * 1000,
      });
      return result.IdToken;
    } catch (e) {
      if (e instanceof AuthError && e.code === 'NetworkError') throw e;
      this.signOut();
      return null;
    }
  }

  private store(auth: StoredAuth) {
    this.session.set(auth);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // Private browsing etc.: the session just lasts until the tab closes.
    }
  }

  private async cognito<T = unknown>(target: string, body: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`https://cognito-idp.${APP_CONFIG.cognito.region}.amazonaws.com/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AuthError('NetworkError', "Can't reach the sign-in service. Check your connection and try again.");
    }
    const data = (await res.json().catch(() => ({}))) as { __type?: string; message?: string };
    if (!res.ok) {
      const code = String(data.__type ?? 'Error').split('#').pop() ?? 'Error';
      throw new AuthError(code, FRIENDLY[code] ?? data.message ?? 'Something went wrong. Please try again.');
    }
    return data as T;
  }
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}
