import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Shell } from './shell';
import { AuthService } from '../../core/auth/auth.service';
import { signal } from '@angular/core';

class AuthServiceStub {
  isAuthenticated = signal(false).asReadonly();
  hasRole(): boolean {
    return false;
  }
}

describe('Shell', () => {
  it('renders the navbar and a router outlet', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: new AuthServiceStub() }],
    });

    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-navbar')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });
});
