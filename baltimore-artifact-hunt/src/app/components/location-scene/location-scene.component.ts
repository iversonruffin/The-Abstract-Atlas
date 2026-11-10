import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import Parallax from 'parallax-js';
import { City, CityLocation, Hotspot } from '../../models/game.models';
import { AuthUiService } from '../../services/auth-ui.service';
import { GameApiService } from '../../services/game-api.service';
import { GameDataService } from '../../services/game-data.service';
import { ProgressService } from '../../services/progress.service';
import { HotspotModalComponent } from '../hotspot-modal/hotspot-modal.component';
import { LeaderboardComponent } from '../leaderboard/leaderboard.component';
import { LeaderboardOnlineComponent } from '../leaderboard-online/leaderboard-online.component';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'app-location-scene',
  standalone: true,
  imports: [CommonModule, RouterLink, HotspotModalComponent, ProgressBarComponent, LeaderboardComponent, LeaderboardOnlineComponent],
  templateUrl: './location-scene.component.html',
  styleUrl: './location-scene.component.css',
})
export class LocationSceneComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sceneEl') sceneEl!: ElementRef<HTMLElement>;
  @ViewChild('zoomWrapEl') zoomWrapEl!: ElementRef<HTMLElement>;

  location?: CityLocation;
  /** Set on /city/:cityId. The scene then shows one house per location in that city. */
  city?: City;
  /** Locations of the open city, for the leaderboard's location picker. */
  cityLocations: CityLocation[] = [];
  /** Which location's leaderboard is showing (city scene only). */
  leaderboardLocationId = '';
  /** Phones/tablets: no bird cursor; tilt the device to move the scene instead. */
  isTouch = false;
  /** iOS only: tilt needs a one-time permission tap. */
  needsTiltPermission = false;
  tiltEnabled = false;
  tiltDenied = false;
  hotspots: Hotspot[] = [];
  activeHotspot: Hotspot | null = null;
  modalActive = false;
  hintVisible = true;
  leaderboardVisible = false;

  private parallaxInstance: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gameData: GameDataService,
    public progress: ProgressService,
    public api: GameApiService,
    private authUi: AuthUiService,
  ) {}

  ngOnInit() {
    this.isTouch = typeof window !== 'undefined' && window.matchMedia?.('(hover: none) and (pointer: coarse)').matches === true;
    this.needsTiltPermission =
      this.isTouch && typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function';

    // City scene (/city/:cityId): a synthetic "location" stands in for the city so the heading works,
    // and the houses are every hotspot of the city's locations.
    const cityId = this.route.snapshot.paramMap.get('cityId');
    if (cityId) {
      this.city = this.gameData.getCity(cityId);
      if (!this.city) {
        this.router.navigate(['/']);
        return;
      }
      this.cityLocations = this.gameData.getLocationsForCity(cityId);
      this.leaderboardLocationId = this.cityLocations[0]?.id ?? '';
      this.location = { id: this.city.id, name: this.city.name, tagline: this.city.tagline, hotspotIds: [] };
      this.hotspots = this.gameData.getHotspotsForCity(cityId);
      return;
    }

    const locationId = this.route.snapshot.paramMap.get('locationId') ?? '';
    this.location = this.gameData.getLocation(locationId);
    this.hotspots = this.gameData.getHotspotsForLocation(locationId);

    if (!this.location) {
      this.router.navigate(['/']);
    }

    // Coming-soon locations can't be opened by anyone yet; a direct link goes back to the map.
    if (this.location?.comingSoon) {
      this.router.navigate(['/']);
      return;
    }

    // Online mode: guests can only open Ridgely's and Uptown. If someone lands here directly
    // (e.g. a QR code or a typed URL), send them back and offer sign-up.
    if (this.api.enabled && this.location) {
      const name = this.location.name;
      void this.api.whenReady().then(() => {
        if (this.api.isLocked(locationId)) {
          this.router.navigate(['/']);
          this.authUi.show('signup', `Sign up to unlock ${name}.`);
        }
      });
    }
  }

  ngAfterViewInit() {
    if (!this.sceneEl) return;
    this.startParallax();
  }

  /**
   * Starts the parallax. On a phone, parallax-js follows the gyroscope; calibrating makes "the way you're
   * holding it now" the middle, so tilting from there moves the scene. Android works right away.
   * iOS needs enableTilt() first (a user tap), and the instance is rebuilt after permission is given.
   */
  private startParallax() {
    this.parallaxInstance?.destroy?.();
    this.parallaxInstance = new (Parallax as any)(this.sceneEl.nativeElement, {
      relativeInput: false,
      hoverOnly: false,
      calibrateX: this.isTouch,
      calibrateY: this.isTouch,
      invertX: true,
      invertY: true,
      limitX: 60,
      limitY: 40,
    });
    this.parallaxInstance.friction(0.12, 0.12);
    this.parallaxInstance.scalar(9.0, 6.0);
  }

  /** "Enable tilt" button (iOS 13+ asks permission for motion sensors, and only from a tap). */
  async enableTilt() {
    this.tiltDenied = false;
    try {
      const requests = [(window as any).DeviceOrientationEvent, (window as any).DeviceMotionEvent]
        .filter((E) => typeof E?.requestPermission === 'function')
        .map((E) => E.requestPermission() as Promise<string>);
      const answers = await Promise.all(requests);
      if (answers.some((a) => a !== 'granted')) throw new Error('denied');
      this.tiltEnabled = true;
      this.startParallax(); // rebuild so it starts listening now that events will arrive
    } catch {
      this.tiltDenied = true;
    }
  }

  ngOnDestroy() {
    this.parallaxInstance?.destroy?.();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (this.isTouch) return; // no bird cursor on phones
    const player = document.getElementById('player');
    if (player) player.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }

  isUnlocked(hotspot: Hotspot): boolean {
    // Also locked when the server says this location needs an account (guests: Ridgely's and Uptown only).
    if (this.isComingSoon(hotspot)) return false;
    return this.progress.isHotspotUnlocked(hotspot.id) && !this.api.isLocked(hotspot.locationId);
  }

  /** Coming-soon houses show on the map but can't be opened by anyone yet. */
  isComingSoon(hotspot: Hotspot): boolean {
    return this.gameData.isComingSoon(hotspot.locationId);
  }

  /** House position: in the city scene every location's house has its own spot. */
  housePosition(hotspot: Hotspot) {
    return this.city ? hotspot.cityPosition ?? hotspot.position : hotspot.position;
  }

  /** Heading progress: whole-city average in the city scene, otherwise the location's own. */
  headingProgressPct(): number {
    if (!this.location) return 0;
    return this.city ? this.progress.getCityProgressPct(this.city.id) : this.progress.getLocationProgressPct(this.location.id);
  }

  /** Which location the leaderboard panel shows. */
  get boardLocationId(): string {
    return this.city ? this.leaderboardLocationId : this.location?.id ?? '';
  }

  isCompleted(hotspot: Hotspot): boolean {
    return this.progress.isHotspotCompleted(hotspot.id);
  }

  openHotspot(hotspot: Hotspot) {
    if (this.isComingSoon(hotspot)) return; // nothing to open yet, for guests or accounts
    if (this.api.isLocked(hotspot.locationId)) {
      const loc = this.gameData.getLocation(hotspot.locationId);
      this.authUi.show('signup', `Sign up to unlock ${loc?.name ?? hotspot.name}.`);
      return;
    }
    if (!this.isUnlocked(hotspot)) return;

    const beaconEl = document.getElementById('beacon-' + hotspot.id);
    const zoomWrap = this.zoomWrapEl?.nativeElement;
    if (beaconEl && zoomWrap) {
      const rect = beaconEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      zoomWrap.style.transformOrigin = `${cx}px ${cy}px`;
      zoomWrap.style.transform = `scale(2.4) translate(${(vw / 2 - cx) / 2.4}px, ${(vh / 2 - cy) / 2.4}px)`;
      zoomWrap.classList.add('zoomed');
      this.hintVisible = false;

      setTimeout(() => {
        this.activeHotspot = hotspot;
        this.modalActive = true;
      }, 550);
    } else {
      this.activeHotspot = hotspot;
      this.modalActive = true;
    }
  }

  toggleLeaderboard() {
    this.leaderboardVisible = !this.leaderboardVisible;
  }

  closeModal() {
    this.modalActive = false;
    setTimeout(() => {
      const zoomWrap = this.zoomWrapEl?.nativeElement;
      if (zoomWrap) {
        zoomWrap.classList.remove('zoomed');
        zoomWrap.style.transform = 'scale(1) translate(0,0)';
      }
      this.hintVisible = true;
      this.activeHotspot = null;
    }, 150);
  }
}
