import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ListingFilters, ListingResponse, Page } from './catalog.types';

@Injectable({ providedIn: 'root' })
export class ListingService {
  private readonly http = inject(HttpClient);

  getLatest(limit = 8): Observable<ListingResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ListingResponse[]>(`${environment.apiUrl}/listings/latest`, { params });
  }

  getFeatured(limit = 8): Observable<ListingResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ListingResponse[]>(`${environment.apiUrl}/listings/featured`, { params });
  }

  getCheap(limit = 8): Observable<ListingResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<ListingResponse[]>(`${environment.apiUrl}/listings/cheap`, { params });
  }

  getById(id: string): Observable<ListingResponse> {
    return this.http.get<ListingResponse>(`${environment.apiUrl}/listings/${id}`);
  }

  search(filters: Partial<ListingFilters>, page: number, size = 12): Observable<Page<ListingResponse>> {
    let params = new HttpParams().set('page', page).set('size', size);

    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.genreId) {
      params = params.set('genreId', filters.genreId);
    }
    if (filters.platform) {
      params = params.set('platform', filters.platform);
    }
    if (filters.minPrice !== null && filters.minPrice !== undefined) {
      params = params.set('minPrice', filters.minPrice);
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
      params = params.set('maxPrice', filters.maxPrice);
    }

    return this.http.get<Page<ListingResponse>>(`${environment.apiUrl}/listings`, { params });
  }
}
