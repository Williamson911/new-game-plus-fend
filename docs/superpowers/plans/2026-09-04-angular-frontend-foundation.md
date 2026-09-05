# Angular Frontend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the freshly-generated Angular 22 app into a working shell for `new-game-plus`: HTTP/auth infrastructure wired to the real backend, a shared design-system component kit matching the provided mockups, an app shell (navbar + layout), and a full routing skeleton (real auth pages now, placeholder pages for the feature waves to come).

**Architecture:** Standalone Angular components throughout (no NgModules), signals for local/service state, functional interceptors and guards, Reactive Forms for the auth pages. Backend contract: `http://localhost:8080`, stateless JWT (`Authorization: Bearer`), roles embedded in the token payload.

**Tech Stack:** Angular 22 (standalone, signals), `@angular/router` (functional guards, `withComponentInputBinding`), `@angular/common/http` (functional interceptors), `@angular/forms` (Reactive Forms + custom `ControlValueAccessor`s), `jwt-decode`, Vitest (`@angular/build:unit-test`, already configured).

Spec: `docs/superpowers/specs/2026-09-04-angular-frontend-foundation-design.md`

---

## Before you start

Every task below ends with a step that runs `npx ng test --watch=false`. This runs the **entire** suite (the Vitest builder used here doesn't support single-file filtering through the `ng test` wrapper) — expect prior tasks' tests to also be listed as passing. "Expected" output in each step only calls out the test(s) that task just added/changed.

All file paths are relative to the repo root: `D:\William\Documents\Technifutur\new-game-plus-frontend`.

---

### Task 1: Design tokens and typography ✅ DONE (staged, not committed)

**Files:**
- Create: `src/app/shared/styles/tokens.css`
- Create: `src/app/shared/styles/typography.css`
- Modify: `src/styles.css`
- Modify: `src/index.html`
- Modify: `angular.json:27-29`

- [ ] **Step 1: Create the color/spacing tokens**

`src/app/shared/styles/tokens.css`:

```css
:root {
  --color-navy: #1A1422;
  --color-orange: #F2AA4C;
  --color-bg: #EDE4D3;
  --color-surface: #FFFFFF;
  --color-accent: #E85A4F;
  --color-text: var(--color-navy);
  --color-border: var(--color-navy);

  --radius: 0;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2rem;
}
```

- [ ] **Step 2: Create the typography tokens**

`src/app/shared/styles/typography.css`:

```css
:root {
  --font-title: 'Press Start 2P', monospace;
  --font-body: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

h1, h2, h3, .app-title {
  font-family: var(--font-title);
  color: var(--color-text);
  line-height: 1.5;
  letter-spacing: 0.02em;
}

body {
  font-family: var(--font-body);
  color: var(--color-text);
}
```

`--font-title` is a placeholder Google Font (loaded in `index.html` below). When the real
title font file is provided, swap this one line — nothing else changes.

Headings reference `--color-text` (not `--color-navy` directly) so there's one place to
change the base text color later. `background` is deliberately not set here — it belongs
to the global reset (Step 3), not to a typography file.

- [ ] **Step 3: Reset global styles and register the token files as global styles**

`src/styles.css` (replace the current single-comment content):

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: var(--color-bg);
}

img {
  max-width: 100%;
  display: block;
}
```

In `angular.json`, change the `"styles"` array (currently `["src/styles.css"]`, around line 27-29) to load the tokens first:

```json
            "styles": [
              "src/app/shared/styles/tokens.css",
              "src/app/shared/styles/typography.css",
              "src/styles.css"
            ]
```

- [ ] **Step 4: Load the placeholder pixel font**

In `src/index.html`, add inside `<head>`, after the `viewport` meta tag:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
```

- [ ] **Step 5: Verify the app still builds**

Run: `npx ng build`
Expected: build succeeds, no CSS/HTML errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/styles/tokens.css src/app/shared/styles/typography.css src/styles.css src/index.html angular.json
git commit -m "feat: add design tokens, typography, and placeholder pixel font"
```

---

### Task 2: Environment configuration ✅ DONE (staged, not committed)

**Files:**
- Create: `src/environments/environment.ts`
- Create: `src/environments/environment.production.ts`
- Modify: `angular.json:31-46`

- [ ] **Step 1: Create the dev environment**

`src/environments/environment.ts`:

```ts
export const environment = {
  apiUrl: 'http://localhost:8080',
};
```

- [ ] **Step 2: Create the production environment**

`src/environments/environment.production.ts`:

```ts
// No production backend exists yet; same placeholder as dev until one is deployed.
export const environment = {
  apiUrl: 'http://localhost:8080',
};
```

- [ ] **Step 3: Wire the file replacement into the production build**

In `angular.json`, inside `architect.build.configurations.production` (currently only
`budgets` and `outputHashing`, lines ~32-46), add `fileReplacements`:

```json
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kB",
                  "maximumError": "1MB"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "4kB",
                  "maximumError": "8kB"
                }
              ],
              "outputHashing": "all",
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.production.ts"
                }
              ]
            },
```

- [ ] **Step 4: Verify both configurations build**

Run: `npx ng build`
Expected: succeeds (uses `environment.production.ts`).

Run: `npx ng build --configuration development`
Expected: succeeds (uses `environment.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/environments angular.json
git commit -m "feat: add dev/production environment configuration"
```

---

### Task 3: Install jwt-decode ✅ DONE (staged, not committed; verified directly, no subagent review — trivial lockfile-only change)

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the dependency**

Run: `npm install jwt-decode`
Expected: `package.json` gains `"jwt-decode": "^4.x.x"` under `dependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add jwt-decode"
```

---

### Task 4: Auth types ✅ DONE (staged, not committed; verified directly, no subagent review — type declarations only)

**Files:**
- Create: `src/app/core/auth/auth.types.ts`

- [ ] **Step 1: Write the shared auth type definitions**

`src/app/core/auth/auth.types.ts`:

```ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
}

export interface ConfirmResponse {
  username: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface MeResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface JwtClaims {
  sub: string;
  id: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}
```

No test for this file — it's pure type declarations, nothing to execute.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/core/auth/auth.types.ts
git commit -m "feat: add auth DTO types matching the backend contract"
```

---

### Task 5: TokenStorageService ✅ DONE (staged, not committed; spec + quality reviewed, approved)

**Files:**
- Create: `src/app/core/auth/token-storage.service.ts`
- Test: `src/app/core/auth/token-storage.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/auth/token-storage.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
  });

  it('returns null when no token is stored', () => {
    expect(service.getToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    service.setToken('abc.def.ghi');
    expect(service.getToken()).toBe('abc.def.ghi');
  });

  it('clears a stored token', () => {
    service.setToken('abc.def.ghi');
    service.clearToken();
    expect(service.getToken()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './token-storage.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/auth/token-storage.service.ts`:

```ts
import { Injectable } from '@angular/core';

const TOKEN_KEY = 'ngp_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all 3 `TokenStorageService` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/token-storage.service.ts src/app/core/auth/token-storage.service.spec.ts
git commit -m "feat: add TokenStorageService"
```

---

### Task 6: AuthService ✅ DONE (staged, not committed; spec + quality reviewed, fixed malformed-token crash + /me-failure state rollback, re-reviewed and approved)

**Files:**
- Create: `src/app/core/auth/auth.service.ts`
- Test: `src/app/core/auth/auth.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/auth/auth.service.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './auth.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/auth/auth.service.ts`:

```ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, switchMap, map } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import {
  AuthResponse,
  ConfirmResponse,
  JwtClaims,
  LoginRequest,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
} from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly _currentUser = signal<MeResponse | null>(null);
  private readonly _roles = signal<string[]>([]);
  private readonly _isAuthenticated = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly displayName = computed(() => this._currentUser()?.username ?? null);

  constructor() {
    this.restoreSession();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => this.applyToken(response.token)),
      switchMap((response) => this.refreshMe().pipe(map(() => response))),
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/auth/register`, data);
  }

  confirmEmail(token: string): Observable<ConfirmResponse> {
    const params = new HttpParams().set('token', token);
    return this.http.get<ConfirmResponse>(`${environment.apiUrl}/auth/confirm`, { params });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(payload: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/reset-password`, payload);
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this._currentUser.set(null);
    this._roles.set([]);
    this._isAuthenticated.set(false);
  }

  refreshMe(): Observable<MeResponse> {
    return this.http
      .get<MeResponse>(`${environment.apiUrl}/me`)
      .pipe(tap((me) => this._currentUser.set(me)));
  }

  hasRole(role: string): boolean {
    return this._roles().includes(role);
  }

  private restoreSession(): void {
    const token = this.tokenStorage.getToken();
    if (!token) {
      return;
    }

    if (this.isExpired(token)) {
      this.tokenStorage.clearToken();
      return;
    }

    this.applyToken(token);
    this.refreshMe().subscribe();
  }

  private applyToken(token: string): void {
    this.tokenStorage.setToken(token);
    const claims = jwtDecode<JwtClaims>(token);
    this._roles.set(claims.roles ?? []);
    this._isAuthenticated.set(true);
  }

  private isExpired(token: string): boolean {
    const claims = jwtDecode<JwtClaims>(token);
    return Date.now() >= claims.exp * 1000;
  }
}
```

Note on `login()`: `refreshMe()` is chained so callers can `subscribe()` once and know
both the token exchange *and* the `/me` fetch have completed before navigating away from
the login page.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `AuthService` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/auth.service.ts src/app/core/auth/auth.service.spec.ts
git commit -m "feat: add AuthService (login, register, password reset, session restore)"
```

---

### Task 7: authInterceptor ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/core/http/auth.interceptor.ts`
- Test: `src/app/core/http/auth.interceptor.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/http/auth.interceptor.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from '../auth/token-storage.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => httpMock.verify());

  it('adds the Authorization header when a token is stored', () => {
    tokenStorage.setToken('my-token');

    http.get(`${environment.apiUrl}/listings`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/listings`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush([]);
  });

  it('does not add the header when no token is stored', () => {
    http.get(`${environment.apiUrl}/listings`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/listings`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('does not add the header for requests to a different origin', () => {
    tokenStorage.setToken('my-token');

    http.get('https://api.mondialrelay.com/ping').subscribe();

    const req = httpMock.expectOne('https://api.mondialrelay.com/ping');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './auth.interceptor'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/http/auth.interceptor.ts`:

```ts
import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../auth/token-storage.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.getToken();

  if (token && req.url.startsWith(environment.apiUrl)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req);
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `authInterceptor` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/http/auth.interceptor.ts src/app/core/http/auth.interceptor.spec.ts
git commit -m "feat: add authInterceptor to attach the bearer token"
```

---

### Task 8: errorInterceptor ✅ DONE (staged, not committed; fixed a real NG0200 circular-DI bug found in review — see correction note below — re-reviewed and approved)

**Files:**
- Create: `src/app/core/http/error.interceptor.ts`
- Test: `src/app/core/http/error.interceptor.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/http/error.interceptor.spec.ts`:

```ts
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

    httpMock.expectOne(`${environment.apiUrl}/orders`).flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

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

    httpMock.expectOne(`${environment.apiUrl}/orders`).flush('conflict', { status: 409, statusText: 'Conflict' });

    expect(caughtStatus).toBe(409);
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './error.interceptor'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/http/error.interceptor.ts`:

```ts
import { inject, Injector } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const isLoginRequest = req.url.endsWith('/auth/login');

      if (isUnauthorized && !isLoginRequest) {
        const authService = injector.get(AuthService);
        authService.logout();
        router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    }),
  );
};
```

`AuthService` is resolved lazily via `Injector.get()` inside `catchError`, not eagerly via
`inject()` at the top of the interceptor. `AuthService`'s own constructor synchronously
fires a `/me` request through `refreshMe()` when restoring a session — if this interceptor
eagerly injected `AuthService` at interceptor-invocation time, that request would trigger a
reentrant `inject(AuthService)` while `AuthService` is still being constructed, throwing
`NG0200: Circular dependency detected`. Deferring resolution to error-time avoids this: by
the time an HTTP error actually arrives (always asynchronous, whether a real network
response or a test's `.flush()`), `AuthService`'s constructor has already returned.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `errorInterceptor` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/http/error.interceptor.ts src/app/core/http/error.interceptor.spec.ts
git commit -m "feat: add errorInterceptor to log out on 401"
```

---

### Task 9: authGuard ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/core/auth/auth.guard.ts`
- Test: `src/app/core/auth/auth.guard.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/auth/auth.guard.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  function run(isAuthenticated: boolean, url: string) {
    const authServiceStub = { isAuthenticated: () => isAuthenticated } as Partial<AuthService>;
    const createUrlTree = vi.fn().mockReturnValue('redirect-tree' as unknown as UrlTree);
    const routerStub = { createUrlTree } as Partial<Router>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: routerStub },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

    return { result, createUrlTree };
  }

  it('allows navigation when authenticated', () => {
    const { result } = run(true, '/profile');
    expect(result).toBe(true);
  });

  it('redirects to /auth/login with a returnUrl when not authenticated', () => {
    const { result, createUrlTree } = run(false, '/profile');
    expect(result).toBe('redirect-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/auth/login'], { queryParams: { returnUrl: '/profile' } });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './auth.guard'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/auth/auth.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `authGuard` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/auth.guard.ts src/app/core/auth/auth.guard.spec.ts
git commit -m "feat: add authGuard"
```

---

### Task 10: roleGuard ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/core/auth/role.guard.ts`
- Test: `src/app/core/auth/role.guard.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/auth/role.guard.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';

describe('roleGuard', () => {
  function run(hasRole: boolean) {
    const authServiceStub = { hasRole: vi.fn().mockReturnValue(hasRole) } as Partial<AuthService>;
    const createUrlTree = vi.fn().mockReturnValue('redirect-tree' as unknown as UrlTree);
    const routerStub = { createUrlTree } as Partial<Router>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: routerStub },
      ],
    });

    const guard = roleGuard('SELLER');
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    return { result, authServiceStub, createUrlTree };
  }

  it('allows navigation when the user has the required role', () => {
    const { result, authServiceStub } = run(true);
    expect(result).toBe(true);
    expect(authServiceStub.hasRole).toHaveBeenCalledWith('SELLER');
  });

  it('redirects home when the user does not have the required role', () => {
    const { result, createUrlTree } = run(false);
    expect(result).toBe('redirect-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './role.guard'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/auth/role.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export function roleGuard(role: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.hasRole(role)) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `roleGuard` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/role.guard.ts src/app/core/auth/role.guard.spec.ts
git commit -m "feat: add roleGuard factory"
```

---

### Task 11: Wire HTTP client, router providers, and the French locale ✅ DONE (staged, not committed; verified directly — build + full suite pass, content matches spec exactly)

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Update app.config.ts**

`src/app/app.config.ts` (replace entirely):

```ts
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFrBe from '@angular/common/locales/fr-BE';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

registerLocaleData(localeFrBe);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'fr-BE' },
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
  ],
};
```

`withComponentInputBinding()` lets routed components declare `input()`s that are bound
directly from route `data`/params/query params — used by the page-stub component in
Task 19. `LOCALE_ID: 'fr-BE'` matches the spec's French-only assumption and makes
`CurrencyPipe`/`DatePipe` (used by the `Card` component in Task 16) format prices and
dates the way a Belgian buyer expects (`20,00 €`, not the Angular default `€20.00`).

- [ ] **Step 2: Verify the app still builds**

Run: `npx ng build`
Expected: succeeds (routes is still `[]` at this point, that's fine).

- [ ] **Step 3: Run the full test suite**

Run: `npx ng test --watch=false`
Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/app/app.config.ts
git commit -m "feat: wire HttpClient interceptors and component input binding"
```

---

### Task 12: Shared UI — Button ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/shared/ui/button/button.ts`
- Create: `src/app/shared/ui/button/button.html`
- Create: `src/app/shared/ui/button/button.css`
- Test: `src/app/shared/ui/button/button.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/shared/ui/button/button.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

describe('Button', () => {
  it('renders a button element', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button')).toBeTruthy();
  });

  it('defaults to variant "primary" and type "button"', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.classList.contains('app-button--secondary')).toBe(false);
  });

  it('applies the secondary variant class when requested', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('variant', 'secondary');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('app-button--secondary')).toBe(true);
  });

  it('emits "pressed" on click when not disabled', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.pressed.subscribe(() => (emitted = true));

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitted).toBe(true);
  });

  it('does not emit "pressed" when disabled', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    let emitted = false;
    fixture.componentInstance.pressed.subscribe(() => (emitted = true));

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitted).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './button'`.

- [ ] **Step 3: Write the implementation**

`src/app/shared/ui/button/button.ts`:

```ts
import { Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly disabled = input<boolean>(false);
  readonly pressed = output<void>();

  onClick(): void {
    if (!this.disabled()) {
      this.pressed.emit();
    }
  }
}
```

`src/app/shared/ui/button/button.html`:

```html
<button
  class="app-button"
  [class.app-button--secondary]="variant() === 'secondary'"
  [type]="type()"
  [disabled]="disabled()"
  (click)="onClick()"
>
  <ng-content />
</button>
```

`src/app/shared/ui/button/button.css`:

```css
.app-button {
  font-family: var(--font-body);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
  padding: var(--space-2) var(--space-4);
  border: 2px solid var(--color-navy);
  border-radius: var(--radius);
  background: var(--color-accent);
  color: var(--color-surface);
  cursor: pointer;
}

.app-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-button--secondary {
  background: var(--color-surface);
  color: var(--color-navy);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `Button` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/button
git commit -m "feat: add shared Button component"
```

---

### Task 13: Shared UI — Badge ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/shared/ui/badge/badge.ts`
- Create: `src/app/shared/ui/badge/badge.html`
- Create: `src/app/shared/ui/badge/badge.css`
- Test: `src/app/shared/ui/badge/badge.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/shared/ui/badge/badge.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders the label', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', 'featured');
    fixture.componentRef.setInput('label', 'Pépite');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pépite');
  });

  it('applies the sold modifier class for variant "sold"', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', 'sold');
    fixture.componentRef.setInput('label', 'Vendu');
    fixture.detectChanges();

    const span = (fixture.nativeElement as HTMLElement).querySelector('.app-badge');
    expect(span?.classList.contains('app-badge--sold')).toBe(true);
  });

  it('does not apply the sold modifier class for variant "featured"', () => {
    const fixture = TestBed.createComponent(Badge);
    fixture.componentRef.setInput('variant', 'featured');
    fixture.componentRef.setInput('label', 'Pépite');
    fixture.detectChanges();

    const span = (fixture.nativeElement as HTMLElement).querySelector('.app-badge');
    expect(span?.classList.contains('app-badge--sold')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './badge'`.

- [ ] **Step 3: Write the implementation**

`src/app/shared/ui/badge/badge.ts`:

```ts
import { Component, input } from '@angular/core';

export type BadgeVariant = 'featured' | 'sold';

@Component({
  selector: 'app-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class Badge {
  readonly variant = input.required<BadgeVariant>();
  readonly label = input.required<string>();
}
```

`src/app/shared/ui/badge/badge.html`:

```html
<span class="app-badge" [class.app-badge--sold]="variant() === 'sold'">{{ label() }}</span>
```

`src/app/shared/ui/badge/badge.css`:

```css
.app-badge {
  display: inline-block;
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  padding: var(--space-1) var(--space-2);
  background: var(--color-orange);
  color: var(--color-navy);
  border-radius: var(--radius);
}

.app-badge--sold {
  background: var(--color-navy);
  color: var(--color-surface);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `Badge` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/badge
git commit -m "feat: add shared Badge component"
```

---

### Task 14: Shared UI — TextField ✅ DONE (staged, not committed; fixed a private-member template compile error found during implementation — handleBlur() wrapper — reviewed, approved)

**Files:**
- Create: `src/app/shared/ui/text-field/text-field.ts`
- Create: `src/app/shared/ui/text-field/text-field.html`
- Create: `src/app/shared/ui/text-field/text-field.css`
- Test: `src/app/shared/ui/text-field/text-field.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/shared/ui/text-field/text-field.spec.ts`:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextField } from './text-field';

@Component({
  imports: [ReactiveFormsModule, TextField],
  template: `<app-text-field label="Email" type="email" [formControl]="control" [error]="error" />`,
})
class HostComponent {
  control = new FormControl('', { nonNullable: true });
  error: string | null = null;
}

describe('TextField', () => {
  it('renders the label and reflects the form control value into the input', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue('will@test.dev');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Email');
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('will@test.dev');
  });

  it('propagates input events back to the form control', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'typed@test.dev';
    input.dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBe('typed@test.dev');
  });

  it('shows an error message when the error input is set', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.error = 'Email invalide';
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Email invalide');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './text-field'`.

- [ ] **Step 3: Write the implementation**

`src/app/shared/ui/text-field/text-field.ts`:

```ts
import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'app-text-field',
  imports: [],
  templateUrl: './text-field.html',
  styleUrl: './text-field.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextField),
      multi: true,
    },
  ],
})
export class TextField implements ControlValueAccessor {
  readonly id = `text-field-${nextId++}`;
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly placeholder = input<string>('');
  readonly error = input<string | null>(null);

  value = '';
  disabled = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleInput(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
```

`src/app/shared/ui/text-field/text-field.html`:

```html
<div class="app-text-field">
  <label [for]="id">{{ label() }}</label>
  <input
    [id]="id"
    [type]="type()"
    [placeholder]="placeholder()"
    [value]="value"
    [disabled]="disabled"
    (input)="handleInput($any($event.target).value)"
    (blur)="handleBlur()"
  />
  @if (error()) {
    <p class="app-text-field__error">{{ error() }}</p>
  }
</div>
```

`onTouched` is `private`, and this project's strict template type-checking rejects a
template calling a private class member directly — hence the public `handleBlur()`
wrapper instead of binding `(blur)="onTouched()"` straight to the private field.

`src/app/shared/ui/text-field/text-field.css`:

```css
.app-text-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.app-text-field label {
  font-weight: 700;
  font-size: 0.85rem;
}

.app-text-field input {
  font-family: var(--font-body);
  font-size: 1rem;
  padding: var(--space-2);
  border: 2px solid var(--color-navy);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-navy);
}

.app-text-field__error {
  color: var(--color-accent);
  font-size: 0.8rem;
  margin: 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `TextField` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/text-field
git commit -m "feat: add shared TextField component (ControlValueAccessor)"
```

---

### Task 15: Shared UI — SelectField ✅ DONE (staged, not committed; fixed a real `[value]`-on-`<select>` vs `@for` ordering bug found and empirically verified during implementation/review — reviewed, approved)

**Files:**
- Create: `src/app/shared/ui/select-field/select-field.ts`
- Create: `src/app/shared/ui/select-field/select-field.html`
- Create: `src/app/shared/ui/select-field/select-field.css`
- Test: `src/app/shared/ui/select-field/select-field.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/shared/ui/select-field/select-field.spec.ts`:

```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectField } from './select-field';

@Component({
  imports: [ReactiveFormsModule, SelectField],
  template: `<app-select-field label="Genre" [options]="options" [formControl]="control" />`,
})
class HostComponent {
  options = [
    { value: 'rpg', label: 'RPG' },
    { value: 'action', label: 'Action' },
  ];
  control = new FormControl('', { nonNullable: true });
}

describe('SelectField', () => {
  it('renders one option per entry plus the label', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Genre');
    expect(el.querySelectorAll('option').length).toBe(2);
  });

  it('reflects the form control value into the select', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue('action');
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('select') as HTMLSelectElement).value).toBe('action');
  });

  it('propagates change events back to the form control', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'rpg';
    select.dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.control.value).toBe('rpg');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './select-field'`.

- [ ] **Step 3: Write the implementation**

`src/app/shared/ui/select-field/select-field.ts`:

```ts
import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

let nextId = 0;

@Component({
  selector: 'app-select-field',
  imports: [],
  templateUrl: './select-field.html',
  styleUrl: './select-field.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectField),
      multi: true,
    },
  ],
})
export class SelectField implements ControlValueAccessor {
  readonly id = `select-field-${nextId++}`;
  readonly label = input.required<string>();
  readonly options = input.required<SelectOption[]>();

  value = '';
  disabled = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  handleBlur(): void {
    this.onTouched();
  }
}
```

`src/app/shared/ui/select-field/select-field.html`:

```html
<div class="app-select-field">
  <label [for]="id">{{ label() }}</label>
  <select
    [id]="id"
    [disabled]="disabled"
    (change)="handleChange($any($event.target).value)"
    (blur)="handleBlur()"
  >
    @for (option of options(); track option.value) {
      <option [value]="option.value" [selected]="option.value === value">{{ option.label }}</option>
    }
  </select>
</div>
```

Selection is driven per-`<option>` via `[selected]`, not via `[value]` on the `<select>`
itself. A `[value]` binding on `<select>` can only select a matching `<option>` if that
option already exists as a DOM child at binding time — but the `@for`-generated options
are created after the `<select>`'s own bindings evaluate, so on first render the
assignment silently no-ops and the browser falls back to the first option. Binding
`[selected]` on each `<option>` avoids this ordering problem entirely.

Same `handleBlur()` wrapper pattern as `TextField` (Task 14) — `onTouched` is `private`
and this project's strict template type-checking rejects a template calling it directly.

`src/app/shared/ui/select-field/select-field.css`:

```css
.app-select-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-3);
}

.app-select-field label {
  font-weight: 700;
  font-size: 0.85rem;
}

.app-select-field select {
  font-family: var(--font-body);
  font-size: 1rem;
  padding: var(--space-2);
  border: 2px solid var(--color-navy);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-navy);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `SelectField` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/select-field
git commit -m "feat: add shared SelectField component (ControlValueAccessor)"
```

---

### Task 16: Shared UI — Card ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/shared/ui/card/card.ts`
- Create: `src/app/shared/ui/card/card.html`
- Create: `src/app/shared/ui/card/card.css`
- Test: `src/app/shared/ui/card/card.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/shared/ui/card/card.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFrBe from '@angular/common/locales/fr-BE';
import { provideRouter } from '@angular/router';
import { Card } from './card';

registerLocaleData(localeFrBe);

describe('Card', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LOCALE_ID, useValue: 'fr-BE' }],
    });
  });

  it('renders the title and formatted price', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('title', 'Kingdom Hearts');
    fixture.componentRef.setInput('price', 20);
    fixture.componentRef.setInput('routerLink', ['/listings', '123']);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Kingdom Hearts');
    expect(el.textContent).toContain('20,00');
  });

  it('shows a "featured" badge only when featured is true', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('title', 'Kingdom Hearts');
    fixture.componentRef.setInput('price', 20);
    fixture.componentRef.setInput('routerLink', ['/listings', '123']);
    fixture.componentRef.setInput('featured', true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-badge')).toBeTruthy();
  });

  it('does not show a badge when neither featured nor sold', () => {
    const fixture = TestBed.createComponent(Card);
    fixture.componentRef.setInput('title', 'Kingdom Hearts');
    fixture.componentRef.setInput('price', 20);
    fixture.componentRef.setInput('routerLink', ['/listings', '123']);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('app-badge')).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './card'`.

- [ ] **Step 3: Write the implementation**

`src/app/shared/ui/card/card.ts`:

```ts
import { Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';

@Component({
  selector: 'app-card',
  imports: [CurrencyPipe, RouterLink, Badge],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  readonly title = input.required<string>();
  readonly price = input.required<number>();
  readonly imageUrl = input<string | null>(null);
  readonly routerLink = input.required<string | unknown[]>();
  readonly featured = input<boolean>(false);
  readonly sold = input<boolean>(false);
}
```

`src/app/shared/ui/card/card.html`:

```html
<article class="app-card">
  @if (featured()) {
    <app-badge class="app-card__badge" variant="featured" label="Pépite" />
  } @else if (sold()) {
    <app-badge class="app-card__badge" variant="sold" label="Vendu" />
  }

  <img class="app-card__image" [src]="imageUrl() ?? 'images/plusicon.svg'" [alt]="title()" />
  <h3 class="app-card__title">{{ title() }}</h3>
  <p class="app-card__price">{{ price() | currency: 'EUR' }}</p>
  <a class="app-card__cta" [routerLink]="routerLink()">Voir</a>
</article>
```

`src/app/shared/ui/card/card.css`:

```css
.app-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  background: var(--color-surface);
  border: 2px solid var(--color-navy);
  border-radius: var(--radius);
  padding: var(--space-3);
  width: 180px;
}

.app-card__badge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
}

.app-card__image {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border: 1px solid var(--color-navy);
}

.app-card__title {
  font-size: 0.75rem;
  margin: 0;
}

.app-card__price {
  font-weight: 700;
  margin: 0;
  border-top: 2px solid var(--color-orange);
  padding-top: var(--space-1);
}

.app-card__cta {
  display: block;
  text-align: center;
  text-decoration: none;
  font-family: var(--font-body);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
  padding: var(--space-2);
  background: var(--color-accent);
  color: var(--color-surface);
  border: 2px solid var(--color-navy);
  border-radius: var(--radius);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `Card` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/card
git commit -m "feat: add shared Card component"
```

---

### Task 17: Navbar ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/layout/navbar/navbar.ts`
- Create: `src/app/layout/navbar/navbar.html`
- Create: `src/app/layout/navbar/navbar.css`
- Test: `src/app/layout/navbar/navbar.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/layout/navbar/navbar.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './navbar'`.

- [ ] **Step 3: Write the implementation**

`src/app/layout/navbar/navbar.ts`:

```ts
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }
}
```

`src/app/layout/navbar/navbar.html`:

```html
<header class="app-navbar">
  <a class="app-navbar__brand" routerLink="/">
    <img src="images/ng+.svg" alt="New Game Plus" />
  </a>

  <nav class="app-navbar__links">
    <a routerLink="/market" routerLinkActive="is-active">Market</a>

    @if (authService.hasRole('SELLER')) {
      <a routerLink="/my-shop" routerLinkActive="is-active">My Shop</a>
    }

    @if (authService.isAuthenticated()) {
      <a routerLink="/profile" routerLinkActive="is-active">Profile</a>
      <a routerLink="/cart" routerLinkActive="is-active">Cart</a>
      <button type="button" class="app-navbar__logout" (click)="logout()">Logout</button>
    } @else {
      <a routerLink="/auth/login" routerLinkActive="is-active">Login</a>
    }
  </nav>
</header>
```

`src/app/layout/navbar/navbar.css`:

```css
.app-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-navy);
  padding: var(--space-3) var(--space-4);
}

.app-navbar__brand img {
  height: 40px;
}

.app-navbar__links {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.app-navbar__links a,
.app-navbar__logout {
  color: var(--color-surface);
  text-decoration: none;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
  background: none;
  border: none;
  cursor: pointer;
}

.app-navbar__links a.is-active {
  color: var(--color-orange);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `Navbar` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout/navbar
git commit -m "feat: add Navbar with role-aware links"
```

---

### Task 18: Shell layout and App root ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/layout/shell/shell.ts`
- Create: `src/app/layout/shell/shell.html`
- Create: `src/app/layout/shell/shell.css`
- Test: `src/app/layout/shell/shell.spec.ts`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`
- Modify: `src/app/app.spec.ts`

- [ ] **Step 1: Write the failing test for Shell**

`src/app/layout/shell/shell.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './shell'`.

- [ ] **Step 3: Write the Shell implementation**

`src/app/layout/shell/shell.ts`:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Navbar],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {}
```

`src/app/layout/shell/shell.html`:

```html
<app-navbar />
<main class="app-shell__content">
  <router-outlet />
</main>
```

`src/app/layout/shell/shell.css`:

```css
.app-shell__content {
  padding: var(--space-4);
}
```

- [ ] **Step 4: Run the test to verify Shell passes**

Run: `npx ng test --watch=false`
Expected: PASS — `Shell` test green (the existing `App` tests will now fail — that's
expected, fixed in the next step).

- [ ] **Step 5: Replace the App root template with the Shell**

`src/app/app.ts` (replace entirely):

```ts
import { Component } from '@angular/core';
import { Shell } from './layout/shell/shell';

@Component({
  selector: 'app-root',
  imports: [Shell],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
```

`src/app/app.html` (replace entirely):

```html
<app-shell />
```

- [ ] **Step 6: Update App's test to match**

`src/app/app.spec.ts` (replace entirely):

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { App } from './app';
import { AuthService } from './core/auth/auth.service';

class AuthServiceStub {
  isAuthenticated = signal(false).asReadonly();
  hasRole(): boolean {
    return false;
  }
}

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: AuthService, useValue: new AuthServiceStub() }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-shell')).toBeTruthy();
  });
});
```

- [ ] **Step 7: Run the full suite to verify everything passes**

Run: `npx ng test --watch=false`
Expected: PASS — `Shell` and `App` tests green, no regressions elsewhere.

- [ ] **Step 8: Commit**

```bash
git add src/app/layout/shell src/app/app.ts src/app/app.html src/app/app.spec.ts
git commit -m "feat: add Shell layout, mount it as the app root"
```

---

### Task 19: PageStub ✅ DONE (staged, not committed; verified directly, matches spec exactly)

**Files:**
- Create: `src/app/shared/ui/page-stub/page-stub.ts`
- Create: `src/app/shared/ui/page-stub/page-stub.html`
- Create: `src/app/shared/ui/page-stub/page-stub.css`
- Test: `src/app/shared/ui/page-stub/page-stub.spec.ts`

This is the placeholder used by every route that belongs to a future wave (Market, My
Shop, Cart, Checkout, Profile, Orders, Admin). Its `title` input is bound straight from
route `data` via `withComponentInputBinding()` (wired in Task 11) — no per-route
component class needed.

- [ ] **Step 1: Write the failing test**

`src/app/shared/ui/page-stub/page-stub.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { PageStub } from './page-stub';

describe('PageStub', () => {
  it('renders the given title', () => {
    const fixture = TestBed.createComponent(PageStub);
    fixture.componentRef.setInput('title', 'My Shop');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toContain('My Shop');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './page-stub'`.

- [ ] **Step 3: Write the implementation**

`src/app/shared/ui/page-stub/page-stub.ts`:

```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-stub',
  imports: [],
  templateUrl: './page-stub.html',
  styleUrl: './page-stub.css',
})
export class PageStub {
  readonly title = input.required<string>();
}
```

`src/app/shared/ui/page-stub/page-stub.html`:

```html
<section class="app-page-stub">
  <h1>{{ title() }}</h1>
  <p>Cette page arrive dans une prochaine vague.</p>
</section>
```

`src/app/shared/ui/page-stub/page-stub.css`:

```css
.app-page-stub {
  padding: var(--space-5);
  text-align: center;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — `PageStub` test green.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/ui/page-stub
git commit -m "feat: add PageStub for not-yet-built routes"
```

---

### Task 20: LoginPage ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/features/auth/login-page/login-page.ts`
- Create: `src/app/features/auth/login-page/login-page.html`
- Create: `src/app/features/auth/login-page/login-page.css`
- Test: `src/app/features/auth/login-page/login-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/auth/login-page/login-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginPage } from './login-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('LoginPage', () => {
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authService = { login: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('does not call AuthService.login when the form is invalid', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('calls AuthService.login with the form value and navigates home on success', () => {
    authService.login.mockReturnValue(of({ token: 'abc' }));
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'will@test.dev', password: 'secret' });
    fixture.componentInstance.submit();

    expect(authService.login).toHaveBeenCalledWith({ email: 'will@test.dev', password: 'secret' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows a server error message and stops submitting on failure', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'will@test.dev', password: 'wrong' });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.componentInstance.serverError()).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './login-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/auth/login-page/login-page.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, TextField, Button],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.serverError.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.submitting.set(false);
        this.serverError.set('Identifiants invalides.');
      },
    });
  }
}
```

`src/app/features/auth/login-page/login-page.html`:

```html
<section class="app-auth-page">
  <h1>Connexion</h1>

  <form [formGroup]="form" (ngSubmit)="submit()">
    <app-text-field label="Email" type="email" formControlName="email" />
    <app-text-field label="Mot de passe" type="password" formControlName="password" />

    @if (serverError()) {
      <p class="app-auth-page__error">{{ serverError() }}</p>
    }

    <app-button type="submit" [disabled]="submitting()">Se connecter</app-button>
  </form>

  <p>
    Pas encore de compte ? <a routerLink="/auth/register">S'inscrire</a><br />
    <a routerLink="/auth/forgot-password">Mot de passe oublié ?</a>
  </p>
</section>
```

`src/app/features/auth/login-page/login-page.css`:

```css
.app-auth-page {
  max-width: 360px;
  margin: 0 auto;
}

.app-auth-page__error {
  color: var(--color-accent);
  font-weight: 700;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `LoginPage` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/login-page
git commit -m "feat: add LoginPage"
```

---

### Task 21: RegisterPage ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/features/auth/register-page/register-page.ts`
- Create: `src/app/features/auth/register-page/register-page.html`
- Create: `src/app/features/auth/register-page/register-page.css`
- Test: `src/app/features/auth/register-page/register-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/auth/register-page/register-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RegisterPage } from './register-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('RegisterPage', () => {
  let authService: { register: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { register: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  });

  it('does not submit when the form is invalid', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('does not submit when passwords do not match', () => {
    authService.register.mockReturnValue(of({ id: 'u1', username: 'will' }));
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      username: 'will',
      email: 'will@test.dev',
      password: 'secret123',
      confirmPassword: 'different',
    });
    fixture.componentInstance.submit();

    expect(authService.register).not.toHaveBeenCalled();
    expect(fixture.componentInstance.passwordMismatch()).toBe(true);
  });

  it('registers and shows a success message on matching, valid input', () => {
    authService.register.mockReturnValue(of({ id: 'u1', username: 'will' }));
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      username: 'will',
      email: 'will@test.dev',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    fixture.componentInstance.submit();

    expect(authService.register).toHaveBeenCalledWith({
      username: 'will',
      email: 'will@test.dev',
      password: 'secret123',
    });
    expect(fixture.componentInstance.registered()).toBe(true);
  });

  it('shows a server error on failure (e.g. duplicate email)', () => {
    authService.register.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' })),
    );
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      username: 'will',
      email: 'will@test.dev',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.serverError()).toBeTruthy();
    expect(fixture.componentInstance.registered()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './register-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/auth/register-page/register-page.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, TextField, Button],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly passwordMismatch = signal(false);
  readonly registered = signal(false);

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { username, email, password, confirmPassword } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.passwordMismatch.set(true);
      return;
    }
    this.passwordMismatch.set(false);

    this.submitting.set(true);
    this.serverError.set(null);

    this.authService.register({ username, email, password }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.registered.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.serverError.set("Impossible de créer le compte (nom d'utilisateur ou email déjà pris).");
      },
    });
  }
}
```

`src/app/features/auth/register-page/register-page.html`:

```html
<section class="app-auth-page">
  <h1>Inscription</h1>

  @if (registered()) {
    <p class="app-auth-page__success">
      Compte créé ! Vérifie tes emails pour confirmer ton adresse avant de te connecter.
    </p>
  } @else {
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-text-field label="Nom d'utilisateur" formControlName="username" />
      <app-text-field label="Email" type="email" formControlName="email" />
      <app-text-field label="Mot de passe" type="password" formControlName="password" />
      <app-text-field label="Confirme le mot de passe" type="password" formControlName="confirmPassword" />

      @if (passwordMismatch()) {
        <p class="app-auth-page__error">Les mots de passe ne correspondent pas.</p>
      }
      @if (serverError()) {
        <p class="app-auth-page__error">{{ serverError() }}</p>
      }

      <app-button type="submit" [disabled]="submitting()">Créer mon compte</app-button>
    </form>

    <p>Déjà inscrit ? <a routerLink="/auth/login">Se connecter</a></p>
  }
</section>
```

`src/app/features/auth/register-page/register-page.css`:

```css
.app-auth-page {
  max-width: 360px;
  margin: 0 auto;
}

.app-auth-page__error {
  color: var(--color-accent);
  font-weight: 700;
}

.app-auth-page__success {
  font-weight: 700;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `RegisterPage` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/register-page
git commit -m "feat: add RegisterPage"
```

---

### Task 22: ConfirmPage (`/auth/verified`) ✅ DONE (staged, not committed; added `provideRouter([])` to the test — RouterLink needs ActivatedRoute in DI, same pattern as Login/RegisterPage — reviewed, approved)

**Files:**
- Create: `src/app/features/auth/confirm-page/confirm-page.ts`
- Create: `src/app/features/auth/confirm-page/confirm-page.html`
- Create: `src/app/features/auth/confirm-page/confirm-page.css`
- Test: `src/app/features/auth/confirm-page/confirm-page.spec.ts`

This page is landed on directly from the confirmation email
(`FRONTEND_URL/auth/verified?token=...`), so its input comes from the query param, bound
via `withComponentInputBinding()`.

- [ ] **Step 1: Write the failing test**

`src/app/features/auth/confirm-page/confirm-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ConfirmPage } from './confirm-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('ConfirmPage', () => {
  let authService: { confirmEmail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { confirmEmail: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  });

  it('calls confirmEmail with the token input and shows a success message', () => {
    authService.confirmEmail.mockReturnValue(of({ username: 'will' }));
    const fixture = TestBed.createComponent(ConfirmPage);
    fixture.componentRef.setInput('token', 'tok-123');
    fixture.detectChanges();

    expect(authService.confirmEmail).toHaveBeenCalledWith('tok-123');
    expect(fixture.componentInstance.status()).toBe('success');
  });

  it('shows an error state when confirmation fails', () => {
    authService.confirmEmail.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const fixture = TestBed.createComponent(ConfirmPage);
    fixture.componentRef.setInput('token', 'bad-token');
    fixture.detectChanges();

    expect(fixture.componentInstance.status()).toBe('error');
  });

  it('shows an error state immediately when no token is present', () => {
    const fixture = TestBed.createComponent(ConfirmPage);
    fixture.componentRef.setInput('token', null);
    fixture.detectChanges();

    expect(authService.confirmEmail).not.toHaveBeenCalled();
    expect(fixture.componentInstance.status()).toBe('error');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './confirm-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/auth/confirm-page/confirm-page.ts`:

```ts
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

type ConfirmStatus = 'pending' | 'success' | 'error';

@Component({
  selector: 'app-confirm-page',
  imports: [RouterLink],
  templateUrl: './confirm-page.html',
  styleUrl: './confirm-page.css',
})
export class ConfirmPage implements OnInit {
  private readonly authService = inject(AuthService);

  readonly token = input<string | null>(null);
  readonly status = signal<ConfirmStatus>('pending');

  ngOnInit(): void {
    const token = this.token();
    if (!token) {
      this.status.set('error');
      return;
    }

    this.authService.confirmEmail(token).subscribe({
      next: () => this.status.set('success'),
      error: () => this.status.set('error'),
    });
  }
}
```

`src/app/features/auth/confirm-page/confirm-page.html`:

```html
<section class="app-auth-page">
  @switch (status()) {
    @case ('pending') {
      <p>Confirmation en cours...</p>
    }
    @case ('success') {
      <p>Ton compte est confirmé, tu peux te connecter.</p>
      <a routerLink="/auth/login">Se connecter</a>
    }
    @case ('error') {
      <p class="app-auth-page__error">Lien de confirmation invalide ou expiré.</p>
    }
  }
</section>
```

`src/app/features/auth/confirm-page/confirm-page.css`:

```css
.app-auth-page {
  max-width: 360px;
  margin: 0 auto;
  text-align: center;
}

.app-auth-page__error {
  color: var(--color-accent);
  font-weight: 700;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ConfirmPage` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/confirm-page
git commit -m "feat: add ConfirmPage for the email confirmation link"
```

---

### Task 23: ForgotPasswordPage ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/features/auth/forgot-password-page/forgot-password-page.ts`
- Create: `src/app/features/auth/forgot-password-page/forgot-password-page.html`
- Create: `src/app/features/auth/forgot-password-page/forgot-password-page.css`
- Test: `src/app/features/auth/forgot-password-page/forgot-password-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/auth/forgot-password-page/forgot-password-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ForgotPasswordPage } from './forgot-password-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('ForgotPasswordPage', () => {
  let authService: { forgotPassword: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { forgotPassword: vi.fn().mockReturnValue(of(undefined)) };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
  });

  it('does not submit an invalid email', () => {
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'not-an-email' });
    fixture.componentInstance.submit();

    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('calls AuthService.forgotPassword and always shows the generic success message', () => {
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'will@test.dev' });
    fixture.componentInstance.submit();

    expect(authService.forgotPassword).toHaveBeenCalledWith('will@test.dev');
    expect(fixture.componentInstance.submitted()).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './forgot-password-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/auth/forgot-password-page/forgot-password-page.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, TextField, Button],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.css',
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly submitting = signal(false);
  readonly submitted = signal(false);

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);

    // The backend always returns 200 here regardless of whether the email exists,
    // to avoid account enumeration — so the UI always shows the same message too.
    this.authService.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
    });
  }
}
```

`src/app/features/auth/forgot-password-page/forgot-password-page.html`:

```html
<section class="app-auth-page">
  <h1>Mot de passe oublié</h1>

  @if (submitted()) {
    <p>Si un compte existe avec cette adresse, un email de réinitialisation vient d'être envoyé.</p>
  } @else {
    <form [formGroup]="form" (ngSubmit)="submit()">
      <app-text-field label="Email" type="email" formControlName="email" />
      <app-button type="submit" [disabled]="submitting()">Envoyer le lien</app-button>
    </form>
  }
</section>
```

`src/app/features/auth/forgot-password-page/forgot-password-page.css`:

```css
.app-auth-page {
  max-width: 360px;
  margin: 0 auto;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ForgotPasswordPage` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/forgot-password-page
git commit -m "feat: add ForgotPasswordPage"
```

---

### Task 24: ResetPasswordPage (`/auth/reset`) ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/features/auth/reset-password-page/reset-password-page.ts`
- Create: `src/app/features/auth/reset-password-page/reset-password-page.html`
- Create: `src/app/features/auth/reset-password-page/reset-password-page.css`
- Test: `src/app/features/auth/reset-password-page/reset-password-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/auth/reset-password-page/reset-password-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ResetPasswordPage } from './reset-password-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('ResetPasswordPage', () => {
  let authService: { resetPassword: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authService = { resetPassword: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('does not submit when there is no token', () => {
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentRef.setInput('token', null);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newSecret1', confirmPassword: 'newSecret1' });
    fixture.componentInstance.submit();

    expect(authService.resetPassword).not.toHaveBeenCalled();
    expect(fixture.componentInstance.missingToken()).toBe(true);
  });

  it('does not submit when passwords do not match', () => {
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentRef.setInput('token', 'tok-123');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newSecret1', confirmPassword: 'different' });
    fixture.componentInstance.submit();

    expect(authService.resetPassword).not.toHaveBeenCalled();
    expect(fixture.componentInstance.passwordMismatch()).toBe(true);
  });

  it('resets the password and redirects to login on success', () => {
    authService.resetPassword.mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentRef.setInput('token', 'tok-123');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newSecret1', confirmPassword: 'newSecret1' });
    fixture.componentInstance.submit();

    expect(authService.resetPassword).toHaveBeenCalledWith({ token: 'tok-123', newPassword: 'newSecret1' });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('shows a server error on failure', () => {
    authService.resetPassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentRef.setInput('token', 'tok-123');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newSecret1', confirmPassword: 'newSecret1' });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.serverError()).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './reset-password-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/auth/reset-password-page/reset-password-page.ts`:

```ts
import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, TextField, Button],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.css',
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly token = input<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly passwordMismatch = signal(false);
  readonly missingToken = signal(false);

  submit(): void {
    const token = this.token();
    if (!token) {
      this.missingToken.set(true);
      return;
    }
    this.missingToken.set(false);

    if (this.form.invalid || this.submitting()) {
      return;
    }

    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordMismatch.set(true);
      return;
    }
    this.passwordMismatch.set(false);

    this.submitting.set(true);
    this.serverError.set(null);

    this.authService.resetPassword({ token, newPassword }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.submitting.set(false);
        this.serverError.set('Lien de réinitialisation invalide ou expiré.');
      },
    });
  }
}
```

`src/app/features/auth/reset-password-page/reset-password-page.html`:

```html
<section class="app-auth-page">
  <h1>Nouveau mot de passe</h1>

  @if (missingToken()) {
    <p class="app-auth-page__error">Lien de réinitialisation invalide.</p>
  }

  <form [formGroup]="form" (ngSubmit)="submit()">
    <app-text-field label="Nouveau mot de passe" type="password" formControlName="newPassword" />
    <app-text-field label="Confirme le mot de passe" type="password" formControlName="confirmPassword" />

    @if (passwordMismatch()) {
      <p class="app-auth-page__error">Les mots de passe ne correspondent pas.</p>
    }
    @if (serverError()) {
      <p class="app-auth-page__error">{{ serverError() }}</p>
    }

    <app-button type="submit" [disabled]="submitting()">Réinitialiser</app-button>
  </form>
</section>
```

`src/app/features/auth/reset-password-page/reset-password-page.css`:

```css
.app-auth-page {
  max-width: 360px;
  margin: 0 auto;
}

.app-auth-page__error {
  color: var(--color-accent);
  font-weight: 700;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ResetPasswordPage` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/reset-password-page
git commit -m "feat: add ResetPasswordPage"
```

---

### Task 25: Full route table ✅ DONE (staged, not committed; reviewed, approved — closes the foundation wave)

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Write the route table**

`src/app/app.routes.ts` (replace entirely):

```ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { PageStub } from './shared/ui/page-stub/page-stub';

export const routes: Routes = [
  {
    path: '',
    component: PageStub,
    data: { title: 'Accueil' },
  },
  {
    path: 'market',
    component: PageStub,
    data: { title: 'Market' },
  },
  {
    path: 'listings/:id',
    component: PageStub,
    data: { title: 'Détail annonce' },
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register-page/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'auth/verified',
    loadComponent: () => import('./features/auth/confirm-page/confirm-page').then((m) => m.ConfirmPage),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password-page/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'auth/reset',
    loadComponent: () =>
      import('./features/auth/reset-password-page/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'profile',
    component: PageStub,
    data: { title: 'Profil' },
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    component: PageStub,
    data: { title: 'Mes commandes' },
    canActivate: [authGuard],
  },
  {
    path: 'my-shop',
    component: PageStub,
    data: { title: 'My Shop' },
    canActivate: [authGuard, roleGuard('SELLER')],
  },
  {
    path: 'my-shop/orders',
    component: PageStub,
    data: { title: 'Commandes de ma boutique' },
    canActivate: [authGuard, roleGuard('SELLER')],
  },
  {
    path: 'cart',
    component: PageStub,
    data: { title: 'Panier' },
    canActivate: [authGuard],
  },
  {
    path: 'checkout',
    component: PageStub,
    data: { title: 'Paiement' },
    canActivate: [authGuard],
  },
  {
    path: 'checkout/success',
    component: PageStub,
    data: { title: 'Paiement réussi' },
  },
  {
    path: 'checkout/cancel',
    component: PageStub,
    data: { title: 'Paiement annulé' },
  },
  {
    path: 'admin/listings',
    component: PageStub,
    data: { title: 'Curation — Pépites' },
    canActivate: [authGuard, roleGuard('ADMIN')],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
```

`checkout/success` and `checkout/cancel` are intentionally **not** behind `authGuard`:
Stripe redirects the browser back to them after payment, and by that point the buyer's
own session may have been affected by time passing on Stripe's hosted page — gating them
would risk bouncing a legitimately-paying buyer to `/auth/login` on return. The upcoming
checkout wave decides what these pages actually show; this wave only reserves the path.

- [ ] **Step 2: Verify the app builds**

Run: `npx ng build`
Expected: succeeds, one lazy chunk per `loadComponent` auth page.

- [ ] **Step 3: Run the full test suite**

Run: `npx ng test --watch=false`
Expected: PASS — every test from every prior task still green.

- [ ] **Step 4: Manual smoke check**

Run: `npx ng serve`

Open `http://localhost:4200/` in a browser and check:
- Navbar renders with the logo, "Market" and "Login" links.
- `/market`, `/listings/123` show the `PageStub` with the right title.
- `/auth/login` and `/auth/register` render the real forms.
- `/profile` redirects to `/auth/login?returnUrl=%2Fprofile` when logged out.
- `/my-shop` redirects to `/auth/login?returnUrl=%2Fmy-shop` when logged out.
- A random path (e.g. `/does-not-exist`) redirects to `/`.

Stop the dev server (Ctrl+C) once verified.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat: wire the full route table with guards and page stubs"
```

---

## Self-review

**Final whole-implementation review (after all 25 tasks, before handoff):** found no
Critical issues; assessment was "ready to hand back." Two Important, cheap fixes were
applied on top:
- `errorInterceptor` now also excludes `/auth/confirm` and `/auth/reset-password` (not
  just `/auth/login`) from its global 401→logout+redirect, since a future backend 401 on
  an invalid/expired confirm or reset token would otherwise silently replace those pages'
  own "lien invalide" messaging with an unrelated redirect.
- `Navbar.logout()` now also calls `router.navigate(['/'])` after `authService.logout()`
  — previously a user logging out while on a guarded route (e.g. `/profile`) stayed on
  that route with stale auth state until their next navigation.
- `src/index.html`'s `lang` attribute changed from `en` to `fr` (the app is French-only).

**Known correction (found during Task 8 code review, applied during execution):** the
`errorInterceptor` code above was updated from an earlier draft that eagerly injected
`AuthService` via `inject()` at the top of the interceptor — that version caused a
reproducible `NG0200` circular-dependency crash whenever `AuthService`'s own
constructor-time `/me` fetch ran through the interceptor chain, silently wiping valid
sessions on app bootstrap. Fixed by deferring `AuthService` resolution to error-time via
`Injector.get()`, as shown above.

**Spec coverage:**
- Folder structure (`core/`, `layout/`, `shared/`, `features/`) — Tasks 4-24 populate exactly this tree.
- Dependencies (`jwt-decode`) — Task 3.
- Environment config — Task 2.
- HTTP layer + interceptors — Tasks 7, 8, 11.
- Auth (service, guards, pages) — Tasks 4, 5, 6, 9, 10, 20-24.
- Design system (tokens, typography, shared UI) — Tasks 1, 12-16, 19.
- App shell / navbar — Tasks 17, 18.
- Full route table — Task 25.
- Corrected `/auth/verified` and `/auth/reset` paths (backend-imposed) — reflected in Tasks 22, 24, 25.
- `/checkout/success` and `/checkout/cancel` reserved as backend-imposed paths — Task 25.

**Out of scope for this plan (explicitly, per spec's Roadmap):** Home/Market real content,
My Shop CRUD, Cart/Checkout logic, Orders, Reviews, Admin curation UI. Their routes exist
as `PageStub`s only, ready for the next waves' specs/plans to replace.

**Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.

**Type consistency:** `AuthService` method names (`login`, `register`, `confirmEmail`,
`forgotPassword`, `resetPassword`, `logout`, `refreshMe`, `hasRole`) are used identically
across Tasks 6-10 and 20-25. `auth.types.ts` interfaces (Task 4) match the request/response
shapes used in Task 6's implementation and tests.
