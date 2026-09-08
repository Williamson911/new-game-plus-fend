import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShopService } from '../../../core/shop/shop.service';
import { ListingService } from '../../../core/catalog/listing.service';
import { AuthService } from '../../../core/auth/auth.service';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { Button } from '../../../shared/ui/button/button';
import { Badge } from '../../../shared/ui/badge/badge';
import { ShopResponse } from '../../../core/shop/shop.types';
import { ListingResponse } from '../../../core/catalog/catalog.types';
import { MyShopOrdersPage } from '../my-shop-orders-page/my-shop-orders-page';

@Component({
  selector: 'app-my-shop-page',
  imports: [ReactiveFormsModule, RouterLink, TextField, Button, Badge, MyShopOrdersPage],
  templateUrl: './my-shop-page.html',
  styleUrl: './my-shop-page.css',
})
export class MyShopPage {
  private readonly fb = inject(FormBuilder);
  private readonly shopService = inject(ShopService);
  private readonly listingService = inject(ListingService);
  private readonly authService = inject(AuthService);

  readonly shop = signal<ShopResponse | null>(null);
  readonly loadingShop = signal(true);

  readonly createForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly listings = signal<ListingResponse[]>([]);
  readonly loadingListings = signal(false);

  readonly editingListingId = signal<string | null>(null);
  readonly editPriceForm = this.fb.nonNullable.group({ price: [0] });

  readonly deletingShop = signal(false);
  readonly actionError = signal<string | null>(null);

  constructor() {
    this.shopService.getMine().subscribe((shop) => {
      this.shop.set(shop);
      this.loadingShop.set(false);
      if (shop) {
        this.fetchListings();
      }
    });
  }

  createShop(): void {
    if (this.createForm.invalid || this.creating()) {
      return;
    }

    this.creating.set(true);
    this.createError.set(null);

    this.shopService.create(this.createForm.getRawValue()).subscribe({
      next: (response) => {
        this.authService.applyNewToken(response.token);
        this.shop.set(response.shop);
        this.creating.set(false);
        this.fetchListings();
      },
      error: () => {
        this.creating.set(false);
        this.createError.set('Impossible de créer la boutique (nom déjà pris ?).');
      },
    });
  }

  startEditPrice(listing: ListingResponse): void {
    this.editingListingId.set(listing.id);
    this.editPriceForm.setValue({ price: listing.price });
  }

  cancelEditPrice(): void {
    this.editingListingId.set(null);
  }

  saveEditPrice(listing: ListingResponse): void {
    const { price } = this.editPriceForm.getRawValue();
    this.actionError.set(null);
    this.listingService.updatePrice(listing.id, listing.gameId, price).subscribe({
      next: () => {
        this.editingListingId.set(null);
        this.fetchListings();
      },
      error: () => {
        this.editingListingId.set(null);
        this.actionError.set("Impossible de modifier le prix de cette annonce.");
      },
    });
  }

  deleteListing(listing: ListingResponse): void {
    this.actionError.set(null);
    this.listingService.delete(listing.id).subscribe({
      next: () => this.fetchListings(),
      error: () => this.actionError.set("Impossible de supprimer cette annonce."),
    });
  }

  deleteShop(): void {
    if (!window.confirm('Supprimer définitivement ta boutique ?')) {
      return;
    }

    this.deletingShop.set(true);
    this.actionError.set(null);
    this.shopService.delete().subscribe({
      next: () => {
        this.deletingShop.set(false);
        this.shop.set(null);
        this.listings.set([]);
      },
      error: () => {
        this.deletingShop.set(false);
        this.actionError.set('Impossible de supprimer la boutique (commandes ou avis en cours ?).');
      },
    });
  }

  private fetchListings(): void {
    this.loadingListings.set(true);
    this.listingService.getMine(0).subscribe((page) => {
      this.listings.set(page.content);
      this.loadingListings.set(false);
    });
  }
}
