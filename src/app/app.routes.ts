import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
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
  {
    path: 'shops/:id',
    loadComponent: () => import('./features/shop/shop-page/shop-page').then((m) => m.ShopPage),
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
    loadComponent: () => import('./features/profile/profile-page/profile-page').then((m) => m.ProfilePage),
    canActivate: [authGuard],
  },
  {
    path: 'orders',
    loadComponent: () => import('./features/orders/my-orders-page/my-orders-page').then((m) => m.MyOrdersPage),
    canActivate: [authGuard],
  },
  {
    path: 'my-shop',
    loadComponent: () => import('./features/shop/my-shop-page/my-shop-page').then((m) => m.MyShopPage),
    canActivate: [authGuard],
  },
  {
    path: 'my-shop/listings/new',
    loadComponent: () =>
      import('./features/shop/new-listing-page/new-listing-page').then((m) => m.NewListingPage),
    canActivate: [authGuard, roleGuard('SELLER')],
  },
  {
    path: 'my-shop/orders',
    loadComponent: () =>
      import('./features/shop/my-shop-orders-page/my-shop-orders-page').then((m) => m.MyShopOrdersPage),
    canActivate: [authGuard, roleGuard('SELLER')],
  },
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
  {
    path: 'admin/listings',
    loadComponent: () =>
      import('./features/admin/admin-listings-page/admin-listings-page').then((m) => m.AdminListingsPage),
    canActivate: [authGuard, roleGuard('ADMIN')],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
