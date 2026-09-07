export interface PayoutResponse {
  id: string;
  amount: number;
  createdAt: string;
}

export interface WalletResponse {
  balance: number;
  totalEarned: number;
  totalPaidOut: number;
  commissionRate: number;
  payouts: PayoutResponse[];
}
