import apiClient from './apiClient';
import { ApiResponse } from '../types/api';
import { Pet } from '../types';

export const petService = {
  create: async (petData: any): Promise<Pet> => {
    if (isNaN(Number(petData.ownerId))) {
      throw new Error('Invalid owner ID: NaN. Please try logging out and in again.');
    }
    const response = await apiClient.post<ApiResponse<Pet>>('/pets', petData);
    return response.data.result!;
  },

  getByOwner: async (ownerId: number): Promise<Pet[]> => {
    if (isNaN(ownerId)) {
      console.warn('[pet.service] getByOwner called with NaN ownerId');
      return [];
    }
    const response = await apiClient.get<ApiResponse<Pet[]>>(`/pets/owner/${ownerId}`);
    return response.data.result!;
  },

  getById: async (id: number): Promise<Pet> => {
    if (isNaN(id)) {
      throw new Error('Invalid pet ID: NaN');
    }
    const response = await apiClient.get<ApiResponse<Pet>>(`/pets/${id}`);
    return response.data.result!;
  },

  update: async (id: number, petData: any): Promise<Pet> => {
    if (isNaN(id)) {
      throw new Error('Invalid pet ID for update: NaN');
    }
    const response = await apiClient.put<ApiResponse<Pet>>(`/pets/${id}`, petData);
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

  delete: async (id: number, reason: string): Promise<void> => {
    if (isNaN(id)) {
      console.warn('[pet.service] delete called with NaN id');
      return;
    }
    await apiClient.delete(`/pets/${id}`, { params: { reason } });
  },

  saveAlbumImageFromCareLog: async (petId: number, careLogId: number): Promise<void> => {
    await apiClient.post(`/pets/${petId}/album/from-carelog/${careLogId}`);
  }
};
