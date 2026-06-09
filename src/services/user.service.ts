import apiClient from './apiClient';
import { ApiResponse, UserResponse } from '../types/api';

export const userService = {
  register: async (userData: { email: string; password: string; fullName?: string; phone?: string; address?: string }): Promise<UserResponse> => {
    const response = await apiClient.post<ApiResponse<UserResponse>>('/users/register', userData);
    return response.data.result!;
  },

  getById: async (id: number): Promise<UserResponse> => {
    const response = await apiClient.get<ApiResponse<UserResponse>>(`/users/${id}`);
    return response.data.result!;
  },

  update: async (id: number, userData: Partial<UserResponse> & { password?: string }): Promise<UserResponse> => {
    const response = await apiClient.put<ApiResponse<UserResponse>>(`/users/${id}`, userData);
    return response.data.result!;
  },

  uploadAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<string>>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.result!;
  },

  deleteAvatar: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}/avatar`);
  },

  changePassword: async (id: number, data: any): Promise<void> => {
    await apiClient.post(`/users/${id}/change-password`, data);
  },

  acknowledgeTierUpgrade: async (): Promise<void> => {
    await apiClient.patch('/users/me/acknowledge-upgrade');
  },

  getPublicVouchers: async (): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/admin/vouchers/public');
    return response.data.result || [];
  },

  checkVoucherStatus: async (voucherCode: string, totalAmount: number, shopId: number): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/user/vouchers/check', null, {
      params: { voucherCode, totalAmount, shopId }
    });
    return res.data;
  },

  // Config
  getVoucherServiceConfig: async (): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<{ enabled: boolean }>>('/public/config/voucher-service');
    return res.data.result?.enabled ?? true;
  },

  getMyVouchers: async (): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>('/users/me/vouchers');
    return response.data.result || [];
  }
};
