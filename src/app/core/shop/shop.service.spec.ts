import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ShopService } from './shop.service';
import { environment } from '../../../environments/environment';

describe('ShopService', () => {
  let service: ShopService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ShopService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getMine() returns the shop when one exists', () => {
    let result: unknown;
    service.getMine().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/shops/me`);
    req.flush({ id: 's1', name: 'Retro Shop', description: 'desc' });

    expect(result).toEqual({ id: 's1', name: 'Retro Shop', description: 'desc' });
  });

  it('getMine() resolves to null (not an error) on a 404', () => {
    let result: unknown = 'not-set';
    service.getMine().subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.apiUrl}/shops/me`);
    req.flush('not found', { status: 404, statusText: 'Not Found' });

    expect(result).toBeNull();
  });

  it('getById() calls GET /shops/{id}', () => {
    service.getById('s1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/shops/s1`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 's1', name: 'Retro Shop', description: 'A shop' });
  });

  it('create() calls POST /shops', () => {
    service.create({ name: 'Retro Shop', description: 'desc' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/shops`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Retro Shop', description: 'desc' });
    req.flush({ shop: { id: 's1', name: 'Retro Shop', description: 'desc' }, token: 'tok' });
  });

  it('delete() calls DELETE /shops', () => {
    service.delete().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/shops`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
