import { Injectable } from '@angular/core';
import { CITIES, CITY_LOCATIONS, HOTSPOTS } from '../data/game-data';
import { Badge, City, CityLocation, Hotspot } from '../models/game.models';

@Injectable({ providedIn: 'root' })
export class GameDataService {
  private readonly locations: CityLocation[] = CITY_LOCATIONS;
  private readonly hotspots: Hotspot[] = HOTSPOTS;

  getLocations(): CityLocation[] {
    return this.locations;
  }

  getLocation(locationId: string): CityLocation | undefined {
    return this.locations.find((l) => l.id === locationId);
  }

  /** Locations marked comingSoon show on the map but nobody can open them yet. */
  isComingSoon(locationId: string): boolean {
    return !!this.getLocation(locationId)?.comingSoon;
  }

  getHotspotsForLocation(locationId: string): Hotspot[] {
    return this.hotspots.filter((h) => h.locationId === locationId);
  }

  getHotspot(hotspotId: string): Hotspot | undefined {
    return this.hotspots.find((h) => h.id === hotspotId);
  }

  // --- Cities (home page -> city scene) ---------------------------------------
  getCities(): City[] {
    return CITIES;
  }

  getCity(cityId: string): City | undefined {
    return CITIES.find((c) => c.id === cityId);
  }

  getLocationsForCity(cityId: string): CityLocation[] {
    return this.locations.filter((l) => l.cityId === cityId);
  }

  /** Every house in a city's scene, in location order. */
  getHotspotsForCity(cityId: string): Hotspot[] {
    return this.getLocationsForCity(cityId).flatMap((l) => this.getHotspotsForLocation(l.id));
  }

  /** All badges in the game (earned or not), for the home page's achievements shelf. Charlotte first, like the cities. */
  getAllBadges(): Badge[] {
    return CITIES.flatMap((c) => this.getHotspotsForCity(c.id)).map((h) => h.badge);
  }
}
