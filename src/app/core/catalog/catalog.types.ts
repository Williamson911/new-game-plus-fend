export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type ListingCondition = 'NEW' | 'VERY_GOOD' | 'GOOD' | 'FAIR';

export const LISTING_CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: 'Neuf',
  VERY_GOOD: 'Très bon état',
  GOOD: 'Bon état',
  FAIR: 'État correct',
};

export interface ListingResponse {
  id: string;
  shopId: string;
  gameId: string;
  gameName: string;
  shopName: string;
  gamePlatform: string;
  price: number;
  status: 'AVAILABLE' | 'SOLD';
  featured: boolean;
  condition: ListingCondition | null;
  description: string | null;
  imageUrls: string[];
}

export interface GameResponse {
  id: string;
  name: string;
  description: string;
  genres: string[];
  publisher: string;
  developer: string;
  platform: string;
  releaseDate: string;
  coverURL: string | null;
  weightGrams: number;
}

export interface IgdbGameResult {
  igdbId: string;
  name: string;
  description: string | null;
  coverURL: string | null;
  platform: string | null;
  releaseDate: string | null;
}

export interface GenreResponse {
  id: string;
  name: string;
}

export interface ListingFilters {
  search: string;
  genreId: string;
  platform: string;
  minPrice: number | null;
  maxPrice: number | null;
  shopId: string;
}
