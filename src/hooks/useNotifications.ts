import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import type { ApiResponse } from '../types/api';

export interface AppNotification {
  id: number;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// Load thông báo (page, size)
async function fetchAllMyNotifications(page: number = 0): Promise<any> {
  const res = await apiClient.get<ApiResponse<any>>('/users/notifications/my', {
    params: { page, size: 20 }
  });
  return res.data.result;
}

async function callMarkRead(id: number): Promise<void> {
  await apiClient.patch(`/users/notifications/${id}/read`);
}

export function useNotifications(page: number = 1, enabled = true) {
  const qc = useQueryClient();

  const { data: pageData, isLoading, refetch } = useQuery({
    queryKey: ['my-notifications', page],
    queryFn: () => fetchAllMyNotifications(page - 1),
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const notifications: AppNotification[] = Array.isArray(pageData) ? pageData : (pageData?.content ?? []);
  const totalPages: number = Array.isArray(pageData) ? 1 : (pageData?.totalPages ?? 1);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: callMarkRead,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['my-notifications'] });
      const prev = qc.getQueryData<any>(['my-notifications', page]);
      qc.setQueryData<any>(['my-notifications', page], (old: any) => {
        if (Array.isArray(old)) return old.map(n => n.id === id ? { ...n, isRead: true } : n);
        if (old && old.content) return { ...old, content: old.content.map((n: any) => n.id === id ? { ...n, isRead: true } : n) };
        return old;
      });
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['my-notifications', page], ctx.prev);
    },
    // Không invalidate ngay — giữ optimistic update, để refetchInterval tự sync sau
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/users/notifications/mark-all-read');
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['my-notifications'] });
      // Optimistic update for all pages
      qc.setQueriesData({ queryKey: ['my-notifications'] }, (old: any) => {
        if (Array.isArray(old)) return old.map(n => ({ ...n, isRead: true }));
        if (old && old.content) return { ...old, content: old.content.map((n: any) => ({ ...n, isRead: true })) };
        return old;
      });
      return {};
    },
    onError: (_err, _vars, ctx) => {
      // Ignore revert for mark all read as it affects multiple pages
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const deleteReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/users/notifications/read');
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['my-notifications'] });
      qc.setQueriesData({ queryKey: ['my-notifications'] }, (old: any) => {
        if (Array.isArray(old)) return old.filter(n => !n.isRead);
        if (old && old.content) return { ...old, content: old.content.filter((n: any) => !n.isRead) };
        return old;
      });
      return {};
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['my-notifications'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const deleteSingleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/users/notifications/${id}`);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['my-notifications'] });
      qc.setQueriesData({ queryKey: ['my-notifications'] }, (old: any) => {
        if (Array.isArray(old)) return old.filter(n => n.id !== id);
        if (old && old.content) return { ...old, content: old.content.filter((n: any) => n.id !== id) };
        return old;
      });
      return {};
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['my-notifications'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  return { 
    notifications, 
    totalPages,
    unreadCount, 
    isLoading, 
    refetch, 
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    deleteRead: deleteReadMutation.mutate,
    deleteSingle: deleteSingleMutation.mutate
  };
}
