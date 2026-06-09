import apiClient from './apiClient';
import type { ApiResponse, BookingRequest, BookingResponse, StaffResponse } from '../types/api';

export interface InitiatePaymentResponse {
  orderCode: number;
  checkoutUrl: string;
  qrCode?: string;
  amount: number;
  description: string;
}

export const bookingService = {
  /** Step 1 (PayOS): validate + create PayOS link. No booking saved yet. */
  initiatePayment: async (data: {
    shopId: number;
    serviceId: number;
    serviceIds?: number[];
    petId: number;
    staffId?: number;
    appointmentDatetime: string;
    checkIn?: string;
    checkOut?: string;
    note?: string;
    cageSize?: string;
    roomType?: string;
  }): Promise<InitiatePaymentResponse> => {
    const response = await apiClient.post<ApiResponse<InitiatePaymentResponse>>(
      '/bookings/initiate-payment', data
    );
    return response.data.result!;
  },

  /** Step 2 (PayOS): verify payment → create booking if PAID */
  confirmPayment: async (orderCode: number): Promise<BookingResponse> => {
    const response = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/confirm-payment?orderCode=${orderCode}`
    );
    return response.data.result!;
  },

  /** Cash Step 1: validate + create PayOS link for 10% deposit. No booking saved yet. */
  initiateCashDeposit: async (data: BookingRequest): Promise<InitiatePaymentResponse> => {
    const response = await apiClient.post<ApiResponse<InitiatePaymentResponse>>(
      '/bookings/cash/initiate', data
    );
    return response.data.result!;
  },

  /** Cash Step 2: verify 10% deposit paid → create booking */
  confirmCashDeposit: async (orderCode: number): Promise<BookingResponse> => {
    const response = await apiClient.post<ApiResponse<BookingResponse>>(
      `/bookings/cash/confirm?orderCode=${orderCode}`
    );
    return response.data.result!;
  },

  /** Get all bookings of the current user */
  getMyBookings: async (page: number = 1, size: number = 10, status?: string): Promise<any> => {
    const params: any = { page, size };
    if (status && status !== 'all') params.status = status;
    const response = await apiClient.get<ApiResponse<any>>('/bookings/my', { params });
    return response.data.result;
  },

  /** Get paginated bookings of the current user (10 per page) */
  getMyBookingsPaged: async (page = 0): Promise<{ content: BookingResponse[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean }> => {
    const response = await apiClient.get<ApiResponse<{ content: BookingResponse[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean }>>('/bookings/my/paged', { params: { page } });
    return response.data.result!;
  },

  /** Get booking detail */
  getById: async (id: number): Promise<BookingResponse> => {
    const response = await apiClient.get<ApiResponse<BookingResponse>>(`/bookings/${id}`);
    return response.data.result!;
  },

  /** Cancel a booking */
  cancel: async (id: number): Promise<BookingResponse> => {
    const response = await apiClient.post<ApiResponse<BookingResponse>>(`/bookings/${id}/cancel`);
    return response.data.result!;
  },

  /** Shop proactively cancels a booking */
  shopCancel: async (id: number, reason: string): Promise<BookingResponse> => {
    const response = await apiClient.post<ApiResponse<BookingResponse>>(`/bookings/${id}/shop-cancel`, { reason });
    return response.data.result!;
  },



  mockConfirmPayment: async (orderCode: number): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(`/bookings/mock-confirm?orderCode=${orderCode}`);
    return response.data.result!;
  },

  mockConfirmCashDeposit: async (orderCode: number): Promise<any> => {
    const response = await apiClient.post<ApiResponse<any>>(`/bookings/cash/mock-confirm?orderCode=${orderCode}`);
    return response.data.result!;
  },

  /** Request a booking cancellation with a reason, pending shop approval */
  requestCancel: async (id: number, payload: { reason: string; bankName: string; bankAccount: string; accountHolder: string }): Promise<BookingResponse> => {
    const response = await apiClient.post<ApiResponse<BookingResponse>>(`/bookings/${id}/cancel-request`, payload);
    return response.data.result!;
  },

  updateBankInfo: async (id: number, payload: { bankName: string; bankAccount: string; accountHolder: string }): Promise<BookingResponse> => {
    const response = await apiClient.put<ApiResponse<BookingResponse>>(`/bookings/${id}/bank-info`, payload);
    return response.data.result!;
  },

  /** Get active staff for a shop */
  getShopStaff: async (shopId: number): Promise<StaffResponse[]> => {
    const response = await apiClient.get<ApiResponse<StaffResponse[]>>(`/bookings/staff/${shopId}`);
    return response.data.result ?? [];
  },

  /** Get staff with availability for a specific time slot */
  getShopStaffAvailability: async (
    shopId: number,
    appointmentDatetime: string,
    durationMinutes: number = 60
  ): Promise<StaffResponse[]> => {
    const response = await apiClient.get<ApiResponse<StaffResponse[]>>(
      `/bookings/staff/${shopId}/availability`,
      { params: { appointmentDatetime, durationMinutes } }
    );
    return response.data.result ?? [];
  },

  /** Get all bookings for the authenticated shop owner within a range */
  getShopBookings: async (start?: string, end?: string): Promise<BookingResponse[]> => {
    const params: any = {};
    if (start) params.start = start;
    if (end) params.end = end;
    
    const response = await apiClient.get<ApiResponse<BookingResponse[]>>('/bookings/shop', { params });
    return response.data.result ?? [];
  },

  /** Get paginated bookings for the authenticated shop owner (10 per page) */
  getShopBookingsPaged: async (page = 0, start?: string, end?: string): Promise<{ content: BookingResponse[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean }> => {
    const params: any = { page };
    if (start) params.start = start;
    if (end) params.end = end;
    const response = await apiClient.get<ApiResponse<{ content: BookingResponse[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean }>>('/bookings/shop/paged', { params });
    return response.data.result!;
  },

  /** Check if a pet is available for booking at a specific time */
  checkPetAvailability: async (petId: number, appointmentDatetime: string, durationMinutes: number = 60): Promise<boolean> => {
    const response = await apiClient.get<ApiResponse<boolean>>(`/bookings/pet/${petId}/availability`, {
      params: { appointmentDatetime, durationMinutes }
    });
    return response.data.result ?? false;
  },

  /**
   * Get available time slots for a shop given a list of service IDs.
   * Total duration = sum of all selected services. Slots step = 60 min.
   */
  getAvailableTimeSlotsForServices: async (
    shopId: number,
    date: string,
    serviceIds: number[]
  ): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>(
      `/bookings/shop/${shopId}/available-slots-by-services`,
      { params: { date, serviceIds: serviceIds.join(',') } }
    );
    return response.data.result ?? [];
  },

  /**
   * Get available time slots for a shop on a specific date.
   * @deprecated Dùng getAvailableTimeSlotsForServices thay thế khi có serviceIds
   */
  getAvailableTimeSlots: async (
    shopId: number,
    date: string,
    durationMinutes: number = 60
  ): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>(
      `/bookings/shop/${shopId}/available-slots`,
      { params: { date, durationMinutes } }
    );
    return response.data.result ?? [];
  },

  /** Get active camera streams for current user */
  getActiveCameras: async (): Promise<BookingResponse[]> => {
    const response = await apiClient.get<ApiResponse<BookingResponse[]>>('/v1/camera/active');
    return response.data.result ?? [];
  },

  /** Configure camera RTSP url for a booking (Shop Owner) */
  configureCamera: async (bookingId: number, rtspUrl: string): Promise<BookingResponse> => {
    const response = await apiClient.post<ApiResponse<BookingResponse>>(
      `/v1/camera/booking/${bookingId}`,
      { rtspUrl }
    );
    return response.data.result!;
  },

  /** Stop/Delete camera configuration for a booking (Shop Owner) */
  deleteCamera: async (bookingId: number): Promise<BookingResponse> => {
    const response = await apiClient.delete<ApiResponse<BookingResponse>>(
      `/v1/camera/booking/${bookingId}`
    );
    return response.data.result!;
  },

  /**
   * Xuất hóa đơn thủ công — Shop Owner / Staff gọi khi đơn COMPLETED hoặc CASH
   * Backend sẽ gửi email hóa đơn đến khách hàng
   */
  sendInvoice: async (bookingId: number): Promise<void> => {
    await apiClient.post(`/bookings/${bookingId}/send-invoice`);
  },

  /** 
   * Shop creates booking directly for a customer.
   * Assumes backend endpoint /bookings/shop-create exists.
   */
  createBookingByShop: async (data: {
    customerId: number;
    shopId: number;
    serviceIds: number[];
    petId: number;
    appointmentDatetime: string;
    checkIn?: string;
    checkOut?: string;
    staffId?: number;
    note?: string;
  }): Promise<BookingResponse> => {
    const response = await apiClient.post<ApiResponse<BookingResponse>>(
      '/bookings/shop-create', data
    );
    return response.data.result!;
  },
};
