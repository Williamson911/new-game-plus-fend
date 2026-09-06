import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ListingService } from '../../../core/catalog/listing.service';
import { GenreService } from '../../../core/catalog/genre.service';
import { GameService } from '../../../core/catalog/game.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { Button } from '../../../shared/ui/button/button';
import { ListingResponse } from '../../../core/catalog/catalog.types';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-admin-listings-page',
  imports: [ReactiveFormsModule, TextField, SelectField, Button],
  templateUrl: './admin-listings-page.html',
  styleUrl: './admin-listings-page.css',
})
export class AdminListingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly listingService = inject(ListingService);
  private readonly genreService = inject(GenreService);
  private readonly gameService = inject(GameService);

  readonly form = this.fb.nonNullable.group({
    search: [''],
    genreId: [''],
    platform: [''],
    minPrice: [null as number | null],
    maxPrice: [null as number | null],
  });

  readonly genreOptions = signal<SelectOption[]>([{ value: '', label: 'Tous les genres' }]);
  readonly platformOptions = signal<SelectOption[]>([{ value: '', label: 'Toutes les plateformes' }]);

  readonly listings = signal<ListingResponse[]>([]);
  readonly loading = signal(true);
  readonly page = signal(0);
  readonly totalPages = signal(0);

  readonly togglingId = signal<string | null>(null);
  readonly featuredErrors = signal<Record<string, string>>({});

  constructor() {
    this.genreService.getAll().subscribe((genres) => {
      this.genreOptions.set([
        { value: '', label: 'Tous les genres' },
        ...genres.map((genre) => ({ value: genre.id, label: genre.name })),
      ]);
    });

    this.gameService.getPlatforms().subscribe((platforms) => {
      this.platformOptions.set([
        { value: '', label: 'Toutes les plateformes' },
        ...platforms.map((platform) => ({ value: platform, label: platform })),
      ]);
    });

    this.form.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      )
      .subscribe(() => {
        this.page.set(0);
        this.fetch();
      });

    this.fetch();
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  toggleFeatured(listing: ListingResponse): void {
    if (this.togglingId()) {
      return;
    }

    this.togglingId.set(listing.id);
    this.featuredErrors.set({ ...this.featuredErrors(), [listing.id]: '' });

    this.listingService.setFeatured(listing.id, !listing.featured).subscribe({
      next: (updated) => {
        this.togglingId.set(null);
        this.listings.set(this.listings().map((l) => (l.id === updated.id ? updated : l)));
      },
      error: () => {
        this.togglingId.set(null);
        this.featuredErrors.set({
          ...this.featuredErrors(),
          [listing.id]: 'Impossible de changer le statut Pépite de cette annonce.',
        });
      },
    });
  }

  private fetch(): void {
    this.loading.set(true);
    const filters = this.form.getRawValue();
    this.listingService.search(filters, this.page(), PAGE_SIZE).subscribe((result) => {
      this.listings.set(result.content);
      this.totalPages.set(result.totalPages);
      this.loading.set(false);
    });
  }
}
