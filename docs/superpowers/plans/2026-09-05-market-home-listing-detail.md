# Market, Home & Listing Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `PageStub` placeholders at `/`, `/market`, and `/listings/:id` with real pages: a curated home feed, a searchable/filterable paginated catalogue, and a listing detail page — all backed by the real backend.

**Architecture:** Three thin `HttpClient` services (`ListingService`, `GameService`, `GenreService`) under `core/catalog/`, three standalone page components under `features/`, reusing the foundation wave's shared UI kit (`Card`, `Badge`, `Button`, `TextField`, `SelectField`).

**Tech Stack:** Angular 22 (standalone, signals), Reactive Forms, RxJS (`debounceTime`/`distinctUntilChanged`/`switchMap`), Vitest.

Spec: `docs/superpowers/specs/2026-09-04-market-home-listing-detail-design.md`

**Depends on:** the companion backend plan
(`new-game-plus/docs/superpowers/plans/2026-09-05-listing-search-filter.md`) must be
implemented first — this plan's `ListingService.search()` and `GameService.getPlatforms()`
call endpoints that plan adds (`GET /listings` with new query params, `GET /games/platforms`,
`gameId` on `ListingResponse`). If that backend work isn't done yet, this plan's frontend
code will still compile and its tests (which mock the HTTP layer) will still pass, but the
Market page won't actually filter anything against a real running backend until it is.

---

## Before you start

All file paths are relative to the repo root:
`C:\Users\lemet\Documents\Technifutur\new-game-plus-frontend`. Every task's verification
step runs `npx ng test --watch=false` (the full suite — no single-file filtering
available through this project's Vitest builder, per the foundation plan's established
convention).

---

### Task 1: Catalog types ✅ DONE (staged, not committed; verified directly)

**Files:**
- Create: `src/app/core/catalog/catalog.types.ts`

- [ ] **Step 1: Write the type definitions**

`src/app/core/catalog/catalog.types.ts`:

```ts
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ListingResponse {
  id: string;
  gameId: string;
  gameName: string;
  shopName: string;
  price: number;
  status: 'AVAILABLE' | 'SOLD';
  featured: boolean;
  imageUrls: string[];
}

export interface GameResponse {
  id: string;
  name: string;
  description: string;
  genres: string[];
  publisher: string;
  developer: string;
  platform: string;
  releaseDate: string;
  coverURL: string | null;
  weightGrams: number;
}

export interface GenreResponse {
  id: string;
  name: string;
}

export interface ListingFilters {
  search: string;
  genreId: string;
  platform: string;
  minPrice: number | null;
  maxPrice: number | null;
}
```

No test — pure type declarations, mirroring how `auth.types.ts` was handled in the
foundation plan.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage the file:
`git add src/app/core/catalog/catalog.types.ts` and stop.

---

### Task 2: ListingService ✅ DONE (staged, not committed; verified directly — matches spec exactly, 74/74 tests pass)

**Files:**
- Create: `src/app/core/catalog/listing.service.ts`
- Test: `src/app/core/catalog/listing.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/catalog/listing.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListingService } from './listing.service';
import { environment } from '../../../environments/environment';

describe('ListingService', () => {
  let service: ListingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ListingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getLatest() calls GET /listings/latest with the given limit', () => {
    service.getLatest(5).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/latest?limit=5`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getLatest() defaults limit to 8', () => {
    service.getLatest().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/latest?limit=8`);
    req.flush([]);
  });

  it('getFeatured() calls GET /listings/featured with the given limit', () => {
    service.getFeatured(3).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/featured?limit=3`);
    req.flush([]);
  });

  it('getCheap() calls GET /listings/cheap with the given limit', () => {
    service.getCheap(3).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/cheap?limit=3`);
    req.flush([]);
  });

  it('getById() calls GET /listings/{id}', () => {
    service.getById('abc-123').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/abc-123`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('search() with no filters only sends page and size', () => {
    service.search({}, 0, 12).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/listings`);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('12');
    expect(req.request.params.keys().length).toBe(2);
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 });
  });

  it('search() includes only the non-empty/non-null filter params', () => {
    service
      .search({ search: 'zelda', genreId: '', platform: 'PC', minPrice: null, maxPrice: 30 }, 1, 12)
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/listings`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('12');
    expect(req.request.params.get('search')).toBe('zelda');
    expect(req.request.params.get('platform')).toBe('PC');
    expect(req.request.params.get('maxPrice')).toBe('30');
    expect(req.request.params.has('genreId')).toBe(false);
    expect(req.request.params.has('minPrice')).toBe(false);
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 12 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './listing.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/catalog/listing.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ListingFilters, ListingResponse, Page } from './catalog.types';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly http = inject(HttpClient);

  getLatest(limit = 8): Observable<ListingResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ListingResponse[]>(`${environment.apiUrl}/listings/latest`, { params });
  }

  getFeatured(limit = 8): Observable<ListingResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ListingResponse[]>(`${environment.apiUrl}/listings/featured`, { params });
  }

  getCheap(limit = 8): Observable<ListingResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ListingResponse[]>(`${environment.apiUrl}/listings/cheap`, { params });
  }

  getById(id: string): Observable<ListingResponse> {
    return this.http.get<ListingResponse>(`${environment.apiUrl}/listings/${id}`);
  }

  search(filters: Partial<ListingFilters>, page: number, size = 12): Observable<Page<ListingResponse>> {
    let params = new HttpParams().set('page', page).set('size', size);

    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.genreId) {
      params = params.set('genreId', filters.genreId);
    }
    if (filters.platform) {
      params = params.set('platform', filters.platform);
    }
    if (filters.minPrice !== null && filters.minPrice !== undefined) {
      params = params.set('minPrice', filters.minPrice);
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
      params = params.set('maxPrice', filters.maxPrice);
    }

    return this.http.get<Page<ListingResponse>>(`${environment.apiUrl}/listings`, { params });
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ListingService` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/catalog/listing.service.ts src/app/core/catalog/listing.service.spec.ts`
and stop.

---

### Task 3: GameService ✅ DONE (staged, not committed; implemented directly following TDD)

**Files:**
- Create: `src/app/core/catalog/game.service.ts`
- Test: `src/app/core/catalog/game.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/catalog/game.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GameService } from './game.service';
import { environment } from '../../../environments/environment';

describe('GameService', () => {
  let service: GameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getById() calls GET /games/{id}', () => {
    service.getById('g-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/games/g-1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getPlatforms() calls GET /games/platforms', () => {
    service.getPlatforms().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/games/platforms`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './game.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/catalog/game.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameResponse } from './catalog.types';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);

  getById(id: string): Observable<GameResponse> {
    return this.http.get<GameResponse>(`${environment.apiUrl}/games/${id}`);
  }

  getPlatforms(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/games/platforms`);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `GameService` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/catalog/game.service.ts src/app/core/catalog/game.service.spec.ts`
and stop.

---

### Task 4: GenreService ✅ DONE (staged, not committed; implemented directly following TDD, 77/77 tests pass)

**Files:**
- Create: `src/app/core/catalog/genre.service.ts`
- Test: `src/app/core/catalog/genre.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/catalog/genre.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GenreService } from './genre.service';
import { environment } from '../../../environments/environment';

describe('GenreService', () => {
  let service: GenreService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GenreService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll() calls GET /genres', () => {
    service.getAll().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/genres`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './genre.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/catalog/genre.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GenreResponse } from './catalog.types';

@Injectable({ providedIn: 'root' })
export class GenreService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<GenreResponse[]> {
    return this.http.get<GenreResponse[]>(`${environment.apiUrl}/genres`);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `GenreService` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/catalog/genre.service.ts src/app/core/catalog/genre.service.spec.ts`
and stop.

---

### Task 5: HomePage ✅ DONE (staged, not committed; reviewed, approved)

**Files:**
- Create: `src/app/features/home/home-page/home-page.ts`
- Create: `src/app/features/home/home-page/home-page.html`
- Create: `src/app/features/home/home-page/home-page.css`
- Test: `src/app/features/home/home-page/home-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/home/home-page/home-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HomePage } from './home-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { ListingResponse } from '../../../core/catalog/catalog.types';

function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: '1',
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

describe('HomePage', () => {
  let listingService: {
    getLatest: ReturnType<typeof vi.fn>;
    getFeatured: ReturnType<typeof vi.fn>;
    getCheap: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    listingService = {
      getLatest: vi.fn().mockReturnValue(of([makeListing({ id: 'latest-1' })])),
      getFeatured: vi.fn().mockReturnValue(of([makeListing({ id: 'featured-1' })])),
      getCheap: vi.fn().mockReturnValue(of([])),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ListingService, useValue: listingService }],
    });
  });

  it('fetches all three sections independently on construction', () => {
    TestBed.createComponent(HomePage);

    expect(listingService.getLatest).toHaveBeenCalled();
    expect(listingService.getFeatured).toHaveBeenCalled();
    expect(listingService.getCheap).toHaveBeenCalled();
  });

  it('renders a card per listing in each populated section', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-card').length).toBe(2);
  });

  it('shows an empty message for a section with no listings', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aucune annonce pour l\'instant.');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './home-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/home/home-page/home-page.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { ListingService } from '../../../core/catalog/listing.service';
import { Card } from '../../../shared/ui/card/card';
import { ListingResponse } from '../../../core/catalog/catalog.types';

@Component({
  selector: 'app-home-page',
  imports: [Card],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  private readonly listingService = inject(ListingService);

  readonly latest = signal<ListingResponse[]>([]);
  readonly latestLoading = signal(true);
  readonly featured = signal<ListingResponse[]>([]);
  readonly featuredLoading = signal(true);
  readonly cheap = signal<ListingResponse[]>([]);
  readonly cheapLoading = signal(true);

  constructor() {
    this.listingService.getLatest().subscribe((listings) => {
      this.latest.set(listings);
      this.latestLoading.set(false);
    });
    this.listingService.getFeatured().subscribe((listings) => {
      this.featured.set(listings);
      this.featuredLoading.set(false);
    });
    this.listingService.getCheap().subscribe((listings) => {
      this.cheap.set(listings);
      this.cheapLoading.set(false);
    });
  }
}
```

`src/app/features/home/home-page/home-page.html`:

```html
<section class="app-home-section">
  <h2>Derniers arrivages</h2>
  @if (latest().length === 0 && !latestLoading()) {
    <p>Aucune annonce pour l'instant.</p>
  } @else {
    <div class="app-home-section__grid">
      @for (listing of latest(); track listing.id) {
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
</section>

<section class="app-home-section">
  <h2>Pépites</h2>
  @if (featured().length === 0 && !featuredLoading()) {
    <p>Aucune annonce pour l'instant.</p>
  } @else {
    <div class="app-home-section__grid">
      @for (listing of featured(); track listing.id) {
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
</section>

<section class="app-home-section">
  <h2>Petits prix</h2>
  @if (cheap().length === 0 && !cheapLoading()) {
    <p>Aucune annonce pour l'instant.</p>
  } @else {
    <div class="app-home-section__grid">
      @for (listing of cheap(); track listing.id) {
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
</section>
```

`src/app/features/home/home-page/home-page.css`:

```css
.app-home-section {
  margin-bottom: var(--space-5);
}

.app-home-section__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `HomePage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/home` and stop.

---

### Task 6: MarketPage ✅ DONE (staged, not committed; reviewed, approved — debounce/pagination timing independently verified against Angular's actual source)

**Files:**
- Create: `src/app/features/market/market-page/market-page.ts`
- Create: `src/app/features/market/market-page/market-page.html`
- Create: `src/app/features/market/market-page/market-page.css`
- Test: `src/app/features/market/market-page/market-page.spec.ts`

This is the largest task in this plan — a reactive-form-driven, debounced, paginated
search page. Take it carefully.

- [ ] **Step 1: Write the failing test**

`src/app/features/market/market-page/market-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MarketPage } from './market-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { GameService } from '../../../core/catalog/game.service';
import { ListingResponse, Page } from '../../../core/catalog/catalog.types';

function makePage(content: ListingResponse[] = [], totalPages = 1, number = 0): Page<ListingResponse> {
  return { content, totalElements: content.length, totalPages, number, size: 12 };
}

function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: '1',
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

describe('MarketPage', () => {
  let listingService: { search: ReturnType<typeof vi.fn> };
  let genreService: { getAll: ReturnType<typeof vi.fn> };
  let gameService: { getPlatforms: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    listingService = { search: vi.fn().mockReturnValue(of(makePage([makeListing()]))) };
    genreService = { getAll: vi.fn().mockReturnValue(of([{ id: 'g-rpg', name: 'RPG' }])) };
    gameService = { getPlatforms: vi.fn().mockReturnValue(of(['PC', 'Nintendo Switch'])) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ListingService, useValue: listingService },
        { provide: GenreService, useValue: genreService },
        { provide: GameService, useValue: gameService },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches the first page with empty filters on construction', () => {
    TestBed.createComponent(MarketPage);

    expect(listingService.search).toHaveBeenCalledWith(
      { search: '', genreId: '', platform: '', minPrice: null, maxPrice: null },
      0,
      12,
    );
  });

  it('loads genre and platform options with a leading "all" choice', () => {
    const fixture = TestBed.createComponent(MarketPage);

    expect(fixture.componentInstance.genreOptions()).toEqual([
      { value: '', label: 'Tous les genres' },
      { value: 'g-rpg', label: 'RPG' },
    ]);
    expect(fixture.componentInstance.platformOptions()).toEqual([
      { value: '', label: 'Toutes les plateformes' },
      { value: 'PC', label: 'PC' },
      { value: 'Nintendo Switch', label: 'Nintendo Switch' },
    ]);
  });

  it('debounces a filter change and resets to page 0 before refetching', () => {
    const fixture = TestBed.createComponent(MarketPage);
    listingService.search.mockClear();
    fixture.componentInstance.page.set(2);

    fixture.componentInstance.form.controls.search.setValue('zelda');
    expect(listingService.search).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(listingService.search).toHaveBeenCalledWith(
      { search: 'zelda', genreId: '', platform: '', minPrice: null, maxPrice: null },
      0,
      12,
    );
  });

  it('goToPage() refetches immediately without waiting for the debounce', () => {
    const fixture = TestBed.createComponent(MarketPage);
    listingService.search.mockClear();

    fixture.componentInstance.goToPage(1);

    expect(listingService.search).toHaveBeenCalledWith(
      { search: '', genreId: '', platform: '', minPrice: null, maxPrice: null },
      1,
      12,
    );
  });

  it('reset() clears the form and refetches with empty filters after the debounce', () => {
    const fixture = TestBed.createComponent(MarketPage);
    fixture.componentInstance.form.controls.platform.setValue('PC');
    vi.advanceTimersByTime(300);
    listingService.search.mockClear();

    fixture.componentInstance.reset();
    vi.advanceTimersByTime(300);

    expect(listingService.search).toHaveBeenCalledWith(
      { search: '', genreId: '', platform: '', minPrice: null, maxPrice: null },
      0,
      12,
    );
  });

  it('populates listings, loading, and totalPages signals from the search result', () => {
    const fixture = TestBed.createComponent(MarketPage);

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.listings().length).toBe(1);
    expect(fixture.componentInstance.totalPages()).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './market-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/market/market-page/market-page.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ListingService } from '../../../core/catalog/listing.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { GameService } from '../../../core/catalog/game.service';
import { Card } from '../../../shared/ui/card/card';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { Button } from '../../../shared/ui/button/button';
import { ListingResponse } from '../../../core/catalog/catalog.types';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-market-page',
  imports: [ReactiveFormsModule, Card, TextField, SelectField, Button],
  templateUrl: './market-page.html',
  styleUrl: './market-page.css',
})
export class MarketPage {
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

  reset(): void {
    this.form.reset({ search: '', genreId: '', platform: '', minPrice: null, maxPrice: null });
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

`src/app/features/market/market-page/market-page.html`:

```html
<section class="app-market-page">
  <h1>Market</h1>

  <form [formGroup]="form" class="app-market-page__filters">
    <app-text-field label="Recherche" formControlName="search" placeholder="Nom du jeu..." />
    <app-select-field label="Genre" [options]="genreOptions()" formControlName="genreId" />
    <app-select-field label="Plateforme" [options]="platformOptions()" formControlName="platform" />

    <div class="app-market-page__price-range">
      <label for="market-min-price">Prix min</label>
      <input id="market-min-price" type="number" formControlName="minPrice" />
      <label for="market-max-price">Prix max</label>
      <input id="market-max-price" type="number" formControlName="maxPrice" />
    </div>

    <app-button type="button" variant="secondary" (pressed)="reset()">Réinitialiser</app-button>
  </form>

  @if (loading()) {
    <p>Chargement...</p>
  } @else if (listings().length === 0) {
    <p>Aucune annonce ne correspond à ces critères.</p>
  } @else {
    <div class="app-market-page__grid">
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

    <div class="app-market-page__pagination">
      <app-button type="button" [disabled]="page() === 0" (pressed)="goToPage(page() - 1)">Précédent</app-button>
      <span>Page {{ page() + 1 }} sur {{ totalPages() }}</span>
      <app-button type="button" [disabled]="page() + 1 >= totalPages()" (pressed)="goToPage(page() + 1)">
        Suivant
      </app-button>
    </div>
  }
</section>
```

`src/app/features/market/market-page/market-page.css`:

```css
.app-market-page__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: flex-end;
  margin-bottom: var(--space-4);
}

.app-market-page__price-range {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.app-market-page__price-range input {
  font-family: var(--font-body);
  padding: var(--space-2);
  border: 2px solid var(--color-navy);
  border-radius: var(--radius);
}

.app-market-page__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.app-market-page__pagination {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `MarketPage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/market/market-page` and stop.

---

### Task 7: ListingDetailPage ✅ DONE (staged, not committed; reviewed, approved — RxJS error-propagation empirically verified)

**Files:**
- Create: `src/app/features/market/listing-detail-page/listing-detail-page.ts`
- Create: `src/app/features/market/listing-detail-page/listing-detail-page.html`
- Create: `src/app/features/market/listing-detail-page/listing-detail-page.css`
- Test: `src/app/features/market/listing-detail-page/listing-detail-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/market/listing-detail-page/listing-detail-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ListingDetailPage } from './listing-detail-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { GameService } from '../../../core/catalog/game.service';
import { GameResponse, ListingResponse } from '../../../core/catalog/catalog.types';

function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: 'l1',
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

function makeGame(overrides: Partial<GameResponse> = {}): GameResponse {
  return {
    id: 'g1',
    name: 'Kingdom Hearts',
    description: 'A game about hearts.',
    genres: ['RPG'],
    publisher: 'Square Enix',
    developer: 'Square Enix',
    platform: 'PlayStation 2',
    releaseDate: '2002-03-28',
    coverURL: null,
    weightGrams: 150,
    ...overrides,
  };
}

describe('ListingDetailPage', () => {
  let listingService: { getById: ReturnType<typeof vi.fn> };
  let gameService: { getById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    listingService = { getById: vi.fn() };
    gameService = { getById: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ListingService, useValue: listingService },
        { provide: GameService, useValue: gameService },
      ],
    });
  });

  it('fetches the listing then the game, and populates both signals', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    expect(listingService.getById).toHaveBeenCalledWith('l1');
    expect(gameService.getById).toHaveBeenCalledWith('g1');
    expect(fixture.componentInstance.listing()?.gameName).toBe('Kingdom Hearts');
    expect(fixture.componentInstance.game()?.publisher).toBe('Square Enix');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('shows a not-found state when the listing fetch fails', () => {
    listingService.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'missing');
    fixture.detectChanges();

    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Annonce introuvable.');
  });

  it('addToCart() is present and callable but does nothing observable this wave', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    expect(() => fixture.componentInstance.addToCart()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './listing-detail-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/market/listing-detail-page/listing-detail-page.ts`:

```ts
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { catchError, of as rxOf, switchMap } from 'rxjs';
import { ListingService } from '../../../core/catalog/listing.service';
import { GameService } from '../../../core/catalog/game.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { GameResponse, ListingResponse } from '../../../core/catalog/catalog.types';

@Component({
  selector: 'app-listing-detail-page',
  imports: [CurrencyPipe, Badge, Button],
  templateUrl: './listing-detail-page.html',
  styleUrl: './listing-detail-page.css',
})
export class ListingDetailPage implements OnInit {
  private readonly listingService = inject(ListingService);
  private readonly gameService = inject(GameService);

  readonly id = input.required<string>();

  readonly listing = signal<ListingResponse | null>(null);
  readonly game = signal<GameResponse | null>(null);
  readonly notFound = signal(false);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.listingService
      .getById(this.id())
      .pipe(
        switchMap((listing) => {
          this.listing.set(listing);
          return this.gameService.getById(listing.gameId);
        }),
        catchError(() => {
          this.notFound.set(true);
          return rxOf(null);
        }),
      )
      .subscribe((game) => {
        this.game.set(game);
        this.loading.set(false);
      });
  }

  addToCart(): void {
    // Intentionally a no-op this wave — wired up once the cart service exists
    // (confirmed with the project owner: the button should exist and be clickable
    // now, not disabled, even though it does nothing yet).
  }
}
```

`src/app/features/market/listing-detail-page/listing-detail-page.html`:

```html
@if (loading()) {
  <p>Chargement...</p>
} @else if (notFound()) {
  <p class="app-listing-detail__error">Annonce introuvable.</p>
} @else if (listing() && game()) {
  <article class="app-listing-detail">
    <img
      class="app-listing-detail__image"
      [src]="listing()!.imageUrls[0] ?? game()!.coverURL ?? 'images/plusicon.svg'"
      [alt]="game()!.name"
    />

    <div class="app-listing-detail__info">
      @if (listing()!.featured) {
        <app-badge variant="featured" label="Pépite" />
      } @else if (listing()!.status === 'SOLD') {
        <app-badge variant="sold" label="Vendu" />
      }

      <h1>{{ game()!.name }}</h1>
      <p class="app-listing-detail__price">{{ listing()!.price | currency: 'EUR' }}</p>
      <p>{{ game()!.description }}</p>

      <dl class="app-listing-detail__meta">
        <dt>Genres</dt>
        <dd>{{ game()!.genres.join(', ') || 'Non renseigné' }}</dd>
        <dt>Éditeur</dt>
        <dd>{{ game()!.publisher }}</dd>
        <dt>Développeur</dt>
        <dd>{{ game()!.developer }}</dd>
        <dt>Plateforme</dt>
        <dd>{{ game()!.platform }}</dd>
        <dt>Date de sortie</dt>
        <dd>{{ game()!.releaseDate }}</dd>
        <dt>Boutique</dt>
        <dd>{{ listing()!.shopName }}</dd>
      </dl>

      <app-button (pressed)="addToCart()">Ajouter au panier</app-button>
    </div>
  </article>
}
```

`src/app/features/market/listing-detail-page/listing-detail-page.css`:

```css
.app-listing-detail {
  display: flex;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.app-listing-detail__image {
  width: 240px;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border: 2px solid var(--color-navy);
}

.app-listing-detail__info {
  flex: 1;
  min-width: 240px;
}

.app-listing-detail__price {
  font-weight: 700;
  font-size: 1.25rem;
}

.app-listing-detail__meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-1) var(--space-3);
  margin: var(--space-4) 0;
}

.app-listing-detail__meta dt {
  font-weight: 700;
}

.app-listing-detail__meta dd {
  margin: 0;
}

.app-listing-detail__error {
  color: var(--color-accent);
  font-weight: 700;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ListingDetailPage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/market/listing-detail-page` and stop.

---

### Task 8: Route wiring ✅ DONE (staged, not committed; build succeeds with 3 new lazy chunks, 89/89 tests pass)

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Replace the three PageStub route entries**

In `src/app/app.routes.ts`, replace exactly these three route objects:

```ts
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
```

with:

```ts
  {
    path: '',
    loadComponent: () => import('./features/home/home-page/home-page').then((m) => m.HomePage),
  },
  {
    path: 'market',
    loadComponent: () => import('./features/market/market-page/market-page').then((m) => m.MarketPage),
  },
  {
    path: 'listings/:id',
    loadComponent: () =>
      import('./features/market/listing-detail-page/listing-detail-page').then((m) => m.ListingDetailPage),
  },
```

Every other route (`profile`, `orders`, `my-shop`, `my-shop/orders`, `cart`, `checkout`,
`checkout/success`, `checkout/cancel`, `admin/listings`, the wildcard, and all `auth/*`
routes) stays exactly as-is — they still use `PageStub` or their own already-built
components. Do NOT remove the `PageStub` import at the top of the file — it's still used
by the remaining stub routes.

- [ ] **Step 2: Verify the app builds**

Run: `npx ng build`
Expected: succeeds, with three new lazy chunks (`home-page`, `market-page`,
`listing-detail-page`) alongside the five existing auth-page chunks from the foundation
wave.

- [ ] **Step 3: Run the full test suite**

Run: `npx ng test --watch=false`
Expected: PASS — every test from every prior task (foundation wave + this plan) still
green.

- [ ] **Step 4: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage: `git add src/app/app.routes.ts`
and stop.

---

### Task 9: Final verification ✅ DONE (21 files staged exactly matching the plan, nothing committed — frontend plan complete)

**Files:** none (verification only).

- [ ] **Step 1: Full production build**

Run: `npx ng build`
Expected: succeeds cleanly.

- [ ] **Step 2: Full test suite**

Run: `npx ng test --watch=false`
Expected: PASS — full suite green (foundation wave's 67 tests + this plan's new tests).

- [ ] **Step 3: Confirm nothing is committed**

Run: `git status`
Expected: all new/modified files from this plan show as staged — nothing committed, per
the project owner's standing preference.

---

## Self-review

**Spec coverage:**
- Home's three sections, independent loading, empty states — Task 5.
- Market's search/genre/platform/price filters, debounce, pagination, reset — Task 6.
- Listing detail's full game info + inert "Ajouter au panier" button — Task 7.
- Route wiring replacing exactly the three intended stubs, nothing else — Task 8.
- Service layer matching the backend contract exactly (`search`/`genreId`/`platform`/
  `minPrice`/`maxPrice` param names, `Page<T>` shape, `gameId` on `ListingResponse`) —
  Tasks 1-4, and consistent with the companion backend plan's exact query param names.

**Out of scope (per spec, unchanged):** no cart wiring, no shop page/link, no reviews,
no infinite scroll, no client-side filtering fallback.

**Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.

**Type consistency:** `ListingFilters` (Task 1) fields (`search`, `genreId`, `platform`,
`minPrice`, `maxPrice`) are used identically in `ListingService.search()` (Task 2) and
`MarketPage`'s form group (Task 6) — same names, same nullability. `ListingResponse`/
`GameResponse`/`GenreResponse`/`Page<T>` (Task 1) match the companion backend plan's
`ListingResponse`/`GameResponse`/`GenreResponse` DTOs and Spring `Page` JSON shape
exactly (field-for-field).
