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
});
