import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { environment } from '../../../environments/environment';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getShopOrders() calls GET /orders/shop', () => {
    service.getShopOrders().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/orders/shop`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('updateStatus() calls PATCH /orders/{id}/status with the new status', () => {
    service.updateStatus('o1', 'SHIPPED').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/orders/o1/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'SHIPPED' });
    req.flush({});
  });

  it('getMyOrders() calls GET /orders', () => {
    service.getMyOrders().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/orders`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('cancel() calls PATCH /orders/{id}/cancel', () => {
    service.cancel('o1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/orders/o1/cancel`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });
});
