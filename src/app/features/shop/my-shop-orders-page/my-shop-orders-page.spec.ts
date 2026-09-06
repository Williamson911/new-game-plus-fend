import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MyShopOrdersPage } from './my-shop-orders-page';
import { OrderService } from '../../../core/shop/order.service';
import { OrderResponse } from '../../../core/shop/shop.types';

function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    id: 'o1',
    shopName: 'Retro Shop',
    buyerUsername: 'will',
    buyerEmail: 'will@test.dev',
    status: 'PAID',
    deliveryMode: 'HOME',
    shippingAddress: null,
    relayPoint: null,
    shippingCost: 5,
    createdAt: '2026-01-01T00:00:00',
    items: [{ listingId: 'l1', gameName: 'Kingdom Hearts', price: 20 }],
    reviewed: false,
    ...overrides,
  };
}

describe('MyShopOrdersPage', () => {
  let orderService: { getShopOrders: ReturnType<typeof vi.fn>; updateStatus: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    orderService = {
      getShopOrders: vi.fn().mockReturnValue(of([makeOrder()])),
      updateStatus: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: OrderService, useValue: orderService }],
    });
  });

  it('fetches shop orders on construction', () => {
    const fixture = TestBed.createComponent(MyShopOrdersPage);

    expect(orderService.getShopOrders).toHaveBeenCalled();
    expect(fixture.componentInstance.orders().length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('nextStatusesFor() returns only the backend-allowed transitions', () => {
    const fixture = TestBed.createComponent(MyShopOrdersPage);

    expect(fixture.componentInstance.nextStatusesFor(makeOrder({ status: 'PENDING' }))).toEqual(['CANCELLED']);
    expect(fixture.componentInstance.nextStatusesFor(makeOrder({ status: 'PAID' }))).toEqual([
      'SHIPPED',
      'CANCELLED',
    ]);
    expect(fixture.componentInstance.nextStatusesFor(makeOrder({ status: 'SHIPPED' }))).toEqual([
      'DELIVERED',
      'CANCELLED',
    ]);
    expect(fixture.componentInstance.nextStatusesFor(makeOrder({ status: 'DELIVERED' }))).toEqual([]);
    expect(fixture.componentInstance.nextStatusesFor(makeOrder({ status: 'CANCELLED' }))).toEqual([]);
  });

  it('orderTotal() sums item prices and shipping cost', () => {
    const fixture = TestBed.createComponent(MyShopOrdersPage);

    const total = fixture.componentInstance.orderTotal(
      makeOrder({
        items: [
          { listingId: 'l1', gameName: 'A', price: 20 },
          { listingId: 'l2', gameName: 'B', price: 10 },
        ],
        shippingCost: 5,
      }),
    );

    expect(total).toBe(35);
  });

  it('updateStatus() replaces the order in the list with the updated response', () => {
    orderService.updateStatus.mockReturnValue(of(makeOrder({ status: 'SHIPPED' })));
    const fixture = TestBed.createComponent(MyShopOrdersPage);

    fixture.componentInstance.updateStatus(makeOrder(), 'SHIPPED');

    expect(orderService.updateStatus).toHaveBeenCalledWith('o1', 'SHIPPED');
    expect(fixture.componentInstance.orders()[0].status).toBe('SHIPPED');
  });

  it('shows the shipping address for a HOME delivery', () => {
    orderService.getShopOrders.mockReturnValue(
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
    const fixture = TestBed.createComponent(MyShopOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rue de la Gare');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Liège');
  });

  it('shows the relay point for a RELAY_POINT delivery', () => {
    orderService.getShopOrders.mockReturnValue(
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
    const fixture = TestBed.createComponent(MyShopOrdersPage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Point Relais Centre');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Place Saint-Lambert');
  });
});
