import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CheckoutSuccessPage } from './checkout-success-page';

describe('CheckoutSuccessPage', () => {
  it('shows a confirmation message with links to orders and market', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CheckoutSuccessPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Merci');
    expect(el.querySelector('a[routerLink="/orders"]')).not.toBeNull();
    expect(el.querySelector('a[routerLink="/market"]')).not.toBeNull();
  });
});
