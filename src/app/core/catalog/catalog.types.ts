export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

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
