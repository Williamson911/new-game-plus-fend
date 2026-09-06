import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ProfilePage } from './profile-page';
import { AuthService } from '../../../core/auth/auth.service';
import { MeResponse } from '../../../core/auth/auth.types';

function makeMe(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: 'u1',
    username: 'will',
    email: 'will@test.dev',
    createdAt: '2026-01-01T00:00:00',
    ...overrides,
  };
}

describe('ProfilePage', () => {
  let authService: {
    refreshMe: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    authService = {
      refreshMe: vi.fn().mockReturnValue(of(makeMe())),
      updateProfile: vi.fn(),
      deleteAccount: vi.fn(),
      logout: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it('pre-fills the form from refreshMe()', () => {
    authService.refreshMe.mockReturnValue(of(makeMe()));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      username: 'will',
      email: 'will@test.dev',
    });
  });

  it('submit() updates the profile and shows a confirmation on success', () => {
    authService.updateProfile.mockReturnValue(of(makeMe({ username: 'newname' })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ username: 'newname', email: 'will@test.dev' });
    fixture.componentInstance.submit();

    expect(authService.updateProfile).toHaveBeenCalledWith({ username: 'newname', email: 'will@test.dev' });
    expect(fixture.componentInstance.updateSuccess()).toBe(true);
  });

  it('submit() shows an inline error on a 409 conflict', () => {
    authService.updateProfile.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.updateError()).not.toBeNull();
    expect(fixture.componentInstance.updateSuccess()).toBe(false);
  });

  it('deleteAccount() does nothing when the confirmation is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.deleteAccount();

    expect(authService.deleteAccount).not.toHaveBeenCalled();
  });

  it('deleteAccount() logs out and navigates home on success when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    authService.deleteAccount.mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.deleteAccount();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('deleteAccount() shows an inline error on a 409 conflict, without logging out', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    authService.deleteAccount.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.deleteAccount();

    expect(fixture.componentInstance.deleteError()).not.toBeNull();
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
