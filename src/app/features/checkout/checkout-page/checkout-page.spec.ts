import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CheckoutPage } from './checkout-page';
import { CartService } from '../../../core/cart/cart.service';
import { CheckoutService } from '../../../core/cart/checkout.service';
import { ShippingService } from '../../../core/cart/shipping.service';
import { RelayPointResult } from '../../../core/cart/cart.types';

function makeRelayPoint(overrides: Partial<RelayPointResult> = {}): RelayPointResult {
  return {
    id: 'r1',
    name: 'Point Relais Centre',
    street: 'Place Saint-Lambert',
    postCode: '4000',
    city: 'Liège',
    country: 'BE',
    ...overrides,
  };
}

describe('CheckoutPage', () => {
  let cartService: { getCart: ReturnType<typeof vi.fn> };
  let checkoutService: { checkout: ReturnType<typeof vi.fn> };
  let shippingService: { findRelayPoints: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cartService = {
      getCart: vi.fn().mockReturnValue(
        of({
          items: [
            { listingId: 'l1', gameName: 'A', shopName: 'Shop A', price: 20, weightGrams: 300 },
            { listingId: 'l2', gameName: 'B', shopName: 'Shop B', price: 15, weightGrams: 500 },
          ],
        }),
      ),
    };
    checkoutService = { checkout: vi.fn() };
    shippingService = { findRelayPoints: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: CartService, useValue: cartService },
        { provide: CheckoutService, useValue: checkoutService },
        { provide: ShippingService, useValue: shippingService },
      ],
    });
  });

  it('fetches the cart and computes subtotal and total weight', () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.subtotal()).toBe(35);
    expect(fixture.componentInstance.totalWeightGrams()).toBe(800);
  });

  it('estimatedShipping() recomputes when the delivery mode changes', () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.estimatedShipping()).toBe(6.99);

    fixture.componentInstance.setDeliveryMode('RELAY_POINT');

    expect(fixture.componentInstance.estimatedShipping()).toBe(5.99);
  });

  it('searchRelayPoints() calls the service and populates results when the search form is valid', () => {
    shippingService.findRelayPoints.mockReturnValue(of([makeRelayPoint()]));
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    fixture.componentInstance.relaySearchForm.setValue({ postCode: '4000', country: 'BE' });
    fixture.componentInstance.searchRelayPoints();

    expect(shippingService.findRelayPoints).toHaveBeenCalledWith('4000', 'BE');
    expect(fixture.componentInstance.relayResults().length).toBe(1);
  });

  it('searchRelayPoints() does nothing when the search form is invalid', () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    fixture.componentInstance.relaySearchForm.setValue({ postCode: '', country: 'BE' });
    fixture.componentInstance.searchRelayPoints();

    expect(shippingService.findRelayPoints).not.toHaveBeenCalled();
  });

  it('searchRelayPoints() resets the loading flag and surfaces an error on failure', () => {
    shippingService.findRelayPoints.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    fixture.componentInstance.relaySearchForm.setValue({ postCode: '4000', country: 'BE' });
    fixture.componentInstance.searchRelayPoints();

    expect(fixture.componentInstance.searchingRelayPoints()).toBe(false);
    expect(fixture.componentInstance.relaySearchError()).not.toBeNull();
  });

  it('setDeliveryMode() clears any previously selected relay point and search results', () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    fixture.componentInstance.setDeliveryMode('RELAY_POINT');
    fixture.componentInstance.selectRelayPoint(makeRelayPoint());

    fixture.componentInstance.setDeliveryMode('HOME');
    fixture.componentInstance.setDeliveryMode('RELAY_POINT');

    expect(fixture.componentInstance.selectedRelayPoint()).toBeNull();
    expect(fixture.componentInstance.relayResults()).toEqual([]);
  });

  it('submit() with HOME delivery sends the address form and redirects to the checkout URL on success', () => {
    checkoutService.checkout.mockReturnValue(
      of({ orders: [], checkoutUrl: 'https://checkout.stripe.com/test' }),
    );
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    const redirectSpy = vi.spyOn(fixture.componentInstance, 'redirectTo' as never);

    fixture.componentInstance.addressForm.setValue({
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    });
    fixture.componentInstance.submit();

    expect(checkoutService.checkout).toHaveBeenCalledWith({
      deliveryMode: 'HOME',
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    });
    expect(redirectSpy).toHaveBeenCalledWith('https://checkout.stripe.com/test');
  });

  it('submit() with RELAY_POINT delivery does nothing until a relay point is selected', () => {
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    fixture.componentInstance.setDeliveryMode('RELAY_POINT');

    fixture.componentInstance.submit();

    expect(checkoutService.checkout).not.toHaveBeenCalled();
  });

  it('submit() with a selected relay point sends its fields and redirects on success', () => {
    checkoutService.checkout.mockReturnValue(
      of({ orders: [], checkoutUrl: 'https://checkout.stripe.com/test' }),
    );
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();
    fixture.componentInstance.setDeliveryMode('RELAY_POINT');
    fixture.componentInstance.selectRelayPoint(makeRelayPoint());

    fixture.componentInstance.submit();

    expect(checkoutService.checkout).toHaveBeenCalledWith({
      deliveryMode: 'RELAY_POINT',
      relayPointId: 'r1',
      relayPointName: 'Point Relais Centre',
      relayPointStreet: 'Place Saint-Lambert',
      relayPointPostCode: '4000',
      relayPointCity: 'Liège',
      relayPointCountry: 'BE',
    });
  });

  it('submit() shows an inline error when an item became unavailable (409)', () => {
    checkoutService.checkout.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    fixture.componentInstance.addressForm.setValue({
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.error()).toContain('panier');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });

  it('submit() shows a generic inline error for any other failure', () => {
    checkoutService.checkout.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(CheckoutPage);
    fixture.detectChanges();

    fixture.componentInstance.addressForm.setValue({
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.error()).toBe('Impossible de finaliser la commande.');
    expect(fixture.componentInstance.submitting()).toBe(false);
  });
});
