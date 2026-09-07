import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Navbar } from './navbar';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../../core/cart/cart.service';

class AuthServiceStub {
  isAuthenticatedSignal = signal(false);
  rolesSignal = signal<string[]>([]);
  isAuthenticated = this.isAuthenticatedSignal.asReadonly();
  logout = vi.fn();
  hasRole(role: string): boolean {
    return this.rolesSignal().includes(role);
  }
}

class CartServiceStub {
  itemCount = signal(0);
  getCart = vi.fn().mockReturnValue(of({ items: [] }));
}

describe('Navbar', () => {
  let authService: AuthServiceStub;
  let cartService: CartServiceStub;

  beforeEach(() => {
    authService = new AuthServiceStub();
    cartService = new CartServiceStub();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: CartService, useValue: cartService },
      ],
    });
  });

  it('shows a Login link when not authenticated', () => {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Login');
    expect(el.textContent).not.toContain('Déconnexion');
  });

  it('shows a cart link with a "Panier" label when authenticated, and loads the cart', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cartLink = el.querySelector('a[aria-label="Panier"]');
    expect(cartLink).not.toBeNull();
    expect(cartLink?.textContent).toContain('Panier');
    expect(cartService.getCart).toHaveBeenCalled();
  });

  it('shows the item count badge only when the cart has items', () => {
    authService.isAuthenticatedSignal.set(true);
    cartService.itemCount.set(3);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-navbar__cart-count')?.textContent).toContain('3');
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
