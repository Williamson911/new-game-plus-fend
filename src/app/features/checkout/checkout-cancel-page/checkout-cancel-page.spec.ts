import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CheckoutCancelPage } from './checkout-cancel-page';

describe('CheckoutCancelPage', () => {
  it('shows a cancellation message with a link back to the cart', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CheckoutCancelPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('annulé');
    expect(el.querySelector('a[routerLink="/cart"]')).not.toBeNull();
  });
});
