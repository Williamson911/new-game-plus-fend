import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MarketPage } from './market-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { GameService } from '../../../core/catalog/game.service';
import { ListingResponse, Page } from '../../../core/catalog/catalog.types';

function makePage(content: ListingResponse[] = [], totalPages = 1, number = 0): Page<ListingResponse> {
  return { content, totalElements: content.length, totalPages, number, size: 12 };
}

function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: '1',
    shopId: 's1',
    gameId: 'g1',
    gameName: 'Kingdom Hearts',
    shopName: 'Retro Shop',
    gamePlatform: 'PlayStation 2',
    price: 20,
    status: 'AVAILABLE',
    featured: false,
    imageUrls: [],
    ...overrides,
  };
}

describe('MarketPage', () => {
  let listingService: { search: ReturnType<typeof vi.fn> };
  let genreService: { getAll: ReturnType<typeof vi.fn> };
  let gameService: { getPlatforms: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    listingService = { search: vi.fn().mockReturnValue(of(makePage([makeListing()]))) };
    genreService = { getAll: vi.fn().mockReturnValue(of([{ id: 'g-rpg', name: 'RPG' }])) };
    gameService = { getPlatforms: vi.fn().mockReturnValue(of(['PC', 'Nintendo Switch'])) };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ListingService, useValue: listingService },
        { provide: GenreService, useValue: genreService },
        { provide: GameService, useValue: gameService },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches the first page with empty filters on construction', () => {
    TestBed.createComponent(MarketPage);

    expect(listingService.search).toHaveBeenCalledWith(
      { search: '', genreId: '', platform: '', minPrice: null, maxPrice: null },
      0,
      24,
    );
  });

  it('loads genre and platform options with a leading "all" choice', () => {
    const fixture = TestBed.createComponent(MarketPage);

    expect(fixture.componentInstance.genreOptions()).toEqual([
      { value: '', label: 'Tous les genres' },
      { value: 'g-rpg', label: 'RPG' },
    ]);
    expect(fixture.componentInstance.platformOptions()).toEqual([
      { value: '', label: 'Toutes les plateformes' },
      { value: 'PC', label: 'PC' },
      { value: 'Nintendo Switch', label: 'Nintendo Switch' },
    ]);
  });

  it('debounces a filter change and resets to page 0 before refetching', () => {
    const fixture = TestBed.createComponent(MarketPage);
    listingService.search.mockClear();
    fixture.componentInstance.page.set(2);

    fixture.componentInstance.form.controls.search.setValue('zelda');
    expect(listingService.search).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(listingService.search).toHaveBeenCalledWith(
      { search: 'zelda', genreId: '', platform: '', minPrice: null, maxPrice: null },
      0,
      24,
    );
  });

  it('goToPage() refetches immediately without waiting for the debounce', () => {
    const fixture = TestBed.createComponent(MarketPage);
    listingService.search.mockClear();

    fixture.componentInstance.goToPage(1);

    expect(listingService.search).toHaveBeenCalledWith(
      { search: '', genreId: '', platform: '', minPrice: null, maxPrice: null },
      1,
      24,
    );
  });

  it('reset() clears the form and refetches with empty filters after the debounce', () => {
    const fixture = TestBed.createComponent(MarketPage);
    fixture.componentInstance.form.controls.platform.setValue('PC');
    vi.advanceTimersByTime(300);
    listingService.search.mockClear();

    fixture.componentInstance.reset();
    vi.advanceTimersByTime(300);

    expect(listingService.search).toHaveBeenCalledWith(
      { search: '', genreId: '', platform: '', minPrice: null, maxPrice: null },
      0,
      24,
    );
  });

  it('populates listings, loading, and totalPages signals from the search result', () => {
    const fixture = TestBed.createComponent(MarketPage);

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.listings().length).toBe(1);
    expect(fixture.componentInstance.totalPages()).toBe(1);
  });
});
