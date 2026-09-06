import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AdminListingsPage } from './admin-listings-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { GameService } from '../../../core/catalog/game.service';
import { ListingResponse } from '../../../core/catalog/catalog.types';

function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: 'l1',
    shopId: 's1',
    gameId: 'g1',
    gameName: 'Kingdom Hearts',
    shopName: 'Retro Shop',
    price: 20,
    status: 'AVAILABLE',
    featured: false,
    imageUrls: [],
    ...overrides,
  };
}

describe('AdminListingsPage', () => {
  let listingService: { search: ReturnType<typeof vi.fn>; setFeatured: ReturnType<typeof vi.fn> };
  let genreService: { getAll: ReturnType<typeof vi.fn> };
  let gameService: { getPlatforms: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    listingService = {
      search: vi.fn().mockReturnValue(
        of({ content: [makeListing()], totalElements: 1, totalPages: 1, number: 0, size: 12 }),
      ),
      setFeatured: vi.fn(),
    };
    genreService = { getAll: vi.fn().mockReturnValue(of([])) };
    gameService = { getPlatforms: vi.fn().mockReturnValue(of([])) };

    TestBed.configureTestingModule({
      providers: [
        { provide: ListingService, useValue: listingService },
        { provide: GenreService, useValue: genreService },
        { provide: GameService, useValue: gameService },
      ],
    });
  });

  it('fetches listings on construction', () => {
    const fixture = TestBed.createComponent(AdminListingsPage);
    fixture.detectChanges();

    expect(listingService.search).toHaveBeenCalled();
    expect(fixture.componentInstance.listings().length).toBe(1);
  });

  it('toggleFeatured() calls the service and replaces the row on success', () => {
    listingService.setFeatured.mockReturnValue(of(makeListing({ featured: true })));
    const fixture = TestBed.createComponent(AdminListingsPage);
    fixture.detectChanges();

    fixture.componentInstance.toggleFeatured(makeListing({ featured: false }));

    expect(listingService.setFeatured).toHaveBeenCalledWith('l1', true);
    expect(fixture.componentInstance.listings()[0].featured).toBe(true);
  });

  it('toggleFeatured() leaves the row unchanged and shows a row error on failure', () => {
    listingService.setFeatured.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const fixture = TestBed.createComponent(AdminListingsPage);
    fixture.detectChanges();

    fixture.componentInstance.toggleFeatured(makeListing({ featured: false }));

    expect(fixture.componentInstance.listings()[0].featured).toBe(false);
    expect(fixture.componentInstance.featuredErrors()['l1']).toBeTruthy();
  });
});
