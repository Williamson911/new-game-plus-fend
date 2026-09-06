import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';
import { AuthService } from '../../core/auth/auth.service';

class AuthServiceStub {
  isAuthenticatedSignal = signal(false);
  rolesSignal = signal<string[]>([]);
  isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  logout = vi.fn();
  hasRole(role: string): boolean {
    return this.rolesSignal().includes(role);
  }
}

describe('Navbar', () => {
  let authService: AuthServiceStub;

  beforeEach(() => {
    authService = new AuthServiceStub();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  });

  it('shows a Login link when not authenticated', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Login');
    expect(el.textContent).not.toContain('Déconnexion');
  });

  it('shows a cart icon link when authenticated', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('a[aria-label="Panier"]')).not.toBeNull();
  });

  it('shows a "Mon compte" trigger with an accessible menu when authenticated', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const trigger = el.querySelector('.app-navbar__account-trigger');
    expect(trigger?.textContent).toContain('Mon compte');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('true');
    expect(el.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('shows Profil, Mes commandes and Déconnexion when authenticated', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Profil');
    expect(el.textContent).toContain('Mes commandes');
    expect(el.textContent).toContain('Déconnexion');
  });

  it('shows My Shop for any authenticated user, regardless of role', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('My Shop');
  });

  it('does not show My Shop when not authenticated', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('My Shop');
  });

  it('calls AuthService.logout() when the logout button is clicked', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const logoutButton = buttons.find((b) => b.textContent?.includes('Déconnexion')) as HTMLButtonElement;
    logoutButton.click();

    expect(authService.logout).toHaveBeenCalled();
  });
});
