import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CartService } from './cart.service';
import { environment } from '../../../environments/environment';

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getCart() calls GET /cart', () => {
    service.getCart().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cart`);
    expect(req.request.method).toBe('GET');
    req.flush({ items: [] });
  });

  it('addItem() calls POST /cart/items with the listing id', () => {
    service.addItem('l1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ listingId: 'l1' });
    req.flush({ items: [] });
  });

  it('removeItem() calls DELETE /cart/items/{listingId}', () => {
    service.removeItem('l1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/cart/items/l1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
