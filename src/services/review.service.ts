import apiClient from './apiClient';

export interface ReviewResponse {
  id: number;
  userName: string;
  userAvatar?: string;
  serviceName?: string;
  shopName?: string;
  rating: number;
  comment: string;
  createdAt: string;
  reply?: string;
  repliedAt?: string;
}

export interface ReviewRequest {
  shopId: number;
  bookingId: number;
  rating: number;
  comment: string;
}

export interface ReviewReplyRequest {
  reply: string;
}

export const reviewService = {
  getReviewsByShop: async (shopId: number): Promise<ReviewResponse[]> => {
    const response = await apiClient.get(`/reviews/shop/${shopId}`);
    return response.data.result;
  },

  getReviewsByShopPaged: async (shopId: number, page = 0): Promise<{ content: ReviewResponse[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean }> => {
    const response = await apiClient.get(`/reviews/shop/${shopId}/paged`, { params: { page } });
    return response.data.result;
  },
  
  getReviewCount: async (shopId: number): Promise<number> => {
    const response = await apiClient.get(`/reviews/shop/${shopId}/count`);
    return response.data.result;
  },

  getLatestReviews: async (limit: number = 6): Promise<ReviewResponse[]> => {
    const response = await apiClient.get(`/reviews/latest?limit=${limit}`);
    return response.data.result;
  },

  createReview: async (request: ReviewRequest): Promise<ReviewResponse> => {
    const response = await apiClient.post('/reviews', request);
    return response.data.result;
  },

  replyToReview: async (reviewId: number, reply: string): Promise<ReviewResponse> => {
    const response = await apiClient.put(`/reviews/${reviewId}/reply`, { reply });
    return response.data.result;
  }
};
