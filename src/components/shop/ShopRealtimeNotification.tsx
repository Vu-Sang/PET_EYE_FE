import React, { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  shopId: number;
}

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', '/api/ws');

/** Keys cần được reload khi có sự kiện cập nhật đơn hàng.
 *  Dùng prefix-match của React Query — chỉ cần khai báo phần đầu của key.
 */
const BOOKING_QUERY_KEYS = [
  ['allShopTasks'],        // ShopBookings - danh sách đơn theo list view
  ['shopBookingsRange'],   // ShopBookings - calendar view (key: ['shopBookingsRange', 'yyyy-MM'])
  ['shopDashboard'],       // ShopDashboard (key: ['shopDashboard', startDate, endDate])
  ['my-notifications'],    // Bell notification badge
];

export default function ShopRealtimeNotification({ shopId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!shopId || !user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      client.subscribe(`/topic/shop/${shopId}/notifications`, (message) => {
        try {
          const data = JSON.parse(message.body);

          if (data.message === 'Có đơn hàng mới!') {
            // Đơn mới: phát âm thanh + toast + reload
            const audio = new Audio('/assets/sounds/notification.wav');
            audio.play().catch(() => {});
            toast.success('🔔 Shop vừa có đơn hàng mới!');
            BOOKING_QUERY_KEYS.forEach(key =>
              queryClient.invalidateQueries({ queryKey: key })
            );
            return;
          }

          if (data.message === 'BOOKING_UPDATED') {
            // Cập nhật trạng thái đơn: reload ngầm, không làm phiền
            BOOKING_QUERY_KEYS.forEach(key =>
              queryClient.invalidateQueries({ queryKey: key })
            );
          }
        } catch (e) {
          console.error('Error parsing notification', e);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('STOMP Notif error', frame.headers['message']);
    };

    client.activate();

    return () => {
      if (client.active) client.deactivate();
    };
  }, [shopId, user, queryClient]);

  return null; // Component chạy ngầm
}
