import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShopCreationResponse, ShopRequest, ShopResponse } from './shop.types';

@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly http = inject(HttpClient);

  getMine(): Observable<ShopResponse | null> {
    return this.http.get<ShopResponse>(`${environment.apiUrl}/shops/me`).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  create(request: ShopRequest): Observable<ShopCreationResponse> {
    return this.http.post<ShopCreationResponse>(`${environment.apiUrl}/shops`, request);
  }

  delete(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/shops`);
  }
}
