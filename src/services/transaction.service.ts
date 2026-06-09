import apiClient from './apiClient';
import type { ApiResponse, TransactionResponse, PageResponse } from '../types/api';

export const transactionService = {
  getCustomerTransactions: async (page: number = 1, limit: number = 10): Promise<PageResponse<TransactionResponse>> => {
    const { data } = await apiClient.get<ApiResponse<PageResponse<TransactionResponse>>>(`/transactions/customer`, {
      params: { page, size: limit }
    });
    return data.result;
  },
  
  getShopTransactions: async (page: number = 1, limit: number = 10): Promise<PageResponse<TransactionResponse>> => {
    const { data } = await apiClient.get<ApiResponse<PageResponse<TransactionResponse>>>(`/transactions/shop`, {
      params: { page, size: limit }
    });
    return data.result;
  }
};
