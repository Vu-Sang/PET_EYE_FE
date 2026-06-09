import apiClient from './apiClient';
import { ApiResponse, ShopCustomerResponse, CustomerDetailResponse } from '../types/api';

const getShopCustomers = async (): Promise<ShopCustomerResponse> => {
  const response = await apiClient.get<ApiResponse<ShopCustomerResponse>>('/shops/my-shop/customers');
  return response.data.result;
};

const getCustomerDetail = async (customerId: number): Promise<CustomerDetailResponse> => {
  const response = await apiClient.get<ApiResponse<CustomerDetailResponse>>(`/shops/my-shop/customers/${customerId}`);
  return response.data.result;
};

export const customerService = {
  getShopCustomers,
  getCustomerDetail,
};
