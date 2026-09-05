import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, catchError, map, switchMap, tap, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import {
  AuthResponse,
  ConfirmResponse,
  JwtClaims,
  LoginRequest,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
} from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly _currentUser = signal<MeResponse | null>(null);
  private readonly _roles = signal<string[]>([]);
  private readonly _isAuthenticated = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly displayName = computed(() => this._currentUser()?.username ?? null);

  constructor() {
    this.restoreSession();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => this.applyToken(response.token)),
      switchMap((response) =>
        this.refreshMe().pipe(
          map(() => response),
          catchError((error) => {
            this.logout();
            return throwError(() => error);
          }),
        ),
      ),
    );
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${environment.apiUrl}/auth/register`, data);
  }

  confirmEmail(token: string): Observable<ConfirmResponse> {
    const params = new HttpParams().set('token', token);
    return this.http.get<ConfirmResponse>(`${environment.apiUrl}/auth/confirm`, { params });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(payload: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/reset-password`, payload);
  }

  applyNewToken(token: string): void {
    this.applyToken(token);
  }

  logout(): void {
    this.tokenStorage.clearToken();
    this._currentUser.set(null);
    this._roles.set([]);
    this._isAuthenticated.set(false);
  }

  refreshMe(): Observable<MeResponse> {
    return this.http
      .get<MeResponse>(`${environment.apiUrl}/me`)
      .pipe(tap((me) => this._currentUser.set(me)));
  }

  hasRole(role: string): boolean {
    return this._roles().includes(role);
  }

  private restoreSession(): void {
    const token = this.tokenStorage.getToken();
    if (!token) {
      return;
    }

    if (this.isExpired(token)) {
      this.tokenStorage.clearToken();
      return;
    }

    this.applyToken(token);
    this.refreshMe()
      .pipe(
        catchError(() => {
          this.logout();
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private applyToken(token: string): void {
    let claims: JwtClaims;
    try {
      claims = jwtDecode<JwtClaims>(token);
    } catch {
      return;
    }

    this.tokenStorage.setToken(token);
    this._roles.set(claims.roles ?? []);
    this._isAuthenticated.set(true);
  }

  private isExpired(token: string): boolean {
    try {
      const claims = jwtDecode<JwtClaims>(token);
      return Date.now() >= claims.exp * 1000;
    } catch {
      return true;
    }
  }
}
