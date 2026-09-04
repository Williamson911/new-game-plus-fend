import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RegisterPage } from './register-page';
import { AuthService } from '../../../core/auth/auth.service';

describe('RegisterPage', () => {
  let authService: { register: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { register: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
  });

  it('does not submit when the form is invalid', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('does not submit when passwords do not match', () => {
    authService.register.mockReturnValue(of({ id: 'u1', username: 'will' }));
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      username: 'will',
      email: 'will@test.dev',
      password: 'secret123',
      confirmPassword: 'different',
    });
    fixture.componentInstance.submit();

    expect(authService.register).not.toHaveBeenCalled();
    expect(fixture.componentInstance.passwordMismatch()).toBe(true);
  });

  it('registers and shows a success message on matching, valid input', () => {
    authService.register.mockReturnValue(of({ id: 'u1', username: 'will' }));
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      username: 'will',
      email: 'will@test.dev',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    fixture.componentInstance.submit();

    expect(authService.register).toHaveBeenCalledWith({
      username: 'will',
      email: 'will@test.dev',
      password: 'secret123',
    });
    expect(fixture.componentInstance.registered()).toBe(true);
  });

  it('shows a server error on failure (e.g. duplicate email)', () => {
    authService.register.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' })),
    );
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      username: 'will',
      email: 'will@test.dev',
      password: 'secret123',
      confirmPassword: 'secret123',
    });
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.serverError()).toBeTruthy();
    expect(fixture.componentInstance.registered()).toBe(false);
  });
});
