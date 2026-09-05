import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GameResponse } from './catalog.types';

@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly http = inject(HttpClient);

  getById(id: string): Observable<GameResponse> {
    return this.http.get<GameResponse>(`${environment.apiUrl}/games/${id}`);
  }

  getPlatforms(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/games/platforms`);
  }
}
