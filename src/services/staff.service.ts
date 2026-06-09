import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffCertificateResponse {
  id: number;
  certificateName: string;
  imageUrl: string;
  issueDate?: string;
  expiryDate?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface StaffCertificateRequest {
  certificateName: string;
  imageUrl: string;
  issueDate?: string;
  expiryDate?: string;
}

export interface StaffResponse {
  id: number;
  shopId: number;
  userId: number | null;
  email: string | null;
  fullName: string;
  role: string | null;
  phone: string | null;
  specialization: string | null;
  isActive: boolean;
  certificates?: StaffCertificateResponse[];
}

export interface StaffCreationRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  specialization?: string;
  certificates?: StaffCertificateRequest[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const staffService = {
  /** GET /staff — Owner: get all staff in owner's shop */
  getMyShopStaff: async (): Promise<StaffResponse[]> => {
    const response = await apiClient.get<ApiResponse<StaffResponse[]>>('/staff');
    return response.data.result ?? [];
  },

  /** GET /staff/:id — Owner: get a single staff member */
  getStaffById: async (id: number): Promise<StaffResponse> => {
    const response = await apiClient.get<ApiResponse<StaffResponse>>(`/staff/${id}`);
    return response.data.result!;
  },

  /** GET /staff/my-profile — Staff: get own profile */
  getMyProfile: async (): Promise<StaffResponse> => {
    const response = await apiClient.get<ApiResponse<StaffResponse>>('/staff/my-profile');
    return response.data.result!;
  },

  /** POST /staff — Owner: create a new staff account */
  createStaff: async (data: StaffCreationRequest): Promise<StaffResponse> => {
    const response = await apiClient.post<ApiResponse<StaffResponse>>('/staff', data);
    return response.data.result!;
  },

  /** PUT /staff/:id/toggle-status — Owner: toggle active/inactive */
  toggleStatus: async (id: number): Promise<StaffResponse> => {
    const response = await apiClient.put<ApiResponse<StaffResponse>>(
      `/staff/${id}/toggle-status`
    );
    return response.data.result!;
  },

  /** PUT /staff/:id — Owner: update staff details */
  updateStaff: async (id: number, data: Partial<StaffCreationRequest>): Promise<StaffResponse> => {
    const response = await apiClient.put<ApiResponse<StaffResponse>>(`/staff/${id}`, data);
    return response.data.result!;
  },

  // ─── Certificates ──────────────────────────────────────────────────────────

  /** POST /staff/:id/certificates — Add a certificate */
  addCertificate: async (staffId: number, data: StaffCertificateRequest): Promise<StaffResponse> => {
    const response = await apiClient.post<ApiResponse<StaffResponse>>(`/staff/${staffId}/certificates`, data);
    return response.data.result!;
  },

  /** DELETE /staff/certificates/:certId — Remove a certificate */
  removeCertificate: async (certId: number): Promise<void> => {
    await apiClient.delete(`/staff/certificates/${certId}`);
  },

  /** PUT /staff/certificates/:certId/verify — Verify or Reject */
  verifyCertificate: async (certId: number, status: 'VERIFIED' | 'REJECTED'): Promise<StaffResponse> => {
    const response = await apiClient.put<ApiResponse<StaffResponse>>(
      `/staff/certificates/${certId}/verify`,
      null,
      { params: { status } }
    );
    return response.data.result!;
  },
};
