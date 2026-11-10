import { Injectable, computed, signal } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import {
  AnswerResponse,
  LeaderboardRow,
  LocationView,
  MeResponse,
  StartResponse,
} from '../models/api.models';
import { AuthService } from './auth.service';
import { ProgressService } from './progress.service';

const GUEST_KEY = 'baltimore-artifact-hunt:guest-token';
const PENDING_NAME_KEY = 'baltimore-artifact-hunt:pending-name';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignore (private browsing)
  }
}

/**
 * Client for the game server. Holds who the player is (account, guest, or nobody yet)
 * and mirrors the server's copy of their progress into ProgressService so the existing
 * screens keep working unchanged.
 *
 * Guests are created lazily: nothing is stored on the server until someone starts a challenge.
 */
@Injectable({ providedIn: 'root' })
export class GameApiService {
  /** False when APP_CONFIG.apiUrl is empty: the game then runs in its original local-only mode. */
  readonly enabled = !!APP_CONFIG.apiUrl;

  readonly me = signal<MeResponse | null>(null);
  private readonly anonymousLocations = signal<LocationView[]>([]);

  readonly locations = computed(() => this.me()?.locations ?? this.anonymousLocations());
  readonly signedIn = computed(() => this.auth.isSignedIn());
  readonly playerName = computed(() => this.me()?.player.name ?? '');
  readonly guestHasBadges = computed(() => !this.auth.isSignedIn() && (this.me()?.badges.length ?? 0) > 0);

  private guestToken: string | null = readStorage(GUEST_KEY);
  private guestPromise: Promise<void> | null = null;
  private readonly readyPromise: Promise<void>;

  constructor(private auth: AuthService, private progress: ProgressService) {
    this.readyPromise = this.enabled ? this.refresh().catch(() => undefined) : Promise.resolve();
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  /** True when the server says this player can't open the location yet (guests: everything but Ridgely's and Uptown). */
  isLocked(locationId: string): boolean {
    if (!this.enabled) return false;
    const loc = this.locations().find((l) => l.id === locationId);
    if (loc) return !loc.accessible;
    // The server's list isn't available (still loading, or unreachable). Fail closed for guests:
    // only the guest locations show as open. Signed-in players aren't limited.
    return !this.auth.isSignedIn() && !APP_CONFIG.guestLocationIds.includes(locationId);
  }

  // ------------------------------------------------------------------ state
  /** Reloads who I am, my progress, and which locations are open. */
  async refresh(): Promise<void> {
    if (!this.enabled) return;
    try {
      if (this.auth.isSignedIn() || this.guestToken) {
        await this.claimGuestProgress();
        this.applyMe(await this.request<MeResponse>('GET', '/me'));
      } else {
        const { locations } = await this.request<{ locations: LocationView[] }>('GET', '/locations');
        this.me.set(null);
        this.anonymousLocations.set(locations);
        this.progress.resetFromServer();
      }
    } catch (e) {
      // A stale guest token or a dead login: drop it and load as whoever is left.
      if (e instanceof ApiError && (e.code === 'INVALID_GUEST_TOKEN' || e.code === 'INVALID_TOKEN')) {
        if (e.code === 'INVALID_GUEST_TOKEN') this.clearGuest();
        return this.refresh();
      }
      throw e;
    }
  }

  private applyMe(me: MeResponse) {
    this.me.set(me);
    this.progress.hydrateFromServer(me.results, me.player.name);
  }

  // ------------------------------------------------------------- challenges
  async startChallenge(hotspotId: string): Promise<StartResponse> {
    await this.ensureCaller();
    try {
      return await this.request<StartResponse>('POST', `/challenges/${hotspotId}/start`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INVALID_GUEST_TOKEN') {
        this.clearGuest();
        await this.ensureCaller();
        return this.request<StartResponse>('POST', `/challenges/${hotspotId}/start`);
      }
      throw e;
    }
  }

  async answer(hotspotId: string, attemptId: string, choiceIndex: number | null): Promise<AnswerResponse> {
    const res = await this.request<AnswerResponse>('POST', `/challenges/${hotspotId}/answer`, { attemptId, choiceIndex });
    if (res.done) void this.refresh().catch(() => undefined); // picks up the new badge + unlocked state
    return res;
  }

  async getLeaderboard(locationId: string): Promise<LeaderboardRow[]> {
    const res = await this.request<{ entries: LeaderboardRow[] }>('GET', `/leaderboard/${locationId}`);
    return res.entries;
  }

  // ---------------------------------------------------------------- accounts
  /** Remember the display name typed at sign-up; it is applied after the first successful login. */
  setPendingName(name: string) {
    writeStorage(PENDING_NAME_KEY, name.trim());
  }

  /** Run after any successful login: move guest progress into the account, apply the chosen name, reload. */
  async afterSignIn(): Promise<void> {
    await this.claimGuestProgress();
    const pending = readStorage(PENDING_NAME_KEY);
    if (pending) {
      try {
        await this.request('PATCH', '/me', { playerName: pending });
        writeStorage(PENDING_NAME_KEY, null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 400) writeStorage(PENDING_NAME_KEY, null); // invalid name: don't retry forever
      }
    }
    await this.refresh();
  }

  async rename(name: string): Promise<void> {
    this.applyMe(await this.request<MeResponse>('PATCH', '/me', { playerName: name }));
  }

  logout() {
    this.auth.signOut();
    writeStorage(PENDING_NAME_KEY, null);
    this.me.set(null);
    this.progress.resetFromServer();
    void this.refresh().catch(() => undefined);
  }

  /** Sends the guest's badges and scores to the signed-in account. Keeps the guest token if the network failed so it can retry. */
  private async claimGuestProgress(): Promise<void> {
    if (!this.guestToken || !this.auth.isSignedIn()) return;
    try {
      await this.request('POST', '/account/claim', {}, true);
      this.clearGuest();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NO_GUEST_TOKEN') this.clearGuest(); // token expired or invalid: nothing to claim
    }
  }

  // ---------------------------------------------------------------- plumbing
  /** Makes sure the server knows who is playing: signed in, or a guest profile. */
  private ensureCaller(): Promise<void> {
    if (this.auth.isSignedIn() || this.guestToken) return Promise.resolve();
    if (!this.guestPromise) {
      this.guestPromise = (async () => {
        const res = await this.request<{ guestToken: string }>('POST', '/guest');
        this.guestToken = res.guestToken;
        writeStorage(GUEST_KEY, res.guestToken);
        await this.refresh();
      })().finally(() => (this.guestPromise = null));
    }
    return this.guestPromise;
  }

  private clearGuest() {
    this.guestToken = null;
    writeStorage(GUEST_KEY, null);
  }

  private async request<T>(method: string, path: string, body?: unknown, includeGuestToken = false): Promise<T> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['content-type'] = 'application/json';

    let idToken: string | null;
    try {
      idToken = await this.auth.getIdToken();
    } catch (e) {
      throw new ApiError(0, 'NETWORK', (e as Error).message);
    }
    if (idToken) {
      headers['authorization'] = `Bearer ${idToken}`;
      if (includeGuestToken && this.guestToken) headers['x-guest-token'] = this.guestToken;
    } else if (this.guestToken) {
      headers['x-guest-token'] = this.guestToken;
    }

    let res: Response;
    try {
      res = await fetch(APP_CONFIG.apiUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'NETWORK', "Can't reach the game server. Check your connection and try again.");
    }

    const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } } & Record<string, unknown>;
    if (!res.ok) {
      const err = data.error ?? {};
      if (err.code === 'INVALID_TOKEN') this.auth.signOut(); // server rejected our login: stop sending it
      throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? 'Something went wrong.', err as Record<string, unknown>);
    }
    return data as T;
  }
}
