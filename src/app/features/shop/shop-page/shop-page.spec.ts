import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ShopPage } from './shop-page';
import { ShopService } from '../../../core/shop/shop.service';
import { ListingService } from '../../../core/catalog/listing.service';
import { ReviewService } from '../../../core/reviews/review.service';
import { ReviewResponse } from '../../../core/reviews/review.types';

function makeReview(overrides: Partial<ReviewResponse> = {}): ReviewResponse {
  return {
    id: 'rv1',
    authorUsername: 'buyer1',
    rating: 5,
    comment: 'Nickel',
    createdAt: '2026-01-01T00:00:00',
    ...overrides,
  };
}

describe('ShopPage', () => {
  let shopService: { getById: ReturnType<typeof vi.fn> };
  let listingService: { search: ReturnType<typeof vi.fn> };
  let reviewService: { getByShop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    shopService = { getById: vi.fn().mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'A shop' })) };
    listingService = {
      search: vi.fn().mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 })),
    };
    reviewService = { getByShop: vi.fn().mockReturnValue(of([])) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ShopService, useValue: shopService },
        { provide: ListingService, useValue: listingService },
        { provide: ReviewService, useValue: reviewService },
      ],
    });
  });

  it('fetches the shop, its listings, and its reviews', () => {
    const fixture = TestBed.createComponent(ShopPage);
    fixture.componentRef.setInput('id', 's1');
    fixture.detectChanges();

    expect(shopService.getById).toHaveBeenCalledWith('s1');
    expect(listingService.search).toHaveBeenCalledWith({ shopId: 's1' }, 0, 12);
    expect(reviewService.getByShop).toHaveBeenCalledWith('s1');
    expect(fixture.componentInstance.shop()?.name).toBe('Retro Shop');
  });

  it('sets notFound when the shop fetch returns a 404', () => {
    shopService.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = TestBed.createComponent(ShopPage);
    fixture.componentRef.setInput('id', 'missing');
    fixture.detectChanges();

    expect(fixture.componentInstance.notFound()).toBe(true);
  });

  it('averageRating() returns null when there are no reviews', () => {
    const fixture = TestBed.createComponent(ShopPage);
    fixture.componentRef.setInput('id', 's1');
    fixture.detectChanges();

    expect(fixture.componentInstance.averageRating()).toBeNull();
  });

  it('averageRating() averages the fetched reviews', () => {
    reviewService.getByShop.mockReturnValue(of([makeReview({ rating: 4 }), makeReview({ rating: 5, id: 'rv2' })]));
    const fixture = TestBed.createComponent(ShopPage);
    fixture.componentRef.setInput('id', 's1');
    fixture.detectChanges();

    expect(fixture.componentInstance.averageRating()).toBe(4.5);
  });
});
