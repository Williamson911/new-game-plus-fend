import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MyOrdersPage } from './my-orders-page';
import { OrderService } from '../../../core/shop/order.service';
import { ReviewService } from '../../../core/reviews/review.service';
import { OrderResponse } from '../../../core/shop/shop.types';

function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 'o1',
    shopName: 'Retro Shop',
    buyerUsername: 'will',
    buyerEmail: 'will@test.dev',
    status: 'PENDING',
    deliveryMode: 'HOME',
    shippingAddress: null,
    relayPoint: null,
    shippingCost: 5,
    createdAt: '2026-01-01T00:00:00',
    items: [{ listingId: 'l1', gameName: 'Kingdom Hearts', price: 20, imageUrl: '' }],
    reviewed: false,
    ...overrides,
  };
}

describe('MyOrdersPage', () => {
  let orderService: { getMyOrders: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> };
  let reviewService: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    orderService = {
      getMyOrders: vi.fn().mockReturnValue(of([makeOrder()])),
      cancel: vi.fn(),
    };
    reviewService = { create: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: OrderService, useValue: orderService },
        { provide: ReviewService, useValue: reviewService },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('fetches the buyer\'s orders on construction', () => {
    const fixture = TestBed.createComponent(MyOrdersPage);

    expect(orderService.getMyOrders).toHaveBeenCalled();
    expect(fixture.componentInstance.orders().length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('orderTotal() sums item prices and shipping cost', () => {
    const fixture = TestBed.createComponent(MyOrdersPage);

    const total = fixture.componentInstance.orderTotal(
      makeOrder({
        items: [
          { listingId: 'l1', gameName: 'A', price: 20, imageUrl: '' },
          { listingId: 'l2', gameName: 'B', price: 10, imageUrl: '' },
        ],
        shippingCost: 5,
      }),
    );

    expect(total).toBe(35);
  });

  it('cancelOrder() cancels and replaces the order in the list when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    orderService.cancel.mockReturnValue(of(makeOrder({ status: 'CANCELLED' })));
    const fixture = TestBed.createComponent(MyOrdersPage);

    fixture.componentInstance.cancelOrder(makeOrder());

    expect(orderService.cancel).toHaveBeenCalledWith('o1');
    expect(fixture.componentInstance.orders()[0].status).toBe('CANCELLED');
  });

  it('cancelOrder() does nothing when the confirmation is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fixture = TestBed.createComponent(MyOrdersPage);

    fixture.componentInstance.cancelOrder(makeOrder());

    expect(orderService.cancel).not.toHaveBeenCalled();
  });

  it('cancelOrder() surfaces an error on failure', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    orderService.cancel.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(MyOrdersPage);

    fixture.componentInstance.cancelOrder(makeOrder());

    expect(fixture.componentInstance.actionError()).not.toBeNull();
  });

  it('shows the shipping address for a HOME delivery', () => {
    orderService.getMyOrders.mockReturnValue(
      of([
        makeOrder({
          deliveryMode: 'HOME',
          shippingAddress: {
            street: 'Rue de la Gare',
            streetNumber: '12',
            postCode: '4000',
            city: 'Liège',
            country: 'Belgique',
          },
        }),
      ]),
    );
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rue de la Gare');
  });

  it('shows the relay point for a RELAY_POINT delivery', () => {
    orderService.getMyOrders.mockReturnValue(
      of([
        makeOrder({
          deliveryMode: 'RELAY_POINT',
          relayPoint: {
            relayId: 'r1',
            relayName: 'Point Relais Centre',
            relayStreet: 'Place Saint-Lambert',
            relayPostCode: '4000',
            relayCity: 'Liège',
            relayCountry: 'Belgique',
          },
        }),
      ]),
    );
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Point Relais Centre');
  });

  it('does not show a cancel button for a non-PENDING order', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED' })]));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.includes('Annuler'))).toBe(false);
  });

  it('shows a review form for a DELIVERED order with no review yet', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: false })]));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Laisser un avis');
  });

  it('does not show a review form for a DELIVERED order that already has one', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: true })]));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Laisser un avis');
  });

  it('submitReview() creates the review and marks the order as reviewed on success', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: false })]));
    reviewService.create.mockReturnValue(of({ id: 'rv1', authorUsername: 'will', rating: 5, comment: null, createdAt: '2026-01-01T00:00:00' }));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    fixture.componentInstance.submitReview(makeOrder({ status: 'DELIVERED', reviewed: false }));

    expect(reviewService.create).toHaveBeenCalledWith({ orderId: 'o1', rating: 5, comment: null });
    expect(fixture.componentInstance.orders()[0].reviewed).toBe(true);
  });

  it('submitReview() marks the order as reviewed even on a 409 (already reviewed elsewhere)', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: false })]));
    reviewService.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    fixture.componentInstance.submitReview(makeOrder({ status: 'DELIVERED', reviewed: false }));

    expect(fixture.componentInstance.orders()[0].reviewed).toBe(true);
    expect(fixture.componentInstance.reviewErrors()['o1']).toBeTruthy();
  });

  it('submitReview() shows a generic error and keeps the form on a non-409 failure', () => {
    orderService.getMyOrders.mockReturnValue(of([makeOrder({ status: 'DELIVERED', reviewed: false })]));
    reviewService.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(MyOrdersPage);
    fixture.detectChanges();

    fixture.componentInstance.submitReview(makeOrder({ status: 'DELIVERED', reviewed: false }));

    expect(fixture.componentInstance.orders()[0].reviewed).toBe(false);
    expect(fixture.componentInstance.reviewErrors()['o1']).toBeTruthy();
  });
});
