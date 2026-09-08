import { OrderResponse } from '../shop/shop.types';

export interface CartItemResponse {
  listingId: string;
  gameName: string;
  shopName: string;
  price: number;
  weightGrams: number;
  imageUrl: string;
}

export interface CartResponse {
  items: CartItemResponse[];
}

export type DeliveryMode = 'HOME' | 'RELAY_POINT';

export interface CheckoutRequest {
  deliveryMode: DeliveryMode;
  street?: string;
  streetNumber?: string;
  postCode?: string;
  city?: string;
  country?: string;
  relayPointId?: string;
  relayPointName?: string;
  relayPointStreet?: string;
  relayPointPostCode?: string;
  relayPointCity?: string;
  relayPointCountry?: string;
}

export interface CheckoutResponse {
  orders: OrderResponse[];
  checkoutUrl: string;
}

export interface RelayPointResult {
  id: string;
  name: string;
  street: string;
  postCode: string;
  city: string;
  country: string;
}
