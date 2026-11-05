import { Injectable, computed, signal } from '@angular/core';
import { Badge, LeaderboardEntry, PlayerHotspotResult } from '../models/game.models';
import { GameDataService } from './game-data.service';

const STORAGE_KEY = 'baltimore-artifact-hunt:progress';

interface StoredProgress {
  playerName: string;
  results: Record<string, PlayerHotspotResult>;
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly results = signal<Record<string, PlayerHotspotResult>>({});
  private readonly playerName = signal<string>('Explorer');

  /** All earned badges, derived from completed hotspot results. */
  readonly earnedBadges = computed<Badge[]>(() => {
    const badges: Badge[] = [];
    for (const hotspot of this.gameData.getLocations().flatMap((l) => this.gameData.getHotspotsForLocation(l.id))) {
      const result = this.results()[hotspot.id];
      if (result?.badgeEarned) badges.push(hotspot.badge);
    }
    return badges;
  });

  constructor(private gameData: GameDataService) {
    this.loadFromStorage();
  }

  setPlayerName(name: string) {
    this.playerName.set(name || 'Explorer');
    this.persist();
  }

  getPlayerName() {
    return this.playerName();
  }

  // --- Online mode (added with the backend) ---------------------------------
  // GameApiService calls these so the server's copy of progress shows up in the
  // existing screens. They deliberately do NOT write to localStorage.

  /** Replace local results with what the server says. */
  hydrateFromServer(results: PlayerHotspotResult[], playerName: string) {
    this.results.set(Object.fromEntries(results.map((r) => [r.hotspotId, r])));
    this.playerName.set(playerName || 'Explorer');
  }

  /** Clear results (signed out / nobody playing yet). */
  resetFromServer() {
    this.results.set({});
    this.playerName.set('Explorer');
  }

  /** A hotspot is unlocked if it has no prerequisites, or all prerequisites are completed. */
  isHotspotUnlocked(hotspotId: string): boolean {
    const hotspot = this.gameData.getHotspot(hotspotId);
    if (!hotspot) return false;
    if (hotspot.unlockRequires.length === 0) return true;
    return hotspot.unlockRequires.every((reqId) => this.results()[reqId]?.completed);
  }

  isHotspotCompleted(hotspotId: string): boolean {
    return !!this.results()[hotspotId]?.completed;
  }

  getResult(hotspotId: string): PlayerHotspotResult | undefined {
    return this.results()[hotspotId];
  }

  /** 0-100 completion percentage for a location, based on its hotspots. */
  getLocationProgressPct(locationId: string): number {
    const hotspots = this.gameData.getHotspotsForLocation(locationId);
    if (hotspots.length === 0) return 0;
    const completed = hotspots.filter((h) => this.isHotspotCompleted(h.id)).length;
    return Math.round((completed / hotspots.length) * 100);
  }

  /** 0-100 completion for a whole city: average of its locations' completion. */
  getCityProgressPct(cityId: string): number {
    const locations = this.gameData.getLocationsForCity(cityId);
    if (locations.length === 0) return 0;
    return Math.round(locations.reduce((sum, l) => sum + this.getLocationProgressPct(l.id), 0) / locations.length);
  }

  /** Records the outcome of a trivia/mini-game challenge and updates badges/leaderboard. */
  recordHotspotResult(hotspotId: string, correctAnswers: number, totalQuestions: number, score: number) {
    const completed = totalQuestions === 0 || correctAnswers > 0;
    const result: PlayerHotspotResult = {
      hotspotId,
      completed,
      correctAnswers,
      totalQuestions,
      score,
      badgeEarned: completed,
    };
    this.results.update((current) => ({ ...current, [hotspotId]: result }));
    this.persist();
  }

  /** Leaderboard for a location: top 10 by score, descending. Includes the current player's runs. */
  getLeaderboardForLocation(locationId: string): LeaderboardEntry[] {
    const hotspots = this.gameData.getHotspotsForLocation(locationId);
    const entries: LeaderboardEntry[] = hotspots
      .map((h) => this.results()[h.id])
      .filter((r): r is PlayerHotspotResult => !!r)
      .map((r) => ({ playerName: this.playerName(), locationId, score: r.score }));

    return entries
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  private persist() {
    const payload: StoredProgress = { playerName: this.playerName(), results: this.results() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage may be unavailable (e.g. private browsing); progress just won't persist.
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: StoredProgress = JSON.parse(raw);
      this.playerName.set(parsed.playerName ?? 'Explorer');
      this.results.set(parsed.results ?? {});
    } catch {
      // Ignore corrupt/missing storage.
    }
  }
}
