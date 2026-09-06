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

  readonly actionError = signal<string | null>(null);

  constructor() {
    this.fetchCart();
  }

  removeItem(listingId: string): void {
    this.actionError.set(null);
    this.cartService.removeItem(listingId).subscribe({
      next: () => this.fetchCart(),
      error: () => this.actionError.set('Impossible de retirer cet article du panier.'),
    });
  }

  private fetchCart(): void {
    this.loading.set(true);
    this.cartService.getCart().subscribe((cart) => {
      this.items.set(cart.items);
      this.loading.set(false);
    });
  }
}
