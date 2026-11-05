import { Routes } from '@angular/router';
import { CityMapComponent } from './components/city-map/city-map.component';
import { LocationSceneComponent } from './components/location-scene/location-scene.component';

export const routes: Routes = [
  { path: '', component: CityMapComponent },
  // A city's parallax scene: one house per location. (Same component as the single-location scene.)
  { path: 'city/:cityId', component: LocationSceneComponent },
  { path: 'location/:locationId', component: LocationSceneComponent },
  { path: '**', redirectTo: '' },
];
