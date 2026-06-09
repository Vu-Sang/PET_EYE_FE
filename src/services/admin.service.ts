import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalRevenue: number;
  periodRevenue?: number;
  totalRevenueTrend?: string;
  totalRevenueTrendUp?: boolean | null;
  totalRevenueSparkData?: number[];

  totalUsers: number;
  periodUsers?: number;
  totalUsersTrend?: string;
  totalUsersTrendUp?: boolean | null;
  totalUsersSparkData?: number[];

  totalShops: number;
  totalShopsTrend?: string;
  totalShopsTrendUp?: boolean | null;
  totalShopsSparkData?: number[];

  totalBookings: number;
  periodBookings?: number;
  totalBookingsTrend?: string;
  totalBookingsTrendUp?: boolean | null;
  totalBookingsSparkData?: number[];

  pendingShops: number;
  pendingShopsTrend?: string;
  pendingShopsTrendUp?: boolean | null;
  pendingShopsSparkData?: number[];

  unreadMessages: number;
}

export interface RevenueMonthly {
  month: number;   // 1-12
  revenue: number; // VND
}

export interface BookingDaily {
  date: string;    // yyyy-MM-dd
  count: number;
}

export interface AdminShopResponse {
  id: number;
  shopName: string;
  shopType: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  description: string;
  licenseNumber: string;
  licenseImageUrl?: string;
  logoUrl?: string;
  bannerUrl?: string;
  galleryUrls?: string;
  openTime?: string;
  closeTime?: string;
  workingDays?: string;
  isVerified: boolean;
  verified?: boolean;       // Jackson serialize isVerified → verified
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  ratingAvg: number;
  ownerId: number;
  assignmentMode?: 'MANUAL' | 'OPEN_POOL' | 'AUTO';
  staffs?: any[];
}

export interface AdminStaffResponse {
  id: number;
  shopId: number;
  userId: number;
  email: string;
  fullName: string;
  role: string;
  phone: string;
  specialization: string;
  isActive: boolean;
}

export interface AdminUserResponse {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  avatar?: string;
  roles: { name: string }[];
  isActive?: boolean;
  active?: boolean; // field thực tế BE trả về
  currentTier?: {
    id: number;
    name: string;
    requiredSpending: number;
  };
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export type NotificationType = 'GENERAL' | 'PROMOTION' | 'REMINDER' | 'SYSTEM' | 'BOOKING';

export interface AdminNotification {
  broadcastId: string;
  title: string;
  content: string;
  totalSent: number;
  totalRead: number;
  createdAt: string;
  notificationType?: NotificationType;
}

export interface ChatMessage {
  id: number;
  shopId: number;
  senderEmail: string;
  senderRole: string;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;  // IMAGE | FILE | VIDEO
  attachmentName?: string;
  createdAt: string;
  isRead: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const adminService = {
  // Dashboard
  getDashboard: async (startDate?: string, endDate?: string): Promise<AdminDashboardStats> => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await apiClient.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard', { params });
    return res.data.result!;
  },

  getRevenueMonthly: async (year?: number): Promise<RevenueMonthly[]> => {
    const res = await apiClient.get<ApiResponse<RevenueMonthly[]>>('/admin/dashboard/revenue-monthly', {
      params: year ? { year } : {}
    });
    return res.data.result ?? [];
  },

  getBookingsWeekly: async (): Promise<BookingDaily[]> => {
    const res = await apiClient.get<ApiResponse<BookingDaily[]>>('/admin/dashboard/bookings-weekly');
    return res.data.result ?? [];
  },

  // Shops
  getAllShops: async (): Promise<AdminShopResponse[]> => {
    const res = await apiClient.get<ApiResponse<AdminShopResponse[]>>('/shops');
    const data = res.data.result ?? [];
    return data.map(s => ({
      ...s,
      isVerified: Boolean((s as any).verified ?? s.isVerified),
      status: s.status as AdminShopResponse['status'],
    }));
  },

  getShopsPaged: async (page = 0): Promise<PagedResponse<AdminShopResponse>> => {
    const res = await apiClient.get<ApiResponse<PagedResponse<AdminShopResponse>>>('/shops/paged', { params: { page } });
    const paged = res.data.result!;
    return {
      ...paged,
      content: paged.content.map(s => ({
        ...s,
        isVerified: Boolean((s as any).verified ?? s.isVerified),
        status: s.status as AdminShopResponse['status'],
      })),
    };
  },

  getPendingShops: async (): Promise<AdminShopResponse[]> => {
    const res = await apiClient.get<ApiResponse<AdminShopResponse[]>>('/shops/pending');
    return res.data.result ?? [];
  },

  getShopById: async (id: number): Promise<AdminShopResponse> => {
    const res = await apiClient.get<ApiResponse<AdminShopResponse>>(`/shops/${id}`);
    return res.data.result!;
  },

  approveShop: async (id: number): Promise<void> => {
    await apiClient.post(`/shops/approve/${id}`);
  },

  rejectShop: async (id: number): Promise<void> => {
    await apiClient.post(`/shops/reject/${id}`);
  },

  getShopStaff: async (shopId: number): Promise<AdminStaffResponse[]> => {
    const res = await apiClient.get<ApiResponse<AdminStaffResponse[]>>(`/shops/${shopId}/staff`);
    return res.data.result ?? [];
  },

  // Users
  getAllUsers: async (): Promise<AdminUserResponse[]> => {
    const res = await apiClient.get<ApiResponse<AdminUserResponse[]>>('/users');
    const data = res.data.result ?? [];
    return data.map(u => ({
      ...u,
      isActive: Boolean((u as any).active ?? u.isActive),
    }));
  },

  getUsersPaged: async (page = 0): Promise<PagedResponse<AdminUserResponse>> => {
    const res = await apiClient.get<ApiResponse<PagedResponse<AdminUserResponse>>>('/users/paged', { params: { page } });
    const paged = res.data.result!;
    return {
      ...paged,
      content: paged.content.map(u => ({
        ...u,
        isActive: Boolean((u as any).active ?? u.isActive),
      })),
    };
  },

  deactivateUser: async (id: number): Promise<void> => {
    await apiClient.patch(`/users/${id}/deactivate`);
  },

  activateUser: async (id: number): Promise<void> => {
    await apiClient.patch(`/users/${id}/activate`);
  },

  deleteUser: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  // Notifications
  getNotifications: async (page = 0): Promise<PagedResponse<AdminNotification>> => {
    const res = await apiClient.get<ApiResponse<PagedResponse<AdminNotification>>>('/admin/notifications', { params: { page } });
    return res.data.result!;
  },

  createNotification: async (data: {
    title: string;
    content: string;
    targetType: 'SINGLE' | 'ALL_USERS' | 'ALL_SHOPS' | 'ALL';
    notificationType?: NotificationType;
    userId?: number;
  }): Promise<string> => {
    const res = await apiClient.post<ApiResponse<null> & { message: string }>('/admin/notifications', data);
    return res.data.message ?? 'Đã gửi thông báo';
  },

  deleteNotification: async (broadcastId: string): Promise<void> => {
    await apiClient.delete(`/admin/notifications/${broadcastId}`);
  },

  // Chat
  getChatHistory: async (shopId: number, channelType: string = 'ADMIN_SUPPORT', recipientEmail?: string): Promise<ChatMessage[]> => {
    const res = await apiClient.get<ApiResponse<ChatMessage[]>>(`/chat/${shopId}/history`, {
      params: { channelType, recipientEmail }
    });
    return res.data.result ?? [];
  },

  sendChatMessage: async (data: { shopId: number; channelType: string; recipientEmail: string; content: string }): Promise<ChatMessage> => {
    const res = await apiClient.post<ApiResponse<ChatMessage>>('/chat/send', data);
    return res.data.result!;
  },

  markChatRead: async (shopId: number, channelType: string = 'ADMIN_SUPPORT', recipientEmail?: string): Promise<void> => {
    await apiClient.patch(`/chat/${shopId}/read`, null, {
      params: { channelType, recipientEmail }
    });
  },

  getShopCustomers: async (shopId: number): Promise<AdminUserResponse[]> => {
    const res = await apiClient.get<ApiResponse<AdminUserResponse[]>>(`/chat/${shopId}/customers`);
    return res.data.result ?? [];
  },

  // Vouchers
  getAllVouchers: async (): Promise<any[]> => {
    const res = await apiClient.get<ApiResponse<any[]>>('/admin/vouchers');
    return res.data.result ?? [];
  },

  createVoucher: async (data: any): Promise<any> => {
    const res = await apiClient.post<ApiResponse<any>>('/admin/vouchers', data);
    return res.data.result;
  },

  updateVoucher: async (id: number, data: any): Promise<any> => {
    const res = await apiClient.put<ApiResponse<any>>(`/admin/vouchers/${id}`, data);
    return res.data.result;
  },

  deleteVoucher: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/vouchers/${id}`);
  },

  // Config
  getVoucherServiceConfig: async (): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<{ enabled: boolean }>>('/public/config/voucher-service');
    return res.data.result?.enabled ?? true;
  },

  setVoucherServiceConfig: async (enabled: boolean): Promise<void> => {
    await apiClient.put(`/admin/config/voucher-service?enabled=${enabled}`);
  },
};
