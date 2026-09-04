import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  function run(isAuthenticated: boolean, url: string) {
    const authServiceStub = { isAuthenticated: () => isAuthenticated } as Partial<AuthService>;
    const createUrlTree = vi.fn().mockReturnValue('redirect-tree' as unknown as UrlTree);
    const routerStub = { createUrlTree } as Partial<Router>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: routerStub },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

    return { result, createUrlTree };
  }

  it('allows navigation when authenticated', () => {
    const { result } = run(true, '/profile');
    expect(result).toBe(true);
  });

  it('redirects to /auth/login with a returnUrl when not authenticated', () => {
    const { result, createUrlTree } = run(false, '/profile');
    expect(result).toBe('redirect-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/auth/login'], { queryParams: { returnUrl: '/profile' } });
  });
});
