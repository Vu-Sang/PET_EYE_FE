import apiClient from './apiClient';
import type { ApiResponse, ServiceResponse, ServiceCreationRequest, ServiceUpdateRequest } from '../types/api';

export const serviceService = {
  /** GET /services/my-shop — all services (incl. inactive) for the logged-in shop owner */
  getMyShopServices: async (): Promise<ServiceResponse[]> => {
    const response = await apiClient.get<ApiResponse<ServiceResponse[]>>('/services/my-shop');
    return response.data.result ?? [];
  },

  /** POST /services — create a new service */
  createService: async (data: ServiceCreationRequest): Promise<ServiceResponse> => {
    const response = await apiClient.post<ApiResponse<ServiceResponse>>('/services', data);
    return response.data.result!;
  },

  /** PUT /services/:id — update a service */
  updateService: async (id: number, data: ServiceUpdateRequest): Promise<ServiceResponse> => {
    const response = await apiClient.put<ApiResponse<ServiceResponse>>(`/services/${id}`, data);
    return response.data.result!;
  },

  /** DELETE /services/:id — soft-delete (deactivate) a service */
  deleteService: async (id: number): Promise<void> => {
    await apiClient.delete(`/services/${id}`);
  },

  /** POST /files/upload — upload image to Cloudinary, returns URL string */
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<string>>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.result!;
  },
};
