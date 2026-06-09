import apiClient from './apiClient';
import type { ApiResponse, ServiceResponse, ShopDashboardResponse } from '../types/api';

export interface ShopPublicResponse {
  id: number;
  shopName: string;
  shopType: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  description: string;
  licenseImageUrl: string;
  logoUrl?: string;
  bannerUrl?: string;
  galleryUrls?: string;
  isVerified: boolean;
  ratingAvg: number;
  ownerId: number;
  openTime?: string;
  closeTime?: string;
  workingDays?: string;
  offDays?: string;
  assignmentMode?: 'MANUAL' | 'OPEN_POOL' | 'AUTO';
  staffs?: any[];
  serviceNames?: string[];
  latitude?: number;
  longitude?: number;
  lateGracePeriod?: number;
}

export interface ShopNearbyResponse {
  id: number;
  shopName: string;
  shopType: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  logoUrl?: string;
  ratingAvg: number;
  distanceKm: number;
  durationMinutes: number;
}

export interface ShopRegistrationRequest {
  shopName: string;
  shopType: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  description: string;
  password: string;
  licenseNumber: string;
  licenseImageUrl?: string;
}

export interface ShopUpdateRequest {
  shopName?: string;
  shopType?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  description?: string;
  openTime?: string;
  closeTime?: string;
  workingDays?: string;
  offDays?: string;
  logoUrl?: string;
  bannerUrl?: string;
  galleryUrls?: string;
  assignmentMode?: 'MANUAL' | 'OPEN_POOL' | 'AUTO';
  lateGracePeriod?: number;
}

export const shopService = {
  getMyShop: async (): Promise<ShopPublicResponse> => {
    const response = await apiClient.get<ApiResponse<ShopPublicResponse>>('/shops/my-shop');
    return response.data.result!;
  },

  updateMyShop: async (data: ShopUpdateRequest): Promise<ShopPublicResponse> => {
    const response = await apiClient.put<ApiResponse<ShopPublicResponse>>('/shops/my-shop', data);
    return response.data.result!;
  },

  getDashboard: async (startDate?: string, endDate?: string): Promise<ShopDashboardResponse> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiClient.get<ApiResponse<ShopDashboardResponse>>(`/shops/my-shop/dashboard${params.toString() ? '?' + params.toString() : ''}`);
    return response.data.result!;
  },

  register: async (data: ShopRegistrationRequest) => {
    const response = await apiClient.post('/shops/register', data);
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/shops');
    return response.data;
  },

  approve: async (id: number) => {
    const response = await apiClient.post(`/shops/approve/${id}`);
    return response.data;
  },

  // ─── Public endpoints (no auth required) ──────────────────────────────────

  /** Search verified shops. All params optional. */
  searchPublic: async (params?: {
    keyword?: string;
    city?: string;
    shopType?: string;
  }): Promise<ShopPublicResponse[]> => {
    const response = await apiClient.get<ApiResponse<ShopPublicResponse[]>>('/shops/public', { params });
    return response.data.result ?? [];
  },

  /** Search verified shops with pagination (10 per page). */
  searchPublicPaged: async (params?: {
    keyword?: string;
    city?: string;
    shopType?: string;
    page?: number;
  }): Promise<{ content: ShopPublicResponse[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean }> => {
    const response = await apiClient.get<ApiResponse<{ content: ShopPublicResponse[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean }>>('/shops/public/paged', { params });
    return response.data.result!;
  },

  /** Search nearby shops using coordinates */
  searchNearby: async (lat: number, lng: number, radius: number = 10.0): Promise<ShopNearbyResponse[]> => {
    const response = await apiClient.get<ApiResponse<ShopNearbyResponse[]>>('/shops/nearby', {
      params: { lat, lng, radius }
    });
    return response.data.result ?? [];
  },

  /** Get a single verified shop by id. */
  getPublicById: async (id: number): Promise<ShopPublicResponse> => {
    const response = await apiClient.get<ApiResponse<ShopPublicResponse>>(`/shops/public/${id}`);
    return response.data.result!;
  },

  /** Get active services for a shop (public). */
  getShopServices: async (shopId: number): Promise<ServiceResponse[]> => {
    const response = await apiClient.get<ApiResponse<ServiceResponse[]>>(`/services/shop/${shopId}`);
    return response.data.result ?? [];
  },

  getShopCustomers: async (shopId: number): Promise<{ id: number; email: string; fullName: string }[]> => {
    const response = await apiClient.get<ApiResponse<{ id: number; email: string; fullName: string }[]>>(`/chat/${shopId}/customers`);
    return response.data.result ?? [];
  },
};
