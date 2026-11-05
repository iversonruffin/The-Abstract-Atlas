import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, City, CityLocation } from '../../models/game.models';
import { AuthUiService } from '../../services/auth-ui.service';
import { GameApiService } from '../../services/game-api.service';
import { GameDataService } from '../../services/game-data.service';
import { ProgressService } from '../../services/progress.service';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'app-city-map',
  standalone: true,
  imports: [CommonModule, RouterLink, ProgressBarComponent],
  templateUrl: './city-map.component.html',
  styleUrl: './city-map.component.css',
})
export class CityMapComponent {
  locations: CityLocation[];
  /** Home page now lists cities (Charlotte, Baltimore); each opens its own parallax scene. */
  cities: City[];
  /** Every badge in the game, so unearned ones can show as placeholders on the achievements shelf. */
  allBadges: Badge[];

  constructor(
    private gameData: GameDataService,
    public progress: ProgressService,
    public api: GameApiService,
    private authUi: AuthUiService,
  ) {
    this.locations = this.gameData.getLocations();
    this.cities = this.gameData.getCities();
    this.allBadges = this.gameData.getAllBadges();
  }

  /** Online mode: guests see account-only locations as locked. Always false offline. */
  isLocked(locationId: string): boolean {
    return this.api.isLocked(locationId);
  }

  promptSignUp(locationName: string) {
    this.authUi.show('signup', `Sign up to unlock ${locationName}.`);
  }

  isBadgeEarned(badgeId: string): boolean {
    return this.progress.earnedBadges().some((b) => b.id === badgeId);
  }

  /** True when a guest can't open ANY of the city's locations (they can still look around the city). */
  isCityLocked(city: City): boolean {
    return city.locationIds.every((id) => this.api.isLocked(id));
  }
}
