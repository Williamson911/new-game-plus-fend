import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
  });

  it('returns null when no token is stored', () => {
    expect(service.getToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    service.setToken('abc.def.ghi');
    expect(service.getToken()).toBe('abc.def.ghi');
  });

  it('clears a stored token', () => {
    service.setToken('abc.def.ghi');
    service.clearToken();
    expect(service.getToken()).toBeNull();
  });
});
