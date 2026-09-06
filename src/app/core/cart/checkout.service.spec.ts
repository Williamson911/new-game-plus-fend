import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CheckoutService } from './checkout.service';
import { environment } from '../../../environments/environment';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('checkout() calls POST /orders/checkout with the request body', () => {
    const request = {
      deliveryMode: 'HOME' as const,
      street: 'Rue de la Paix',
      streetNumber: '12',
      postCode: '4000',
      city: 'Liège',
      country: 'BE',
    };
    service.checkout(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/orders/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ orders: [], checkoutUrl: 'https://checkout.stripe.com/test' });
  });
});
