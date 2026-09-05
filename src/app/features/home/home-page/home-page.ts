import { Component, inject, signal } from '@angular/core';
import { ListingService } from '../../../core/catalog/listing.service';
import { Card } from '../../../shared/ui/card/card';
import { ListingResponse } from '../../../core/catalog/catalog.types';

@Component({
  selector: 'app-home-page',
  imports: [Card],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  private readonly listingService = inject(ListingService);

  readonly latest = signal<ListingResponse[]>([]);
  readonly latestLoading = signal(true);
  readonly featured = signal<ListingResponse[]>([]);
  readonly featuredLoading = signal(true);
  readonly cheap = signal<ListingResponse[]>([]);
  readonly cheapLoading = signal(true);

  constructor() {
    this.listingService.getLatest().subscribe((listings) => {
      this.latest.set(listings);
      this.latestLoading.set(false);
    });
    this.listingService.getFeatured().subscribe((listings) => {
      this.featured.set(listings);
      this.featuredLoading.set(false);
    });
    this.listingService.getCheap().subscribe((listings) => {
      this.cheap.set(listings);
      this.cheapLoading.set(false);
    });
  }
}
