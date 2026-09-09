import { Component, inject, signal } from '@angular/core';
import { OrderService } from '../../../core/shop/order.service';
import { OrderInvoiceService } from '../../../shared/pdf/order-invoice.service';
import { Button } from '../../../shared/ui/button/button';
import { OrderResponse, OrderStatus } from '../../../core/shop/shop.types';

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Component({
  selector: 'app-my-shop-orders-page',
  imports: [Button],
  templateUrl: './my-shop-orders-page.html',
  styleUrl: './my-shop-orders-page.css',
})
export class MyShopOrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly orderInvoiceService = inject(OrderInvoiceService);

  readonly orders = signal<OrderResponse[]>([]);
  readonly loading = signal(true);

  constructor() {
    this.orderService.getShopOrders().subscribe((orders) => {
      this.orders.set(orders);
      this.loading.set(false);
    });
  }

  nextStatusesFor(order: OrderResponse): OrderStatus[] {
    return NEXT_STATUSES[order.status];
  }

  orderTotal(order: OrderResponse): number {
    return order.items.reduce((sum, item) => sum + item.price, 0) + order.shippingCost;
  }

  updateStatus(order: OrderResponse, status: OrderStatus): void {
    this.orderService.updateStatus(order.id, status).subscribe((updated) => {
      this.orders.set(this.orders().map((o) => (o.id === updated.id ? updated : o)));
    });
  }

  exportPdf(order: OrderResponse): void {
    this.orderInvoiceService.generateInvoice(order).save(`facture-${order.id}.pdf`);
  }
}
