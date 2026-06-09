import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskResponse {
  bookingId: number;
  shopId: number;
  shopName: string;
  petId: number;
  petName: string;
  customerId: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceId: number;
  serviceName: string;
  servicePrice: number;
  staffId: number | null;
  staffName: string | null;
  appointmentDatetime: string;
  checkOutDatetime?: string;
  serviceStartDatetime?: string;
  serviceEndDatetime?: string;
  cageSize?: string;
  roomType?: string;
  status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PENDING_PAYMENT' | 'CANCEL_REQUESTED' | 'WAITING_REFUND';
  note: string | null;
  cameraEnabled?: boolean;
  rtspLink?: string;
  category?: string;
  cancellationReason?: string;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  createdAt: string;
  updatedAt?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  completedServiceIds?: number[];
  services?: {
    serviceId: number;
    serviceName: string;
    servicePrice: number;
    completedAt?: string;
  }[];
}

export type TaskStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// ─── Service ──────────────────────────────────────────────────────────────────

export const taskService = {
  // ─── Staff endpoints ──────────────────────────────────────────────────────

  /** GET /tasks/my-tasks — Staff: get assigned tasks */
  getMyTasks: async (): Promise<TaskResponse[]> => {
    const response = await apiClient.get<ApiResponse<TaskResponse[]>>('/tasks/my-tasks');
    return response.data.result ?? [];
  },

  /** GET /tasks/unassigned — Staff/Owner: get unassigned bookings in shop */
  getUnassignedTasks: async (): Promise<TaskResponse[]> => {
    const response = await apiClient.get<ApiResponse<TaskResponse[]>>('/tasks/unassigned');
    return response.data.result ?? [];
  },

  /** PUT /tasks/:id/claim — Staff: claim an unassigned booking */
  claimTask: async (bookingId: number): Promise<TaskResponse> => {
    const response = await apiClient.put<ApiResponse<TaskResponse>>(
      `/tasks/${bookingId}/claim`
    );
    return response.data.result!;
  },

  /** PUT /tasks/:id/status — Staff: update task status */
  updateStatus: async (bookingId: number, status: TaskStatus, rtspLink?: string): Promise<TaskResponse> => {
    const response = await apiClient.put<ApiResponse<TaskResponse>>(
      `/tasks/${bookingId}/status`,
      { status, rtspLink }
    );
    return response.data.result!;
  },

  // ─── Owner endpoints ──────────────────────────────────────────────────────

  /** GET /tasks/all — Owner: get all shop bookings */
  getAllShopTasks: async (): Promise<TaskResponse[]> => {
    const response = await apiClient.get<ApiResponse<TaskResponse[]>>('/tasks/all');
    return response.data.result ?? [];
  },

  /** PUT /tasks/:bookingId/assign/:staffId — Owner: assign staff to booking */
  assignTask: async (bookingId: number, staffId: number): Promise<TaskResponse> => {
    const response = await apiClient.put<ApiResponse<TaskResponse>>(
      `/tasks/${bookingId}/assign/${staffId}`
    );
    return response.data.result!;
  },

  /** PUT /tasks/:bookingId/unassign — Owner: remove staff from booking */
  unassignTask: async (bookingId: number): Promise<TaskResponse> => {
    const response = await apiClient.put<ApiResponse<TaskResponse>>(
      `/tasks/${bookingId}/unassign`
    );
    return response.data.result!;
  },

  /** GET /tasks/:bookingId/staff-change-request — Get pending request */
  getPendingStaffChangeRequest: async (bookingId: number): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/tasks/${bookingId}/staff-change-request`);
    return response.data.result ?? null;
  },

  /** GET /tasks/:bookingId/staff-change-history — Get staff change history */
  getStaffChangeHistory: async (bookingId: number): Promise<any[]> => {
    const response = await apiClient.get<ApiResponse<any[]>>(`/tasks/${bookingId}/staff-change-history`);
    return response.data.result ?? [];
  },

  /** POST /tasks/:bookingId/request-change/:staffId — Owner: request staff change */
  requestStaffChange: async (bookingId: number, staffId: number, reason: string): Promise<void> => {
    await apiClient.post(`/tasks/${bookingId}/request-change/${staffId}`, { reason });
  },

  /** PUT /tasks/staff-change/:requestId/respond — Customer: respond to staff change */
  respondToStaffChange: async (requestId: number, status: 'ACCEPTED' | 'REJECTED'): Promise<TaskResponse> => {
    const response = await apiClient.put<ApiResponse<TaskResponse>>(
      `/tasks/staff-change/${requestId}/respond`,
      { status }
    );
    return response.data.result!;
  },

  /** PUT /tasks/:bookingId/no-show — Staff/Owner: cancel booking due to customer no-show */
  cancelNoShow: async (bookingId: number): Promise<TaskResponse> => {
    const response = await apiClient.put<ApiResponse<TaskResponse>>(
      `/tasks/${bookingId}/no-show`
    );
    return response.data.result!;
  },

  /** PUT /tasks/:bookingId/complete-service/:serviceId — Staff/Owner: complete sub-service item */
  completeServiceItem: async (bookingId: number, serviceId: number): Promise<TaskResponse> => {
    const response = await apiClient.put<ApiResponse<TaskResponse>>(
      `/tasks/${bookingId}/complete-service/${serviceId}`
    );
    return response.data.result!;
  },
};
