import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginPage } from './login-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('LoginPage', () => {
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authService = { login: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('does not call AuthService.login when the form is invalid', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('calls AuthService.login with the form value and navigates home on success', () => {
    authService.login.mockReturnValue(of({ token: 'abc' }));
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'will@test.dev', password: 'secret' });
    fixture.componentInstance.submit();

    expect(authService.login).toHaveBeenCalledWith({ email: 'will@test.dev', password: 'secret' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows a server error message and stops submitting on failure', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'will@test.dev', password: 'wrong' });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.componentInstance.serverError()).toBeTruthy();
  });
});
