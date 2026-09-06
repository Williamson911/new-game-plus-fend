export interface ReviewResponse {
  id: string;
  authorUsername: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewRequest {
  orderId: string;
  rating: number;
  comment: string | null;
}
