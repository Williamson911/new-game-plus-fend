import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CheckoutRequest, CheckoutResponse } from './cart.types';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);

  checkout(request: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${environment.apiUrl}/orders/checkout`, request);
  }
}
