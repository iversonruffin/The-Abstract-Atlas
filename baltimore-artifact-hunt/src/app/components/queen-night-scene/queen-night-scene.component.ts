import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * Queen City at night: the parallax scene from the design canvas ("Queen City · Sunset"), built from simple shapes.
 *
 * Used twice inside the scene, so the clickable houses can sit between the layers:
 *   <app-queen-night-scene part="back">   sky, clouds, skyline, trees + light rail, street   (behind the houses)
 *   <app-queen-night-scene part="front">  dogwood branch + Trade & Tryon sign              (in front of the houses)
 *
 * Each layer is a `.layer` with a `data-depth`; the scene's parallax finds them with `selector: '.layer'`.
 * The host uses `display: contents`, so the layers position against the scene itself.
 * When your painted layers are ready, each `.qn-*` layer's shapes get swapped for one image.
 */
@Component({
  selector: 'app-queen-night-scene',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queen-night-scene.component.html',
  styleUrl: './queen-night-scene.component.css',
})
export class QueenNightSceneComponent {
  @Input() part: 'back' | 'front' = 'back';

  /** Uptown towers, left to right: width and height in % of the screen. The crown tower is the tallest. */
  readonly buildings = [
    { w: 5.6, h: 24 }, { w: 4.2, h: 31 }, { w: 7.3, h: 21 }, { w: 5, h: 35 }, { w: 6.5, h: 29 },
    { w: 5.8, h: 40, crown: true },
    { w: 6.9, h: 34 }, { w: 4, h: 27 }, { w: 6, h: 37 }, { w: 7.5, h: 22 }, { w: 4.8, h: 32 }, { w: 6.2, h: 20 }, { w: 4.6, h: 25 },
  ];

  /** Dogwood blossoms on the branch, in % of the screen. */
  readonly blossoms = [
    { x: 1, y: 3 }, { x: 8.5, y: 8 }, { x: 14.5, y: 6 }, { x: 19, y: 14 }, { x: 26, y: 16 },
    { x: 30, y: 21 }, { x: 22, y: 7 }, { x: 11.5, y: 16 }, { x: 33, y: 14 },
  ];
}
