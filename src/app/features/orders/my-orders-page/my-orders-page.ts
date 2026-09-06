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
  readonly cancellingOrderId = signal<string | null>(null);

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
    if (this.cancellingOrderId() || !window.confirm('Annuler cette commande ?')) {
      return;
    }

    this.actionError.set(null);
    this.cancellingOrderId.set(order.id);
    this.orderService.cancel(order.id).subscribe({
      next: (updated) => {
        this.cancellingOrderId.set(null);
        this.orders.set(this.orders().map((o) => (o.id === updated.id ? updated : o)));
      },
      error: () => {
        this.cancellingOrderId.set(null);
        this.actionError.set("Impossible d'annuler cette commande.");
      },
    });
  }
}
