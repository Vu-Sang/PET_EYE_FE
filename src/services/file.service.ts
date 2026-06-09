import apiClient from './apiClient';
import type { ApiResponse } from '../types/api';

export const fileService = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post<ApiResponse<string>>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.result!;
  }
};
