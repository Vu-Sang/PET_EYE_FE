import apiClient from "./apiClient";

export interface NotificationResponse {
    id: number;
    title: string;
    content: string;
    isRead: boolean;
    createdAt: string;
}

export interface PageResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
}

export const notificationService = {
    getMyNotifications: async (page = 0) => {
        const response = await apiClient.get<any>(`/users/notifications/my?page=${page}`);
        return response.data.result as PageResponse<NotificationResponse>;
    },

    markAsRead: async (id: number) => {
        const response = await apiClient.patch<any>(`/users/notifications/${id}/read`);
        return response.data;
    }
};
