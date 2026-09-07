import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HomePage } from './home-page';
import { ListingService } from '../../../core/catalog/listing.service';
import { ListingResponse } from '../../../core/catalog/catalog.types';

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
    condition: 'GOOD',
    description: null,
    imageUrls: [],
    ...overrides,
  };
}

describe('HomePage', () => {
  let listingService: {
    getLatest: ReturnType<typeof vi.fn>;
    getFeatured: ReturnType<typeof vi.fn>;
    getCheap: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    listingService = {
      getLatest: vi.fn().mockReturnValue(of([makeListing({ id: 'latest-1' })])),
      getFeatured: vi.fn().mockReturnValue(of([makeListing({ id: 'featured-1' })])),
      getCheap: vi.fn().mockReturnValue(of([])),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ListingService, useValue: listingService }],
    });
  });

  it('fetches all three sections independently on construction', () => {
    TestBed.createComponent(HomePage);

    expect(listingService.getLatest).toHaveBeenCalled();
    expect(listingService.getFeatured).toHaveBeenCalled();
    expect(listingService.getCheap).toHaveBeenCalled();
  });

  it('renders a card per listing in each populated section', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-card').length).toBe(2);
  });

  it('shows an empty message for a section with no listings', () => {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aucune annonce pour l\'instant.');
  });
});
