import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ListingDetailPage } from './listing-detail-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { GameService } from '../../../core/catalog/game.service';
import { GameResponse, ListingResponse } from '../../../core/catalog/catalog.types';

function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: 'l1',
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

function makeGame(overrides: Partial<GameResponse> = {}): GameResponse {
  return {
    id: 'g1',
    name: 'Kingdom Hearts',
    description: 'A game about hearts.',
    genres: ['RPG'],
    publisher: 'Square Enix',
    developer: 'Square Enix',
    platform: 'PlayStation 2',
    releaseDate: '2002-03-28',
    coverURL: null,
    weightGrams: 150,
    ...overrides,
  };
}

describe('ListingDetailPage', () => {
  let listingService: { getById: ReturnType<typeof vi.fn> };
  let gameService: { getById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    listingService = { getById: vi.fn() };
    gameService = { getById: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ListingService, useValue: listingService },
        { provide: GameService, useValue: gameService },
      ],
    });
  });

  it('fetches the listing then the game, and populates both signals', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    expect(listingService.getById).toHaveBeenCalledWith('l1');
    expect(gameService.getById).toHaveBeenCalledWith('g1');
    expect(fixture.componentInstance.listing()?.gameName).toBe('Kingdom Hearts');
    expect(fixture.componentInstance.game()?.publisher).toBe('Square Enix');
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('shows a not-found state when the listing fetch fails', () => {
    listingService.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'missing');
    fixture.detectChanges();

    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Annonce introuvable.');
  });

  it('addToCart() is present and callable but does nothing observable this wave', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    expect(() => fixture.componentInstance.addToCart()).not.toThrow();
  });
});
