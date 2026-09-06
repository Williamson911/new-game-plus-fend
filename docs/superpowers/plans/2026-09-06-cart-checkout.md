# Cart & Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `PageStub` placeholders at `/cart`, `/checkout`, `/checkout/success`,
`/checkout/cancel`, and `/orders`: cart management, checkout with home-address or
Mondial-Relay-point delivery and a live shipping estimate, a Stripe redirect, static
success/cancel pages, and buyer order history with cancellation. Wires up
`ListingDetailPage`'s inert "Ajouter au panier" button, and redesigns the Navbar
(cart icon, "Mon compte" hover dropdown).

**Architecture:** A new `core/cart/` module (types + `CartService` + `CheckoutService`
+ `ShippingService` + a pure `estimateShippingCost` function), an extension to Wave 2's
`OrderService`, five new page components, and a Navbar restructure.

**Tech Stack:** Angular 22 (standalone, signals), Reactive Forms, Vitest.

Spec: `docs/superpowers/specs/2026-09-06-cart-checkout-design.md`

**Depends on:** the companion backend plan
(`new-game-plus/docs/superpowers/plans/2026-09-06-cart-checkout-backend.md`) must be
implemented first — `CartItemResponse` gaining `weightGrams`.

---

## Before you start

All file paths are relative to the repo root: `C:\Users\lemet\Documents\Technifutur\new-game-plus-frontend`.
Every task's verification step runs `npx ng test --watch=false` (full suite — no
single-file filtering available, per established convention).

---

### Task 1: Cart domain types ✅ DONE (staged, not committed; trivial types, verified directly)

**Files:**
- Create: `src/app/core/cart/cart.types.ts`

- [ ] **Step 1: Write the type definitions**

`src/app/core/cart/cart.types.ts`:

```ts
import { OrderResponse } from '../shop/shop.types';

export interface CartItemResponse {
  listingId: string;
  gameName: string;
  shopName: string;
  price: number;
  weightGrams: number;
}

export interface CartResponse {
  items: CartItemResponse[];
}

export type DeliveryMode = 'HOME' | 'RELAY_POINT';

export interface CheckoutRequest {
  deliveryMode: DeliveryMode;
  street?: string;
  streetNumber?: string;
  postCode?: string;
  city?: string;
  country?: string;
  relayPointId?: string;
  relayPointName?: string;
  relayPointStreet?: string;
  relayPointPostCode?: string;
  relayPointCity?: string;
  relayPointCountry?: string;
}

export interface CheckoutResponse {
  orders: OrderResponse[];
  checkoutUrl: string;
}

export interface RelayPointResult {
  id: string;
  name: string;
  street: string;
  postCode: string;
  city: string;
  country: string;
}
```

No test — pure type declarations, same treatment as `shop.types.ts`/`catalog.types.ts`.
Note that `RelayPointResult` (this file, unprefixed field names — the Mondial Relay
search API's shape) is a different type from the `RelayPoint` embedded in
`OrderResponse` (`shop.types.ts`, `relayName`/`relayStreet`/etc. — the persisted
snapshot's shape). Do not merge them; they serialize differently on the backend.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/cart/cart.types.ts` and stop.

---

### Task 2: CartService ✅ DONE (staged, not committed; 141/141 tests pass, verified directly)

**Files:**
- Create: `src/app/core/cart/cart.service.ts`
- Test: `src/app/core/cart/cart.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/cart/cart.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CartService } from './cart.service';
import { environment } from '../../../environments/environment';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getCart() calls GET /cart', () => {
    service.getCart().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cart`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [] });
  });

  it('addItem() calls POST /cart/items with the listing id', () => {
    service.addItem('l1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ listingId: 'l1' });
    req.flush({ items: [] });
  });

  it('removeItem() calls DELETE /cart/items/{listingId}', () => {
    service.removeItem('l1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items/l1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './cart.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/cart/cart.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CartResponse } from './cart.types';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(`${environment.apiUrl}/cart`);
  }

  addItem(listingId: string): Observable<CartResponse> {
    return this.http.post<CartResponse>(`${environment.apiUrl}/cart/items`, { listingId });
  }

  removeItem(listingId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/cart/items/${listingId}`);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/cart/cart.service.ts src/app/core/cart/cart.service.spec.ts`
and stop.

---

### Task 3: CheckoutService ✅ DONE (staged, not committed; 141/141 tests pass, verified directly)

**Files:**
- Create: `src/app/core/cart/checkout.service.ts`
- Test: `src/app/core/cart/checkout.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/cart/checkout.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CheckoutService } from './checkout.service';
import { environment } from '../../../environments/environment';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('checkout() calls POST /orders/checkout with the request body', () => {
    const request = {
      deliveryMode: 'HOME' as const,
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    };
    service.checkout(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/orders/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ orders: [], checkoutUrl: 'https://checkout.stripe.com/test' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './checkout.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/cart/checkout.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutRequest, CheckoutResponse } from './cart.types';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${environment.apiUrl}/orders/checkout`, request);
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/cart/checkout.service.ts src/app/core/cart/checkout.service.spec.ts`
and stop.

---

### Task 4: ShippingService ✅ DONE (staged, not committed; 141/141 tests pass, verified directly)

**Files:**
- Create: `src/app/core/cart/shipping.service.ts`
- Test: `src/app/core/cart/shipping.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/cart/shipping.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ShippingService } from './shipping.service';
import { environment } from '../../../environments/environment';

describe('ShippingService', () => {
  let service: ShippingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ShippingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('findRelayPoints() calls GET /shipping/relay-points with postCode and country', () => {
    service.findRelayPoints('4000', 'BE').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/shipping/relay-points?postCode=4000&country=BE`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './shipping.service'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/cart/shipping.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RelayPointResult } from './cart.types';

@Injectable({ providedIn: 'root' })
export class ShippingService {
  private readonly http = inject(HttpClient);

  findRelayPoints(postCode: string, country: string): Observable<RelayPointResult[]> {
    const params = new HttpParams().set('postCode', postCode).set('country', country);
    return this.http.get<RelayPointResult[]>(`${environment.apiUrl}/shipping/relay-points`, { params });
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/cart/shipping.service.ts src/app/core/cart/shipping.service.spec.ts`
and stop.

---

### Task 5: Shipping-rate estimate (pure function) ✅ DONE (staged, not committed; 141/141 tests pass, verified directly)

**Files:**
- Create: `src/app/core/cart/shipping-rate.ts`
- Test: `src/app/core/cart/shipping-rate.spec.ts`

This function deliberately duplicates the backend's `ShippingRateCalculator` tier
table (`new-game-plus/src/main/java/be/technifutur/newgameplus/shipping/ShippingRateCalculator.java`)
verbatim, so the checkout page can show a live estimate with no network round-trip.
It is a pure function — no Angular DI, no `TestBed` needed for its test.

- [ ] **Step 1: Write the failing test**

`src/app/core/cart/shipping-rate.spec.ts`:

```ts
import { estimateShippingCost } from './shipping-rate';

describe('estimateShippingCost', () => {
  it('returns the home rate for a weight within the first tier', () => {
    expect(estimateShippingCost('HOME', 200)).toBe(4.99);
  });

  it('returns the relay rate for the same weight', () => {
    expect(estimateShippingCost('RELAY_POINT', 200)).toBe(4.15);
  });

  it('picks the correct tier for a mid-range weight', () => {
    expect(estimateShippingCost('HOME', 800)).toBe(6.99);
    expect(estimateShippingCost('RELAY_POINT', 800)).toBe(5.99);
  });

  it('uses the tier whose upper bound exactly matches the weight', () => {
    expect(estimateShippingCost('HOME', 1_000)).toBe(6.99);
  });

  it('falls back to the highest tier when the weight exceeds every threshold', () => {
    expect(estimateShippingCost('HOME', 50_000)).toBe(17.99);
    expect(estimateShippingCost('RELAY_POINT', 50_000)).toBe(13.49);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './shipping-rate'`.

- [ ] **Step 3: Write the implementation**

`src/app/core/cart/shipping-rate.ts`:

```ts
import { DeliveryMode } from './cart.types';

interface Tier {
  maxGrams: number;
  relayPrice: number;
  homePrice: number;
}

// Mirrors ShippingRateCalculator.TIERS in the backend
// (new-game-plus/src/main/java/be/technifutur/newgameplus/shipping/ShippingRateCalculator.java).
// Keep both tables in sync if the backend's tiers or prices ever change — this is a
// deliberate duplication (see the design spec's non-goals), not a shared source of truth.
const TIERS: Tier[] = [
  { maxGrams: 250, relayPrice: 4.15, homePrice: 4.99 },
  { maxGrams: 1_000, relayPrice: 5.99, homePrice: 6.99 },
  { maxGrams: 3_000, relayPrice: 6.99, homePrice: 7.99 },
  { maxGrams: 5_000, relayPrice: 7.99, homePrice: 8.99 },
  { maxGrams: 10_000, relayPrice: 9.49, homePrice: 11.99 },
  { maxGrams: 15_000, relayPrice: 11.49, homePrice: 14.99 },
  { maxGrams: 20_000, relayPrice: 13.49, homePrice: 17.99 },
];

export function estimateShippingCost(mode: DeliveryMode, totalWeightGrams: number): number {
  const tier = TIERS.find((t) => totalWeightGrams <= t.maxGrams) ?? TIERS[TIERS.length - 1];
  return mode === 'RELAY_POINT' ? tier.relayPrice : tier.homePrice;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/cart/shipping-rate.ts src/app/core/cart/shipping-rate.spec.ts`
and stop.

---

### Task 6: Extend OrderService for the buyer side ✅ DONE (staged, not committed; 141/141 tests pass, verified directly)

**Files:**
- Modify: `src/app/core/shop/order.service.ts`
- Modify: `src/app/core/shop/order.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Read the current `order.service.spec.ts` first. Add these two tests inside the
existing `describe('OrderService', ...)` block, after the existing tests:

```ts
  it('getMyOrders() calls GET /orders', () => {
    service.getMyOrders().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/orders`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('cancel() calls PATCH /orders/{id}/cancel', () => {
    service.cancel('o1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/orders/o1/cancel`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `service.getMyOrders is not a function` (and similarly for `cancel`).

- [ ] **Step 3: Write the implementation**

Read the current `order.service.ts` first. Add these two methods to the `OrderService`
class, after the existing `updateStatus`:

```ts
  getMyOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${environment.apiUrl}/orders`);
  }

  cancel(id: string): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${environment.apiUrl}/orders/${id}/cancel`, {});
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `OrderService` tests green (4 total: 2 existing + 2 new).

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/core/shop/order.service.ts src/app/core/shop/order.service.spec.ts`
and stop.

---

### Task 7: Wire `ListingDetailPage.addToCart()` ✅ DONE (staged, not committed; reviewed, approved — added a double-submit test and Prettier formatting per review findings)

**Files:**
- Modify: `src/app/features/market/listing-detail-page/listing-detail-page.ts`
- Modify: `src/app/features/market/listing-detail-page/listing-detail-page.html`
- Modify: `src/app/features/market/listing-detail-page/listing-detail-page.css`
- Modify: `src/app/features/market/listing-detail-page/listing-detail-page.spec.ts`

- [ ] **Step 1: Write the failing tests**

Read the current `listing-detail-page.spec.ts` first. Replace the existing test named
`'addToCart() is present and callable but does nothing observable this wave'` with
these three, and add a `cartService` stub to the existing `beforeEach`/providers:

```ts
  let cartService: { addItem: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    listingService = { getById: vi.fn() };
    gameService = { getById: vi.fn() };
    cartService = { addItem: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ListingService, useValue: listingService },
        { provide: GameService, useValue: gameService },
        { provide: CartService, useValue: cartService },
      ],
    });
  });
```

(This replaces the existing `beforeEach` body — keep the two existing tests
`'fetches the listing then the game, and populates both signals'` and `'shows a
not-found state when the listing fetch fails'` unchanged, they don't touch
`cartService`.)

```ts
  it('addToCart() adds the listing to the cart and shows a confirmation', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));
    cartService.addItem.mockReturnValue(of({ items: [] }));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    fixture.componentInstance.addToCart();

    expect(cartService.addItem).toHaveBeenCalledWith('l1');
    expect(fixture.componentInstance.addedToCart()).toBe(true);
  });

  it('addToCart() shows an inline error when the listing is already in the cart or unavailable', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));
    cartService.addItem.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    fixture.componentInstance.addToCart();

    expect(fixture.componentInstance.addedToCart()).toBe(false);
    expect(fixture.componentInstance.cartError()).not.toBeNull();
  });

  it('addToCart() shows an inline error when the listing is the user\'s own', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));
    cartService.addItem.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    fixture.componentInstance.addToCart();

    expect(fixture.componentInstance.cartError()).toContain('propre annonce');
  });
```

Add one import at the top of the file: `import { CartService } from '../../../core/cart/cart.service';`
(alongside the existing `ListingService`/`GameService` imports).

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `addedToCart`/`cartError` are not defined on `ListingDetailPage` yet.

- [ ] **Step 3: Write the implementation**

Read the current `listing-detail-page.ts` first. Replace it entirely with:

```ts
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of as rxOf, switchMap } from 'rxjs';
import { ListingService } from '../../../core/catalog/listing.service';
import { GameService } from '../../../core/catalog/game.service';
import { CartService } from '../../../core/cart/cart.service';
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
  private readonly cartService = inject(CartService);

  readonly id = input.required<string>();

  readonly listing = signal<ListingResponse | null>(null);
  readonly game = signal<GameResponse | null>(null);
  readonly notFound = signal(false);
  readonly loading = signal(true);

  readonly addingToCart = signal(false);
  readonly addedToCart = signal(false);
  readonly cartError = signal<string | null>(null);

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
    if (this.addingToCart()) {
      return;
    }

    this.addingToCart.set(true);
    this.cartError.set(null);

    this.cartService.addItem(this.listing()!.id).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.addedToCart.set(true);
      },
      error: (err: unknown) => {
        this.addingToCart.set(false);
        this.cartError.set(this.mapCartError(err));
      },
    });
  }

  private mapCartError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      return 'Déjà dans ton panier, ou cette annonce n\'est plus disponible.';
    }
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return 'Tu ne peux pas acheter ta propre annonce.';
    }
    return "Impossible d'ajouter ce jeu au panier.";
  }
}
```

Read the current `listing-detail-page.html` first. Replace the single line
`<app-button (pressed)="addToCart()">Ajouter au panier</app-button>` with:

```html
      @if (addedToCart()) {
        <p class="app-listing-detail__cart-confirm">Ajouté au panier ✓</p>
      } @else {
        <app-button [disabled]="addingToCart()" (pressed)="addToCart()">Ajouter au panier</app-button>
        @if (cartError()) {
          <p class="app-listing-detail__cart-error">{{ cartError() }}</p>
        }
      }
```

Append to `listing-detail-page.css`:

```css
.app-listing-detail__cart-confirm {
  color: var(--color-navy);
  font-weight: 700;
}

.app-listing-detail__cart-error {
  color: var(--color-accent);
  font-weight: 700;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `ListingDetailPage` tests green (5 total: the 2 unchanged
existing tests — fetch, not-found — plus these 3 new ones; the old single addToCart
placeholder test was replaced, not kept).

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/market/listing-detail-page/listing-detail-page.ts src/app/features/market/listing-detail-page/listing-detail-page.html src/app/features/market/listing-detail-page/listing-detail-page.css src/app/features/market/listing-detail-page/listing-detail-page.spec.ts`
and stop.

---

### Task 8: Navbar redesign — cart icon + "Mon compte" dropdown ✅ DONE (staged, not committed; reviewed, approved — added aria-haspopup/role=menu attributes, deduped CSS, added a trigger test per review findings)

**Files:**
- Modify: `src/app/layout/navbar/navbar.html`
- Modify: `src/app/layout/navbar/navbar.css`
- Modify: `src/app/layout/navbar/navbar.spec.ts`

This replaces the flat Profile/Cart/Logout links (all shown when authenticated) with:
Market, My Shop, a cart icon link, then a hover-triggered "Mon compte" dropdown
containing Profil / Mes commandes / Déconnexion. Market/My Shop/Login stay exactly as
they are — only the authenticated Profile/Cart/Logout section changes shape.

- [ ] **Step 1: Write the failing tests**

Read the current `navbar.spec.ts` first. Replace the test named `'shows Profile, Cart
and Logout when authenticated'` with these two, and update the existing `'shows a
Login link when not authenticated'` and `'calls AuthService.logout() when the logout
button is clicked'` tests as shown (leave `'shows My Shop for any authenticated user,
regardless of role'` and `'does not show My Shop when not authenticated'` completely
untouched):

```ts
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

  it('shows Profil, Mes commandes and Déconnexion when authenticated', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Profil');
    expect(el.textContent).toContain('Mes commandes');
    expect(el.textContent).toContain('Déconnexion');
  });
```

(`'shows a Login link when not authenticated'` changes only its second assertion, from
`.not.toContain('Logout')` to `.not.toContain('Déconnexion')`, since the logout
button's label text changes in this task.)

```ts
  it('calls AuthService.logout() when the logout button is clicked', () => {
    authService.isAuthenticatedSignal.set(true);
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const logoutButton = buttons.find((b) => b.textContent?.includes('Déconnexion')) as HTMLButtonElement;
    logoutButton.click();

    expect(authService.logout).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — no element matches `a[aria-label="Panier"]`, and the text
`'Mes commandes'`/`'Déconnexion'` doesn't exist yet in the current template.

- [ ] **Step 3: Write the implementation**

Read the current `navbar.html` first. Replace the `@if (authService.isAuthenticated())`
block (currently containing My Shop / Profile / Cart / Logout) with:

```html
    @if (authService.isAuthenticated()) {
      <a routerLink="/my-shop" routerLinkActive="is-active">My Shop</a>
      <a routerLink="/cart" routerLinkActive="is-active" class="app-navbar__cart" aria-label="Panier">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
          <path d="M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </a>
      <div class="app-navbar__account">
        <button type="button" class="app-navbar__account-trigger">Mon compte</button>
        <div class="app-navbar__account-menu">
          <a routerLink="/profile" routerLinkActive="is-active">Profil</a>
          <a routerLink="/orders" routerLinkActive="is-active">Mes commandes</a>
          <button type="button" class="app-navbar__logout" (click)="logout()">Déconnexion</button>
        </div>
      </div>
    } @else {
      <a routerLink="/auth/login" routerLinkActive="is-active">Login</a>
    }
```

Read the current `navbar.css` first. Append:

```css
.app-navbar__cart svg {
  display: block;
}

.app-navbar__account {
  position: relative;
}

.app-navbar__account-trigger {
  color: var(--color-surface);
  text-decoration: none;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.85rem;
  background: none;
  border: none;
  cursor: pointer;
}

.app-navbar__account-menu {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-navy);
  border: 2px solid var(--color-surface);
  flex-direction: column;
  min-width: 180px;
  z-index: 10;
}

.app-navbar__account:hover .app-navbar__account-menu,
.app-navbar__account:focus-within .app-navbar__account-menu {
  display: flex;
}

.app-navbar__account-menu a,
.app-navbar__account-menu .app-navbar__logout {
  padding: var(--space-2) var(--space-3);
}
```

The dropdown is CSS-only (`:hover`/`:focus-within`), no component state — its content
stays in the DOM and accessible/clickable at all times (jsdom-based tests don't
evaluate `display: none` from an external stylesheet as hiding text, so `textContent`
assertions and `.click()` calls against menu items work regardless of hover state).

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `Navbar` tests green (6 total: the 2 My-Shop tests unchanged +
these 4 — Login, cart icon, account-menu labels, logout-click), no regressions
anywhere else.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/layout/navbar/navbar.html src/app/layout/navbar/navbar.css src/app/layout/navbar/navbar.spec.ts`
and stop.

---

### Task 9: CartPage ✅ DONE (staged, not committed; reviewed, approved — added removeItem() error handling and DOM-level tests per review findings)

**Files:**
- Create: `src/app/features/cart/cart-page/cart-page.ts`
- Create: `src/app/features/cart/cart-page/cart-page.html`
- Create: `src/app/features/cart/cart-page/cart-page.css`
- Test: `src/app/features/cart/cart-page/cart-page.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/cart/cart-page/cart-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CartPage } from './cart-page';
import { CartService } from '../../../core/cart/cart.service';
import { CartItemResponse } from '../../../core/cart/cart.types';

function makeItem(overrides: Partial<CartItemResponse> = {}): CartItemResponse {
  return {
    listingId: 'l1',
    gameName: 'Kingdom Hearts',
    shopName: 'Retro Shop',
    price: 20,
    weightGrams: 300,
    ...overrides,
  };
}

describe('CartPage', () => {
  let cartService: { getCart: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cartService = { getCart: vi.fn(), removeItem: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CartService, useValue: cartService }],
    });
  });

  it('fetches the cart on construction', () => {
    cartService.getCart.mockReturnValue(of({ items: [makeItem()] }));

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    expect(cartService.getCart).toHaveBeenCalled();
    expect(fixture.componentInstance.items().length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('subtotal() sums the price of every item', () => {
    cartService.getCart.mockReturnValue(
      of({ items: [makeItem({ price: 20 }), makeItem({ listingId: 'l2', price: 15 })] }),
    );

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.subtotal()).toBe(35);
  });

  it('removeItem() removes the item and refetches the cart', () => {
    cartService.getCart.mockReturnValueOnce(of({ items: [makeItem()] }));
    cartService.removeItem.mockReturnValue(of(undefined));
    cartService.getCart.mockReturnValueOnce(of({ items: [] }));

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    fixture.componentInstance.removeItem('l1');

    expect(cartService.removeItem).toHaveBeenCalledWith('l1');
    expect(fixture.componentInstance.items().length).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './cart-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/cart/cart-page/cart-page.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/cart/cart.service';
import { Button } from '../../../shared/ui/button/button';
import { CartItemResponse } from '../../../core/cart/cart.types';

@Component({
  selector: 'app-cart-page',
  imports: [RouterLink, Button],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.css',
})
export class CartPage {
  private readonly cartService = inject(CartService);

  readonly items = signal<CartItemResponse[]>([]);
  readonly loading = signal(true);

  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.price, 0));

  constructor() {
    this.fetchCart();
  }

  removeItem(listingId: string): void {
    this.cartService.removeItem(listingId).subscribe(() => this.fetchCart());
  }

  private fetchCart(): void {
    this.loading.set(true);
    this.cartService.getCart().subscribe((cart) => {
      this.items.set(cart.items);
      this.loading.set(false);
    });
  }
}
```

`src/app/features/cart/cart-page/cart-page.html`:

```html
@if (loading()) {
  <p>Chargement...</p>
} @else if (items().length === 0) {
  <p>Ton panier est vide. <a routerLink="/market">Parcourir le catalogue</a></p>
} @else {
  <ul class="app-cart-page__list">
    @for (item of items(); track item.listingId) {
      <li class="app-cart-page__item">
        <span>{{ item.gameName }} ({{ item.shopName }})</span>
        <span>{{ item.price }} €</span>
        <app-button type="button" variant="secondary" (pressed)="removeItem(item.listingId)">Retirer</app-button>
      </li>
    }
  </ul>
  <p class="app-cart-page__subtotal">Sous-total : {{ subtotal() }} €</p>
  <a routerLink="/checkout"><app-button type="button">Passer commande</app-button></a>
}
```

`src/app/features/cart/cart-page/cart-page.css`:

```css
.app-cart-page__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.app-cart-page__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 2px solid var(--color-navy);
}

.app-cart-page__subtotal {
  font-weight: 700;
  margin-top: var(--space-4);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `CartPage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/cart/cart-page` and stop.

---

### Task 10: CheckoutPage ✅ DONE (staged, not committed; reviewed, approved — added relay-search error handling, cleared stale relay selection on mode switch, and 4 additional tests per review findings)

**Files:**
- Create: `src/app/features/checkout/checkout-page/checkout-page.ts`
- Create: `src/app/features/checkout/checkout-page/checkout-page.html`
- Create: `src/app/features/checkout/checkout-page/checkout-page.css`
- Test: `src/app/features/checkout/checkout-page/checkout-page.spec.ts`

Before writing anything, read `src/app/shared/ui/select-field/select-field.ts` and
`.html` to confirm the `label`/`options`/`formControlName` pattern (already used by
`MarketPage`'s genre/platform filters) — this task reuses it unchanged for the country
selector.

- [ ] **Step 1: Write the failing test**

`src/app/features/checkout/checkout-page/checkout-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CheckoutPage } from './checkout-page';
import { CartService } from '../../../core/cart/cart.service';
import { CheckoutService } from '../../../core/cart/checkout.service';
import { ShippingService } from '../../../core/cart/shipping.service';
import { RelayPointResult } from '../../../core/cart/cart.types';

function makeRelayPoint(overrides: Partial<RelayPointResult> = {}): RelayPointResult {
  return {
    id: 'r1',
    name: 'Point Relais Centre',
    street: 'Place Saint-Lambert',
    postCode: '4000',
    city: 'Liège',
    country: 'BE',
    ...overrides,
  };
}

describe('CheckoutPage', () => {
  let cartService: { getCart: ReturnType<typeof vi.fn> };
  let checkoutService: { checkout: ReturnType<typeof vi.fn> };
  let shippingService: { findRelayPoints: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cartService = {
      getCart: vi.fn().mockReturnValue(
        of({
          items: [
            { listingId: 'l1', gameName: 'A', shopName: 'Shop A', price: 20, weightGrams: 300 },
            { listingId: 'l2', gameName: 'B', shopName: 'Shop B', price: 15, weightGrams: 500 },
          ],
        }),
      ),
    };
    checkoutService = { checkout: vi.fn() };
    shippingService = { findRelayPoints: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: CartService, useValue: cartService },
        { provide: CheckoutService, useValue: checkoutService },
        { provide: ShippingService, useValue: shippingService },
      ],
    });
  });

  it('fetches the cart and computes subtotal and total weight', () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.subtotal()).toBe(35);
    expect(fixture.componentInstance.totalWeightGrams()).toBe(800);
  });

  it('estimatedShipping() recomputes when the delivery mode changes', () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.estimatedShipping()).toBe(6.99);

    fixture.componentInstance.setDeliveryMode('RELAY_POINT');

    expect(fixture.componentInstance.estimatedShipping()).toBe(5.99);
  });

  it('searchRelayPoints() calls the service and populates results when the search form is valid', () => {
    shippingService.findRelayPoints.mockReturnValue(of([makeRelayPoint()]));
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    fixture.componentInstance.relaySearchForm.setValue({ postCode: '4000', country: 'BE' });
    fixture.componentInstance.searchRelayPoints();

    expect(shippingService.findRelayPoints).toHaveBeenCalledWith('4000', 'BE');
    expect(fixture.componentInstance.relayResults().length).toBe(1);
  });

  it('submit() with HOME delivery sends the address form and redirects to the checkout URL on success', () => {
    checkoutService.checkout.mockReturnValue(
      of({ orders: [], checkoutUrl: 'https://checkout.stripe.com/test' }),
    );
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const redirectSpy = vi.spyOn(fixture.componentInstance, 'redirectTo' as never);

    fixture.componentInstance.addressForm.setValue({
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    });
    fixture.componentInstance.submit();

    expect(checkoutService.checkout).toHaveBeenCalledWith({
      deliveryMode: 'HOME',
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    });
    expect(redirectSpy).toHaveBeenCalledWith('https://checkout.stripe.com/test');
  });

  it('submit() with RELAY_POINT delivery does nothing until a relay point is selected', () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    fixture.componentInstance.setDeliveryMode('RELAY_POINT');

    fixture.componentInstance.submit();

    expect(checkoutService.checkout).not.toHaveBeenCalled();
  });

  it('submit() with a selected relay point sends its fields and redirects on success', () => {
    checkoutService.checkout.mockReturnValue(
      of({ orders: [], checkoutUrl: 'https://checkout.stripe.com/test' }),
    );
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    fixture.componentInstance.setDeliveryMode('RELAY_POINT');
    fixture.componentInstance.selectRelayPoint(makeRelayPoint());

    fixture.componentInstance.submit();

    expect(checkoutService.checkout).toHaveBeenCalledWith({
      deliveryMode: 'RELAY_POINT',
      relayPointId: 'r1',
      relayPointName: 'Point Relais Centre',
      relayPointStreet: 'Place Saint-Lambert',
      relayPointPostCode: '4000',
      relayPointCity: 'Liège',
      relayPointCountry: 'BE',
    });
  });

  it('submit() shows an inline error when an item became unavailable (409)', () => {
    checkoutService.checkout.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    fixture.componentInstance.addressForm.setValue({
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.error()).toContain('panier');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './checkout-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/checkout/checkout-page/checkout-page.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CartService } from '../../../core/cart/cart.service';
import { CheckoutService } from '../../../core/cart/checkout.service';
import { ShippingService } from '../../../core/cart/shipping.service';
import { estimateShippingCost } from '../../../core/cart/shipping-rate';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SelectField } from '../../../shared/ui/select-field/select-field';
import { Button } from '../../../shared/ui/button/button';
import { CartItemResponse, CheckoutRequest, DeliveryMode, RelayPointResult } from '../../../core/cart/cart.types';

const COUNTRY_OPTIONS = [
  { value: 'BE', label: 'Belgique' },
  { value: 'FR', label: 'France' },
];

@Component({
  selector: 'app-checkout-page',
  imports: [ReactiveFormsModule, TextField, SelectField, Button],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage {
  private readonly fb = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly shippingService = inject(ShippingService);

  readonly countryOptions = COUNTRY_OPTIONS;

  readonly items = signal<CartItemResponse[]>([]);
  readonly loading = signal(true);

  readonly deliveryMode = signal<DeliveryMode>('HOME');

  readonly addressForm = this.fb.nonNullable.group({
    street: ['', Validators.required],
    streetNumber: ['', Validators.required],
    postCode: ['', Validators.required],
    city: ['', Validators.required],
    country: ['BE', Validators.required],
  });

  readonly relaySearchForm = this.fb.nonNullable.group({
    postCode: ['', Validators.required],
    country: ['BE', Validators.required],
  });
  readonly relayResults = signal<RelayPointResult[]>([]);
  readonly selectedRelayPoint = signal<RelayPointResult | null>(null);
  readonly searchingRelayPoints = signal(false);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.price, 0));
  readonly totalWeightGrams = computed(() => this.items().reduce((sum, item) => sum + item.weightGrams, 0));
  readonly estimatedShipping = computed(() => estimateShippingCost(this.deliveryMode(), this.totalWeightGrams()));
  readonly estimatedTotal = computed(() => this.subtotal() + this.estimatedShipping());

  constructor() {
    this.cartService.getCart().subscribe((cart) => {
      this.items.set(cart.items);
      this.loading.set(false);
    });
  }

  setDeliveryMode(mode: DeliveryMode): void {
    this.deliveryMode.set(mode);
  }

  searchRelayPoints(): void {
    if (this.relaySearchForm.invalid) {
      return;
    }

    this.searchingRelayPoints.set(true);
    const { postCode, country } = this.relaySearchForm.getRawValue();
    this.shippingService.findRelayPoints(postCode, country).subscribe((results) => {
      this.relayResults.set(results);
      this.searchingRelayPoints.set(false);
    });
  }

  selectRelayPoint(point: RelayPointResult): void {
    this.selectedRelayPoint.set(point);
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    const request = this.buildRequest();
    if (!request) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.checkoutService.checkout(request).subscribe({
      next: (response) => {
        this.redirectTo(response.checkoutUrl);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(this.mapError(err));
      },
    });
  }

  protected redirectTo(url: string): void {
    window.location.href = url;
  }

  private buildRequest(): CheckoutRequest | null {
    if (this.deliveryMode() === 'HOME') {
      if (this.addressForm.invalid) {
        return null;
      }
      return { deliveryMode: 'HOME', ...this.addressForm.getRawValue() };
    }

    const point = this.selectedRelayPoint();
    if (!point) {
      return null;
    }

    return {
      deliveryMode: 'RELAY_POINT',
      relayPointId: point.id,
      relayPointName: point.name,
      relayPointStreet: point.street,
      relayPointPostCode: point.postCode,
      relayPointCity: point.city,
      relayPointCountry: point.country,
    };
  }

  private mapError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      return "Un article n'est plus disponible, retourne à ton panier.";
    }
    return 'Impossible de finaliser la commande.';
  }
}
```

`src/app/features/checkout/checkout-page/checkout-page.html`:

```html
@if (loading()) {
  <p>Chargement...</p>
} @else {
  <section class="app-checkout-page">
    <h1>Paiement</h1>

    <div class="app-checkout-page__delivery-toggle">
      <app-button
        type="button"
        [variant]="deliveryMode() === 'HOME' ? 'primary' : 'secondary'"
        (pressed)="setDeliveryMode('HOME')"
      >
        Domicile
      </app-button>
      <app-button
        type="button"
        [variant]="deliveryMode() === 'RELAY_POINT' ? 'primary' : 'secondary'"
        (pressed)="setDeliveryMode('RELAY_POINT')"
      >
        Point relais
      </app-button>
    </div>

    @if (deliveryMode() === 'HOME') {
      <form [formGroup]="addressForm" class="app-checkout-page__form">
        <app-text-field label="Rue" formControlName="street" />
        <app-text-field label="Numéro" formControlName="streetNumber" />
        <app-text-field label="Code postal" formControlName="postCode" />
        <app-text-field label="Ville" formControlName="city" />
        <app-select-field label="Pays" formControlName="country" [options]="countryOptions" />
      </form>
    } @else {
      <form [formGroup]="relaySearchForm" (ngSubmit)="searchRelayPoints()" class="app-checkout-page__form">
        <app-text-field label="Code postal" formControlName="postCode" />
        <app-select-field label="Pays" formControlName="country" [options]="countryOptions" />
        <app-button type="submit" [disabled]="searchingRelayPoints()">Rechercher les points relais</app-button>
      </form>

      @if (relayResults().length > 0) {
        <ul class="app-checkout-page__relay-results">
          @for (point of relayResults(); track point.id) {
            <li>
              <label>
                <input
                  type="radio"
                  name="relay-point"
                  [checked]="selectedRelayPoint()?.id === point.id"
                  (change)="selectRelayPoint(point)"
                />
                {{ point.name }} — {{ point.street }}, {{ point.postCode }} {{ point.city }}
              </label>
            </li>
          }
        </ul>
      }
    }

    <div class="app-checkout-page__summary">
      <p>Sous-total : {{ subtotal() }} €</p>
      <p>Livraison estimée : {{ estimatedShipping() }} €</p>
      <p>Total estimé : {{ estimatedTotal() }} € — le montant exact sera confirmé sur la page de paiement Stripe</p>
    </div>

    @if (error()) {
      <p class="app-checkout-page__error">{{ error() }}</p>
    }

    <app-button type="button" [disabled]="submitting()" (pressed)="submit()">Payer</app-button>
  </section>
}
```

`src/app/features/checkout/checkout-page/checkout-page.css`:

```css
.app-checkout-page__delivery-toggle {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.app-checkout-page__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.app-checkout-page__relay-results {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.app-checkout-page__summary {
  border: 2px solid var(--color-navy);
  padding: var(--space-3);
  margin-bottom: var(--space-4);
}

.app-checkout-page__error {
  color: var(--color-accent);
  font-weight: 700;
}
```

**Important**: `redirectTo` is `protected` (not `private`) specifically so tests can
spy on it (`vi.spyOn(fixture.componentInstance, 'redirectTo' as never)`) instead of
letting `submit()` actually navigate `window.location` away mid-test-run.

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `CheckoutPage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/checkout/checkout-page` and stop.

---

### Task 11: CheckoutSuccessPage & CheckoutCancelPage ✅ DONE (staged, not committed; 165/165 tests pass, verified directly)

**Files:**
- Create: `src/app/features/checkout/checkout-success-page/checkout-success-page.ts`
- Create: `src/app/features/checkout/checkout-success-page/checkout-success-page.html`
- Create: `src/app/features/checkout/checkout-success-page/checkout-success-page.css`
- Test: `src/app/features/checkout/checkout-success-page/checkout-success-page.spec.ts`
- Create: `src/app/features/checkout/checkout-cancel-page/checkout-cancel-page.ts`
- Create: `src/app/features/checkout/checkout-cancel-page/checkout-cancel-page.html`
- Create: `src/app/features/checkout/checkout-cancel-page/checkout-cancel-page.css`
- Test: `src/app/features/checkout/checkout-cancel-page/checkout-cancel-page.spec.ts`

Both pages are static (no service calls) — Stripe's webhook confirms payment
asynchronously and neither redirect URL carries a session identifier to check, per the
spec's non-goals.

- [ ] **Step 1: Write the failing tests**

`src/app/features/checkout/checkout-success-page/checkout-success-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CheckoutSuccessPage } from './checkout-success-page';

describe('CheckoutSuccessPage', () => {
  it('shows a confirmation message with links to orders and market', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CheckoutSuccessPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Merci');
    expect(el.querySelector('a[routerLink="/orders"]')).not.toBeNull();
    expect(el.querySelector('a[routerLink="/market"]')).not.toBeNull();
  });
});
```

`src/app/features/checkout/checkout-cancel-page/checkout-cancel-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CheckoutCancelPage } from './checkout-cancel-page';

describe('CheckoutCancelPage', () => {
  it('shows a cancellation message with a link back to the cart', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CheckoutCancelPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('annulé');
    expect(el.querySelector('a[routerLink="/cart"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './checkout-success-page'` and
`Cannot find module './checkout-cancel-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/checkout/checkout-success-page/checkout-success-page.ts`:

```ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-success-page',
  imports: [RouterLink],
  templateUrl: './checkout-success-page.html',
  styleUrl: './checkout-success-page.css',
})
export class CheckoutSuccessPage {}
```

`src/app/features/checkout/checkout-success-page/checkout-success-page.html`:

```html
<section class="app-checkout-success-page">
  <h1>Merci pour ta commande !</h1>
  <p>
    Ton paiement a été pris en compte. Tu recevras une confirmation dès que ta
    commande sera validée.
  </p>
  <a routerLink="/orders">Voir mes commandes</a>
  <a routerLink="/market">Continuer mes achats</a>
</section>
```

`src/app/features/checkout/checkout-success-page/checkout-success-page.css`:

```css
.app-checkout-success-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}
```

`src/app/features/checkout/checkout-cancel-page/checkout-cancel-page.ts`:

```ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-cancel-page',
  imports: [RouterLink],
  templateUrl: './checkout-cancel-page.html',
  styleUrl: './checkout-cancel-page.css',
})
export class CheckoutCancelPage {}
```

`src/app/features/checkout/checkout-cancel-page/checkout-cancel-page.html`:

```html
<section class="app-checkout-cancel-page">
  <h1>Paiement annulé</h1>
  <p>Ta commande n'a pas été finalisée. Ton panier est toujours disponible.</p>
  <a routerLink="/cart">Retour au panier</a>
</section>
```

`src/app/features/checkout/checkout-cancel-page/checkout-cancel-page.css`:

```css
.app-checkout-cancel-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — both new test files green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/checkout/checkout-success-page src/app/features/checkout/checkout-cancel-page`
and stop.

---

### Task 12: MyOrdersPage ✅ DONE (staged, not committed; reviewed, approved — added a cancel busy-guard per review; DRY-extraction of order-summary markup with MyShopOrdersPage flagged as a cross-wave follow-up for the project owner to decide)

**Files:**
- Create: `src/app/features/orders/my-orders-page/my-orders-page.ts`
- Create: `src/app/features/orders/my-orders-page/my-orders-page.html`
- Create: `src/app/features/orders/my-orders-page/my-orders-page.css`
- Test: `src/app/features/orders/my-orders-page/my-orders-page.spec.ts`

This mirrors `MyShopOrdersPage` (`src/app/features/shop/my-shop-orders-page/`) from
the prior wave, but from the buyer's perspective: shop name instead of buyer identity,
`getMyOrders()` instead of `getShopOrders()`, and a confirmed cancel action instead of
seller status-transition buttons. Read that component first for the established
`Address`/`RelayPoint` rendering pattern (field names `relayName`/`relayStreet`/
`relayPostCode`/`relayCity`/`relayCountry` — not the unprefixed names used by
`RelayPointResult` in Task 10, a different type for a different purpose).

- [ ] **Step 1: Write the failing test**

`src/app/features/orders/my-orders-page/my-orders-page.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MyOrdersPage } from './my-orders-page';
import { OrderService } from '../../../core/shop/order.service';
import { OrderResponse } from '../../../core/shop/shop.types';

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
    ...overrides,
  };
}

describe('MyOrdersPage', () => {
  let orderService: { getMyOrders: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    orderService = {
      getMyOrders: vi.fn().mockReturnValue(of([makeOrder()])),
      cancel: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: OrderService, useValue: orderService }],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('fetches the buyer\'s orders on construction', () => {
    const fixture = TestBed.createComponent(MyOrdersPage);

    expect(orderService.getMyOrders).toHaveBeenCalled();
    expect(fixture.componentInstance.orders().length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('orderTotal() sums item prices and shipping cost', () => {
    const fixture = TestBed.createComponent(MyOrdersPage);

    const total = fixture.componentInstance.orderTotal(
      makeOrder({
        items: [
          { listingId: 'l1', gameName: 'A', price: 20 },
          { listingId: 'l2', gameName: 'B', price: 10 },
        ],
        shippingCost: 5,
      }),
    );

    expect(total).toBe(35);
  });

  it('cancelOrder() cancels and replaces the order in the list when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    orderService.cancel.mockReturnValue(of(makeOrder({ status: 'CANCELLED' })));
    const fixture = TestBed.createComponent(MyOrdersPage);

    fixture.componentInstance.cancelOrder(makeOrder());

    expect(orderService.cancel).toHaveBeenCalledWith('o1');
    expect(fixture.componentInstance.orders()[0].status).toBe('CANCELLED');
  });

  it('cancelOrder() does nothing when the confirmation is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fixture = TestBed.createComponent(MyOrdersPage);

    fixture.componentInstance.cancelOrder(makeOrder());

    expect(orderService.cancel).not.toHaveBeenCalled();
  });

  it('cancelOrder() surfaces an error on failure', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    orderService.cancel.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(MyOrdersPage);

    fixture.componentInstance.cancelOrder(makeOrder());

    expect(fixture.componentInstance.actionError()).not.toBeNull();
  });

  it('shows the shipping address for a HOME delivery', () => {
    orderService.getMyOrders.mockReturnValue(
      of([
        makeOrder({
          deliveryMode: 'HOME',
          shippingAddress: {
            street: 'Rue de la Gare',
            streetNumber: '12',
            postCode: '4000',
            city: 'Liège',
            country: 'Belgique',
          },
        }),
      ]),
    );
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rue de la Gare');
  });

  it('shows the relay point for a RELAY_POINT delivery', () => {
    orderService.getMyOrders.mockReturnValue(
      of([
        makeOrder({
          deliveryMode: 'RELAY_POINT',
          relayPoint: {
            relayId: 'r1',
            relayName: 'Point Relais Centre',
            relayStreet: 'Place Saint-Lambert',
            relayPostCode: '4000',
            relayCity: 'Liège',
            relayCountry: 'Belgique',
          },
        }),
      ]),
    );
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Point Relais Centre');
  });

  it('does not show a cancel button for a non-PENDING order', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED' })]));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.includes('Annuler'))).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './my-orders-page'`.

- [ ] **Step 3: Write the implementation**

`src/app/features/orders/my-orders-page/my-orders-page.ts`:

```ts
import { Component, inject, signal } from '@angular/core';
import { OrderService } from '../../../core/shop/order.service';
import { Button } from '../../../shared/ui/button/button';
import { OrderResponse } from '../../../core/shop/shop.types';

@Component({
  selector: 'app-my-orders-page',
  imports: [Button],
  templateUrl: './my-orders-page.html',
  styleUrl: './my-orders-page.css',
})
export class MyOrdersPage {
  private readonly orderService = inject(OrderService);

  readonly orders = signal<OrderResponse[]>([]);
  readonly loading = signal(true);
  readonly actionError = signal<string | null>(null);

  constructor() {
    this.orderService.getMyOrders().subscribe((orders) => {
      this.orders.set(orders);
      this.loading.set(false);
    });
  }

  orderTotal(order: OrderResponse): number {
    return order.items.reduce((sum, item) => sum + item.price, 0) + order.shippingCost;
  }

  cancelOrder(order: OrderResponse): void {
    if (!window.confirm('Annuler cette commande ?')) {
      return;
    }

    this.actionError.set(null);
    this.orderService.cancel(order.id).subscribe({
      next: (updated) => {
        this.orders.set(this.orders().map((o) => (o.id === updated.id ? updated : o)));
      },
      error: () => {
        this.actionError.set("Impossible d'annuler cette commande.");
      },
    });
  }
}
```

`src/app/features/orders/my-orders-page/my-orders-page.html`:

```html
@if (loading()) {
  <p>Chargement...</p>
} @else if (orders().length === 0) {
  <p>Tu n'as pas encore de commande.</p>
} @else {
  @if (actionError()) {
    <p class="app-my-orders-page__error">{{ actionError() }}</p>
  }
  <ul class="app-my-orders-page__list">
    @for (order of orders(); track order.id) {
      <li class="app-my-orders-page__order">
        <p>Boutique : {{ order.shopName }}</p>
        <p>Statut : {{ order.status }}</p>
        <ul>
          @for (item of order.items; track item.listingId) {
            <li>{{ item.gameName }} — {{ item.price }} €</li>
          }
        </ul>
        <p>Livraison : {{ order.shippingCost }} € ({{ order.deliveryMode }})</p>
        @if (order.deliveryMode === 'HOME' && order.shippingAddress) {
          <p class="app-my-orders-page__address">
            {{ order.shippingAddress.street }} {{ order.shippingAddress.streetNumber }},
            {{ order.shippingAddress.postCode }} {{ order.shippingAddress.city }},
            {{ order.shippingAddress.country }}
          </p>
        }
        @if (order.deliveryMode === 'RELAY_POINT' && order.relayPoint) {
          <p class="app-my-orders-page__address">
            {{ order.relayPoint.relayName }} — {{ order.relayPoint.relayStreet }},
            {{ order.relayPoint.relayPostCode }} {{ order.relayPoint.relayCity }},
            {{ order.relayPoint.relayCountry }}
          </p>
        }
        <p>Total : {{ orderTotal(order) }} €</p>

        @if (order.status === 'PENDING') {
          <app-button type="button" variant="secondary" (pressed)="cancelOrder(order)">
            Annuler cette commande
          </app-button>
        }
      </li>
    }
  </ul>
}
```

`src/app/features/orders/my-orders-page/my-orders-page.css`:

```css
.app-my-orders-page__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.app-my-orders-page__order {
  border: 2px solid var(--color-navy);
  padding: var(--space-3);
}

.app-my-orders-page__address {
  color: var(--color-navy);
  font-size: 0.9em;
}

.app-my-orders-page__error {
  color: var(--color-accent);
  font-weight: 700;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx ng test --watch=false`
Expected: PASS — all `MyOrdersPage` tests green.

- [ ] **Step 5: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage:
`git add src/app/features/orders/my-orders-page` and stop.

---

### Task 13: Route wiring ✅ DONE (staged, not committed; build succeeds with 5 new lazy chunks, 173/173 tests pass, verified directly)

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Replace the remaining stub route entries**

Read the current `app.routes.ts` first. Find these five entries:

```ts
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
```

and (further down):

```ts
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
```

Replace the `orders` entry (leave `profile` untouched — it stays a `PageStub`, out of
scope for this wave) with:

```ts
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/my-orders-page/my-orders-page').then((m) => m.MyOrdersPage),
    canActivate: [authGuard],
  },
```

Replace the four `cart`/`checkout*` entries with:

```ts
  {
    path: 'cart',
    loadComponent: () => import('./features/cart/cart-page/cart-page').then((m) => m.CartPage),
    canActivate: [authGuard],
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/checkout-page/checkout-page').then((m) => m.CheckoutPage),
    canActivate: [authGuard],
  },
  {
    path: 'checkout/success',
    loadComponent: () =>
      import('./features/checkout/checkout-success-page/checkout-success-page').then((m) => m.CheckoutSuccessPage),
  },
  {
    path: 'checkout/cancel',
    loadComponent: () =>
      import('./features/checkout/checkout-cancel-page/checkout-cancel-page').then((m) => m.CheckoutCancelPage),
  },
```

Every other route (Home, Market, Listing Detail, all `auth/*`, `profile`, `my-shop`,
`my-shop/listings/new`, `my-shop/orders`, `admin/listings`, the wildcard) stays exactly
as-is. Do NOT remove the `PageStub` import — it's still used by `profile` and
`admin/listings`.

- [ ] **Step 2: Verify the app builds**

Run: `npx ng build`
Expected: succeeds, with five new lazy chunks (`my-orders-page`, `cart-page`,
`checkout-page`, `checkout-success-page`, `checkout-cancel-page`).

- [ ] **Step 3: Run the full test suite**

Run: `npx ng test --watch=false`
Expected: PASS — every test from every prior task still green.

- [ ] **Step 4: Commit** — SEE OVERRIDE BELOW, do not run this step as written.

**IMPORTANT OVERRIDE**: do NOT run `git commit`. Stage: `git add src/app/app.routes.ts`
and stop.

---

### Task 14: Final verification ✅ DONE (build succeeds, 173/173 tests pass, all 14 tasks staged, nothing committed)

**Files:** none (verification only).

- [ ] **Step 1: Full production build**

Run: `npx ng build`
Expected: succeeds cleanly.

- [ ] **Step 2: Full test suite**

Run: `npx ng test --watch=false`
Expected: PASS — full suite green.

- [ ] **Step 3: Confirm nothing is committed**

Run: `git status`
Expected: all new/modified files from this plan show as staged — nothing committed.

---

## Self-review

**Spec coverage:**
- Cart CRUD + `ListingDetailPage` wiring — Tasks 1, 2, 7.
- Checkout with home-address/relay-point delivery, live shipping estimate, Stripe
  redirect — Tasks 1, 3, 4, 5, 10.
- Success/cancel pages — Task 11.
- Buyer order history + cancellation — Tasks 6, 12.
- Navbar redesign (cart icon, "Mon compte" dropdown) — Task 8.
- Route wiring for all five pages — Task 13.

**Out of scope (per spec):** no shipping-preview endpoint (duplicated tier table
instead), no live cart-item counter/badge, no payment-status polling on the success
page, no editing an existing order's delivery details, no auto-re-adding a cancelled
order's items to the cart.

**Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.

**Type consistency:** `CartItemResponse`/`CheckoutRequest`/`CheckoutResponse`/
`RelayPointResult` (Task 1) are used identically across every service (Tasks 2-5) and
page (Tasks 7, 9, 10) that references them. `RelayPointResult`'s unprefixed field names
(`name`/`street`/`postCode`/`city`/`country`, Task 1/10) are kept deliberately distinct
from `OrderResponse`'s embedded `RelayPoint` (`relayName`/`relayStreet`/etc., reused
unchanged from Wave 2 in Task 12) — confirmed not to be conflated anywhere in this
plan. `estimateShippingCost(mode, totalWeightGrams)`'s signature (Task 5) matches its
one call site in `CheckoutPage` (Task 10) exactly.
