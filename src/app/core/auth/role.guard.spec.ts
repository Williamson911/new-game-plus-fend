import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';

describe('roleGuard', () => {
  function run(hasRole: boolean) {
    const authServiceStub = { hasRole: vi.fn().mockReturnValue(hasRole) } as Partial<AuthService>;
    const createUrlTree = vi.fn().mockReturnValue('redirect-tree' as unknown as UrlTree);
    const routerStub = { createUrlTree } as Partial<Router>;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: routerStub },
      ],
    });

    const guard = roleGuard('SELLER');
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    return { result, authServiceStub, createUrlTree };
  }

  it('allows navigation when the user has the required role', () => {
    const { result, authServiceStub } = run(true);
    expect(result).toBe(true);
    expect(authServiceStub.hasRole).toHaveBeenCalledWith('SELLER');
  });

  it('redirects home when the user does not have the required role', () => {
    const { result, createUrlTree } = run(false);
    expect(result).toBe('redirect-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
