import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewService } from './review.service';
import { environment } from '../../../environments/environment';

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getByShop() calls GET /reviews/shop/{shopId}', () => {
    service.getByShop('s1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/reviews/shop/s1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create() calls POST /reviews with the request body', () => {
    const request = { orderId: 'o1', rating: 5, comment: 'Nickel' };
    service.create(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/reviews`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 'rv1', authorUsername: 'will', rating: 5, comment: 'Nickel', createdAt: '2026-01-01T00:00:00' });
  });
});
