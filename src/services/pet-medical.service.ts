import apiClient from "./apiClient";
import { ApiResponse } from "../types/api";

export interface PetMedicalRecordRequest {
  diagnosis: string;
  symptoms: string;
  treatment: string;
  prescription: string;
  notes?: string;
  visitDate: string;
}

export interface PetMedicalRecordResponse {
  id: number;
  petId: number;
  bookingId?: number;
  diagnosis: string;
  symptoms: string;
  treatment: string;
  prescription: string;
  notes?: string;
  visitDate: string;
  staffName?: string;
  shopName?: string;
  createdAt: string;
}

export interface PetVaccinationRequest {
  name: string;
  drug?: string;
  clinic?: string;
  date?: string;
  status?: string;
}

export interface PetVaccinationResponse {
  id: number;
  petId: number;
  bookingId?: number;
  staffId?: number;
  staffName?: string;
  shopName?: string;
  name: string;
  drug?: string;
  clinic?: string;
  date?: string;
  status?: string;
}

export const petMedicalService = {
  addMedicalRecord: async (bookingId: number, data: PetMedicalRecordRequest): Promise<PetMedicalRecordResponse> => {
    const response = await apiClient.post<ApiResponse<PetMedicalRecordResponse>>(`/medical/booking/${bookingId}`, data);
    return response.data.result!;
  },

  getMedicalRecords: async (petId: number): Promise<PetMedicalRecordResponse[]> => {
    const response = await apiClient.get<ApiResponse<PetMedicalRecordResponse[]>>(`/medical/pet/${petId}`);
    return response.data.result ?? [];
  },

  addVaccination: async (bookingId: number, data: PetVaccinationRequest): Promise<PetVaccinationResponse> => {
    const response = await apiClient.post<ApiResponse<PetVaccinationResponse>>(`/medical/vaccinations/booking/${bookingId}`, data);
    return response.data.result!;
  },

  getVaccinations: async (petId: number): Promise<PetVaccinationResponse[]> => {
    const response = await apiClient.get<ApiResponse<PetVaccinationResponse[]>>(`/medical/vaccinations/pet/${petId}`);
    return response.data.result ?? [];
  }
};
