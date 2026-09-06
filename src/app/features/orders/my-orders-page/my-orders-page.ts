import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrderService } from '../../../core/shop/order.service';
import { ReviewService } from '../../../core/reviews/review.service';
import { Button } from '../../../shared/ui/button/button';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { OrderResponse } from '../../../core/shop/shop.types';

const RATING_OPTIONS: SelectOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

@Component({
  selector: 'app-my-orders-page',
  imports: [ReactiveFormsModule, Button, TextField, SelectField],
  templateUrl: './my-orders-page.html',
  styleUrl: './my-orders-page.css',
})
export class MyOrdersPage {
  private readonly fb = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly reviewService = inject(ReviewService);

  readonly ratingOptions = RATING_OPTIONS;

  readonly orders = signal<OrderResponse[]>([]);
  readonly loading = signal(true);
  readonly actionError = signal<string | null>(null);
  readonly cancellingOrderId = signal<string | null>(null);

  readonly reviewForms: Record<string, FormGroup> = {};
  readonly submittingReviewFor = signal<string | null>(null);
  readonly reviewErrors = signal<Record<string, string>>({});

  constructor() {
    this.orderService.getMyOrders().subscribe((orders) => {
      this.orders.set(orders);
      this.loading.set(false);
      for (const order of orders) {
        if (order.status === 'DELIVERED' && !order.reviewed) {
          this.reviewForms[order.id] = this.fb.nonNullable.group({
            rating: ['5', Validators.required],
            comment: [''],
          });
        }
      }
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

  submitReview(order: OrderResponse): void {
    if (this.submittingReviewFor()) {
      return;
    }

    const form = this.reviewForms[order.id];
    if (!form) {
      return;
    }
    const { rating, comment } = form.getRawValue() as { rating: string; comment: string };

    this.reviewErrors.set({ ...this.reviewErrors(), [order.id]: '' });
    this.submittingReviewFor.set(order.id);

    this.reviewService.create({ orderId: order.id, rating: Number(rating), comment: comment || null }).subscribe({
      next: () => {
        this.submittingReviewFor.set(null);
        this.markReviewed(order.id);
      },
      error: (err: unknown) => {
        this.submittingReviewFor.set(null);
        if (err instanceof HttpErrorResponse && err.status === 409) {
          // Already reviewed elsewhere (race with another tab/request): the end
          // state the UI cares about — this order has a review — is true either
          // way, so treat it as a soft success rather than a hard failure.
          this.reviewErrors.set({ ...this.reviewErrors(), [order.id]: 'Cette commande a déjà un avis.' });
          this.markReviewed(order.id);
        } else {
          // Any other failure (network error, 500, etc.) is a genuine failure:
          // no review was recorded, so keep the form so the user can retry.
          this.reviewErrors.set({ ...this.reviewErrors(), [order.id]: "Impossible d'enregistrer cet avis." });
        }
      },
    });
  }

  private markReviewed(orderId: string): void {
    this.orders.set(this.orders().map((o) => (o.id === orderId ? { ...o, reviewed: true } : o)));
    delete this.reviewForms[orderId];
  }
}
