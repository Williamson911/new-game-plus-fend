# Profile, Reviews & Admin Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `PageStub` placeholders at `/profile` and `/admin/listings`, and
add a new `/shops/:id` page: profile editing/account deletion, a public shop page
(info + listings + reviews) with an inline review-creation flow on `MyOrdersPage`,
and an admin listing-curation table with a featured toggle.

**Architecture:** Two new core modules (`core/reviews/`, plus `getById` on the
existing `core/shop/shop.service.ts`), two extended core files
(`core/auth/auth.service.ts` gains profile update/delete, `core/catalog/` gains
`shopId` filtering and a featured-toggle call), five new/modified page components,
and two route swaps plus one new route.

**Tech Stack:** Angular 22 (standalone, signals), Reactive Forms, Vitest.

Spec: `docs/superpowers/specs/2026-09-06-profile-reviews-admin-frontend-design.md`

**Depends on:** the companion backend plan
(`new-game-plus/docs/superpowers/plans/2026-09-06-profile-reviews-admin-backend.md`),
already implemented — `GET /shops/{id}`, `ListingResponse.shopId`,
`GET /listings?shopId=`, `OrderResponse.reviewed`.

---

## Before you start

All file paths are relative to the repo root:
`C:\Users\lemet\Documents\Technifutur\new-game-plus-frontend`.
Every task's verification step runs `npx ng test --watch=false` (full suite — no
single-file filtering available, per established convention).

**Hard rule for every "Commit" step below:** do **NOT** run `git commit`, under any
circumstances. Stage the listed files with `git add` and stop. This overrides the
step's own wording every time it appears.

---

### Task 1: `AuthService` gains `updateProfile()` / `deleteAccount()` ✅ DONE (staged, not committed; reviewed, approved — matched the plan exactly, no discrepancies)

**Files:**
- Modify: `src/app/core/auth/auth.types.ts`
- Modify: `src/app/core/auth/auth.service.ts`
- Modify: `src/app/core/auth/auth.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

In `src/app/core/auth/auth.types.ts`, add this interface after `RegisterRequest`:

```ts
export interface UpdateProfileRequest {
  username: string;
  email: string;
}
```

Read the current `src/app/core/auth/auth.service.spec.ts` first to confirm the exact
structure of its `describe('actions', ...)` block (it already has `service`,
`tokenStorage`, and `httpMock` set up in a shared `beforeEach`). Add these two tests
inside that block, after the existing `resetPassword()` test:

```ts
    it('updateProfile() puts to /profile and updates currentUser on success', () => {
      let resolved: unknown;
      service
        .updateProfile({ username: 'newname', email: 'newname@test.dev' })
        .subscribe((r) => (resolved = r));

      const req = httpMock.expectOne(`${environment.apiUrl}/profile`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ username: 'newname', email: 'newname@test.dev' });
      req.flush({ id: 'u1', username: 'newname', email: 'newname@test.dev', createdAt: '2026-01-01T00:00:00' });

      expect(resolved).toEqual({ id: 'u1', username: 'newname', email: 'newname@test.dev', createdAt: '2026-01-01T00:00:00' });
      expect(service.currentUser()?.username).toBe('newname');
    });

    it('deleteAccount() calls DELETE /account', () => {
      service.deleteAccount().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/account`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `service.updateProfile is not a function` (and similarly for
`deleteAccount`).

- [ ] **Step 3: Write the implementation**

Read the current `src/app/core/auth/auth.service.ts` first. Add `UpdateProfileRequest`
to the existing `import { ... } from './auth.types';` block, then add these two
methods to the `AuthService` class, right after `resetPassword`:

```ts
  updateProfile(request: UpdateProfileRequest): Observable<MeResponse> {
    return this.http
      .put<MeResponse>(`${environment.apiUrl}/profile`, request)
      .pipe(tap((me) => this._currentUser.set(me)));
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/account`);
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/auth/auth.types.ts src/app/core/auth/auth.service.ts src/app/core/auth/auth.service.spec.ts`
and stop.

---

### Task 2: `ReviewService` (new module) ✅ DONE (staged, not committed; reviewed, approved — matched sibling service conventions exactly)

**Files:**
- Create: `src/app/core/reviews/review.types.ts`
- Create: `src/app/core/reviews/review.service.ts`
- Test: `src/app/core/reviews/review.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/reviews/review.types.ts`:

```ts
export interface ReviewResponse {
  id: string;
  authorUsername: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewRequest {
  orderId: string;
  rating: number;
  comment: string | null;
}
```

No test for this file — pure type declarations, same treatment as
`catalog.types.ts`/`cart.types.ts`.

`src/app/core/reviews/review.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService } from './review.service';
import { environment } from '../../../environments/environment';

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getByShop() calls GET /reviews/shop/{shopId}', () => {
    service.getByShop('s1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/reviews/shop/s1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create() calls POST /reviews with the request body', () => {
    const request = { orderId: 'o1', rating: 5, comment: 'Nickel' };
    service.create(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/reviews`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 'rv1', authorUsername: 'will', rating: 5, comment: 'Nickel', createdAt: '2026-01-01T00:00:00' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './review.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/reviews/review.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReviewRequest, ReviewResponse } from './review.types';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  getByShop(shopId: string): Observable<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(`${environment.apiUrl}/reviews/shop/${shopId}`);
  }

  create(request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(`${environment.apiUrl}/reviews`, request);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/reviews/review.types.ts src/app/core/reviews/review.service.ts src/app/core/reviews/review.service.spec.ts`
and stop.

---

### Task 3: `ShopService` gains `getById()` ✅ DONE (staged, not committed; reviewed, approved — matched sibling `getById` conventions exactly)

**Files:**
- Modify: `src/app/core/shop/shop.service.ts`
- Modify: `src/app/core/shop/shop.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Read the current `src/app/core/shop/shop.service.spec.ts` first. Add this test inside
the existing `describe('ShopService', ...)` block, after whichever test currently
covers `getMine()`:

```ts
  it('getById() calls GET /shops/{id}', () => {
    service.getById('s1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/shops/s1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 's1', name: 'Retro Shop', description: 'A shop' });
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `service.getById is not a function`.

- [ ] **Step 3: Write the implementation**

Read the current `src/app/core/shop/shop.service.ts` first. Add this method to the
`ShopService` class, after `getMine`:

```ts
  getById(id: string): Observable<ShopResponse> {
    return this.http.get<ShopResponse>(`${environment.apiUrl}/shops/${id}`);
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/shop/shop.service.ts src/app/core/shop/shop.service.spec.ts`
and stop.

---

### Task 4: `ListingResponse` gains `shopId`, `GET /listings` search gains `shopId`, `setFeatured()` ✅ DONE (staged, not committed; reviewed, approved — all 4 dependent fixture files correctly updated, independently verified no others were missed)

**Files:**
- Modify: `src/app/core/catalog/catalog.types.ts`
- Modify: `src/app/core/catalog/listing.service.ts`
- Modify: `src/app/core/catalog/listing.service.spec.ts`
- Modify: `src/app/features/home/home-page/home-page.spec.ts`
- Modify: `src/app/features/market/listing-detail-page/listing-detail-page.spec.ts`
- Modify: `src/app/features/market/market-page/market-page.spec.ts`
- Modify: `src/app/features/shop/my-shop-page/my-shop-page.spec.ts`

This task adds a required `shopId` field to `ListingResponse`. Four existing spec
files construct `ListingResponse` fixtures via a local `makeListing()` helper and
must each gain a `shopId` value or the suite will fail to compile — this task
updates all four alongside the type/service change, in the same TDD cycle.

- [ ] **Step 1: Write the failing tests**

In `src/app/core/catalog/listing.service.spec.ts`, add this test inside the existing
`describe('ListingService', ...)` block, right after the `'search() includes only
the non-empty/non-null filter params'` test:

```ts
  it('search() includes shopId when present', () => {
    service.search({ shopId: 's1' }, 0, 12).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/listings`);
    expect(req.request.params.get('shopId')).toBe('s1');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 });
  });

  it('setFeatured() calls PATCH /listings/{id}/featured with the featured flag', () => {
    service.setFeatured('l1', true).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/l1/featured`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ featured: true });
    req.flush({
      id: 'l1',
      shopId: 's1',
      gameId: 'g1',
      gameName: 'Kingdom Hearts',
      shopName: 'Retro Shop',
      price: 20,
      status: 'AVAILABLE',
      featured: true,
      imageUrls: [],
    });
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `service.setFeatured is not a function`, and the `shopId` assertion
finds `null` (param not sent).

- [ ] **Step 3: Write the implementation**

Read the current `src/app/core/catalog/catalog.types.ts` first. Update
`ListingResponse` and `ListingFilters` (insert `shopId` right after `id` on the
response, and as the last optional field on the filters, matching the backend's own
field placement in `ListingResponse`):

```ts
export interface ListingResponse {
  id: string;
  shopId: string;
  gameId: string;
  gameName: string;
  shopName: string;
  price: number;
  status: 'AVAILABLE' | 'SOLD';
  featured: boolean;
  imageUrls: string[];
}
```

```ts
export interface ListingFilters {
  search: string;
  genreId: string;
  platform: string;
  minPrice: number | null;
  maxPrice: number | null;
  shopId: string;
}
```

Read the current `src/app/core/catalog/listing.service.ts` first. In `search()`, add
one more conditional param after the existing `maxPrice` block:

```ts
    if (filters.shopId) {
      params = params.set('shopId', filters.shopId);
    }
```

Add a new method after `delete`:

```ts
  setFeatured(id: string, featured: boolean): Observable<ListingResponse> {
    return this.http.patch<ListingResponse>(`${environment.apiUrl}/listings/${id}/featured`, { featured });
  }
```

Now update the four existing `makeListing()` fixture helpers so the suite compiles
under the new required `shopId` field. In each of the four files below, read the
current helper first, then add `shopId: 's1',` as the line right after `id: '...',`
(keep each file's existing `id` value unchanged — only insert the new line):

- `src/app/features/home/home-page/home-page.spec.ts`
- `src/app/features/market/listing-detail-page/listing-detail-page.spec.ts`
- `src/app/features/market/market-page/market-page.spec.ts`
- `src/app/features/shop/my-shop-page/my-shop-page.spec.ts`

For example, in `listing-detail-page.spec.ts`, `makeListing()` changes from:

```ts
function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: 'l1',
    gameId: 'g1',
```

to:

```ts
function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: 'l1',
    shopId: 's1',
    gameId: 'g1',
```

Apply the same one-line insertion (with each file's own existing `id` value kept
as-is) to the other three files.

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — full suite green, including `ListingService`, `HomePage`,
`ListingDetailPage`, `MarketPage`, and `MyShopPage` tests.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/catalog/catalog.types.ts src/app/core/catalog/listing.service.ts src/app/core/catalog/listing.service.spec.ts src/app/features/home/home-page/home-page.spec.ts src/app/features/market/listing-detail-page/listing-detail-page.spec.ts src/app/features/market/market-page/market-page.spec.ts src/app/features/shop/my-shop-page/my-shop-page.spec.ts`
and stop.

---

### Task 5: `ProfilePage` ✅ DONE (staged, not committed; reviewed, fixed and re-approved — form pre-fill originally read a possibly-stale `currentUser()` signal synchronously at construction, producing an empty form on a hard refresh/direct nav; fixed to fetch fresh data via `refreshMe()` gated behind a `loading` signal, matching `MyShopPage`'s pattern)

**Files:**
- Create: `src/app/features/profile/profile-page/profile-page.ts`
- Create: `src/app/features/profile/profile-page/profile-page.html`
- Create: `src/app/features/profile/profile-page/profile-page.css`
- Test: `src/app/features/profile/profile-page/profile-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/profile/profile-page/profile-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ProfilePage } from './profile-page';
import { AuthService } from '../../../core/auth/auth.service';
import { MeResponse } from '../../../core/auth/auth.types';

function makeMe(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: 'u1',
    username: 'will',
    email: 'will@test.dev',
    createdAt: '2026-01-01T00:00:00',
    ...overrides,
  };
}

describe('ProfilePage', () => {
  let authService: {
    currentUser: ReturnType<typeof signal<MeResponse | null>>;
    updateProfile: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    authService = {
      currentUser: signal(makeMe()),
      updateProfile: vi.fn(),
      deleteAccount: vi.fn(),
      logout: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it('pre-fills the form from currentUser()', () => {
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      username: 'will',
      email: 'will@test.dev',
    });
  });

  it('submit() updates the profile and shows a confirmation on success', () => {
    authService.updateProfile.mockReturnValue(of(makeMe({ username: 'newname' })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ username: 'newname', email: 'will@test.dev' });
    fixture.componentInstance.submit();

    expect(authService.updateProfile).toHaveBeenCalledWith({ username: 'newname', email: 'will@test.dev' });
    expect(fixture.componentInstance.updateSuccess()).toBe(true);
  });

  it('submit() shows an inline error on a 409 conflict', () => {
    authService.updateProfile.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.updateError()).not.toBeNull();
    expect(fixture.componentInstance.updateSuccess()).toBe(false);
  });

  it('deleteAccount() does nothing when the confirmation is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.deleteAccount();

    expect(authService.deleteAccount).not.toHaveBeenCalled();
  });

  it('deleteAccount() logs out and navigates home on success when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    authService.deleteAccount.mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.deleteAccount();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('deleteAccount() shows an inline error on a 409 conflict, without logging out', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    authService.deleteAccount.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.deleteAccount();

    expect(fixture.componentInstance.deleteError()).not.toBeNull();
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './profile-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/profile/profile-page/profile-page.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, TextField, Button],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: [this.authService.currentUser()?.username ?? '', Validators.required],
    email: [this.authService.currentUser()?.email ?? '', Validators.required],
  });

  readonly updating = signal(false);
  readonly updateSuccess = signal(false);
  readonly updateError = signal<string | null>(null);

  readonly deletingAccount = signal(false);
  readonly deleteError = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid || this.updating()) {
      return;
    }

    this.updating.set(true);
    this.updateSuccess.set(false);
    this.updateError.set(null);

    this.authService.updateProfile(this.form.getRawValue()).subscribe({
      next: () => {
        this.updating.set(false);
        this.updateSuccess.set(true);
      },
      error: () => {
        this.updating.set(false);
        this.updateError.set("Nom d'utilisateur ou email déjà utilisé.");
      },
    });
  }

  deleteAccount(): void {
    if (!window.confirm('Supprimer définitivement ton compte ?')) {
      return;
    }

    this.deletingAccount.set(true);
    this.deleteError.set(null);

    this.authService.deleteAccount().subscribe({
      next: () => {
        this.deletingAccount.set(false);
        this.authService.logout();
        this.router.navigate(['/']);
      },
      error: () => {
        this.deletingAccount.set(false);
        this.deleteError.set(
          'Impossible de supprimer ton compte : solde d\'abord ta boutique, tes commandes et tes avis en cours.',
        );
      },
    });
  }
}
```

`src/app/features/profile/profile-page/profile-page.html`:

```html
<section class="app-profile-page">
  <h1>Profil</h1>

  <form [formGroup]="form" (ngSubmit)="submit()">
    <app-text-field label="Nom d'utilisateur" formControlName="username" />
    <app-text-field label="Email" type="email" formControlName="email" />

    @if (updateError()) {
      <p class="app-profile-page__error">{{ updateError() }}</p>
    }
    @if (updateSuccess()) {
      <p class="app-profile-page__success">Profil mis à jour ✓</p>
    }

    <app-button type="submit" [disabled]="updating()">Enregistrer</app-button>
  </form>

  <section class="app-profile-page__danger-zone">
    <h2>Supprimer mon compte</h2>
    @if (deleteError()) {
      <p class="app-profile-page__error">{{ deleteError() }}</p>
    }
    <app-button type="button" variant="secondary" [disabled]="deletingAccount()" (pressed)="deleteAccount()">
      Supprimer mon compte
    </app-button>
  </section>
</section>
```

`src/app/features/profile/profile-page/profile-page.css`:

```css
.app-profile-page__error {
  color: var(--color-accent);
  font-weight: 700;
}

.app-profile-page__success {
  color: var(--color-navy);
  font-weight: 700;
}

.app-profile-page__danger-zone {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 2px solid var(--color-navy);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ProfilePage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/profile` and stop.

---

### Task 6: `ShopPage` ✅ DONE (staged, not committed; reviewed, fixed twice and re-approved — (1) fetches moved from the plan's illustrative constructor into `ngOnInit`, since a required `input()` has no value yet at construction time, matching `ListingDetailPage`'s established pattern; (2) the single `loading` signal only gated on the shop fetch, letting listings/reviews empty-states flash before those requests resolved — fixed by combining all three fetches via `forkJoin`, with `catchError` fallbacks added on the listings/reviews branches so a failure there can't hang the page in "Chargement..." forever)

**Files:**
- Create: `src/app/features/shop/shop-page/shop-page.ts`
- Create: `src/app/features/shop/shop-page/shop-page.html`
- Create: `src/app/features/shop/shop-page/shop-page.css`
- Test: `src/app/features/shop/shop-page/shop-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/shop/shop-page/shop-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ShopPage } from './shop-page';
import { ShopService } from '../../../core/shop/shop.service';
import { ListingService } from '../../../core/catalog/listing.service';
import { ReviewService } from '../../../core/reviews/review.service';
import { ReviewResponse } from '../../../core/reviews/review.types';

function makeReview(overrides: Partial<ReviewResponse> = {}): ReviewResponse {
  return {
    id: 'rv1',
    authorUsername: 'buyer1',
    rating: 5,
    comment: 'Nickel',
    createdAt: '2026-01-01T00:00:00',
    ...overrides,
  };
}

describe('ShopPage', () => {
  let shopService: { getById: ReturnType<typeof vi.fn> };
  let listingService: { search: ReturnType<typeof vi.fn> };
  let reviewService: { getByShop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    shopService = { getById: vi.fn().mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'A shop' })) };
    listingService = {
      search: vi.fn().mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 })),
    };
    reviewService = { getByShop: vi.fn().mockReturnValue(of([])) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ShopService, useValue: shopService },
        { provide: ListingService, useValue: listingService },
        { provide: ReviewService, useValue: reviewService },
      ],
    });
  });

  it('fetches the shop, its listings, and its reviews', () => {
    const fixture = TestBed.createComponent(ShopPage);
    fixture.componentRef.setInput('id', 's1');
    fixture.detectChanges();

    expect(shopService.getById).toHaveBeenCalledWith('s1');
    expect(listingService.search).toHaveBeenCalledWith({ shopId: 's1' }, 0, 12);
    expect(reviewService.getByShop).toHaveBeenCalledWith('s1');
    expect(fixture.componentInstance.shop()?.name).toBe('Retro Shop');
  });

  it('sets notFound when the shop fetch returns a 404', () => {
    shopService.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = TestBed.createComponent(ShopPage);
    fixture.componentRef.setInput('id', 'missing');
    fixture.detectChanges();

    expect(fixture.componentInstance.notFound()).toBe(true);
  });

  it('averageRating() returns null when there are no reviews', () => {
    const fixture = TestBed.createComponent(ShopPage);
    fixture.componentRef.setInput('id', 's1');
    fixture.detectChanges();

    expect(fixture.componentInstance.averageRating()).toBeNull();
  });

  it('averageRating() averages the fetched reviews', () => {
    reviewService.getByShop.mockReturnValue(of([makeReview({ rating: 4 }), makeReview({ rating: 5, id: 'rv2' })]));
    const fixture = TestBed.createComponent(ShopPage);
    fixture.componentRef.setInput('id', 's1');
    fixture.detectChanges();

    expect(fixture.componentInstance.averageRating()).toBe(4.5);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './shop-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/shop/shop-page/shop-page.ts`:

```ts
import { Component, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of as rxOf } from 'rxjs';
import { ShopService } from '../../../core/shop/shop.service';
import { ListingService } from '../../../core/catalog/listing.service';
import { ReviewService } from '../../../core/reviews/review.service';
import { Card } from '../../../shared/ui/card/card';
import { ShopResponse } from '../../../core/shop/shop.types';
import { ListingResponse } from '../../../core/catalog/catalog.types';
import { ReviewResponse } from '../../../core/reviews/review.types';

@Component({
  selector: 'app-shop-page',
  imports: [Card],
  templateUrl: './shop-page.html',
  styleUrl: './shop-page.css',
})
export class ShopPage {
  private readonly shopService = inject(ShopService);
  private readonly listingService = inject(ListingService);
  private readonly reviewService = inject(ReviewService);

  readonly id = input.required<string>();

  readonly shop = signal<ShopResponse | null>(null);
  readonly listings = signal<ListingResponse[]>([]);
  readonly reviews = signal<ReviewResponse[]>([]);
  readonly notFound = signal(false);
  readonly loading = signal(true);

  readonly averageRating = computed(() => {
    const reviews = this.reviews();
    if (reviews.length === 0) {
      return null;
    }
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  });

  constructor() {
    this.shopService
      .getById(this.id())
      .pipe(
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.notFound.set(true);
          }
          return rxOf(null);
        }),
      )
      .subscribe((shop) => {
        this.shop.set(shop);
        this.loading.set(false);
      });

    this.listingService.search({ shopId: this.id() }, 0, 12).subscribe((page) => {
      this.listings.set(page.content);
    });

    this.reviewService.getByShop(this.id()).subscribe((reviews) => {
      this.reviews.set(reviews);
    });
  }
}
```

`src/app/features/shop/shop-page/shop-page.html`:

```html
@if (loading()) {
  <p>Chargement...</p>
} @else if (notFound()) {
  <p class="app-shop-page__error">Boutique introuvable.</p>
} @else if (shop()) {
  <section class="app-shop-page">
    <header class="app-shop-page__header">
      <h1>{{ shop()!.name }}</h1>
      <p>{{ shop()!.description }}</p>
      @if (averageRating() !== null) {
        <p class="app-shop-page__rating">{{ averageRating()!.toFixed(1) }}/5 · {{ reviews().length }} avis</p>
      } @else {
        <p class="app-shop-page__rating">Pas encore d'avis</p>
      }
    </header>

    <h2>Annonces disponibles</h2>
    @if (listings().length === 0) {
      <p>Aucune annonce disponible pour l'instant.</p>
    } @else {
      <div class="app-shop-page__grid">
        @for (listing of listings(); track listing.id) {
          <app-card
            [title]="listing.gameName"
            [price]="listing.price"
            [imageUrl]="listing.imageUrls[0] ?? null"
            [routerLink]="['/listings', listing.id]"
            [featured]="listing.featured"
            [sold]="listing.status === 'SOLD'"
          />
        }
      </div>
    }

    <h2>Avis</h2>
    @if (reviews().length === 0) {
      <p>Aucun avis pour l'instant.</p>
    } @else {
      <ul class="app-shop-page__reviews">
        @for (review of reviews(); track review.id) {
          <li class="app-shop-page__review">
            <p><strong>{{ review.authorUsername }}</strong> — {{ review.rating }}/5</p>
            @if (review.comment) {
              <p>{{ review.comment }}</p>
            }
          </li>
        }
      </ul>
    }
  </section>
}
```

`src/app/features/shop/shop-page/shop-page.css`:

```css
.app-shop-page__error {
  color: var(--color-accent);
  font-weight: 700;
}

.app-shop-page__header {
  margin-bottom: var(--space-4);
}

.app-shop-page__rating {
  font-weight: 700;
}

.app-shop-page__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.app-shop-page__reviews {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.app-shop-page__review {
  padding: var(--space-3);
  border: 2px solid var(--color-navy);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ShopPage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/shop/shop-page` and stop.

---

### Task 7: `ListingDetailPage` — shop name becomes a link ✅ DONE (staged, not committed; reviewed, approved — byte-for-byte match with the plan)

**Files:**
- Modify: `src/app/features/market/listing-detail-page/listing-detail-page.ts`
- Modify: `src/app/features/market/listing-detail-page/listing-detail-page.html`
- Modify: `src/app/features/market/listing-detail-page/listing-detail-page.spec.ts`

- [ ] **Step 1: Write the failing test**

Read the current `listing-detail-page.spec.ts` first — it does not yet import
`provideRouter` (confirmed: this component has had no `routerLink` until now). Add
`import { provideRouter } from '@angular/router';` alongside the file's other
imports, and add `provideRouter([])` as the first entry of the existing
`TestBed.configureTestingModule({ providers: [...] })` array, since this component
will now render a `routerLink`. Then add this test after `'fetches the listing then
the game, and populates both signals'`:

```ts
  it('links the shop name to its public shop page', () => {
    listingService.getById.mockReturnValue(of(makeListing({ shopId: 's42', shopName: 'Retro Shop' })));
    gameService.getById.mockReturnValue(of(makeGame()));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/shops/s42"]');
    expect(link?.textContent).toContain('Retro Shop');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — no `a[href="/shops/s42"]` element exists yet (the shop name is
currently plain text).

- [ ] **Step 3: Write the implementation**

Read the current `listing-detail-page.ts` first. Add `RouterLink` to the existing
`@angular/router`... there is no such import yet in this file, so add a new import
line and add `RouterLink` to the component's `imports` array:

```ts
import { RouterLink } from '@angular/router';
```

```ts
  imports: [CurrencyPipe, RouterLink, Badge, Button],
```

Read the current `listing-detail-page.html` first. Replace the line
`<dd>{{ listing()!.shopName }}</dd>` with:

```html
        <dd><a [routerLink]="['/shops', listing()!.shopId]">{{ listing()!.shopName }}</a></dd>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ListingDetailPage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/market/listing-detail-page/listing-detail-page.ts src/app/features/market/listing-detail-page/listing-detail-page.html src/app/features/market/listing-detail-page/listing-detail-page.spec.ts`
and stop.

---

### Task 8: `OrderResponse` gains `reviewed`, `MyOrdersPage` gains the inline review flow ✅ DONE (staged, not committed; reviewed, fixed twice and re-approved — (1) the implementer correctly narrowed the plan's "any error is a soft success" to 409-only, per the design spec's actual intent, leaving the form retryable on other failures; (2) code review then found `reviewError` was a single page-level signal rendered inside the per-order loop, bleeding one order's error onto every other unreviewed order's form — fixed to a `reviewErrors: Record<string,string>` keyed by order id; a missing test for the non-409 branch was also added)

**Files:**
- Modify: `src/app/core/shop/shop.types.ts`
- Modify: `src/app/features/orders/my-orders-page/my-orders-page.ts`
- Modify: `src/app/features/orders/my-orders-page/my-orders-page.html`
- Modify: `src/app/features/orders/my-orders-page/my-orders-page.css`
- Modify: `src/app/features/orders/my-orders-page/my-orders-page.spec.ts`
- Modify: `src/app/features/shop/my-shop-orders-page/my-shop-orders-page.spec.ts`

- [ ] **Step 1: Write the failing tests**

Read the current `src/app/core/shop/shop.types.ts` first. Add `reviewed: boolean;` as
the last field of `OrderResponse`. No test for this line alone — it's a pure
additive type change, verified indirectly by the tests below (which will fail to
compile — and therefore fail to pass — if this field is missing, since the test file
constructs full `OrderResponse` fixtures).

Read the current `my-orders-page.spec.ts` first. Its `makeOrder()` helper needs
`reviewed: false` added as the last field (before the closing `...overrides,` line),
matching the same one-line-insertion approach as Task 4's fixture updates:

```ts
function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 'o1',
    shopName: 'Retro Shop',
    buyerUsername: 'will',
    buyerEmail: 'will@test.dev',
    status: 'PENDING',
    deliveryMode: 'HOME',
    shippingAddress: null,
    relayPoint: null,
    shippingCost: 5,
    createdAt: '2026-01-01T00:00:00',
    items: [{ listingId: 'l1', gameName: 'Kingdom Hearts', price: 20 }],
    reviewed: false,
    ...overrides,
  };
}
```

The only other spec file constructing full `OrderResponse` fixtures is
`src/app/features/shop/my-shop-orders-page/my-shop-orders-page.spec.ts` (confirmed
by searching the codebase — `checkout-page.spec.ts` only ever uses empty `orders:
[]` arrays, so it needs no change). Read its `makeOrder()` helper first, then add
`reviewed: false,` as the last field the same way, right before its `...overrides,`
line:

```ts
function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 'o1',
    shopName: 'Retro Shop',
    buyerUsername: 'will',
    buyerEmail: 'will@test.dev',
    status: 'PAID',
    deliveryMode: 'HOME',
    shippingAddress: null,
    relayPoint: null,
    shippingCost: 5,
    createdAt: '2026-01-01T00:00:00',
    items: [{ listingId: 'l1', gameName: 'Kingdom Hearts', price: 20 }],
    reviewed: false,
    ...overrides,
  };
}
```

Add `import { ReviewService } from '../../../core/reviews/review.service';` to the
top of the file, and add a `reviewService` stub to the existing `beforeEach`
(alongside the existing `orderService`):

```ts
  let reviewService: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    orderService = {
      getMyOrders: vi.fn().mockReturnValue(of([makeOrder()])),
      cancel: vi.fn(),
    };
    reviewService = { create: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: OrderService, useValue: orderService },
        { provide: ReviewService, useValue: reviewService },
      ],
    });
  });
```

Add these tests after the existing `'does not show a cancel button for a
non-PENDING order'` test:

```ts
  it('shows a review form for a DELIVERED order with no review yet', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: false })]));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Laisser un avis');
  });

  it('does not show a review form for a DELIVERED order that already has one', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: true })]));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Laisser un avis');
  });

  it('submitReview() creates the review and marks the order as reviewed on success', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: false })]));
    reviewService.create.mockReturnValue(of({ id: 'rv1', authorUsername: 'will', rating: 5, comment: null, createdAt: '2026-01-01T00:00:00' }));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    fixture.componentInstance.submitReview(makeOrder({ status: 'DELIVERED', reviewed: false }));

    expect(reviewService.create).toHaveBeenCalledWith({ orderId: 'o1', rating: 5, comment: null });
    expect(fixture.componentInstance.orders()[0].reviewed).toBe(true);
  });

  it('submitReview() marks the order as reviewed even on a 409 (already reviewed elsewhere)', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: false })]));
    reviewService.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    fixture.componentInstance.submitReview(makeOrder({ status: 'DELIVERED', reviewed: false }));

    expect(fixture.componentInstance.orders()[0].reviewed).toBe(true);
    expect(fixture.componentInstance.reviewError()).not.toBeNull();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `submitReview is not a function`, and "Laisser un avis" doesn't
appear anywhere yet.

- [ ] **Step 3: Write the implementation**

Read the current `my-orders-page.ts` first. Replace it entirely with:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrderService } from '../../../core/shop/order.service';
import { ReviewService } from '../../../core/reviews/review.service';
import { Button } from '../../../shared/ui/button/button';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { OrderResponse } from '../../../core/shop/shop.types';

const RATING_OPTIONS: SelectOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

@Component({
  selector: 'app-my-orders-page',
  imports: [ReactiveFormsModule, Button, TextField, SelectField],
  templateUrl: './my-orders-page.html',
  styleUrl: './my-orders-page.css',
})
export class MyOrdersPage {
  private readonly fb = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly reviewService = inject(ReviewService);

  readonly ratingOptions = RATING_OPTIONS;

  readonly orders = signal<OrderResponse[]>([]);
  readonly loading = signal(true);
  readonly actionError = signal<string | null>(null);
  readonly cancellingOrderId = signal<string | null>(null);

  readonly reviewForms: Record<string, FormGroup> = {};
  readonly submittingReviewFor = signal<string | null>(null);
  readonly reviewError = signal<string | null>(null);

  constructor() {
    this.orderService.getMyOrders().subscribe((orders) => {
      this.orders.set(orders);
      this.loading.set(false);
      for (const order of orders) {
        if (order.status === 'DELIVERED' && !order.reviewed) {
          this.reviewForms[order.id] = this.fb.nonNullable.group({
            rating: ['5', Validators.required],
            comment: [''],
          });
        }
      }
    });
  }

  orderTotal(order: OrderResponse): number {
    return order.items.reduce((sum, item) => sum + item.price, 0) + order.shippingCost;
  }

  cancelOrder(order: OrderResponse): void {
    if (this.cancellingOrderId() || !window.confirm('Annuler cette commande ?')) {
      return;
    }

    this.actionError.set(null);
    this.cancellingOrderId.set(order.id);
    this.orderService.cancel(order.id).subscribe({
      next: (updated) => {
        this.cancellingOrderId.set(null);
        this.orders.set(this.orders().map((o) => (o.id === updated.id ? updated : o)));
      },
      error: () => {
        this.cancellingOrderId.set(null);
        this.actionError.set("Impossible d'annuler cette commande.");
      },
    });
  }

  submitReview(order: OrderResponse): void {
    if (this.submittingReviewFor()) {
      return;
    }

    const form = this.reviewForms[order.id];
    const { rating, comment } = form.getRawValue() as { rating: string; comment: string };

    this.reviewError.set(null);
    this.submittingReviewFor.set(order.id);

    this.reviewService.create({ orderId: order.id, rating: Number(rating), comment: comment || null }).subscribe({
      next: () => {
        this.submittingReviewFor.set(null);
        this.markReviewed(order.id);
      },
      error: () => {
        this.submittingReviewFor.set(null);
        this.reviewError.set('Cette commande a déjà un avis.');
        this.markReviewed(order.id);
      },
    });
  }

  private markReviewed(orderId: string): void {
    this.orders.set(this.orders().map((o) => (o.id === orderId ? { ...o, reviewed: true } : o)));
    delete this.reviewForms[orderId];
  }
}
```

Read the current `my-orders-page.html` first. Add this block right after the
existing `@if (order.status === 'PENDING') { ... }` cancel-button block, still
inside the `<li class="app-my-orders-page__order">` element:

```html
        @if (order.status === 'DELIVERED' && !order.reviewed && reviewForms[order.id]) {
          <form [formGroup]="reviewForms[order.id]" (ngSubmit)="submitReview(order)" class="app-my-orders-page__review-form">
            <app-select-field label="Note" formControlName="rating" [options]="ratingOptions" />
            <app-text-field label="Commentaire (optionnel)" formControlName="comment" />
            @if (reviewError()) {
              <p class="app-my-orders-page__error">{{ reviewError() }}</p>
            }
            <app-button type="submit" [disabled]="submittingReviewFor() === order.id">Laisser un avis</app-button>
          </form>
        }
```

Read the current `my-orders-page.css` first. Append:

```css
.app-my-orders-page__review-form {
  margin-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 20rem;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `MyOrdersPage` tests green (existing tests unchanged in
behavior, plus the four new ones).

- [ ] **Step 5: Run the full suite to confirm no regression**

Run: `npx ng test --watch=false`
Expected: PASS — every existing test class still green, including
`MyShopOrdersPage`'s spec with its now-updated `makeOrder()` fixture.

- [ ] **Step 6: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/shop/shop.types.ts src/app/features/orders/my-orders-page src/app/features/shop/my-shop-orders-page/my-shop-orders-page.spec.ts`
and stop.

---

### Task 9: `AdminListingsPage` ✅ DONE (staged, not committed; reviewed, approved — byte-for-byte match with the plan; `togglingId`/`featuredErrors` scoping specifically double-checked against Tasks 6/8's bugs and confirmed correct)

**Files:**
- Create: `src/app/features/admin/admin-listings-page/admin-listings-page.ts`
- Create: `src/app/features/admin/admin-listings-page/admin-listings-page.html`
- Create: `src/app/features/admin/admin-listings-page/admin-listings-page.css`
- Test: `src/app/features/admin/admin-listings-page/admin-listings-page.spec.ts`

Before writing anything, read `src/app/features/market/market-page/market-page.ts`
to confirm the exact filter-form/debounce/pagination pattern this task reuses
unchanged (same `FormBuilder` group shape, same 300ms `debounceTime` +
`distinctUntilChanged`, same genre/platform option loading via `GenreService`/
`GameService.getPlatforms()`).

- [ ] **Step 1: Write the failing test**

`src/app/features/admin/admin-listings-page/admin-listings-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AdminListingsPage } from './admin-listings-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { GameService } from '../../../core/catalog/game.service';
import { ListingResponse } from '../../../core/catalog/catalog.types';

function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: 'l1',
    shopId: 's1',
    gameId: 'g1',
    gameName: 'Kingdom Hearts',
    shopName: 'Retro Shop',
    price: 20,
    status: 'AVAILABLE',
    featured: false,
    imageUrls: [],
    ...overrides,
  };
}

describe('AdminListingsPage', () => {
  let listingService: { search: ReturnType<typeof vi.fn>; setFeatured: ReturnType<typeof vi.fn> };
  let genreService: { getAll: ReturnType<typeof vi.fn> };
  let gameService: { getPlatforms: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    listingService = {
      search: vi.fn().mockReturnValue(
        of({ content: [makeListing()], totalElements: 1, totalPages: 1, number: 0, size: 12 }),
      ),
      setFeatured: vi.fn(),
    };
    genreService = { getAll: vi.fn().mockReturnValue(of([])) };
    gameService = { getPlatforms: vi.fn().mockReturnValue(of([])) };

    TestBed.configureTestingModule({
      providers: [
        { provide: ListingService, useValue: listingService },
        { provide: GenreService, useValue: genreService },
        { provide: GameService, useValue: gameService },
      ],
    });
  });

  it('fetches listings on construction', () => {
    const fixture = TestBed.createComponent(AdminListingsPage);
    fixture.detectChanges();

    expect(listingService.search).toHaveBeenCalled();
    expect(fixture.componentInstance.listings().length).toBe(1);
  });

  it('toggleFeatured() calls the service and replaces the row on success', () => {
    listingService.setFeatured.mockReturnValue(of(makeListing({ featured: true })));
    const fixture = TestBed.createComponent(AdminListingsPage);
    fixture.detectChanges();

    fixture.componentInstance.toggleFeatured(makeListing({ featured: false }));

    expect(listingService.setFeatured).toHaveBeenCalledWith('l1', true);
    expect(fixture.componentInstance.listings()[0].featured).toBe(true);
  });

  it('toggleFeatured() leaves the row unchanged and shows a row error on failure', () => {
    listingService.setFeatured.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(AdminListingsPage);
    fixture.detectChanges();

    fixture.componentInstance.toggleFeatured(makeListing({ featured: false }));

    expect(fixture.componentInstance.listings()[0].featured).toBe(false);
    expect(fixture.componentInstance.featuredErrors()['l1']).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './admin-listings-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/admin/admin-listings-page/admin-listings-page.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ListingService } from '../../../core/catalog/listing.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { GameService } from '../../../core/catalog/game.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { Button } from '../../../shared/ui/button/button';
import { ListingResponse } from '../../../core/catalog/catalog.types';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-admin-listings-page',
  imports: [ReactiveFormsModule, TextField, SelectField, Button],
  templateUrl: './admin-listings-page.html',
  styleUrl: './admin-listings-page.css',
})
export class AdminListingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly listingService = inject(ListingService);
  private readonly genreService = inject(GenreService);
  private readonly gameService = inject(GameService);

  readonly form = this.fb.nonNullable.group({
    search: [''],
    genreId: [''],
    platform: [''],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
  });

  readonly genreOptions = signal<SelectOption[]>([{ value: '', label: 'Tous les genres' }]);
  readonly platformOptions = signal<SelectOption[]>([{ value: '', label: 'Toutes les plateformes' }]);

  readonly listings = signal<ListingResponse[]>([]);
  readonly loading = signal(true);
  readonly page = signal(0);
  readonly totalPages = signal(0);

  readonly togglingId = signal<string | null>(null);
  readonly featuredErrors = signal<Record<string, string>>({});

  constructor() {
    this.genreService.getAll().subscribe((genres) => {
      this.genreOptions.set([
        { value: '', label: 'Tous les genres' },
        ...genres.map((genre) => ({ value: genre.id, label: genre.name })),
      ]);
    });

    this.gameService.getPlatforms().subscribe((platforms) => {
      this.platformOptions.set([
        { value: '', label: 'Toutes les plateformes' },
        ...platforms.map((platform) => ({ value: platform, label: platform })),
      ]);
    });

    this.form.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      )
      .subscribe(() => {
        this.page.set(0);
        this.fetch();
      });

    this.fetch();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  toggleFeatured(listing: ListingResponse): void {
    if (this.togglingId()) {
      return;
    }

    this.togglingId.set(listing.id);
    this.featuredErrors.set({ ...this.featuredErrors(), [listing.id]: '' });

    this.listingService.setFeatured(listing.id, !listing.featured).subscribe({
      next: (updated) => {
        this.togglingId.set(null);
        this.listings.set(this.listings().map((l) => (l.id === updated.id ? updated : l)));
      },
      error: () => {
        this.togglingId.set(null);
        this.featuredErrors.set({
          ...this.featuredErrors(),
          [listing.id]: "Impossible de changer le statut Pépite de cette annonce.",
        });
      },
    });
  }

  private fetch(): void {
    this.loading.set(true);
    const filters = this.form.getRawValue();
    this.listingService.search(filters, this.page(), PAGE_SIZE).subscribe((result) => {
      this.listings.set(result.content);
      this.totalPages.set(result.totalPages);
      this.loading.set(false);
    });
  }
}
```

`src/app/features/admin/admin-listings-page/admin-listings-page.html`:

```html
<section class="app-admin-listings-page">
  <h1>Curation — Pépites</h1>

  <form [formGroup]="form" class="app-admin-listings-page__filters">
    <app-text-field label="Recherche" formControlName="search" placeholder="Nom du jeu..." />
    <app-select-field label="Genre" [options]="genreOptions()" formControlName="genreId" />
    <app-select-field label="Plateforme" [options]="platformOptions()" formControlName="platform" />

    <div class="app-admin-listings-page__price-range">
      <label for="admin-min-price">Prix min</label>
      <input id="admin-min-price" type="number" formControlName="minPrice" />
      <label for="admin-max-price">Prix max</label>
      <input id="admin-max-price" type="number" formControlName="maxPrice" />
    </div>
  </form>

  @if (loading()) {
    <p>Chargement...</p>
  } @else if (listings().length === 0) {
    <p>Aucune annonce ne correspond à ces critères.</p>
  } @else {
    <table class="app-admin-listings-page__table">
      <thead>
        <tr>
          <th></th>
          <th>Jeu</th>
          <th>Boutique</th>
          <th>Prix</th>
          <th>Statut</th>
          <th>Pépite</th>
        </tr>
      </thead>
      <tbody>
        @for (listing of listings(); track listing.id) {
          <tr>
            <td><img class="app-admin-listings-page__thumb" [src]="listing.imageUrls[0] ?? 'images/plusicon.svg'" [alt]="listing.gameName" /></td>
            <td>{{ listing.gameName }}</td>
            <td>{{ listing.shopName }}</td>
            <td>{{ listing.price }} €</td>
            <td>{{ listing.status }}</td>
            <td>
              <app-button
                type="button"
                variant="secondary"
                [disabled]="togglingId() === listing.id"
                (pressed)="toggleFeatured(listing)"
              >
                {{ listing.featured ? 'Oui' : 'Non' }}
              </app-button>
              @if (featuredErrors()[listing.id]) {
                <p class="app-admin-listings-page__error">{{ featuredErrors()[listing.id] }}</p>
              }
            </td>
          </tr>
        }
      </tbody>
    </table>

    <div class="app-admin-listings-page__pagination">
      <app-button type="button" [disabled]="page() === 0" (pressed)="goToPage(page() - 1)">Précédent</app-button>
      <span>Page {{ page() + 1 }} sur {{ totalPages() }}</span>
      <app-button type="button" [disabled]="page() + 1 >= totalPages()" (pressed)="goToPage(page() + 1)">Suivant</app-button>
    </div>
  }
</section>
```

`src/app/features/admin/admin-listings-page/admin-listings-page.css`:

```css
.app-admin-listings-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: flex-end;
  margin-bottom: var(--space-4);
}

.app-admin-listings-page__price-range {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.app-admin-listings-page__price-range input {
  font-family: var(--font-body);
  padding: var(--space-2);
  border: 2px solid var(--color-navy);
  border-radius: var(--radius);
}

.app-admin-listings-page__table {
  width: 100%;
  border-collapse: collapse;
}

.app-admin-listings-page__table th,
.app-admin-listings-page__table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--color-navy);
  text-align: left;
}

.app-admin-listings-page__thumb {
  width: 3rem;
  height: 3rem;
  object-fit: cover;
}

.app-admin-listings-page__error {
  color: var(--color-accent);
  font-weight: 700;
}

.app-admin-listings-page__pagination {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `AdminListingsPage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/admin` and stop.

---

### Task 10: Route wiring + `PageStub` removal ✅ DONE (staged, not committed; reviewed, approved — 198/198 tests pass, production build succeeds with correct lazy chunks, `PageStub` fully removed with zero dangling references)

**Files:**
- Modify: `src/app/app.routes.ts`
- Delete: `src/app/shared/ui/page-stub/page-stub.ts`
- Delete: `src/app/shared/ui/page-stub/page-stub.html`
- Delete: `src/app/shared/ui/page-stub/page-stub.css`
- Delete: `src/app/shared/ui/page-stub/page-stub.spec.ts`

After this task, `/profile` and `/admin/listings` are the only two routes that ever
used `PageStub` (confirmed by searching the codebase — no other route or component
references it), so the component becomes dead code once both are swapped for real
pages.

- [ ] **Step 1: Update the route table**

Read the current `src/app/app.routes.ts` first. Remove the
`import { PageStub } from './shared/ui/page-stub/page-stub';` line. No new top-level
imports are needed for the three route changes below — `loadComponent` uses dynamic
`import()` inline, matching every other route in this file.

Replace the `/profile` route entry:

```ts
  {
    path: 'profile',
    component: PageStub,
    data: { title: 'Profil' },
    canActivate: [authGuard],
  },
```

with:

```ts
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile-page/profile-page').then((m) => m.ProfilePage),
    canActivate: [authGuard],
  },
```

Replace the `/admin/listings` route entry:

```ts
  {
    path: 'admin/listings',
    component: PageStub,
    data: { title: 'Curation — Pépites' },
    canActivate: [authGuard, roleGuard('ADMIN')],
  },
```

with:

```ts
  {
    path: 'admin/listings',
    loadComponent: () =>
      import('./features/admin/admin-listings-page/admin-listings-page').then((m) => m.AdminListingsPage),
    canActivate: [authGuard, roleGuard('ADMIN')],
  },
```

Add a new route for the shop page — place it right after the `listings/:id` route,
since both are public catalog-browsing routes:

```ts
  {
    path: 'shops/:id',
    loadComponent: () => import('./features/shop/shop-page/shop-page').then((m) => m.ShopPage),
  },
```

- [ ] **Step 2: Delete the now-unused `PageStub` component**

Delete these four files:
- `src/app/shared/ui/page-stub/page-stub.ts`
- `src/app/shared/ui/page-stub/page-stub.html`
- `src/app/shared/ui/page-stub/page-stub.css`
- `src/app/shared/ui/page-stub/page-stub.spec.ts`

- [ ] **Step 3: Run to verify everything still builds and passes**

Run: `npx ng test --watch=false`
Expected: PASS — no test references `PageStub` anymore (confirm with a search
before deleting; if any test does, it belongs to one of the two routes already
replaced by earlier tasks and should already be gone — if not, that's a signal a
step was missed and must be resolved before proceeding, not worked around).

Run: `npx ng build`
Expected: succeeds — confirms no dangling import of the deleted `PageStub` files
anywhere (a route or component still referencing it would fail the build, not just
the tests).

- [ ] **Step 4: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/app.routes.ts src/app/shared/ui/page-stub`
(staging a deleted directory with `git add` records the deletions) and stop.

---

### Task 11: Final verification ✅ DONE (198/198 tests pass, production build succeeds, all 10 tasks staged, nothing committed — includes one fix from the final holistic review: `AdminListingsPage`'s and `MyOrdersPage`'s per-row `disabled` bindings checked `=== id` against a page-level single-flight guard, so other rows looked clickable but silently no-op'd while one action was in flight; fixed to disable all rows while any request is in flight, matching the guard's actual global semantics)

**Files:** none (verification only).

- [ ] **Step 1: Run the entire test suite**

Run: `npx ng test --watch=false`
Expected: PASS — every test file green, including all new/modified files from this
plan.

- [ ] **Step 2: Full production build sanity check**

Run: `npx ng build`
Expected: succeeds with no new warnings tied to any file this plan touched.

- [ ] **Step 3: Confirm nothing is committed**

Run: `git status`
Expected: all new/modified files from this plan show as staged — nothing
committed.

---

## Self-review

**Spec coverage:**
- `AuthService.updateProfile`/`deleteAccount` — Task 1.
- `ReviewService` (new module) — Task 2.
- `ShopService.getById` — Task 3.
- `ListingResponse.shopId`, `GET /listings` `shopId` filter, `setFeatured()` — Task 4.
- `ProfilePage` (edit + delete account) — Task 5.
- `ShopPage` (info + listings + reviews + computed average rating) — Task 6.
- `ListingDetailPage` shop-name link — Task 7.
- `OrderResponse.reviewed`, `MyOrdersPage` inline review flow — Task 8.
- `AdminListingsPage` (filters + featured toggle) — Task 9.
- Route wiring (`/profile`, `/admin/listings`, new `/shops/:id`) and `PageStub`
  removal — Task 10.

**Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.

**Type consistency:** `UpdateProfileRequest` (Task 1) is used identically by
`AuthService.updateProfile` and `ProfilePage.submit()`. `ReviewRequest`/
`ReviewResponse` (Task 2) are used identically by `ReviewService` and both
`ShopPage`/`MyOrdersPage`. `ListingResponse.shopId` (Task 4) is consumed identically
by `ShopPage`'s listing grid (unchanged `Card` inputs) and `ListingDetailPage`'s new
link. `ListingFilters.shopId` (Task 4) is passed as `{ shopId: this.id() }` in
`ShopPage` (Task 6), matching the exact param name `ListingService.search` checks.
`OrderResponse.reviewed` (Task 8) is read/written consistently across
`MyOrdersPage`'s template guard, `submitReview`, and `markReviewed`. `setFeatured`'s
2-arg signature `(id, featured)` (Task 4) is called identically at its only call
site in `AdminListingsPage.toggleFeatured` (Task 9).
