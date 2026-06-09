import apiClient from "./apiClient";
import { ApiResponse } from "../types/api";

export interface CareLogRequest {
  type: string;
  note: string;
  imageUrl?: string;
}

export interface CareLogResponse {
  id: number;
  bookingId: number;
  staffName: string;
  type: string;
  note: string;
  timestamp: string;
  imageUrl?: string;
}

export const careLogService = {
  addLog: async (bookingId: number, data: CareLogRequest): Promise<CareLogResponse> => {
    const response = await apiClient.post<ApiResponse<CareLogResponse>>(`/care-logs/${bookingId}`, data);
    return response.data.result!;
  },

  getLogs: async (bookingId: number): Promise<CareLogResponse[]> => {
    const response = await apiClient.get<ApiResponse<CareLogResponse[]>>(`/care-logs/${bookingId}`);
    return response.data.result ?? [];
  }
};
