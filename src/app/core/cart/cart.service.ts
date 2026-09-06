import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CartResponse } from './cart.types';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);

  getCart(): Observable<CartResponse> {
    return this.http.get<CartResponse>(`${environment.apiUrl}/cart`);
  }

  addItem(listingId: string): Observable<CartResponse> {
    return this.http.post<CartResponse>(`${environment.apiUrl}/cart/items`, { listingId });
  }

  removeItem(listingId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/cart/items/${listingId}`);
  }
}
