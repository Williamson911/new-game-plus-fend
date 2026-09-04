import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(authService, 'logout');
  });

  afterEach(() => httpMock.verify());

  it('logs out and redirects to /auth/login on a 401 from a protected endpoint', () => {
    http.get(`${environment.apiUrl}/orders`).subscribe({ error: () => {} });

    httpMock
      .expectOne(`${environment.apiUrl}/orders`)
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not log out or redirect on a 401 from the login endpoint itself', () => {
    http.post(`${environment.apiUrl}/auth/login`, {}).subscribe({ error: () => {} });

    httpMock
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('passes through non-401 errors unchanged', () => {
    let caughtStatus: number | undefined;
    http.get(`${environment.apiUrl}/orders`).subscribe({
      error: (err) => (caughtStatus = err.status),
    });

    httpMock
      .expectOne(`${environment.apiUrl}/orders`)
      .flush('conflict', { status: 409, statusText: 'Conflict' });

    expect(caughtStatus).toBe(409);
    expect(authService.logout).not.toHaveBeenCalled();
  });
});

describe('errorInterceptor - circular dependency regression', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    // Set up a valid token BEFORE configuring TestBed, so AuthService.restoreSession()
    // makes the /me request while errorInterceptor is in the chain.
    localStorage.clear();
    const now = Math.floor(Date.now() / 1000);
    const base64url = (obj: unknown) =>
      btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const token = `${base64url({ alg: 'none' })}.${base64url({ sub: 'will', id: 'u1', email: 'will@test.dev', roles: ['BUYER'], iat: now, exp: now + 3600 })}.sig`;
    localStorage.setItem('ngp_token', token);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('does not throw a circular-dependency error when AuthService itself triggers a request through this interceptor', () => {
    // Simulates AuthService's own constructor firing its /me call while
    // errorInterceptor (which injects AuthService via injector.get) is in the same chain.
    expect(() => TestBed.inject(AuthService)).not.toThrow();

    const meReq = httpMock.expectOne(`${environment.apiUrl}/me`);
    meReq.flush({
      id: 'u1',
      username: 'will',
      email: 'will@test.dev',
      createdAt: '2026-01-01T00:00:00',
    });

    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(true);
  });
});
