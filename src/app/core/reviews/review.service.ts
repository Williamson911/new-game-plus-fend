import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReviewRequest, ReviewResponse } from './review.types';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  getByShop(shopId: string): Observable<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(`${environment.apiUrl}/reviews/shop/${shopId}`);
  }

  create(request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(`${environment.apiUrl}/reviews`, request);
  }
}
