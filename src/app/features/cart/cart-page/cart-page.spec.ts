import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CartPage } from './cart-page';
import { CartService } from '../../../core/cart/cart.service';
import { CartItemResponse } from '../../../core/cart/cart.types';

function makeItem(overrides: Partial<CartItemResponse> = {}): CartItemResponse {
  return {
    listingId: 'l1',
    gameName: 'Kingdom Hearts',
    shopName: 'Retro Shop',
    price: 20,
    weightGrams: 300,
    ...overrides,
  };
}

describe('CartPage', () => {
  let cartService: { getCart: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cartService = { getCart: vi.fn(), removeItem: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: CartService, useValue: cartService }],
    });
  });

  it('fetches the cart on construction', () => {
    cartService.getCart.mockReturnValue(of({ items: [makeItem()] }));

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    expect(cartService.getCart).toHaveBeenCalled();
    expect(fixture.componentInstance.items().length).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('subtotal() sums the price of every item', () => {
    cartService.getCart.mockReturnValue(
      of({ items: [makeItem({ price: 20 }), makeItem({ listingId: 'l2', price: 15 })] }),
    );

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.subtotal()).toBe(35);
  });

  it('removeItem() removes the item and refetches the cart', () => {
    cartService.getCart.mockReturnValueOnce(of({ items: [makeItem()] }));
    cartService.removeItem.mockReturnValue(of(undefined));
    cartService.getCart.mockReturnValueOnce(of({ items: [] }));

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    fixture.componentInstance.removeItem('l1');

    expect(cartService.removeItem).toHaveBeenCalledWith('l1');
    expect(fixture.componentInstance.items().length).toBe(0);
  });

  it('removeItem() surfaces an error on failure without removing the item', () => {
    cartService.getCart.mockReturnValue(of({ items: [makeItem()] }));
    cartService.removeItem.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    fixture.componentInstance.removeItem('l1');

    expect(fixture.componentInstance.actionError()).not.toBeNull();
    expect(fixture.componentInstance.items().length).toBe(1);
  });

  it('renders the empty-cart message and a link to the market when the cart has no items', () => {
    cartService.getCart.mockReturnValue(of({ items: [] }));

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ton panier est vide');
    expect(el.querySelector('a[routerLink="/market"]')).not.toBeNull();
  });

  it('renders each item, the subtotal, and a link to checkout when the cart has items', () => {
    cartService.getCart.mockReturnValue(of({ items: [makeItem({ price: 20 })] }));

    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Kingdom Hearts');
    expect(el.textContent).toContain('Retro Shop');
    expect(el.textContent).toContain('Sous-total : 20 €');
    expect(el.querySelector('a[routerLink="/checkout"]')).not.toBeNull();
  });
});
