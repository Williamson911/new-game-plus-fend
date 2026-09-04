import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ForgotPasswordPage } from './forgot-password-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('ForgotPasswordPage', () => {
  let authService: { forgotPassword: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { forgotPassword: vi.fn().mockReturnValue(of(undefined)) };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });
  });

  it('does not submit an invalid email', () => {
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'not-an-email' });
    fixture.componentInstance.submit();

    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it('calls AuthService.forgotPassword and always shows the generic success message', () => {
    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'will@test.dev' });
    fixture.componentInstance.submit();

    expect(authService.forgotPassword).toHaveBeenCalledWith('will@test.dev');
    expect(fixture.componentInstance.submitted()).toBe(true);
  });
});
