import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { NewListingPage } from './new-listing-page';
import { GameService } from '../../../core/catalog/game.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { ListingService } from '../../../core/catalog/listing.service';
import { GameResponse } from '../../../core/catalog/catalog.types';

describe('NewListingPage', () => {
  let gameService: { search: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let genreService: { getAll: ReturnType<typeof vi.fn> };
  let listingService: { create: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    gameService = {
      search: vi.fn().mockReturnValue(of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 })),
      create: vi.fn(),
    };
    genreService = { getAll: vi.fn().mockReturnValue(of([{ id: 'g-rpg', name: 'RPG' }])) };
    listingService = { create: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GameService, useValue: gameService },
        { provide: GenreService, useValue: genreService },
        { provide: ListingService, useValue: listingService },
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('loads genre options on construction', () => {
    TestBed.createComponent(NewListingPage);
    expect(genreService.getAll).toHaveBeenCalled();
  });

  it('search() calls GameService.search and populates results', () => {
    gameService.search.mockReturnValue(
      of({ content: [{ id: 'g1', name: 'Zelda' } as GameResponse], totalElements: 1, totalPages: 1, number: 0, size: 10 }),
    );
    const fixture = TestBed.createComponent(NewListingPage);

    fixture.componentInstance.search('zelda');

    expect(gameService.search).toHaveBeenCalledWith('zelda', 0);
    expect(fixture.componentInstance.searchResults().length).toBe(1);
  });

  it('search() with an empty term clears results without calling the service', () => {
    const fixture = TestBed.createComponent(NewListingPage);
    gameService.search.mockClear();

    fixture.componentInstance.search('');

    expect(gameService.search).not.toHaveBeenCalled();
    expect(fixture.componentInstance.searchResults()).toEqual([]);
  });

  describe('search debounce', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('debounces typing into the search control before calling GameService.search', () => {
      gameService.search.mockReturnValue(
        of({ content: [{ id: 'g1', name: 'Zelda' } as GameResponse], totalElements: 1, totalPages: 1, number: 0, size: 10 }),
      );
      const fixture = TestBed.createComponent(NewListingPage);

      fixture.componentInstance.searchControl.setValue('ze');
      fixture.componentInstance.searchControl.setValue('zel');
      fixture.componentInstance.searchControl.setValue('zelda');

      expect(gameService.search).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(gameService.search).toHaveBeenCalledTimes(1);
      expect(gameService.search).toHaveBeenCalledWith('zelda', 0);
      expect(fixture.componentInstance.searchResults().length).toBe(1);
    });
  });

  it('selectGame() sets the selected game and hides the create-game form', () => {
    const fixture = TestBed.createComponent(NewListingPage);
    fixture.componentInstance.showCreateGameForm.set(true);

    fixture.componentInstance.selectGame({ id: 'g1', name: 'Zelda' } as GameResponse);

    expect(fixture.componentInstance.selectedGame()?.id).toBe('g1');
    expect(fixture.componentInstance.showCreateGameForm()).toBe(false);
  });

  it('toggleGenre() adds and removes a genre id', () => {
    const fixture = TestBed.createComponent(NewListingPage);

    fixture.componentInstance.toggleGenre('g-rpg');
    expect(fixture.componentInstance.selectedGenreIds()).toEqual(['g-rpg']);

    fixture.componentInstance.toggleGenre('g-rpg');
    expect(fixture.componentInstance.selectedGenreIds()).toEqual([]);
  });

  it('createGame() does nothing when no genre is selected', () => {
    const fixture = TestBed.createComponent(NewListingPage);
    fixture.componentInstance.newGameForm.setValue({
      name: 'New Game',
      description: 'desc',
      publisher: 'Pub',
      developer: 'Dev',
      platform: 'PC',
      releaseDate: '2020-01-01',
      coverURL: '',
      weightGrams: 200,
    });

    fixture.componentInstance.createGame();

    expect(gameService.create).not.toHaveBeenCalled();
  });

  it('createGame() creates the game and selects it on success', () => {
    gameService.create.mockReturnValue(of({ id: 'g-new', name: 'New Game' }));
    const fixture = TestBed.createComponent(NewListingPage);
    fixture.componentInstance.toggleGenre('g-rpg');
    fixture.componentInstance.newGameForm.setValue({
      name: 'New Game',
      description: 'desc',
      publisher: 'Pub',
      developer: 'Dev',
      platform: 'PC',
      releaseDate: '2020-01-01',
      coverURL: '',
      weightGrams: 200,
    });

    fixture.componentInstance.createGame();

    expect(gameService.create).toHaveBeenCalledWith({
      name: 'New Game',
      description: 'desc',
      publisher: 'Pub',
      developer: 'Dev',
      platform: 'PC',
      releaseDate: '2020-01-01',
      coverURL: null,
      weightGrams: 200,
      igdbID: null,
      genreIds: ['g-rpg'],
    });
    expect(fixture.componentInstance.selectedGame()?.id).toBe('g-new');
  });

  it('createListing() creates the listing and navigates to /my-shop on success', () => {
    listingService.create.mockReturnValue(of({}));
    const fixture = TestBed.createComponent(NewListingPage);
    fixture.componentInstance.selectGame({ id: 'g1', name: 'Zelda' } as GameResponse);
    fixture.componentInstance.priceForm.setValue({ price: 20, condition: 'GOOD', description: 'RAS' });

    fixture.componentInstance.createListing();

    expect(listingService.create).toHaveBeenCalledWith({
      gameId: 'g1',
      price: 20,
      condition: 'GOOD',
      description: 'RAS',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/my-shop']);
  });

  it('createListing() does nothing when no game is selected', () => {
    const fixture = TestBed.createComponent(NewListingPage);
    fixture.componentInstance.priceForm.setValue({ price: 20, condition: 'GOOD', description: 'RAS' });

    fixture.componentInstance.createListing();

    expect(listingService.create).not.toHaveBeenCalled();
  });
});
