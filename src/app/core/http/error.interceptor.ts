import { inject, Injector } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

const UNAUTHENTICATED_AUTH_ENDPOINTS = ['/auth/login', '/auth/confirm', '/auth/reset-password'];

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      const requestPath = req.url.split('?')[0];
      const isUnauthenticatedAuthRequest = UNAUTHENTICATED_AUTH_ENDPOINTS.some((endpoint) =>
        requestPath.endsWith(endpoint),
      );

      if (isUnauthorized && !isUnauthenticatedAuthRequest) {
        const authService = injector.get(AuthService);
        authService.logout();
        router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    }),
  );
};
