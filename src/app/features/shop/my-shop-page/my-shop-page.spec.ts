import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { MyShopPage } from './my-shop-page';
import { ShopService } from '../../../core/shop/shop.service';
import { ListingService } from '../../../core/catalog/listing.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ListingResponse } from '../../../core/catalog/catalog.types';

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
    imageUrls: [],
    ...overrides,
  };
}

describe('MyShopPage', () => {
  let shopService: {
    getMine: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let listingService: {
    getMine: ReturnType<typeof vi.fn>;
    updatePrice: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let authService: { applyNewToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    shopService = { getMine: vi.fn(), create: vi.fn(), delete: vi.fn() };
    listingService = { getMine: vi.fn(), updatePrice: vi.fn(), delete: vi.fn() };
    authService = { applyNewToken: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ShopService, useValue: shopService },
        { provide: ListingService, useValue: listingService },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the create-shop form when the user has no shop', () => {
    shopService.getMine.mockReturnValue(of(null));

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.shop()).toBeNull();
    expect(listingService.getMine).not.toHaveBeenCalled();
  });

  it('fetches listings when the user already has a shop', () => {
    shopService.getMine.mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'desc' }));
    listingService.getMine.mockReturnValue(
      of({ content: [makeListing()], totalElements: 1, totalPages: 1, number: 0, size: 12 }),
    );

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.shop()?.name).toBe('Retro Shop');
    expect(listingService.getMine).toHaveBeenCalled();
    expect(fixture.componentInstance.listings().length).toBe(1);
  });

  it('createShop() applies the new token and switches to the shop view on success', () => {
    shopService.getMine.mockReturnValue(of(null));
    shopService.create.mockReturnValue(
      of({ shop: { id: 's1', name: 'Retro Shop', description: 'desc' }, token: 'new-token' }),
    );
    listingService.getMine.mockReturnValue(
      of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 }),
    );

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    fixture.componentInstance.createForm.setValue({ name: 'Retro Shop', description: 'desc' });
    fixture.componentInstance.createShop();

    expect(authService.applyNewToken).toHaveBeenCalledWith('new-token');
    expect(fixture.componentInstance.shop()?.name).toBe('Retro Shop');
  });

  it('saveEditPrice() calls updatePrice with the listing gameId and new price', () => {
    shopService.getMine.mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'desc' }));
    listingService.getMine.mockReturnValue(
      of({ content: [makeListing()], totalElements: 1, totalPages: 1, number: 0, size: 12 }),
    );
    listingService.updatePrice.mockReturnValue(of(makeListing({ price: 30 })));

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    const listing = fixture.componentInstance.listings()[0];
    fixture.componentInstance.startEditPrice(listing);
    fixture.componentInstance.editPriceForm.setValue({ price: 30 });
    fixture.componentInstance.saveEditPrice(listing);

    expect(listingService.updatePrice).toHaveBeenCalledWith('l1', 'g1', 30);
  });

  it('saveEditPrice() closes the edit form and surfaces an error on failure', () => {
    shopService.getMine.mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'desc' }));
    listingService.getMine.mockReturnValue(
      of({ content: [makeListing()], totalElements: 1, totalPages: 1, number: 0, size: 12 }),
    );
    listingService.updatePrice.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    const listing = fixture.componentInstance.listings()[0];
    fixture.componentInstance.startEditPrice(listing);
    fixture.componentInstance.editPriceForm.setValue({ price: 30 });
    fixture.componentInstance.saveEditPrice(listing);

    expect(fixture.componentInstance.editingListingId()).toBeNull();
    expect(fixture.componentInstance.actionError()).not.toBeNull();
  });

  it('deleteListing() calls delete and refetches listings', () => {
    shopService.getMine.mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'desc' }));
    listingService.getMine.mockReturnValue(
      of({ content: [makeListing()], totalElements: 1, totalPages: 1, number: 0, size: 12 }),
    );
    listingService.delete.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    fixture.componentInstance.deleteListing(makeListing());

    expect(listingService.delete).toHaveBeenCalledWith('l1');
  });

  it('deleteListing() surfaces an error on failure', () => {
    shopService.getMine.mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'desc' }));
    listingService.getMine.mockReturnValue(
      of({ content: [makeListing()], totalElements: 1, totalPages: 1, number: 0, size: 12 }),
    );
    listingService.delete.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    fixture.componentInstance.deleteListing(makeListing());

    expect(fixture.componentInstance.actionError()).not.toBeNull();
  });

  it('deleteShop() resets the shop and listings signals on success when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    shopService.getMine.mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'desc' }));
    listingService.getMine.mockReturnValue(
      of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 }),
    );
    shopService.delete.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    fixture.componentInstance.deleteShop();

    expect(fixture.componentInstance.shop()).toBeNull();
    expect(fixture.componentInstance.listings().length).toBe(0);
  });

  it('deleteShop() does nothing when the confirmation is declined', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    shopService.getMine.mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'desc' }));
    listingService.getMine.mockReturnValue(
      of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 }),
    );

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    fixture.componentInstance.deleteShop();

    expect(shopService.delete).not.toHaveBeenCalled();
    expect(fixture.componentInstance.shop()).not.toBeNull();
  });

  it('deleteShop() clears the in-flight flag and surfaces an error on failure', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    shopService.getMine.mockReturnValue(of({ id: 's1', name: 'Retro Shop', description: 'desc' }));
    listingService.getMine.mockReturnValue(
      of({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 12 }),
    );
    shopService.delete.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

    const fixture = TestBed.createComponent(MyShopPage);
    fixture.detectChanges();

    fixture.componentInstance.deleteShop();

    expect(fixture.componentInstance.deletingShop()).toBe(false);
    expect(fixture.componentInstance.shop()).not.toBeNull();
    expect(fixture.componentInstance.actionError()).not.toBeNull();
  });
});
