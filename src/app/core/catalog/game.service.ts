import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameResponse, Page } from './catalog.types';
import { GameCreateRequest } from '../shop/shop.types';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);

  getById(id: string): Observable<GameResponse> {
    return this.http.get<GameResponse>(`${environment.apiUrl}/games/${id}`);
  }

  getPlatforms(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/games/platforms`);
  }

  search(name: string, page: number, size = 10): Observable<Page<GameResponse>> {
    const params = new HttpParams().set('name', name).set('page', page).set('size', size);
    return this.http.get<Page<GameResponse>>(`${environment.apiUrl}/games`, { params });
  }

  create(request: GameCreateRequest): Observable<GameResponse> {
    return this.http.post<GameResponse>(`${environment.apiUrl}/games`, request);
  }
}
