import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrderResponse, OrderStatus } from './shop.types';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  getShopOrders(): Observable<OrderResponse[]> {
    return this.http.get<OrderResponse[]>(`${environment.apiUrl}/orders/shop`);
  }

  updateStatus(id: string, status: OrderStatus): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(`${environment.apiUrl}/orders/${id}/status`, { status });
  }
}
