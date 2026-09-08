import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { GameService } from '../../../core/catalog/game.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { ListingService } from '../../../core/catalog/listing.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SelectField } from '../../../shared/ui/select-field/select-field';
import { Button } from '../../../shared/ui/button/button';
import {
  GameResponse,
  GenreResponse,
  IgdbGameResult,
  LISTING_CONDITION_LABELS,
  ListingCondition,
} from '../../../core/catalog/catalog.types';

@Component({
  selector: 'app-new-listing-page',
  imports: [ReactiveFormsModule, TextField, SelectField, Button],
  templateUrl: './new-listing-page.html',
  styleUrl: './new-listing-page.css',
})
export class NewListingPage {
  private readonly fb = inject(FormBuilder);
  private readonly gameService = inject(GameService);
  private readonly genreService = inject(GenreService);
  private readonly listingService = inject(ListingService);
  private readonly router = inject(Router);

  readonly searchControl = this.fb.nonNullable.control('');
  readonly searchResults = signal<GameResponse[]>([]);
  readonly igdbResults = signal<IgdbGameResult[]>([]);
  readonly selectedGame = signal<GameResponse | null>(null);

  readonly showCreateGameForm = signal(false);
  readonly pendingIgdbId = signal<string | null>(null);
  readonly genres = signal<GenreResponse[]>([]);
  readonly selectedGenreIds = signal<string[]>([]);

  readonly newGameForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    publisher: ['', Validators.required],
    developer: ['', Validators.required],
    platform: ['', Validators.required],
    releaseDate: ['', Validators.required],
    coverURL: [''],
    weightGrams: [200, Validators.required],
  });

  readonly priceForm = this.fb.nonNullable.group({
    price: [0, [Validators.required, Validators.min(0.01)]],
    condition: ['GOOD' as ListingCondition, Validators.required],
    description: [''],
  });

  readonly conditionOptions = (Object.entries(LISTING_CONDITION_LABELS) as [ListingCondition, string][]).map(
    ([value, label]) => ({ value, label }),
  );

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.genreService.getAll().subscribe((genres) => this.genres.set(genres));

    this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe((term) => {
      this.search(term);
    });
  }

  search(term: string): void {
    if (!term) {
      this.searchResults.set([]);
      this.igdbResults.set([]);
      return;
    }
    this.gameService.search(term, 0).subscribe((page) => this.searchResults.set(page.content));
    this.gameService.searchIgdb(term).subscribe({
      next: (results) => this.igdbResults.set(results),
      error: () => this.igdbResults.set([]),
    });
  }

  selectGame(game: GameResponse): void {
    this.selectedGame.set(game);
    this.showCreateGameForm.set(false);
  }

  selectIgdbGame(result: IgdbGameResult): void {
    this.pendingIgdbId.set(result.igdbId);
    this.newGameForm.patchValue({
      name: result.name,
      description: result.description ?? '',
      platform: result.platform ?? '',
      releaseDate: result.releaseDate ?? '',
      coverURL: result.coverURL ?? '',
    });
    this.showCreateGameForm.set(true);
  }

  toggleCreateGameForm(): void {
    if (this.showCreateGameForm()) {
      this.showCreateGameForm.set(false);
      return;
    }
    this.pendingIgdbId.set(null);
    this.newGameForm.reset();
    this.showCreateGameForm.set(true);
  }

  toggleGenre(genreId: string): void {
    const current = this.selectedGenreIds();
    this.selectedGenreIds.set(
      current.includes(genreId) ? current.filter((id) => id !== genreId) : [...current, genreId],
    );
  }

  createGame(): void {
    if (this.newGameForm.invalid || this.selectedGenreIds().length === 0) {
      return;
    }

    const values = this.newGameForm.getRawValue();
    this.gameService
      .create({
        ...values,
        coverURL: values.coverURL || null,
        igdbID: this.pendingIgdbId(),
        genreIds: this.selectedGenreIds(),
      })
      .subscribe((game) => {
        this.selectedGame.set(game);
        this.showCreateGameForm.set(false);
        this.pendingIgdbId.set(null);
      });
  }

  createListing(): void {
    const game = this.selectedGame();
    if (!game || this.priceForm.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const values = this.priceForm.getRawValue();
    this.listingService
      .create({
        gameId: game.id,
        price: values.price,
        condition: values.condition,
        description: values.description || null,
      })
      .subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/my-shop']);
      },
      error: () => {
        this.submitting.set(false);
        this.error.set("Impossible de créer l'annonce.");
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/my-shop']);
  }
}
