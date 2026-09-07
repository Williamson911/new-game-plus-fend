import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CartResponse } from './cart.types';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);

  readonly itemCount = signal(0);

  getCart(): Observable<CartResponse> {
    return this.http
      .get<CartResponse>(`${environment.apiUrl}/cart`)
      .pipe(tap((cart) => this.itemCount.set(cart.items.length)));
  }

  addItem(listingId: string): Observable<CartResponse> {
    return this.http
      .post<CartResponse>(`${environment.apiUrl}/cart/items`, { listingId })
      .pipe(tap((cart) => this.itemCount.set(cart.items.length)));
  }

  removeItem(listingId: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/cart/items/${listingId}`)
      .pipe(tap(() => this.itemCount.update((n) => Math.max(0, n - 1))));
  }
}
