import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmPage } from './confirm-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('ConfirmPage', () => {
  let authService: { confirmEmail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { confirmEmail: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  });

  it('calls confirmEmail with the token input and shows a success message', () => {
    authService.confirmEmail.mockReturnValue(of({ username: 'will' }));
    const fixture = TestBed.createComponent(ConfirmPage);
    fixture.componentRef.setInput('token', 'tok-123');
    fixture.detectChanges();

    expect(authService.confirmEmail).toHaveBeenCalledWith('tok-123');
    expect(fixture.componentInstance.status()).toBe('success');
  });

  it('shows an error state when confirmation fails', () => {
    authService.confirmEmail.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const fixture = TestBed.createComponent(ConfirmPage);
    fixture.componentRef.setInput('token', 'bad-token');
    fixture.detectChanges();

    expect(fixture.componentInstance.status()).toBe('error');
  });

  it('shows an error state immediately when no token is present', () => {
    const fixture = TestBed.createComponent(ConfirmPage);
    fixture.componentRef.setInput('token', null);
    fixture.detectChanges();

    expect(authService.confirmEmail).not.toHaveBeenCalled();
    expect(fixture.componentInstance.status()).toBe('error');
  });
});
