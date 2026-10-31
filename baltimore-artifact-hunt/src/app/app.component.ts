import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountBarComponent } from './components/account-bar/account-bar.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AccountBarComponent, AuthModalComponent],
  template: `<router-outlet></router-outlet>
    <app-account-bar></app-account-bar>
    <app-auth-modal></app-auth-modal>`,
})
export class AppComponent {}
