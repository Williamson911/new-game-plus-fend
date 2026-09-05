import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../../environments/environment';

function fakeToken(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(payload)}.signature`;
}

function validToken(roles: string[] = ['BUYER']): string {
  const now = Math.floor(Date.now() / 1000);
  return fakeToken({ sub: 'will', id: 'u1', email: 'will@test.dev', roles, iat: now, exp: now + 3600 });
}

function expiredToken(): string {
  const now = Math.floor(Date.now() / 1000);
  return fakeToken({ sub: 'will', id: 'u1', email: 'will@test.dev', roles: ['BUYER'], iat: now - 7200, exp: now - 3600 });
}

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  afterEach(() => {
    httpMock.verify();
  });

  describe('on construction with no stored token', () => {
    let service: AuthService;

    beforeEach(() => {
      localStorage.clear();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(AuthService);
    });

    it('starts unauthenticated with no roles', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(service.roles()).toEqual([]);
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('on construction with a valid stored token', () => {
    let service: AuthService;

    beforeEach(() => {
      localStorage.clear();
      localStorage.setItem('ngp_token', validToken(['BUYER', 'SELLER']));
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(AuthService);
    });

    it('restores authentication state from the token and fetches /me', () => {
      expect(service.isAuthenticated()).toBe(true);
      expect(service.roles()).toEqual(['BUYER', 'SELLER']);

      const req = httpMock.expectOne(`${environment.apiUrl}/me`);
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'u1', username: 'will', email: 'will@test.dev', createdAt: '2026-01-01T00:00:00' });

      expect(service.currentUser()?.username).toBe('will');
    });
  });

  describe('on construction with an expired stored token', () => {
    let service: AuthService;

    beforeEach(() => {
      localStorage.clear();
      localStorage.setItem('ngp_token', expiredToken());
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(AuthService);
    });

    it('discards the expired token and stays unauthenticated', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('ngp_token')).toBeNull();
    });
  });

  describe('on construction with a malformed stored token', () => {
    let service: AuthService;

    beforeEach(() => {
      localStorage.clear();
      localStorage.setItem('ngp_token', 'not-a-real-jwt');
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(AuthService);
    });

    it('discards the malformed token and stays unauthenticated', () => {
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('ngp_token')).toBeNull();
    });
  });

  describe('actions', () => {
    let service: AuthService;
    let tokenStorage: TokenStorageService;

    beforeEach(() => {
      localStorage.clear();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting()],
      });
      httpMock = TestBed.inject(HttpTestingController);
      service = TestBed.inject(AuthService);
      tokenStorage = TestBed.inject(TokenStorageService);
    });

    it('login() stores the token, updates auth state, then loads /me', () => {
      let resolved: unknown;
      service.login({ email: 'will@test.dev', password: 'secret' }).subscribe((r) => (resolved = r));

      const loginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(loginReq.request.method).toBe('POST');
      expect(loginReq.request.body).toEqual({ email: 'will@test.dev', password: 'secret' });
      loginReq.flush({ token: validToken(['BUYER']) });

      expect(service.isAuthenticated()).toBe(true);
      expect(tokenStorage.getToken()).not.toBeNull();

      const meReq = httpMock.expectOne(`${environment.apiUrl}/me`);
      meReq.flush({ id: 'u1', username: 'will', email: 'will@test.dev', createdAt: '2026-01-01T00:00:00' });

      expect(service.currentUser()?.username).toBe('will');
      expect(resolved).toEqual({ token: expect.any(String) });
    });

    it('login() logs out if the /me fetch fails after a successful login POST', () => {
      let errored: unknown;
      service.login({ email: 'will@test.dev', password: 'secret' }).subscribe({
        error: (e) => (errored = e),
      });

      const loginReq = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      loginReq.flush({ token: validToken(['BUYER']) });

      expect(service.isAuthenticated()).toBe(true);

      const meReq = httpMock.expectOne(`${environment.apiUrl}/me`);
      meReq.flush('server error', { status: 500, statusText: 'Internal Server Error' });

      expect(errored).toBeTruthy();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('register() posts to /auth/register without authenticating', () => {
      let resolved: unknown;
      service
        .register({ username: 'will', email: 'will@test.dev', password: 'secret' })
        .subscribe((r) => (resolved = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      req.flush({ id: 'u1', username: 'will' });

      expect(resolved).toEqual({ id: 'u1', username: 'will' });
      expect(service.isAuthenticated()).toBe(false);
    });

    it('confirmEmail() calls GET /auth/confirm with the token as a query param', () => {
      service.confirmEmail('tok-123').subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/confirm?token=tok-123`);
      expect(req.request.method).toBe('GET');
      req.flush({ username: 'will' });
    });

    it('forgotPassword() posts the email to /auth/forgot-password', () => {
      service.forgotPassword('will@test.dev').subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/forgot-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'will@test.dev' });
      req.flush(null);
    });

    it('resetPassword() posts the token and new password to /auth/reset-password', () => {
      service.resetPassword({ token: 'tok-123', newPassword: 'newSecret1' }).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/reset-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'tok-123', newPassword: 'newSecret1' });
      req.flush(null);
    });

    it('logout() clears the token and resets auth state', () => {
      tokenStorage.setToken(validToken());
      service.logout();

      expect(tokenStorage.getToken()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.roles()).toEqual([]);
      expect(service.currentUser()).toBeNull();
    });

    it('applyNewToken() decodes and applies a new token, updating roles and authentication state', () => {
      service.applyNewToken(validToken(['BUYER', 'SELLER']));

      expect(service.isAuthenticated()).toBe(true);
      expect(service.roles()).toEqual(['BUYER', 'SELLER']);
      expect(tokenStorage.getToken()).not.toBeNull();
    });

    it('hasRole() reflects the roles decoded from the token', () => {
      service.login({ email: 'will@test.dev', password: 'secret' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: validToken(['SELLER']) });
      httpMock
        .expectOne(`${environment.apiUrl}/me`)
        .flush({ id: 'u1', username: 'will', email: 'will@test.dev', createdAt: '2026-01-01T00:00:00' });

      expect(service.hasRole('SELLER')).toBe(true);
      expect(service.hasRole('ADMIN')).toBe(false);
    });
  });
});
