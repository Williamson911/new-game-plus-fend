# Profile, Reviews & Admin — design

Date: 2026-09-06
Status: Approved, ready for implementation plan

## Context

Final wave of the roadmap: profile editing/account deletion, a public shop page
(info + available listings + reviews) with a review-creation flow reachable from a
buyer's delivered orders, and an admin listing-curation page (featured toggle).
Replaces the `PageStub` placeholders at `/profile` and `/admin/listings`, and adds a
new `/shops/:id` route that doesn't exist yet.

Depends on the companion backend spec/plan
(`new-game-plus/docs/superpowers/specs/2026-09-06-profile-reviews-admin-backend-design.md`),
already implemented: `GET /shops/{id}` (public), `ListingResponse.shopId`,
`GET /listings?shopId=`, and `OrderResponse.reviewed`. Every other backend capability
this wave needs (`GET /me`, `PUT /profile`, `DELETE /account`,
`GET /reviews/shop/{shopId}`, `POST /reviews`, `PATCH /listings/{id}/featured`)
already exists and is unchanged.

Visual style follows the mockups in `public/images/` (cream background, navy header,
orange accents, uppercase pixel font, card grid with an orange underline under the
title) — already fully implemented by the existing shared UI components
(`Card`, `Button`, `TextField`, `SelectField`, `Badge`). No new visual language is
introduced by this wave; every new page reuses these components.

## Goals

- A logged-in user can edit their username/email from a profile page, and delete
  their account (with the backend's existing conflict rules — active shop, orders,
  or reviews — surfaced as clear inline errors).
- A buyer can navigate from any listing to a public page for that listing's shop,
  seeing the shop's name/description, its available listings, and its reviews (with
  a frontend-computed average rating).
- A buyer with a `DELIVERED` order that has no review yet can leave one (rating +
  optional comment) directly from their order history, without leaving the page.
- An admin can search/filter all listings (same filters as the public market search)
  in a dedicated table view and toggle each one's "Pépite" (featured) status.

## Non-goals

- No password change on the profile page — `PUT /profile` only updates
  username/email; changing a password already has its own flow
  (`/auth/forgot-password` → `/auth/reset`), unchanged and out of scope here.
- No shop-rating aggregate from the backend — the average shown on the shop page is
  computed client-side from the raw review list already fetched, per the backend
  spec's explicit non-goal of not adding a denormalized average field.
- No pagination on the shop page's review list — matches the backend's flat,
  unpaginated `GET /reviews/shop/{shopId}`.
- No editing or deleting an existing review — the backend has no such endpoint; a
  review, once created, is immutable in this wave.
- No shop name becoming a link from `MarketPage`'s card grid — only from
  `ListingDetailPage`, confirmed with the project owner as sufficient for this wave.
- No reuse of the `Card`/grid UI for the admin curation page — it gets its own
  dedicated tabular view, confirmed with the project owner as clearer for an
  admin-scale "scan many rows, toggle one field" workflow than a visual grid.
- No live update of `AuthService.currentUser` roles after a profile edit — `PUT
  /profile` only changes username/email, neither of which affects role-gated UI, so
  no re-decoding of any token/claims is needed.

## Backend contract recap (from the companion backend spec)

- `GET /shops/{id}` → `ShopResponse { id, name, description }`, public (no auth
  header needed), `404` if unknown.
- `PUT /profile` → body `{ username, email }` → `200` with the updated `MeResponse`,
  or `409` (username or email already taken by another user).
- `DELETE /account` → `204`, or `409` with a French message when the caller has an
  active shop, existing orders, or existing reviews.
- `GET /reviews/shop/{shopId}` → `ReviewResponse[] { id, authorUsername, rating,
  comment, createdAt }`, unpaginated, public.
- `POST /reviews` → body `{ orderId, rating, comment }` → `201` with the created
  `ReviewResponse`, or `404` (unknown order), `403` (not the caller's order), `409`
  (already reviewed).
- `GET /listings?shopId=` → same paginated `Page<ListingResponse>` shape as the
  unfiltered search, `ListingResponse` now also carries `shopId`.
- `PATCH /listings/{id}/featured` → body `{ featured }` → `200` with the updated
  `ListingResponse` (already used internally by the backend; no frontend caller
  exists yet).
- `GET /orders` → `OrderResponse[]`, each now carrying `reviewed: boolean`.

## Architecture

### Extended module: `core/auth/auth.service.ts`

Gains two methods, alongside the existing `login`/`register`/`refreshMe`:

```ts
updateProfile(request: UpdateProfileRequest): Observable<MeResponse> {
  return this.http.put<MeResponse>(`${environment.apiUrl}/profile`, request)
    .pipe(tap((me) => this._currentUser.set(me)));
}

deleteAccount(): Observable<void> {
  return this.http.delete<void>(`${environment.apiUrl}/account`);
}
```

Living on `AuthService` (rather than a new `ProfileService`) because it already owns
the `currentUser` signal and `/me` fetching — `updateProfile` updates that signal
directly on success, exactly like `refreshMe` does. `UpdateProfileRequest { username,
email }` is added to `core/auth/auth.types.ts`.

### New core module: `core/reviews/`

```
src/app/core/reviews/
  review.types.ts    # ReviewResponse, ReviewRequest
  review.service.ts  # getByShop(shopId), create(request)
```

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

### Extended module: `core/shop/shop.service.ts`

Gains `getById(id: string): Observable<ShopResponse>` (→ `GET /shops/{id}`, no
`Authorization` header required — this is the app's first genuinely public
authenticated-optional GET besides the market/listing endpoints, and needs no
special handling since the existing `HttpClient`/interceptor setup already only
*adds* a token when one exists, never requires one).

### Extended module: `core/catalog/` (`catalog.types.ts`, `listing.service.ts`)

- `ListingResponse` gains `shopId: string`.
- `ListingFilters` gains an optional `shopId: string`.
- `ListingService.search` passes `shopId` through to the query params when present,
  the same way it already handles every other optional filter.
- `ListingService` gains `setFeatured(id: string, featured: boolean):
  Observable<ListingResponse>` (→ `PATCH /listings/{id}/featured`).

### Extended module: `core/shop/shop.types.ts`

`OrderResponse` gains `reviewed: boolean`, additive, matching the backend record.

## Page designs

### `ProfilePage` (`/profile`, replaces the `PageStub`)

Reactive form (`TextField` for username/email), pre-filled from
`authService.currentUser()` on init (redirecting to nothing extra — `authGuard`
already guarantees a logged-in user reaches this page with `currentUser` populated,
consistent with every other guarded page).

- Submit calls `authService.updateProfile(...)`; a `409` shows a single hardcoded
  inline French message ("Nom d'utilisateur ou email déjà utilisé") — status-code-only
  mapping, consistent with every other error-handling site in this codebase
  (`checkout-page.ts`, `listing-detail-page.ts`'s `addToCart`, `my-shop-page.ts`'s
  delete flows, `register-page.ts`), none of which read the backend's error response
  body. Success shows a brief confirmation ("Profil mis à jour").
- A separate "Supprimer mon compte" section: a button that, on click, uses
  `window.confirm('Supprimer définitivement ton compte ?')` (matching the existing
  `cancelOrder`/`deleteShop` confirmation pattern), then calls
  `authService.deleteAccount()`. On success: `authService.logout()` followed by
  `router.navigate(['/'])`. On `409` (the backend has three distinct reasons — active
  shop, existing orders, existing reviews — all under the same status), a single
  hardcoded inline message covers all three ("Impossible de supprimer ton compte :
  solde d'abord ta boutique, tes commandes et tes avis en cours"), same
  status-code-only convention as above; no logout.

### `ShopPage` (`/shops/:id`, new route)

Fetches three things independently on init: `shopService.getById(id)`,
`listingService.search({ shopId: id }, 0, 12)` (first page only — a shop is expected
to have a modest number of listings; if pagination is ever needed here it can reuse
`MarketPage`'s existing page-controls pattern, deferred as YAGNI for this wave), and
`reviewService.getByShop(id)`.

- Header: shop name (`<h1>`) and description.
- `averageRating` computed signal: `reviews.length ? reviews.reduce((s, r) => s +
  r.rating, 0) / reviews.length : null`, rendered as e.g. "4.5/5 · 12 avis" next to
  the header, or "Pas encore d'avis" when the list is empty.
- Listings section: reuses `Card` exactly like `MarketPage`'s grid (same inputs:
  title from `gameName`, price, `imageUrl` from `imageUrls[0]`, `routerLink` to
  `/listings/:id`, `featured`/`sold` flags) — no new card variant needed since
  `ListingResponse` already carries every field `Card` needs.
- Reviews section: a simple list, one entry per review — author username, rating
  (rendered as plain text "4/5", no star-icon component introduced for this), an
  optional comment, and the date.
- Not-found handling: a `404` from `shopService.getById` sets a `notFound` signal,
  rendering "Boutique introuvable." (same pattern as `ListingDetailPage`).

### `ListingDetailPage` (existing) — shop name becomes a link

Line `<dd>{{ listing()!.shopName }}</dd>` becomes:

```html
<dd><a [routerLink]="['/shops', listing()!.shopId]">{{ listing()!.shopName }}</a></dd>
```

`RouterLink` is already imported in this component's sibling pages; add the import
here if not already present. No other change to this page.

### `MyOrdersPage` (existing) — inline review flow

Each `DELIVERED` order with `reviewed === false` gains a small inline form below its
existing details, gated the same way the existing "Annuler cette commande" button is
gated by `order.status === 'PENDING'`:

```html
@if (order.status === 'DELIVERED' && !order.reviewed) {
  <form [formGroup]="reviewForms[order.id]" (ngSubmit)="submitReview(order)">
    <app-select-field label="Note" formControlName="rating" [options]="ratingOptions" />
    <app-text-field label="Commentaire (optionnel)" formControlName="comment" />
    <app-button type="submit" [disabled]="submittingReviewFor() === order.id">Laisser un avis</app-button>
  </form>
}
```

- `ratingOptions`: `[{value:'1',label:'1'}, ..., {value:'5',label:'5'}]` — reuses
  `SelectField` rather than introducing a star-rating widget, consistent with this
  codebase's preference so far for plain form controls over bespoke input widgets.
- One `FormGroup` per order needing a review, built lazily (a `Record<string,
  FormGroup>` keyed by order id, populated in the constructor's `getMyOrders()`
  callback) rather than one shared form, since multiple unreviewed orders can appear
  in the list simultaneously.
- On submit: `reviewService.create({ orderId: order.id, rating: Number(raw.rating),
  comment: raw.comment || null })`; on success, replace the order in the local
  `orders` signal with `{ ...order, reviewed: true }` (no refetch of the whole list,
  consistent with how `cancelOrder` already patches the list locally) and remove the
  now-unneeded form. On error (`409` — already reviewed, a race with another tab/
  request), show an inline message and mark it reviewed locally anyway, since a
  `409` here means a review already exists for that order regardless of which
  request created it.

### `AdminListingsPage` (`/admin/listings`, replaces the `PageStub`)

A dedicated page, not a reuse of `MarketPage`'s card grid. Same filter form as
`MarketPage` (search/genre/platform/minPrice/maxPrice via `ListingService.search`,
same `FormBuilder` + 300ms debounce + pagination pattern), rendering a table instead
of a grid:

| Image (thumbnail) | Jeu | Boutique | Prix | Statut | Pépite |
|---|---|---|---|---|---|

The "Pépite" column is a toggle button (`app-button`, label "Oui"/"Non" reflecting
current state) rather than a checkbox, consistent with this codebase's button-driven
interaction style elsewhere. Clicking it calls `listingService.setFeatured(id,
!current)` and, **on success**, replaces that row's listing with the response —
no optimistic flip beforehand. This matches the existing, established pattern in
this codebase (`MyShopOrdersPage.updateStatus`, `MyOrdersPage.cancelOrder`,
`ListingDetailPage.addToCart`): mutate local state only after the server confirms,
never before. A `togglingId` signal (same naming convention as
`cancellingOrderId`/`submittingReviewFor` elsewhere in this wave) disables the
button for that row while the request is in flight; on error, a row-scoped inline
message is shown (`featuredErrors: Record<string, string>`) and the row's displayed
state is simply whatever it already was (never mutated), so there is nothing to
revert.

## Routing changes

`app.routes.ts`:
- `/profile`: swaps `component: PageStub` for `loadComponent` pointing at
  `ProfilePage`. `canActivate: [authGuard]` unchanged.
- `/admin/listings`: swaps `component: PageStub` for `loadComponent` pointing at
  `AdminListingsPage`. `canActivate: [authGuard, roleGuard('ADMIN')]` unchanged.
- `/shops/:id`: new route, `loadComponent` pointing at `ShopPage`, **no**
  `canActivate` guard — matches `GET /shops/{id}`'s public, unauthenticated access.

## Testing

Same conventions as prior waves: `HttpTestingController` for the extended
services (`AuthService`, `ShopService`, `ListingService`) and the new
`ReviewService`; stubbed service values (`useValue`) for page component tests;
`provideRouter([])` wherever routing is involved. The `averageRating` computed
signal on `ShopPage` gets direct assertions for the empty-list, single-review, and
multi-review cases. The per-order review form on `MyOrdersPage` gets tests for: form
shown only when `DELIVERED` and `!reviewed`, successful submit flips `reviewed` and
removes the form, `409` on submit also flips `reviewed` (treated as already-done
rather than a hard failure). The admin toggle gets tests for both outcomes: success
replaces the row's listing with the response, and failure leaves the row's
`featured` value untouched while showing a row-scoped error.

## Open assumptions

- **Rating input is a 1–5 `SelectField`, not a star widget** — confirmed with the
  project owner; matches the codebase's existing plain-form-control style.
- **Shop name is only a link from `ListingDetailPage`, not from `MarketPage`'s card
  grid** — confirmed with the project owner.
- **Admin curation page is a dedicated table, not a reuse of the `Card` grid** —
  confirmed with the project owner.
- **Admin filters mirror `MarketPage`'s full filter set** (search, genre, platform,
  min/max price), not search-only — confirmed with the project owner.
- **Average shop rating is computed client-side, not requested from the backend** —
  confirmed with the project owner, consistent with the backend spec's own
  non-goals.
- **A `409` on review creation (already reviewed) is treated as a soft success on
  the frontend** (order flips to `reviewed: true` locally rather than showing a hard
  error) — since the only way to hit this is a genuine race (another tab, a retried
  request), and the end state the UI cares about (this order has a review) is true
  either way.
