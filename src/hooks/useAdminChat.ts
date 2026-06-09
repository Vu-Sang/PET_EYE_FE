import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { adminService, ChatMessage } from '../services/admin.service';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', '/api/ws');

export function useAdminChat(
  shopId: number | null, 
  token: string | undefined, 
  channelType: string = 'ADMIN_SUPPORT',
  recipientEmail?: string
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const clientRef = useRef<Client | null>(null);

  // Load history when shopId changes
  useEffect(() => {
    if (!shopId && shopId !== 0) return;
    
    let active = true;
    setMessages([]);
    setLoading(true);

    adminService.getChatHistory(shopId, channelType, recipientEmail)
      .then(data => {
        if (active) {
            setMessages(data);
            setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    adminService.markChatRead(shopId, channelType, recipientEmail).catch(() => {});

    return () => {
        active = false;
    };
  }, [shopId, channelType, recipientEmail]);

  // WebSocket connection
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
    });

    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
    };
  }, [token]);

  // Subscribe to shopId room with channelType
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !connected || (!shopId && shopId !== 0)) return;

    let topic = `/topic/chat/${shopId}/${channelType}`;
    if (channelType === 'CUSTOMER_CHAT' && recipientEmail) {
        topic = `/topic/chat/${shopId}/customer/${recipientEmail}`;
    }
    
    console.log('Admin subscribing to:', topic);

    const sub = client.subscribe(topic, (frame) => {
      try {
        const msg: ChatMessage = JSON.parse(frame.body);
        setMessages(prev => [...prev, msg]);
      } catch (err) {
        console.error('Admin parse error:', err);
      }
    });

    return () => sub.unsubscribe();
  }, [connected, shopId, channelType, recipientEmail]);

  const sendMessage = useCallback((targetShopId: number, content: string, attachment?: { url: string; type: string; name: string }) => {
    const client = clientRef.current;
    if (!client || !connected) return;
    client.publish({
      destination: '/app/chat',
      body: JSON.stringify({ 
        shopId: targetShopId, 
        channelType,
        recipientEmail,
        content,
        attachmentUrl: attachment?.url,
        attachmentType: attachment?.type,
        attachmentName: attachment?.name,
      }),
    });
  }, [connected, channelType, recipientEmail]);

  return { messages, connected, loading, sendMessage };
}
