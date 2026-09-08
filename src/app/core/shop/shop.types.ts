import { ListingCondition } from '../catalog/catalog.types';

export interface ShopResponse {
  id: string;
  name: string;
  description: string | null;
}

export interface ShopRequest {
  name: string;
  description: string | null;
}

export interface ShopCreationResponse {
  shop: ShopResponse;
  token: string;
}

export interface ListingCreateRequest {
  gameId: string;
  price: number;
  condition: ListingCondition | null;
  description: string | null;
}

export interface GameCreateRequest {
  name: string;
  description: string;
  genreIds: string[];
  publisher: string;
  developer: string;
  platform: string;
  releaseDate: string;
  coverURL: string | null;
  igdbID: string | null;
  weightGrams: number;
}

export interface Address {
  street: string;
  streetNumber: string;
  postCode: string;
  city: string;
  country: string;
}

export interface RelayPoint {
  relayId: string;
  relayName: string;
  relayStreet: string;
  relayPostCode: string;
  relayCity: string;
  relayCountry: string;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItemResponse {
  listingId: string;
  gameName: string;
  price: number;
  imageUrl: string;
}

export interface OrderResponse {
  id: string;
  shopName: string;
  buyerUsername: string;
  buyerEmail: string;
  status: OrderStatus;
  deliveryMode: 'HOME' | 'RELAY_POINT';
  shippingAddress: Address | null;
  relayPoint: RelayPoint | null;
  shippingCost: number;
  createdAt: string;
  items: OrderItemResponse[];
  reviewed: boolean;
}
