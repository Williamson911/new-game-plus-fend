import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GenreService } from './genre.service';
import { environment } from '../../../environments/environment';

describe('GenreService', () => {
  let service: GenreService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GenreService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll() calls GET /genres', () => {
    service.getAll().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/genres`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
