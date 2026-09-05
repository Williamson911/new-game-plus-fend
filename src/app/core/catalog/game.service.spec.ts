import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GameService } from './game.service';
import { environment } from '../../../environments/environment';

describe('GameService', () => {
  let service: GameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getById() calls GET /games/{id}', () => {
    service.getById('g-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/games/g-1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('getPlatforms() calls GET /games/platforms', () => {
    service.getPlatforms().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/games/platforms`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('search() calls GET /games with name, page, and size', () => {
    service.search('zelda', 0, 10).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/games?name=zelda&page=0&size=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
  });

  it('create() calls POST /games with the full game payload', () => {
    const request = {
      name: 'New Game',
      description: 'desc',
      genreIds: ['g1'],
      publisher: 'Pub',
      developer: 'Dev',
      platform: 'PC',
      releaseDate: '2020-01-01',
      coverURL: null,
      igdbID: null,
      weightGrams: 200,
    };
    service.create(request).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/games`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({});
  });
});
