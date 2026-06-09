import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopWalletResponse {
  id: number;
  shopId: number;
  frozenBalance: number;
  availableBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  updatedAt: string;
}

export interface WithdrawalRequestResponse {
  id: number;
  shopId: number;
  shopName: string;
  amount: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  note?: string;
  status: 'PENDING' | 'PAYING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  adminNote?: string;
  payosOrderCode?: number;
  checkoutUrl?: string;
  createdAt: string;
  processedAt?: string;
  type?: 'WITHDRAWAL' | 'REFUND';
  userId?: number;
  userEmail?: string;
}

export interface WithdrawalRequestCreate {
  amount: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  note?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const walletService = {
  // ── Shop Owner ──────────────────────────────────────────────────────────────

  getMyWallet: async (): Promise<ShopWalletResponse> => {
    const res = await apiClient.get<ApiResponse<ShopWalletResponse>>('/wallet/my');
    return res.data.result!;
  },

  createWithdrawal: async (data: WithdrawalRequestCreate): Promise<WithdrawalRequestResponse> => {
    const res = await apiClient.post<ApiResponse<WithdrawalRequestResponse>>('/wallet/withdraw', data);
    return res.data.result!;
  },

  getMyWithdrawals: async (): Promise<WithdrawalRequestResponse[]> => {
    const res = await apiClient.get<ApiResponse<WithdrawalRequestResponse[]>>('/wallet/withdrawals/my');
    return res.data.result ?? [];
  },

  // ── Admin ───────────────────────────────────────────────────────────────────

  getAdminBalance: async (): Promise<number> => {
    const res = await apiClient.get<ApiResponse<{ adminBalance: number }>>('/wallet/admin/balance');
    return res.data.result?.adminBalance ?? 0;
  },

  getShopWallet: async (shopId: number): Promise<ShopWalletResponse> => {
    const res = await apiClient.get<ApiResponse<ShopWalletResponse>>(`/wallet/admin/shop/${shopId}`);
    return res.data.result!;
  },

  getAllWithdrawals: async (status?: string): Promise<WithdrawalRequestResponse[]> => {
    const params = status ? { status } : {};
    const res = await apiClient.get<ApiResponse<WithdrawalRequestResponse[]>>('/wallet/admin/withdrawals', { params });
    return res.data.result ?? [];
  },

  getWaitingRefunds: async (): Promise<WithdrawalRequestResponse[]> => {
    const res = await apiClient.get<ApiResponse<WithdrawalRequestResponse[]>>('/wallet/admin/refunds/waiting');
    return res.data.result ?? [];
  },

  approveWithdrawal: async (id: number, adminNote?: string): Promise<WithdrawalRequestResponse> => {
    const res = await apiClient.post<ApiResponse<WithdrawalRequestResponse>>(
      `/wallet/admin/withdrawals/${id}/approve`,
      null,
      { params: { adminNote: adminNote ?? '' } }
    );
    return res.data.result!;
  },

  confirmPayout: async (orderCode: number): Promise<WithdrawalRequestResponse> => {
    const res = await apiClient.post<ApiResponse<WithdrawalRequestResponse>>(
      '/wallet/admin/withdrawals/confirm-payout',
      null,
      { params: { orderCode } }
    );
    return res.data.result!;
  },

  regeneratePayoutLink: async (id: number): Promise<WithdrawalRequestResponse> => {
    const res = await apiClient.post<ApiResponse<WithdrawalRequestResponse>>(
      `/wallet/admin/withdrawals/${id}/regenerate-payout`
    );
    return res.data.result!;
  },

  confirmWithdrawal: async (id: number): Promise<WithdrawalRequestResponse> => {
    const res = await apiClient.post<ApiResponse<WithdrawalRequestResponse>>(
      `/wallet/admin/withdrawals/${id}/confirm-manual`
    );
    return res.data.result!;
  },

  confirmRefundForBooking: async (bookingId: number): Promise<void> => {
    const res = await apiClient.post<ApiResponse<string>>(`/wallet/admin/refunds/${bookingId}/confirm`);
    return res.data.result ? Promise.resolve() : Promise.resolve();
  },

  rejectWithdrawal: async (id: number, adminNote?: string): Promise<WithdrawalRequestResponse> => {
    const res = await apiClient.post<ApiResponse<WithdrawalRequestResponse>>(
      `/wallet/admin/withdrawals/${id}/reject`,
      null,
      { params: { adminNote: adminNote ?? '' } }
    );
    return res.data.result!;
  },

  /** Trigger thủ công expire các PAYING quá 24h (dùng để test) */
  expireStale: async (): Promise<string> => {
    const res = await apiClient.post<ApiResponse<string>>('/wallet/admin/withdrawals/expire-stale');
    return res.data.result ?? 'Done';
  },
};
