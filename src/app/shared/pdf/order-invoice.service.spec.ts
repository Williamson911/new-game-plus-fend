import { OrderInvoiceService } from './order-invoice.service';
import { OrderResponse } from '../../core/shop/shop.types';

function pdfText(doc: { output: (type: string) => string }): string {
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1];
  return atob(base64);
}

const homeOrder: OrderResponse = {
  id: 'order-home-1',
  shopName: 'Pixel Bazaar',
  buyerUsername: 'gamerino',
  buyerEmail: 'gamerino@example.com',
  status: 'PAID',
  deliveryMode: 'HOME',
  shippingAddress: {
    street: 'Rue de la Loi',
    streetNumber: '16',
    postCode: '4000',
    city: 'Liège',
    country: 'Belgique',
  },
  relayPoint: null,
  shippingCost: 4.5,
  createdAt: '2026-09-01T10:00:00Z',
  items: [
    { listingId: 'l1', gameName: 'Chrono Trigger', price: 25, imageUrl: '' },
    { listingId: 'l2', gameName: 'Silent Hill 2', price: 18.5, imageUrl: '' },
  ],
  reviewed: false,
};

const relayOrder: OrderResponse = {
  ...homeOrder,
  id: 'order-relay-1',
  deliveryMode: 'RELAY_POINT',
  shippingAddress: null,
  relayPoint: {
    relayId: 'r1',
    relayName: 'Point Relais Carrefour',
    relayStreet: 'Chaussée de Bruxelles 1',
    relayPostCode: '4000',
    relayCity: 'Liège',
    relayCountry: 'Belgique',
  },
};

describe('OrderInvoiceService', () => {
  let service: OrderInvoiceService;

  beforeEach(() => {
    service = new OrderInvoiceService();
  });

  it('includes the shop name and buyer username', () => {
    const doc = service.generateInvoice(homeOrder);
    const text = pdfText(doc);

    expect(text).toContain('Pixel Bazaar');
    expect(text).toContain('gamerino');
  });

  it('includes each item name and price', () => {
    const doc = service.generateInvoice(homeOrder);
    const text = pdfText(doc);

    expect(text).toContain('Chrono Trigger');
    expect(text).toContain('Silent Hill 2');
  });

  it('includes the total (items + shipping)', () => {
    const doc = service.generateInvoice(homeOrder);
    const text = pdfText(doc);

    expect(text).toContain('48');
  });

  it('includes the home delivery address when deliveryMode is HOME', () => {
    const doc = service.generateInvoice(homeOrder);
    const text = pdfText(doc);

    expect(text).toContain('Rue de la Loi');
  });

  it('includes the relay point name when deliveryMode is RELAY_POINT', () => {
    const doc = service.generateInvoice(relayOrder);
    const text = pdfText(doc);

    expect(text).toContain('Point Relais Carrefour');
  });
});
