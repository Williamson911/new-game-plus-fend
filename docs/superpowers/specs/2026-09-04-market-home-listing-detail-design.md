# Market, Home & Listing Detail — design

Date: 2026-09-04
Status: Approved, ready for implementation plan

## Context

This is Wave 1 of the roadmap laid out in the foundation spec
(`2026-09-04-angular-frontend-foundation-design.md`): the first real feature pages,
replacing three `PageStub` placeholders — `/` (Home), `/market`, and `/listings/:id` —
with working pages backed by the real `new-game-plus` backend.

Two pages, two purposes, kept deliberately separate (confirmed during brainstorming,
matching the maquette's actual layout more precisely than a single merged page would):

- **Home (`/`)** — the curated landing experience: three sections ("Derniers arrivages",
  "Pépites", "Petits prix") pulled from the backend's existing curation endpoints, no
  search or filters.
- **Market (`/market`)** — the full paginated catalogue with search and filters (genre,
  platform, price range).
- **Listing detail (`/listings/:id`)** — a single annonce's full information.

This wave also requires a companion **backend** change (separate repo, `new-game-plus`,
already specified: `2026-09-04-listing-search-filter-design.md`) — `GET /listings`
gains `search`/`genreId`/`platform`/`minPrice`/`maxPrice` query params, a new
`GET /games/platforms` endpoint appears, and `ListingResponse` gains `gameId`. This
frontend spec assumes that backend work is done first; the frontend has nothing to fall
back on if it isn't (there's no client-side filtering fallback — see brainstorming
decision below).

## Goals

- Replace the three `PageStub` routes with real pages backed by the live backend.
- Home shows the three curated sections from the maquette using the shared `Card`
  component built in the foundation wave.
- Market lets a buyer search by game name and filter by genre/platform/price, with
  pagination.
- Listing detail shows full game information for one annonce, with an "Ajouter au
  panier" button present and clickable but intentionally inert this wave (no cart
  service exists yet — wired up in the cart/checkout wave).

## Non-goals

- No client-side-only filtering fallback — filtering is entirely server-side via the new
  backend query params (confirmed during brainstorming: the backend gets the real
  capability added first, rather than faking it in the browser).
- No "add to cart" functionality — the button exists but does nothing (no `CartService`
  exists yet).
- No shop page / "voir la boutique" link — shops aren't routed yet; the shop name is
  shown as plain text on the listing detail page.
- No reviews, no "similar listings," no wishlist/favorites on the detail page.
- No infinite scroll — Market uses classic prev/next pagination matching `Page<T>`'s
  shape from the backend.

## Backend contract (recap, from the companion backend spec)

- `GET /listings/latest?limit=`, `/listings/cheap?limit=`, `/listings/featured?limit=` —
  unchanged, return `List<ListingResponse>` (no pagination wrapper), used by Home.
- `GET /listings?search=&genreId=&platform=&minPrice=&maxPrice=&page=&size=` — all
  params optional, returns a Spring `Page<ListingResponse>` JSON object:
  ```ts
  interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number; // current page index, 0-based
    size: number;
  }
  ```
- `GET /listings/{id}` → single `ListingResponse`.
- `ListingResponse`: `{ id, gameId, gameName, shopName, price, status, featured, imageUrls }`.
- `GET /games/{id}` → `GameResponse`:
  `{ id, name, description, genres: string[], publisher, developer, platform, releaseDate, coverURL, weightGrams }`.
- `GET /games/platforms` → `string[]` (distinct platform values, for the filter dropdown).
- `GET /genres` → `GenreResponse[]`: `{ id, name }[]` (for the genre filter dropdown).
- All of the above are public `GET` endpoints (no auth token required) — already
  `permitAll` in the backend's `SecurityConfig`.

## Architecture

### New core service layer

```
src/app/core/catalog/
  catalog.types.ts       # ListingResponse, GameResponse, GenreResponse, Page<T>, ListingFilters
  listing.service.ts     # getLatest, getFeatured, getCheap, search, getById
  game.service.ts        # getById, getPlatforms
  genre.service.ts       # getAll
```

`catalog.types.ts`:

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

`ListingService`:

```ts
@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly http = inject(HttpClient);

  getLatest(limit = 8): Observable<ListingResponse[]> { ... }   // GET /listings/latest?limit=
  getFeatured(limit = 8): Observable<ListingResponse[]> { ... } // GET /listings/featured?limit=
  getCheap(limit = 8): Observable<ListingResponse[]> { ... }    // GET /listings/cheap?limit=
  getById(id: string): Observable<ListingResponse> { ... }      // GET /listings/{id}

  search(filters: Partial<ListingFilters>, page: number, size = 12): Observable<Page<ListingResponse>> {
    // GET /listings — builds HttpParams from only the non-empty/non-null filter fields,
    // plus page/size. Never sends a param for an empty string or null value.
  }
}
```

`GameService.getById(id)` → `GET /games/{id}`; `GameService.getPlatforms()` →
`GET /games/platforms`. `GenreService.getAll()` → `GET /genres`.

All three services are thin `HttpClient` wrappers, no state — consistent with how
`AuthService` in the foundation wave separates HTTP calls (via `HttpClient`) from
reactive state (via signals) for the pieces that need it; these three services need no
signal state of their own, since each page owns its own local loading/data state.

### Pages

```
src/app/features/home/home-page/
src/app/features/market/market-page/
src/app/features/market/listing-detail-page/
```

## Page designs

### HomePage (`/`)

On construction, fires `getLatest()`, `getFeatured()`, `getCheap()` in parallel (each
into its own signal, not chained — a slow section shouldn't block the others from
appearing). Each section:

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
```

Three such sections ("Derniers arrivages" / latest, "Pépites" / featured, "Petits prix"
/ cheap), each with its own loading signal so one slow request doesn't block the others
from rendering as they arrive.

### MarketPage (`/market`)

Reactive Form with 5 controls (`search`, `genreId`, `platform`, `minPrice`, `maxPrice`),
plus a `page` signal (0-based, reset to `0` whenever the form's value changes).

- `search`: `app-text-field` (reuses the foundation wave's `TextField`).
- `genreId`, `platform`: `app-select-field` (reuses `SelectField`), options loaded once
  on init from `GenreService.getAll()` / `GameService.getPlatforms()`, each prefixed
  with an empty-value "Tous les genres" / "Toutes les plateformes" option meaning "no
  filter."
- `minPrice`, `maxPrice`: plain native `<input type="number" formControlName="...">`
  — Angular's built-in `NumberValueAccessor` handles these directly; `TextField` doesn't
  support `type="number"` and doesn't need to be extended just for this (the two
  purpose-built numeric inputs here are simple enough not to warrant a new shared
  component).

`form.valueChanges.pipe(debounceTime(300), distinctUntilChanged(isEqual))` (or a
`toSignal`-based equivalent) drives refetching: any filter change resets `page` to `0`
and triggers a new `ListingService.search(...)` call. Changing `page` alone (via
pagination controls) does **not** go through the debounce — it refetches immediately
with the current filter values.

Results render in the same `Card` grid pattern as Home, plus pagination controls below
(Précédent / page X sur Y / Suivant, using the shared `Button` component, `Précédent`
disabled on page 0, `Suivant` disabled on the last page per `Page.totalPages`).

A "Réinitialiser" button resets the form to its empty defaults (clears all filters).

### ListingDetailPage (`/listings/:id`)

Route param `:id` bound via `withComponentInputBinding()` (already configured in
`app.config.ts`) as a component `input.required<string>()` — same mechanism already used
for query-param binding on `ConfirmPage`/`ResetPasswordPage` in the foundation wave;
path params bind the same way.

On init: `ListingService.getById(id)`, then chains into `GameService.getById(listing.gameId)`
once the listing resolves (via `switchMap`) to get full game details. Renders:

- Cover image: first of `listing.imageUrls`, falling back to `game.coverURL`, falling
  back to the same placeholder icon `Card` uses (`images/plusicon.svg`) if both are
  null.
- Title (`game.name`), price, featured/sold badge (reusing `Badge`).
- Description, genres (comma-joined or as a row of small `Badge`-styled chips — the
  latter reuses `Badge`'s visual language, but `Badge`'s `variant` type is currently
  `'featured' | 'sold'` only, so genre chips use a plain `<span>` with the same CSS class
  conventions rather than misusing `Badge`'s variant semantics for an unrelated purpose).
- Publisher, developer, platform, release date.
- Shop name (plain text, not a link — no shop page exists yet).
- "Ajouter au panier" button (shared `Button`), `(pressed)` handler present but
  deliberately empty — the button is real and clickable, it just does nothing this wave.
- Not-found handling: a `404`/error from `getById` shows "Annonce introuvable" instead
  of a blank page.

## Routing changes

In `src/app/app.routes.ts`, replace three existing `PageStub` entries with lazy-loaded
real pages (everything else — guards, other stub routes — untouched):

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

## Testing

Each service (`ListingService`, `GameService`, `GenreService`) gets `HttpTestingController`-based
tests verifying the exact URL/params built for each method, mirroring the pattern
established for `AuthService` in the foundation wave.

Each page component gets tests using the existing project conventions: `HttpTestingController`
for HTTP, `provideRouter([])` where `RouterLink`/route-param binding is involved, signal
assertions on loading/data/empty states. `MarketPage`'s filter-debounce behavior is
tested with Vitest's fake timers (`vi.useFakeTimers()` / `vi.advanceTimersByTime(300)`)
rather than real delays.

## Open assumptions

- **Page size**: Market uses `size=12` per page (a 3-4 column grid × 3-4 rows,
  reasonable for the card dimensions already established) — not specified in mockups,
  chosen as a round number; easy to change later, not a contract concern (the backend
  accepts any `size` via standard Spring `Pageable`).
- **Debounce duration**: 300ms for search-as-you-type, a conventional default; no design
  requirement pins this down.
- **Genre chips on the detail page**: styled as plain spans reusing `Badge`'s CSS
  *pattern* (padding/radius/color scale) rather than the `Badge` *component*, since
  `Badge`'s `variant` prop is semantically about listing state (featured/sold), not
  genre tagging — reusing it for genres would be a type/semantics mismatch, not a
  visual one.
