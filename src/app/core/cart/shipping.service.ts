import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RelayPointResult } from './cart.types';

@Injectable({ providedIn: 'root' })
export class ShippingService {
  private readonly http = inject(HttpClient);

  findRelayPoints(postCode: string, country: string): Observable<RelayPointResult[]> {
    const params = new HttpParams().set('postCode', postCode).set('country', country);
    return this.http.get<RelayPointResult[]>(`${environment.apiUrl}/shipping/relay-points`, { params });
  }
}
