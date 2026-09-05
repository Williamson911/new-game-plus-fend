import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GenreResponse } from './catalog.types';

@Injectable({ providedIn: 'root' })
export class GenreService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<GenreResponse[]> {
    return this.http.get<GenreResponse[]>(`${environment.apiUrl}/genres`);
  }
}
