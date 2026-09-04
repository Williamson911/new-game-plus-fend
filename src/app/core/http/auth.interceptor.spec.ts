import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { TokenStorageService } from '../auth/token-storage.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => httpMock.verify());

  it('adds the Authorization header when a token is stored', () => {
    tokenStorage.setToken('my-token');

    http.get(`${environment.apiUrl}/listings`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/listings`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush([]);
  });

  it('does not add the header when no token is stored', () => {
    http.get(`${environment.apiUrl}/listings`).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/listings`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('does not add the header for requests to a different origin', () => {
    tokenStorage.setToken('my-token');

    http.get('https://api.mondialrelay.com/ping').subscribe();

    const req = httpMock.expectOne('https://api.mondialrelay.com/ping');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
