import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CartService } from '../../../core/cart/cart.service';
import { CheckoutService } from '../../../core/cart/checkout.service';
import { ShippingService } from '../../../core/cart/shipping.service';
import { estimateShippingCost } from '../../../core/cart/shipping-rate';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SelectField } from '../../../shared/ui/select-field/select-field';
import { Button } from '../../../shared/ui/button/button';
import { CartItemResponse, CheckoutRequest, DeliveryMode, RelayPointResult } from '../../../core/cart/cart.types';

const COUNTRY_OPTIONS = [
  { value: 'BE', label: 'Belgique' },
  { value: 'FR', label: 'France' },
];

@Component({
  selector: 'app-checkout-page',
  imports: [ReactiveFormsModule, TextField, SelectField, Button],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
})
export class CheckoutPage {
  private readonly fb = inject(FormBuilder);
  private readonly cartService = inject(CartService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly shippingService = inject(ShippingService);

  readonly countryOptions = COUNTRY_OPTIONS;

  readonly items = signal<CartItemResponse[]>([]);
  readonly loading = signal(true);

  readonly deliveryMode = signal<DeliveryMode>('HOME');

  readonly addressForm = this.fb.nonNullable.group({
    street: ['', Validators.required],
    streetNumber: ['', Validators.required],
    postCode: ['', Validators.required],
    city: ['', Validators.required],
    country: ['BE', Validators.required],
  });

  readonly relaySearchForm = this.fb.nonNullable.group({
    postCode: ['', Validators.required],
    country: ['BE', Validators.required],
  });
  readonly relayResults = signal<RelayPointResult[]>([]);
  readonly selectedRelayPoint = signal<RelayPointResult | null>(null);
  readonly searchingRelayPoints = signal(false);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly relaySearchError = signal<string | null>(null);

  readonly subtotal = computed(() => this.items().reduce((sum, item) => sum + item.price, 0));
  readonly totalWeightGrams = computed(() => this.items().reduce((sum, item) => sum + item.weightGrams, 0));
  readonly estimatedShipping = computed(() => estimateShippingCost(this.deliveryMode(), this.totalWeightGrams()));
  readonly estimatedTotal = computed(() => this.subtotal() + this.estimatedShipping());

  constructor() {
    this.cartService.getCart().subscribe((cart) => {
      this.items.set(cart.items);
      this.loading.set(false);
    });
  }

  setDeliveryMode(mode: DeliveryMode): void {
    this.deliveryMode.set(mode);
    this.selectedRelayPoint.set(null);
    this.relayResults.set([]);
  }

  searchRelayPoints(): void {
    if (this.relaySearchForm.invalid) {
      return;
    }

    this.searchingRelayPoints.set(true);
    this.relaySearchError.set(null);
    const { postCode, country } = this.relaySearchForm.getRawValue();
    this.shippingService.findRelayPoints(postCode, country).subscribe({
      next: (results) => {
        this.relayResults.set(results);
        this.searchingRelayPoints.set(false);
      },
      error: () => {
        this.searchingRelayPoints.set(false);
        this.relaySearchError.set('Impossible de rechercher les points relais, réessaie.');
      },
    });
  }

  selectRelayPoint(point: RelayPointResult): void {
    this.selectedRelayPoint.set(point);
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    const request = this.buildRequest();
    if (!request) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.checkoutService.checkout(request).subscribe({
      next: (response) => {
        this.redirectTo(response.checkoutUrl);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        this.error.set(this.mapError(err));
      },
    });
  }

  protected redirectTo(url: string): void {
    window.location.href = url;
  }

  private buildRequest(): CheckoutRequest | null {
    if (this.deliveryMode() === 'HOME') {
      if (this.addressForm.invalid) {
        return null;
      }
      return { deliveryMode: 'HOME', ...this.addressForm.getRawValue() };
    }

    const point = this.selectedRelayPoint();
    if (!point) {
      return null;
    }

    return {
      deliveryMode: 'RELAY_POINT',
      relayPointId: point.id,
      relayPointName: point.name,
      relayPointStreet: point.street,
      relayPointPostCode: point.postCode,
      relayPointCity: point.city,
      relayPointCountry: point.country,
    };
  }

  private mapError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      return "Un article n'est plus disponible, retourne à ton panier.";
    }
    return 'Impossible de finaliser la commande.';
  }
}
