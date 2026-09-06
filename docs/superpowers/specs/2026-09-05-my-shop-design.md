# My Shop — design

Date: 2026-09-05
Status: Approved, ready for implementation plan

## Context

Wave 2 of the roadmap laid out in the foundation spec: the seller-facing area — create a
shop, manage listings (create/edit price/delete), view and update orders received.
Replaces the `PageStub` placeholders at `/my-shop` and `/my-shop/orders`, and adds a new
route `/my-shop/listings/new`.

Depends on the companion backend spec/plan (`new-game-plus/docs/superpowers/specs/2026-09-05-my-shop-backend-design.md`),
which must be implemented first: `GET /listings/mine`, `buyerUsername`/`buyerEmail` on
`OrderResponse`, and `POST /shops` returning a fresh token alongside the created shop.

## Goals

- A user without a shop can create one from `/my-shop`.
- A user with a shop can see all their own listings (any status), create new ones
  (against an existing game or a newly-created one), edit price, and delete listings.
- A seller can see orders placed against their shop — including buyer identity — and
  advance order status through the allowed transitions.
- Creating a shop mid-session works without requiring the user to log out and back in
  (the new JWT from `POST /shops` is applied immediately).

## Non-goals

- No shop editing (name/description) after creation — only create and delete.
- No listing fields besides price are editable after creation (matches the backend's
  `ListingRequest`, which only supports price on `PUT`).
- No image upload for listings or games — `imageUrls`/`coverURL` stay as backend
  concerns not exposed in this wave's forms (no `ListingImage` management UI).
- No multi-select genre component addition to the shared UI kit — the new-game form uses
  plain native checkboxes for genre selection (a one-off need, not worth generalizing
  `SelectField` into a multi-select for).

## Backend contract recap (from the companion backend spec)

- `GET /listings/mine` (SELLER) → `Page<ListingResponse>`, all statuses, caller's shop only.
- `POST /shops` → `{ shop: ShopResponse, token: string }` (not a bare `ShopResponse` anymore).
- `GET /shops/me` → `ShopResponse` (unchanged), `404` if no shop exists.
- `DELETE /shops` → `204`, blocked (`409`) if the shop has orders or reviews.
- `POST /listings` → `ListingResponse`, body `{ gameId, price }`.
- `PUT /listings/{id}` → `ListingResponse`, body `{ gameId, price }` — **`gameId` is
  `@NotNull` on the backend DTO even though the endpoint ignores it and only updates
  price** — the frontend must still send the listing's current `gameId` in this request
  or the backend rejects it with `400`.
- `DELETE /listings/{id}` → `204`, blocked (`409`) if the listing is `SOLD`.
- `GET /games?name=&page=&size=` → `Page<GameResponse>` (paginated even with no `name`).
- `POST /games` → `GameResponse`, body includes `genreIds: string[]`.
- `GET /genres` → `GenreResponse[]` (already used by Market's genre filter in Wave 1).
- `GET /orders/shop` (SELLER) → `OrderResponse[]`, now including `buyerUsername`/`buyerEmail`.
- `PATCH /orders/{id}/status` (SELLER) → `OrderResponse`, body `{ status }`. Allowed
  transitions: `PENDING→CANCELLED`, `PAID→SHIPPED|CANCELLED`, `SHIPPED→DELIVERED|CANCELLED`;
  `DELIVERED`/`CANCELLED` are terminal (no further transitions).

## Architecture

### The chicken-and-egg fix: `/my-shop` guard and Navbar

A user must be able to reach `/my-shop` to create their first shop *before* they hold the
`SELLER` role. Two changes to already-approved foundation-wave code:

- `app.routes.ts`: `/my-shop`'s `canActivate` drops `roleGuard('SELLER')`, keeping only
  `authGuard`. `/my-shop/orders` keeps both guards (a page that only makes sense once a
  shop exists).
- `Navbar`: the "My Shop" link moves from being gated on `hasRole('SELLER')` to being
  shown to any authenticated user (inside the existing `isAuthenticated()` branch,
  alongside Profile/Cart/Logout). The page itself decides what to render — a "create
  your shop" form or the management dashboard.

### Session refresh after shop creation

`AuthService` gains one new **public** method, purely additive (no existing method's
behavior changes):

```ts
applyNewToken(token: string): void {
  this.applyToken(token); // the existing private method — decode, persist, set roles/isAuthenticated
}
```

`MyShopPage` calls this immediately after a successful `POST /shops`, so the very next
SELLER-gated request (e.g. creating a listing) carries a token that already has the role.

### New core module: `core/shop/`

```
src/app/core/shop/
  shop.types.ts      # ShopResponse, ShopRequest, ShopCreationResponse,
                      # ListingCreateRequest, GameCreateRequest,
                      # OrderStatus, OrderItemResponse, OrderResponse, Address, RelayPoint
  shop.service.ts     # getMine() [404 → null, not an error], create(), delete()
  order.service.ts    # getShopOrders(), updateStatus()
```

`getMine()` deliberately turns a `404` from `GET /shops/me` into a `null` emission
(via `catchError`), not a propagated error — "no shop yet" is an expected, normal state
for this page, not a failure.

### Extended core module: `core/catalog/`

`ListingService` (from Wave 1) gains `getMine(page, size)`, `create(request)`,
`updatePrice(id, gameId, price)`, `delete(id)`. `GameService` (from Wave 1) gains
`search(name, page, size)`, `create(request)`. Both are purely additive — no existing
method changes.

## Page designs

### MyShopPage (`/my-shop`)

On init, fetches `shopService.getMine()`.

- **No shop** (`null`): shows a form (name, description) → `shopService.create()` →
  on success: `authService.applyNewToken(response.token)`, set the shop signal from
  `response.shop`, then fetch listings (starts empty).
- **Has a shop**: shows shop name/description, a "Créer une annonce" link to
  `/my-shop/listings/new`, the list of the shop's own listings (via
  `listingService.getMine()` — any status), and a "Supprimer ma boutique" action
  (confirmation required, calls `shopService.delete()`, resets the shop signal to `null`
  on success — reverting to the create-shop form).
- Each listing row: game name, price (with an inline "modifier le prix" toggle → number
  input → save, calling `listingService.updatePrice(id, gameId, newPrice)`), status
  badge (reusing `Badge`), and a delete button — **disabled when `status === 'SOLD'`**
  (matches the backend's `409` on deleting a sold listing; price editing stays available
  regardless of status, matching the backend's actual permissiveness — no extra
  restriction invented beyond what the backend enforces).

### NewListingPage (`/my-shop/listings/new`, SELLER-gated)

Two ways to pick the game for the new listing, and then a price:

1. **Search existing games**: a debounced search box (reusing `TextField`) calls
   `gameService.search(term)`, shows matching results (name, platform), each with a
   "Choisir" action that sets the selected game.
2. **Create a new game**: a toggle reveals a form — name, description, genres (a plain
   list of checkboxes, options from `GenreService.getAll()`, reused from Wave 1),
   publisher, developer, platform, release date, cover URL (optional), weight in grams
   — submitting calls `gameService.create()`; on success, that new game becomes the
   selected one and the form collapses.

Once a game is selected (either path), a price field appears; submitting calls
`listingService.create({ gameId, price })` and navigates back to `/my-shop` on success.

### MyShopOrdersPage (`/my-shop/orders`, SELLER-gated)

Fetches `orderService.getShopOrders()` on init. Each order shows: buyer
(`buyerUsername`/`buyerEmail`), items (game name × price), shipping cost, a computed
total (sum of item prices + shipping cost — the backend doesn't compute this for us),
delivery mode and address/relay-point details, current status, and — for non-terminal
orders — a control offering only the statuses that are actually reachable from the
current one, mirroring the backend's `assertValidTransition`:

| Current | Offered next statuses |
|---|---|
| `PENDING` | `CANCELLED` |
| `PAID` | `SHIPPED`, `CANCELLED` |
| `SHIPPED` | `DELIVERED`, `CANCELLED` |
| `DELIVERED`, `CANCELLED` | none (terminal) |

Choosing one calls `orderService.updateStatus(id, status)` and replaces that order in
the local list with the response.

## Routing changes

`app.routes.ts`:
- `/my-shop`: `canActivate` becomes `[authGuard]` (drops `roleGuard('SELLER')`),
  `component: PageStub` replaced with `loadComponent` for `MyShopPage`.
- `/my-shop/orders`: `canActivate` stays `[authGuard, roleGuard('SELLER')]`, `component`
  replaced with `loadComponent` for `MyShopOrdersPage`.
- New route `/my-shop/listings/new`: `canActivate: [authGuard, roleGuard('SELLER')]`,
  `loadComponent` for `NewListingPage`.

## Testing

Same conventions as Wave 1: `HttpTestingController` for services, stubbed
service/`AuthService` values (`useValue`) for page component tests, `provideRouter([])`
wherever `RouterLink`/route binding is involved. `Navbar`'s existing "only shows My Shop
for SELLER" test is replaced with a test confirming My Shop shows for any authenticated
user regardless of role — this is a deliberate behavior change from Wave 1, not a
regression.

## Open assumptions

- **Genre selection as checkboxes, not a new shared component**: a one-off need: the
  new-game form is the only place in the app requiring multi-select, so a dedicated
  shared `MultiSelectField` component isn't justified yet (YAGNI) — plain native
  checkboxes bound manually (not via a `ControlValueAccessor`, just an array signal) are
  simplest.
- **Order total is computed client-side** (sum of item prices + shipping cost) since the
  backend doesn't provide a pre-computed total field.
- **No optimistic UI** for price edits/status updates — each action waits for the
  server response before updating local state, consistent with every other page built
  so far in this project (no wave has used optimistic updates).
