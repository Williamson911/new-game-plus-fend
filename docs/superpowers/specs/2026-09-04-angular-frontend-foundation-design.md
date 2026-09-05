# Frontend Angular — socle commun (fondations)

Date: 2026-09-04
Status: Approuvé, prêt pour plan d'implémentation

## Contexte

`new-game-plus-frontend` est un projet Angular 22 fraîchement généré
(standalone, signals, CSS brut) — squelette par défaut uniquement,
aucune route, aucun `HttpClient` configuré.

Le backend `new-game-plus` (`C:\Users\lemet\Documents\Technifutur\new-game-plus`)
est déjà largement construit : marketplace C2C de jeux vidéo d'occasion
(auth JWT, boutiques vendeur, annonces, panier, checkout Stripe,
livraison Mondial Relay, avis, curation admin). Son `SecurityConfig`
autorise déjà `http://localhost:4200` en CORS — ce repo frontend est
son client prévu.

Deux maquettes (`public/images/Capture d'écran ...png`) montrent la
page d'accueil : header avec logo "NEW GAME PLUS", nav (Market / My
Shop / Profile / Cart / Logout), recherche + filtres, puis trois
sections de cartes produit ("Derniers arrivages", "Pépites", "Petits
prix") qui correspondent exactement aux endpoints backend
`/listings/latest`, `/listings/featured`, `/listings/cheap`. Palette
confirmée par les SVG fournis : bleu nuit `#1A1422`, orange `#F2AA4C`,
cartes à angles nets, police de titre pixel/rétro.

Aucun fichier de police n'a été trouvé sur le poste (recherché dans le
repo, `Documents`, `Desktop`, `Downloads`). Ce socle utilise une police
Google Fonts pixel de substitution (`Press Start 2P`), remplaçable en
une ligne (`@font-face` unique) dès que la police définitive est
fournie.

## Objectif de cette vague

Poser tout ce dont **chaque** fonctionnalité aura besoin, avant de
construire les fonctionnalités elles-mêmes :

- Structure de projet et conventions
- Connexion HTTP au backend + gestion des erreurs
- Authentification complète (register/login/confirmation email/mot de
  passe oublié/reset/logout) et persistance de session
- Garde-fous de routage (routes publiques / connectées / par rôle)
- Système de design (tokens CSS, typographie, composants UI partagés)
- Ossature de navigation (layout + navbar conforme à la maquette)
- Squelette de routage avec pages vides pour les vagues suivantes

**Non-goals de cette vague** : aucune logique métier des features
(pas de vraie page Market, pas de gestion de boutique, pas de panier,
pas de checkout). Ces pages existent en tant que routes/composants
vides après cette vague ; leur contenu est le travail des vagues 1 à 4
(voir Roadmap).

## Contrat backend (rappel, pour référence du plan d'implémentation)

- Base URL dev : `http://localhost:8080` (pas de `server.port`
  personnalisé, défaut Spring Boot).
- Auth stateless JWT, header `Authorization: Bearer <token>`, durée de
  vie 24h. Payload : `sub` (username), `id`, `email`, `roles`
  (`BUYER` par défaut, `SELLER` ajouté à la création d'une boutique,
  `ADMIN`).
- `POST /auth/register`, `POST /auth/login` → `AuthResponse { token }`.
- `GET /auth/confirm?token=`, `POST /auth/resend-confirmation`,
  `POST /auth/forgot-password`, `POST /auth/reset-password`.
- Les emails envoyés par le backend contiennent des liens en dur vers
  le front : confirmation → `FRONTEND_URL/auth/verified?token=...`,
  reset password → `FRONTEND_URL/auth/reset?token=...`. **Ces deux
  chemins exacts sont imposés**, comme `/checkout/success` et
  `/checkout/cancel`.
- `GET /me` → `MeResponse { id, username, email, createdAt }` (pas de
  rôles dans cette réponse — les rôles viennent du JWT décodé
  côté client).
- Routes `GET` publiques (pas de token requis) : `/games/**`,
  `/genres/**`, `/listings/**`, `/reviews/**`, `/shipping/**`.
- Tout le reste nécessite un token valide ; `PATCH /listings/{id}/featured`
  nécessite en plus le rôle `ADMIN`, les mutations sur `/listings` et
  `/shops` le rôle `SELLER`.
- Stripe Checkout : `POST /orders/checkout` redirige vers une
  `checkoutUrl` Stripe hébergée. Stripe renvoie ensuite vers
  `FRONTEND_URL/checkout/success` ou `/checkout/cancel` — **ces deux
  chemins sont câblés en dur côté backend**, non négociables.

## Structure de projet

```
src/app/
  core/
    http/
      auth.interceptor.ts       # attache le Bearer token
      error.interceptor.ts      # 401 → logout + redirect /auth/login
    auth/
      auth.service.ts           # signal currentUser, login/register/logout, decode JWT
      auth.guard.ts              # authGuard (route function guard)
      role.guard.ts              # roleGuard('SELLER' | 'ADMIN') factory
      token-storage.service.ts  # wrapper localStorage (clé unique, testable)
      auth.types.ts              # LoginRequest, RegisterRequest, AuthResponse, MeResponse, JwtClaims
  layout/
    shell/                       # layout racine : navbar + <router-outlet>
    navbar/                      # logo, nav (Market/My Shop/Profile/Cart/Logout), affichage conditionnel par rôle/auth
  shared/
    ui/
      button/
      card/                      # jaquette + titre + prix + bouton "Voir"
      input/
      select/
      badge/                     # "Featured" / "Sold"
    styles/
      tokens.css                 # variables couleur/espacement/rayon
      typography.css             # @font-face + échelle de titres
  features/
    auth/                        # login, register, confirm, forgot-password, reset-password
    home/                        # stub — vague 1
    market/                      # stub — vague 1
    my-shop/                     # stub — vague 2
    cart/                        # stub — vague 3
    checkout/                    # stub — vague 3 (dont /checkout/success, /checkout/cancel)
    profile/                     # stub — vague 4
    admin/                       # stub — vague 4
  app.routes.ts
  app.config.ts
```

Composants standalone partout (déjà le défaut Angular 22, pas de
`NgModule`). Chaque feature expose ses propres routes via
`loadChildren`/route enfants pour permettre le lazy-loading, même si
leur contenu est un stub pour l'instant.

## Dépendances à ajouter

- `jwt-decode` — décoder le payload du JWT côté client (rôles,
  expiration) sans dépendance lourde.

Rien d'autre : `HttpClient` et `Router` sont déjà dans `@angular/common`
et `@angular/router` (présents). Pas de state manager externe (NgRx) —
les signals + un service par domaine suffisent à ce périmètre.

## Configuration d'environnement

`src/environments/environment.ts` (dev) et `environment.production.ts` :

```ts
export const environment = {
  apiUrl: 'http://localhost:8080',
};
```

`app.config.ts` fournit `apiUrl` via `InjectionToken` ou import direct
du fichier d'environnement (pattern standard Angular CLI — à générer
avec `ng generate environments` si absent).

## Couche HTTP

- `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`
  dans `app.config.ts`.
- `authInterceptor` : si un token existe (`TokenStorageService`),
  ajoute `Authorization: Bearer <token>` à toute requête vers `apiUrl`.
- `errorInterceptor` : intercepte les réponses `401` → appelle
  `AuthService.logout()` puis redirige vers `/auth/login` (sauf si la
  requête qui a échoué est déjà `/auth/login`, pour ne pas bruiter
  l'écran de connexion lui-même avec un mauvais mot de passe).

## Authentification

`AuthService` (signal-based) :
- `currentUser: Signal<MeResponse | null>`
- `isAuthenticated: Signal<boolean>` (dérivé d'un token présent et non expiré)
- `roles: Signal<string[]>` (décodées du JWT, pas de `MeResponse`)
- `login(credentials)`, `register(data)`, `logout()`,
  `refreshMe()` (appelle `GET /me` pour rafraîchir `currentUser`
  après login ou au bootstrap si un token existe déjà en storage)

Guards :
- `authGuard` — redirige vers `/auth/login` si non connecté (avec
  `returnUrl` en query param)
- `roleGuard(role: string)` — 403/redirect si le rôle n'est pas dans
  `AuthService.roles()`

Pages de cette vague (fonctionnelles, pas des stubs, car l'auth est
elle-même une fondation), toutes sous `/auth/*` pour rester cohérent
avec les chemins imposés par les emails :
- `/auth/login`, `/auth/register`
- `/auth/verified` (lit `?token=` et appelle `GET /auth/confirm`,
  chemin imposé par l'email de confirmation)
- `/auth/forgot-password`
- `/auth/reset` (lit `?token=`, formulaire nouveau mot de passe,
  appelle `POST /auth/reset-password`, chemin imposé par l'email de
  reset)

Formulaires en Reactive Forms (`ReactiveFormsModule`), validation
côté client alignée sur les contraintes backend (`@NotBlank`,
format email) mais le backend reste la source de vérité — toute
erreur 400/409 renvoyée par l'API s'affiche telle quelle sous le
formulaire.

## Système de design

`shared/styles/tokens.css` (variables CSS globales, pas de
préprocesseur — cohérent avec le choix "CSS custom sur-mesure") :

```css
:root {
  --color-navy: #1A1422;
  --color-orange: #F2AA4C;
  --color-bg: #EDE4D3;       /* à affiner sur les captures */
  --color-accent: #E85A4F;   /* bouton "Voir", à affiner */
  --radius: 0;                /* angles nets partout, pas d'arrondi */
  --font-title: 'Press Start 2P', monospace; /* placeholder, remplaçable */
  --font-body: system-ui, sans-serif;
}
```

Composants partagés minimaux pour cette vague (utilisés par toutes
les features suivantes, donc construits maintenant) :
- `Button` (variantes primary/secondary, taille unique pour l'instant)
- `Card` (jaquette + titre + prix + bouton — la brique de toutes les
  grilles de listings)
- `Input` / `Select` (champs de formulaire génériques)
- `Badge` (featured / sold)
- `Navbar` (logo + liens conditionnels par rôle/auth + logout)

Chaque composant partagé a son propre fichier de test (`.spec.ts`,
Vitest déjà configuré) couvrant son rendu et ses états de base
(disabled, variant, contenu vide).

## Squelette de routage

```ts
export const routes: Routes = [
  { path: '', component: HomeStub },                    // vague 1
  { path: 'market', component: MarketStub },             // vague 1
  { path: 'listings/:id', component: ListingDetailStub },// vague 1
  { path: 'auth/login', component: LoginPage },
  { path: 'auth/register', component: RegisterPage },
  { path: 'auth/verified', component: ConfirmPage },      // chemin imposé (email)
  { path: 'auth/forgot-password', component: ForgotPasswordPage },
  { path: 'auth/reset', component: ResetPasswordPage },   // chemin imposé (email)
  {
    path: 'profile', component: ProfileStub,             // vague 4
    canActivate: [authGuard],
  },
  {
    path: 'orders', component: OrdersStub,                // vague 3
    canActivate: [authGuard],
  },
  {
    path: 'my-shop', component: MyShopStub,               // vague 2
    canActivate: [authGuard, roleGuard('SELLER')],
  },
  {
    path: 'cart', component: CartStub,                    // vague 3
    canActivate: [authGuard],
  },
  {
    path: 'checkout', component: CheckoutStub,             // vague 3
    canActivate: [authGuard],
  },
  { path: 'checkout/success', component: CheckoutSuccessStub }, // vague 3
  { path: 'checkout/cancel', component: CheckoutCancelStub },   // vague 3
  {
    path: 'admin/listings', component: AdminListingsStub, // vague 4
    canActivate: [authGuard, roleGuard('ADMIN')],
  },
  { path: '**', redirectTo: '' },
];
```

Les routes marquées "stub" affichent un composant minimal (titre de
page + message "à venir") — leur seul rôle ici est de valider que la
navbar, le routage et les guards fonctionnent de bout en bout avant
que les vagues suivantes ne remplissent le contenu.

## Layout

`ShellComponent` (racine, monté dans `app.html` à la place du contenu
actuel) : `Navbar` fixe en haut (logo cliquable → `/`, liens Market/My
Shop/Profile/Cart visibles seulement si pertinents — My Shop caché si
pas `SELLER`, Login/Register remplacés par Profile/Logout si connecté)
puis `<router-outlet>`.

## Tests

- Vitest (déjà configuré) pour : `AuthService` (login/logout/decode
  JWT/expiration), les deux interceptors, les guards, chaque composant
  partagé (`shared/ui/**`).
- Pas de tests e2e dans cette vague (aucun framework e2e choisi —
  hors périmètre, à décider séparément si besoin).

## Roadmap des vagues suivantes (aperçu, specs séparées)

1. **Market / Home** — grille des 3 sections d'accueil, catalogue
   paginé avec recherche/filtres (genre, plateforme, prix), fiche
   annonce détaillée.
2. **My Shop** — création de boutique, création/édition/suppression
   d'annonces (recherche jeu existant ou création d'un nouveau
   `Game`), vue des commandes reçues + changement de statut.
3. **Panier & Checkout** — gestion du panier, choix du mode de
   livraison (adresse ou recherche point relais Mondial Relay),
   redirection Stripe, pages succès/annulation, historique des
   commandes acheteur.
4. **Profil, avis, admin** — édition profil / suppression compte,
   avis sur une boutique, curation "Pépites" (toggle featured) côté
   admin.

Chacune de ces vagues aura sa propre spec (et son propre plan
d'implémentation) une fois le socle commun posé et validé.

## Hypothèses ouvertes

- **Police** : placeholder Google Fonts (`Press Start 2P`) en
  attendant le fichier définitif. À remplacer par un simple changement
  de `@font-face` dans `typography.css` — aucun autre impact.
- **Langue** : contenu 100% français, pas d'i18n prévue (les maquettes
  et le backend — messages d'erreur, noms de champs — sont en
  français uniquement).
- **Palette exacte** : `--color-bg` et `--color-accent` sont estimées
  depuis les captures fournies, à affiner visuellement une fois les
  premiers écrans montés (pas de code couleur exact fourni au-delà des
  deux SVG).
