import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ProfilePage } from './profile-page';
import { AuthService } from '../../../core/auth/auth.service';
import { MeResponse } from '../../../core/auth/auth.types';
import { WalletService } from '../../../core/shop/wallet.service';
import { WalletResponse } from '../../../core/shop/wallet.types';

function makeMe(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    id: 'u1',
    username: 'will',
    email: 'will@test.dev',
    createdAt: '2026-01-01T00:00:00',
    ...overrides,
  };
}

function makeWallet(overrides: Partial<WalletResponse> = {}): WalletResponse {
  return {
    balance: 0,
    totalEarned: 0,
    totalPaidOut: 0,
    commissionRate: 0.1,
    payouts: [],
    ...overrides,
  };
}

describe('ProfilePage', () => {
  let authService: {
    refreshMe: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    hasRole: ReturnType<typeof vi.fn>;
  };
  let walletService: {
    getWallet: ReturnType<typeof vi.fn>;
    requestPayout: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    authService = {
      refreshMe: vi.fn().mockReturnValue(of(makeMe())),
      updateProfile: vi.fn(),
      deleteAccount: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn().mockReturnValue(false),
    };
    walletService = {
      getWallet: vi.fn().mockReturnValue(of(makeWallet())),
      requestPayout: vi.fn().mockReturnValue(of(makeWallet())),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: WalletService, useValue: walletService },
      ],
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

  it('does not load the wallet for a non-seller', () => {
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    expect(fixture.componentInstance.isSeller()).toBe(false);
    expect(walletService.getWallet).not.toHaveBeenCalled();
  });

  it('loads the wallet for a seller', () => {
    authService.hasRole.mockReturnValue(true);
    walletService.getWallet.mockReturnValue(of(makeWallet({ balance: 42.5 })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    expect(fixture.componentInstance.isSeller()).toBe(true);
    expect(fixture.componentInstance.wallet()?.balance).toBe(42.5);
  });

  it('requestPayout() updates the wallet on success', () => {
    authService.hasRole.mockReturnValue(true);
    walletService.getWallet.mockReturnValue(of(makeWallet({ balance: 42.5 })));
    walletService.requestPayout.mockReturnValue(of(makeWallet({ balance: 0, totalPaidOut: 42.5 })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.requestPayout();

    expect(walletService.requestPayout).toHaveBeenCalled();
    expect(fixture.componentInstance.wallet()?.balance).toBe(0);
  });

  it('requestPayout() shows an error on failure', () => {
    authService.hasRole.mockReturnValue(true);
    walletService.getWallet.mockReturnValue(of(makeWallet({ balance: 42.5 })));
    walletService.requestPayout.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    fixture.componentInstance.requestPayout();

    expect(fixture.componentInstance.payoutError()).not.toBeNull();
  });
});
