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
import { CityLocation, Hotspot } from '../../models/game.models';
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
    const locationId = this.route.snapshot.paramMap.get('locationId') ?? '';
    this.location = this.gameData.getLocation(locationId);
    this.hotspots = this.gameData.getHotspotsForLocation(locationId);

    if (!this.location) {
      this.router.navigate(['/']);
    }

    // Online mode: guests can only open Federal Hill. If someone lands here directly
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
    this.parallaxInstance = new (Parallax as any)(this.sceneEl.nativeElement, {
      relativeInput: false,
      hoverOnly: false,
      calibrateX: false,
      calibrateY: false,
      invertX: true,
      invertY: true,
      limitX: 60,
      limitY: 40,
    });
    this.parallaxInstance.friction(0.12, 0.12);
    this.parallaxInstance.scalar(9.0, 6.0);
  }

  ngOnDestroy() {
    this.parallaxInstance?.destroy?.();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    const player = document.getElementById('player');
    if (player) player.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }

  isUnlocked(hotspot: Hotspot): boolean {
    return this.progress.isHotspotUnlocked(hotspot.id);
  }

  isCompleted(hotspot: Hotspot): boolean {
    return this.progress.isHotspotCompleted(hotspot.id);
  }

  openHotspot(hotspot: Hotspot) {
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
