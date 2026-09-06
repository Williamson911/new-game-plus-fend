import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ShippingService } from './shipping.service';
import { environment } from '../../../environments/environment';

describe('ShippingService', () => {
  let service: ShippingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ShippingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('findRelayPoints() calls GET /shipping/relay-points with postCode and country', () => {
    service.findRelayPoints('4000', 'BE').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/shipping/relay-points?postCode=4000&country=BE`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
