import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { catchError, of as rxOf, switchMap } from 'rxjs';
import { ListingService } from '../../../core/catalog/listing.service';
import { GameService } from '../../../core/catalog/game.service';
import { Badge } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { GameResponse, ListingResponse } from '../../../core/catalog/catalog.types';

@Component({
  selector: 'app-listing-detail-page',
  imports: [CurrencyPipe, Badge, Button],
  templateUrl: './listing-detail-page.html',
  styleUrl: './listing-detail-page.css',
})
export class ListingDetailPage implements OnInit {
  private readonly listingService = inject(ListingService);
  private readonly gameService = inject(GameService);

  readonly id = input.required<string>();

  readonly listing = signal<ListingResponse | null>(null);
  readonly game = signal<GameResponse | null>(null);
  readonly notFound = signal(false);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.listingService
      .getById(this.id())
      .pipe(
        switchMap((listing) => {
          this.listing.set(listing);
          return this.gameService.getById(listing.gameId);
        }),
        catchError(() => {
          this.notFound.set(true);
          return rxOf(null);
        }),
      )
      .subscribe((game) => {
        this.game.set(game);
        this.loading.set(false);
      });
  }

  addToCart(): void {
    // Intentionally a no-op this wave — wired up once the cart service exists
    // (confirmed with the project owner: the button should exist and be clickable
    // now, not disabled, even though it does nothing yet).
  }
}
