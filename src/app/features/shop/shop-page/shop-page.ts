import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, of as rxOf } from 'rxjs';
import { ShopService } from '../../../core/shop/shop.service';
import { ListingService } from '../../../core/catalog/listing.service';
import { ReviewService } from '../../../core/reviews/review.service';
import { Card } from '../../../shared/ui/card/card';
import { ShopResponse } from '../../../core/shop/shop.types';
import { ListingResponse } from '../../../core/catalog/catalog.types';
import { ReviewResponse } from '../../../core/reviews/review.types';

@Component({
  selector: 'app-shop-page',
  imports: [Card],
  templateUrl: './shop-page.html',
  styleUrl: './shop-page.css',
})
export class ShopPage implements OnInit {
  private readonly shopService = inject(ShopService);
  private readonly listingService = inject(ListingService);
  private readonly reviewService = inject(ReviewService);

  readonly id = input.required<string>();

  readonly shop = signal<ShopResponse | null>(null);
  readonly listings = signal<ListingResponse[]>([]);
  readonly reviews = signal<ReviewResponse[]>([]);
  readonly notFound = signal(false);
  readonly loading = signal(true);

  readonly averageRating = computed(() => {
    const reviews = this.reviews();
    if (reviews.length === 0) {
      return null;
    }
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  });

  ngOnInit(): void {
    const shop$ = this.shopService.getById(this.id()).pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.notFound.set(true);
        }
        return rxOf(null);
      }),
    );

    const listings$ = this.listingService.search({ shopId: this.id() }, 0, 12).pipe(
      catchError(() => rxOf({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 })),
    );

    const reviews$ = this.reviewService.getByShop(this.id()).pipe(catchError(() => rxOf([])));

    forkJoin([shop$, listings$, reviews$]).subscribe(([shop, listingsPage, reviews]) => {
      this.shop.set(shop);
      this.listings.set(listingsPage.content);
      this.reviews.set(reviews);
      this.loading.set(false);
    });
  }
}
