import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ListingService } from './listing.service';
import { environment } from '../../../environments/environment';

describe('ListingService', () => {
  let service: ListingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ListingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getLatest() calls GET /listings/latest with the given limit', () => {
    service.getLatest(5).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/latest?limit=5`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getLatest() defaults limit to 8', () => {
    service.getLatest().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/latest?limit=8`);
    req.flush([]);
  });

  it('getFeatured() calls GET /listings/featured with the given limit', () => {
    service.getFeatured(3).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/featured?limit=3`);
    req.flush([]);
  });

  it('getCheap() calls GET /listings/cheap with the given limit', () => {
    service.getCheap(3).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/cheap?limit=3`);
    req.flush([]);
  });

  it('getById() calls GET /listings/{id}', () => {
    service.getById('abc-123').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/listings/abc-123`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('search() with no filters only sends page and size', () => {
    service.search({}, 0, 12).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/listings`);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('12');
    expect(req.request.params.keys().length).toBe(2);
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 });
  });

  it('search() includes only the non-empty/non-null filter params', () => {
    service
      .search({ search: 'zelda', genreId: '', platform: 'PC', minPrice: null, maxPrice: 30 }, 1, 12)
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/listings`);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('12');
    expect(req.request.params.get('search')).toBe('zelda');
    expect(req.request.params.get('platform')).toBe('PC');
    expect(req.request.params.get('maxPrice')).toBe('30');
    expect(req.request.params.has('genreId')).toBe(false);
    expect(req.request.params.has('minPrice')).toBe(false);
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 1, size: 12 });
  });
});
