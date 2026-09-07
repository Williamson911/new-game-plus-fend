import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WalletResponse } from './wallet.types';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);

  getWallet(): Observable<WalletResponse> {
    return this.http.get<WalletResponse>(`${environment.apiUrl}/wallet`);
  }

  requestPayout(): Observable<WalletResponse> {
    return this.http.post<WalletResponse>(`${environment.apiUrl}/wallet/payout`, {});
  }
}
