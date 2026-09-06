import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of as rxOf, switchMap } from 'rxjs';
import { ListingService } from '../../../core/catalog/listing.service';
import { GameService } from '../../../core/catalog/game.service';
import { CartService } from '../../../core/cart/cart.service';
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
  private readonly cartService = inject(CartService);

  readonly id = input.required<string>();

  readonly listing = signal<ListingResponse | null>(null);
  readonly game = signal<GameResponse | null>(null);
  readonly notFound = signal(false);
  readonly loading = signal(true);

  readonly addingToCart = signal(false);
  readonly addedToCart = signal(false);
  readonly cartError = signal<string | null>(null);

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
    if (this.addingToCart()) {
      return;
    }

    this.addingToCart.set(true);
    this.cartError.set(null);

    this.cartService.addItem(this.listing()!.id).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.addedToCart.set(true);
      },
      error: (err: unknown) => {
        this.addingToCart.set(false);
        this.cartError.set(this.mapCartError(err));
      },
    });
  }

  private mapCartError(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      return "Déjà dans ton panier, ou cette annonce n'est plus disponible.";
    }
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return 'Tu ne peux pas acheter ta propre annonce.';
    }
    return "Impossible d'ajouter ce jeu au panier.";
  }
}
