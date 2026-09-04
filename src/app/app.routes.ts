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
