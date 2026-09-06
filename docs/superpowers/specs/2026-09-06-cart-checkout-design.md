# Cart & Checkout — design

Date: 2026-09-06
Status: Approved, ready for implementation plan

## Context

Wave 3 of the roadmap laid out in the foundation spec: cart management, checkout
(delivery mode + address or Mondial Relay point, Stripe redirect), success/cancel
pages, and buyer order history. Replaces the `PageStub` placeholders at `/cart`,
`/checkout`, `/checkout/success`, `/checkout/cancel`, and `/orders`. Wires up
`ListingDetailPage`'s "Ajouter au panier" button, inert since Wave 1.

Depends on the companion backend spec/plan
(`new-game-plus/docs/superpowers/specs/2026-09-06-cart-checkout-backend-design.md`),
which must be implemented first: `CartItemResponse` gains `weightGrams`. Every other
backend capability this wave needs (cart CRUD, multi-shop checkout, Stripe session
creation, the payment webhook, Mondial Relay search, buyer order history/cancel)
already exists and is unchanged.

## Goals

- A logged-in user can add an available listing (not their own, not already in their
  cart) to their cart from the listing detail page, see items in a cart page, remove
  them, and proceed to checkout.
- Checkout lets the user choose delivery by home address or by searching and picking a
  Mondial Relay point, shows a live shipping-cost estimate, and on submission redirects
  to Stripe's hosted checkout page.
- After paying (or cancelling) at Stripe, the user lands on a simple confirmation page.
- A buyer can see their own order history across all shops and cancel a still-`PENDING`
  order.
- The Navbar gains a cart icon and an "Mon compte" hover dropdown, reordering existing
  links without removing any existing destination.

## Non-goals

- No shipping-cost preview endpoint on the backend — the frontend duplicates the
  weight-tier table for a live estimate (see Architecture). This is an accepted,
  explicit tradeoff: the table is small and changes rarely, and keeping it in sync
  manually is cheaper than adding and maintaining a preview endpoint for one field.
- No live cart-item counter/badge on the Navbar's cart icon — out of scope for this
  wave (YAGNI; no wave so far has needed real-time badge state, and this would add a
  global-state concern the codebase doesn't have yet).
- No payment-status polling on the success page — the Stripe webhook confirms payment
  asynchronously and the checkout success URL carries no session identifier to poll
  with (confirmed in `application.yaml`), so the success page is a static confirmation,
  not a live status page.
- No editing of an existing order's delivery details — only cancellation of `PENDING`
  orders, matching what the backend already supports (`PATCH /orders/{id}/cancel`).
- No re-adding a cancelled order's items back into the cart automatically — the seller
  side already releases the listings back to `AVAILABLE` on cancellation; the buyer can
  just re-browse and re-add if they still want them.

## Backend contract recap (from the companion backend spec)

- `GET /cart` → `{ items: [{ listingId, gameName, shopName, price, weightGrams }] }`.
- `POST /cart/items` → body `{ listingId }` → `201` with the updated cart, or `409` if
  already in cart / listing no longer `AVAILABLE`, or `403` if it's the caller's own
  listing.
- `DELETE /cart/items/{listingId}` → `204`.
- `POST /orders/checkout` → body
  `{ deliveryMode, street?, streetNumber?, postCode?, city?, country?, relayPointId?, relayPointName?, relayPointStreet?, relayPointPostCode?, relayPointCity?, relayPointCountry? }`
  (home-address fields required when `deliveryMode: 'HOME'`, relay-point fields
  required when `'RELAY_POINT'`) → `201` with
  `{ orders: OrderResponse[], checkoutUrl: string }`, or `400` (empty cart / incomplete
  delivery fields), `409` (an item became unavailable since it was added), `502`
  (Stripe error).
- `GET /orders` (buyer, unscoped by shop) → `OrderResponse[]`.
- `PATCH /orders/{id}/cancel` → `200` with the updated `OrderResponse`, or `403` (not
  the buyer's order), `404`, `409` (already past `PENDING`).
- `GET /shipping/relay-points?postCode=&country=` → `RelayPointResult[]`
  (`{ id, name, street, postCode, city, country }` — note: unprefixed field names here,
  unlike the `RelayPoint` entity embedded in `OrderResponse`, which uses
  `relayName`/`relayStreet`/etc. — these are two different shapes for two different
  purposes and must not be confused).

## Architecture

### New core module: `core/cart/`

```
src/app/core/cart/
  cart.types.ts       # CartItemResponse, CartResponse, CheckoutRequest,
                       # CheckoutResponse, RelayPointResult
  cart.service.ts      # getCart(), addItem(listingId), removeItem(listingId)
  checkout.service.ts  # checkout(request)
  shipping.service.ts  # findRelayPoints(postCode, country)
  shipping-rate.ts      # estimateShippingCost(mode, totalWeightGrams) — pure function
```

`shipping-rate.ts` deliberately duplicates `ShippingRateCalculator`'s tier table
verbatim (same breakpoints, same two price columns for relay vs. home), with a comment
stating it must be kept in sync if the backend table ever changes. This is a pure,
dependency-free function — easy to unit test directly against the same fixture prices
the backend test suite would use.

### Extended module: `core/shop/order.service.ts`

Gains `getMyOrders(): Observable<OrderResponse[]>` (→ `GET /orders`) and
`cancel(id: string): Observable<OrderResponse>` (→ `PATCH /orders/{id}/cancel`), purely
additive alongside the existing `getShopOrders()`/`updateStatus()`. `OrderResponse` is
already defined in `core/shop/shop.types.ts` and is reused as-is — no new type needed,
since the shape returned by `/orders`, `/orders/shop`, and `/orders/checkout` is the
same `OrderResponse` record on the backend.

### Navbar redesign

Order becomes: Market, My Shop, Cart (icon-only button/link), then "Mon compte" — a
hover-triggered dropdown (CSS `:hover`/`:focus-within`, no JS state, matching the
project's existing preference for simple CSS-driven UI over component state where
possible) containing Profil, Mes commandes, Déconnexion. The cart icon is a small
inline SVG (no external asset, no icon library), styled via `currentColor` so it
inherits the navbar's existing text color and active/hover treatment. No item-count
badge (see Non-goals).

The existing Navbar tests for "shows Profile, Cart and Logout when authenticated" are
replaced with equivalent assertions against the new structure (cart link still present,
now identified by an `aria-label` on the icon link since it no longer has visible text;
Profile/Mes commandes/Déconnexion now inside the dropdown but still present in the DOM
and clickable — a CSS-only hover dropdown keeps its content in the accessibility tree
and clickable via testing-library-style queries even though it's visually hidden until
hover, so existing "does the link exist and navigate" style tests keep working
unchanged in kind, just re-targeted at the new structure).

## Page designs

### `ListingDetailPage` (existing, Wave 1) — wire `addToCart()`

```ts
addToCart(): void {
  if (this.addingToCart()) return;
  this.addingToCart.set(true);
  this.cartError.set(null);
  this.cartService.addItem(this.listing()!.id).subscribe({
    next: () => {
      this.addingToCart.set(false);
      this.addedToCart.set(true);
    },
    error: (err) => {
      this.addingToCart.set(false);
      this.cartError.set(mapAddToCartError(err));
    },
  });
}
```

Three new signals: `addingToCart`, `addedToCart` (shows "Ajouté au panier ✓" inline,
replacing the button label or shown alongside it), `cartError` (French message: "Déjà
dans ton panier", "Cette annonce n'est plus disponible", "Tu ne peux pas acheter ta
propre annonce", or a generic fallback for anything else). No navigation — stays on the
page, per the approved design.

### `CartPage` (`/cart`)

Fetches `cartService.getCart()` on init. Flat list (no per-shop grouping — items
already carry `shopName` inline): game name, shop name, price, "Retirer" button
(`cartService.removeItem(listingId)`, then refetch or splice locally). A computed
`subtotal` signal sums item prices. Empty state: message + link to `/market`. A
"Passer commande" link to `/checkout`, disabled/hidden when the cart is empty.

### `CheckoutPage` (`/checkout`)

Fetches the cart on init (for the item list, subtotal, and total weight — refetching
here rather than passing state from `CartPage` keeps the page correct on a direct visit
or refresh, consistent with every other page in this app not relying on router state).

- A delivery-mode toggle (two radio-style buttons or a segmented control): "Domicile"
  / "Point relais".
- **Domicile**: a reactive form (street, streetNumber, postCode, city via `TextField`,
  all required; country via `SelectField` defaulting to `'BE'`, same fixed two-option
  list as below — this is the first place the app asks for a country, so a small fixed
  list matches Mondial Relay's actual coverage rather than inventing free-text country
  entry).
- **Point relais**: postal code (`TextField`) + country (`SelectField`, options
  `{value: 'BE', label: 'Belgique'}`/`{value: 'FR', label: 'France'}`, defaulting to
  `'BE'`) plus an explicit "Rechercher les points relais" button calling
  `shippingService.findRelayPoints()`; results shown as a selectable list (radio
  buttons or clickable rows), one of which must be chosen before submitting.
- A live estimate section: subtotal (from the cart), estimated shipping
  (`estimateShippingCost(mode, totalWeightGrams)`, recomputed whenever the mode
  changes), and an estimated total — clearly labeled as an estimate (e.g. "Estimation —
  le montant exact sera confirmé sur la page de paiement Stripe"), matching the
  approved non-goal that Stripe's own page is the source of truth for the final charge.
- Submitting builds a `CheckoutRequest` from whichever branch is active and calls
  `checkoutService.checkout()`; on success, `window.location.href = response.checkoutUrl`
  (a full navigation away from the Angular app — no client-side route change, no need
  to keep app state, since the browser is leaving the SPA entirely). On error, an inline
  French message distinguishing at least the `409` ("Un article n'est plus disponible,
  retourne à ton panier") case from a generic fallback.

### `CheckoutSuccessPage` (`/checkout/success`) / `CheckoutCancelPage` (`/checkout/cancel`)

Static content, no service calls. Success: confirmation message + links to `/orders`
and `/market`. Cancel: "Paiement annulé" message + link back to `/cart`. Both stay
unguarded (matches current route config) since Stripe's redirect doesn't guarantee the
app's in-memory auth state survived the round trip, and there's nothing
sensitive to protect on either page.

### `MyOrdersPage` (`/orders`)

Fetches `orderService.getMyOrders()` on init. Same rendering approach as
`MyShopOrdersPage` from Wave 2 (reusing its now-corrected `Address`/`RelayPoint`
rendering pattern and field names), but oriented around the buyer's perspective: shows
`shopName` (not buyer identity — the buyer already knows who they are), items,
computed total, delivery mode + address/relay-point details, current status. For
orders still `PENDING`, a confirmed ("Annuler cette commande ?", `window.confirm`,
matching the `MyShopPage.deleteShop()` precedent from Wave 2) "Annuler ma commande"
button calling `orderService.cancel(id)`, replacing that order in the local list with
the response on success.

## Routing changes

`app.routes.ts`: `/cart`, `/checkout`, `/checkout/success`, `/checkout/cancel`, and
`/orders` each swap `component: PageStub` for `loadComponent` pointing at their real
page. `canActivate` stays exactly as currently configured for each (all `[authGuard]`
except the two Stripe-redirect pages, which keep no guard).

## Testing

Same conventions as prior waves: `HttpTestingController` for services, stubbed
service/`AuthService` values (`useValue`) for page component tests, `provideRouter([])`
wherever routing is involved, `vi.useFakeTimers()`/`afterEach` cleanup where debouncing
is used (not needed here — the relay-point search is button-triggered, not debounced).
`estimateShippingCost` gets direct unit tests (no TestBed needed — it's a pure
function) covering at least one value per tier and both delivery modes.

## Open assumptions

- **Relay-point search is manual (button-triggered), not debounced** — confirmed with
  the project owner; avoids firing the external Mondial Relay SOAP call on every
  keystroke.
- **No live shipping-cost preview endpoint; the frontend duplicates the tier table** —
  confirmed with the project owner as an accepted, explicit tradeoff (see Non-goals).
- **Cart icon is a hand-drawn inline SVG, no icon library, no external asset** —
  confirmed with the project owner.
- **"Mon compte" dropdown is CSS-hover-driven, no component state** — consistent with
  this project's preference for simple, mostly-CSS UI (e.g. the existing `@if`-driven
  Navbar, no menu/overlay library anywhere in the app so far); revisit only if a future
  wave needs keyboard-accessible menu semantics beyond what CSS `:hover`/`:focus-within`
  provides.
