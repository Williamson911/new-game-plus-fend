import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ListingDetailPage } from './listing-detail-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { GameService } from '../../../core/catalog/game.service';
import { CartService } from '../../../core/cart/cart.service';
import { GameResponse, ListingResponse } from '../../../core/catalog/catalog.types';

function makeListing(overrides: Partial<ListingResponse> = {}): ListingResponse {
  return {
    id: 'l1',
    shopId: 's1',
    gameId: 'g1',
    gameName: 'Kingdom Hearts',
    shopName: 'Retro Shop',
    gamePlatform: 'PlayStation 2',
    price: 20,
    status: 'AVAILABLE',
    featured: false,
    condition: 'GOOD',
    description: null,
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
  let cartService: { addItem: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    listingService = { getById: vi.fn() };
    gameService = { getById: vi.fn() };
    cartService = { addItem: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ListingService, useValue: listingService },
        { provide: GameService, useValue: gameService },
        { provide: CartService, useValue: cartService },
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

  it('links the shop name to its public shop page', () => {
    listingService.getById.mockReturnValue(of(makeListing({ shopId: 's42', shopName: 'Retro Shop' })));
    gameService.getById.mockReturnValue(of(makeGame()));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/shops/s42"]');
    expect(link?.textContent).toContain('Retro Shop');
  });

  it('shows a not-found state when the listing fetch fails', () => {
    listingService.getById.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'missing');
    fixture.detectChanges();

    expect(fixture.componentInstance.notFound()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Annonce introuvable.');
  });

  it('addToCart() adds the listing to the cart and shows a confirmation', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));
    cartService.addItem.mockReturnValue(of({ items: [] }));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    fixture.componentInstance.addToCart();

    expect(cartService.addItem).toHaveBeenCalledWith('l1');
    expect(fixture.componentInstance.addedToCart()).toBe(true);
  });

  it('addToCart() shows an inline error when the listing is already in the cart or unavailable', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));
    cartService.addItem.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    fixture.componentInstance.addToCart();

    expect(fixture.componentInstance.addedToCart()).toBe(false);
    expect(fixture.componentInstance.cartError()).not.toBeNull();
  });

  it('addToCart() ignores a second call while a request is already in flight', () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));
    const pending = new Subject<{ items: [] }>();
    cartService.addItem.mockReturnValue(pending);

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    fixture.componentInstance.addToCart();
    fixture.componentInstance.addToCart();

    expect(cartService.addItem).toHaveBeenCalledTimes(1);
  });

  it("addToCart() shows an inline error when the listing is the user's own", () => {
    listingService.getById.mockReturnValue(of(makeListing()));
    gameService.getById.mockReturnValue(of(makeGame()));
    cartService.addItem.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));

    const fixture = TestBed.createComponent(ListingDetailPage);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();

    fixture.componentInstance.addToCart();

    expect(fixture.componentInstance.cartError()).toContain('propre annonce');
  });
});
