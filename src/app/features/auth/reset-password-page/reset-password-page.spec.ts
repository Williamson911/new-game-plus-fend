import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ResetPasswordPage } from './reset-password-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('ResetPasswordPage', () => {
  let authService: { resetPassword: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authService = { resetPassword: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('does not submit when there is no token', () => {
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentRef.setInput('token', null);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newSecret1', confirmPassword: 'newSecret1' });
    fixture.componentInstance.submit();

    expect(authService.resetPassword).not.toHaveBeenCalled();
    expect(fixture.componentInstance.missingToken()).toBe(true);
  });

  it('does not submit when passwords do not match', () => {
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentRef.setInput('token', 'tok-123');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newSecret1', confirmPassword: 'different' });
    fixture.componentInstance.submit();

    expect(authService.resetPassword).not.toHaveBeenCalled();
    expect(fixture.componentInstance.passwordMismatch()).toBe(true);
  });

  it('resets the password and redirects to login on success', () => {
    authService.resetPassword.mockReturnValue(of(undefined));
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentRef.setInput('token', 'tok-123');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newSecret1', confirmPassword: 'newSecret1' });
    fixture.componentInstance.submit();

    expect(authService.resetPassword).toHaveBeenCalledWith({ token: 'tok-123', newPassword: 'newSecret1' });
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('shows a server error on failure', () => {
    authService.resetPassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    const fixture = TestBed.createComponent(ResetPasswordPage);
    fixture.componentRef.setInput('token', 'tok-123');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newSecret1', confirmPassword: 'newSecret1' });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.serverError()).toBeTruthy();
  });
});
