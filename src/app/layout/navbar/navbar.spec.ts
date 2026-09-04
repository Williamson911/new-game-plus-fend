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
    expect(el.textContent).not.toContain('Logout');
  });

  it('shows Profile, Cart and Logout when authenticated', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Profile');
    expect(el.textContent).toContain('Cart');
    expect(el.textContent).toContain('Logout');
  });

  it('only shows My Shop when the user has the SELLER role', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixtureWithoutRole = TestBed.createComponent(Navbar);
    fixtureWithoutRole.detectChanges();
    expect((fixtureWithoutRole.nativeElement as HTMLElement).textContent).not.toContain('My Shop');

    authService.rolesSignal.set(['SELLER']);
    const fixtureWithRole = TestBed.createComponent(Navbar);
    fixtureWithRole.detectChanges();
    expect((fixtureWithRole.nativeElement as HTMLElement).textContent).toContain('My Shop');
  });

  it('calls AuthService.logout() when the logout button is clicked', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const logoutButton = buttons.find((b) => b.textContent?.includes('Logout')) as HTMLButtonElement;
    logoutButton.click();

    expect(authService.logout).toHaveBeenCalled();
  });
});
