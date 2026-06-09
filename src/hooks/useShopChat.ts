import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { ApiResponse } from '../types/api';
import type { ChatMessage } from '../services/admin.service';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace('/api', '/api/ws');

export function useShopChat(
  shopId: number | null, 
  token: string | undefined, 
  channelType: string = 'ADMIN_SUPPORT',
  recipientEmail?: string
) {
  const { user } = useAuth();
  const currentEmail = user?.email;
  const userRole = user?.role;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState<{ typing: boolean, senderEmail?: string }>({ typing: false });
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    console.log(`useShopChat [${channelType}] initialized. ShopId:`, shopId, "Role:", userRole);
  }, [shopId, channelType, !!token, userRole]);

  // Load history
  useEffect(() => {
    if (shopId === null) return;
    
    let active = true;
    setMessages([]);
    setLoading(true);

    apiClient.get<ApiResponse<ChatMessage[]>>(`/chat/${shopId}/history`, {
      params: { channelType, recipientEmail }
    })
      .then(r => {
        if (active) {
            setMessages(r.data.result ?? []);
            setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    apiClient.patch(`/chat/${shopId}/read`, null, {
      params: { channelType, recipientEmail }
    }).catch(() => {});

    return () => {
        active = false;
    };
  }, [shopId, channelType, recipientEmail]);

  // WebSocket
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      onConnect: () => {
        setConnected(true);
      },
      onDisconnect: () => setConnected(false),
    });

    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
    };
  }, [token]);

  // Subscribe
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !connected || shopId === null) return;

    let topic = `/topic/chat/${shopId}/${channelType}`;
    
    if (channelType === 'CUSTOMER_CHAT') {
      topic = `/topic/chat/${shopId}/customer/${recipientEmail}`;
    } else if (channelType === 'CAMERA_CHAT') {
      topic = `/topic/chat/${shopId}/camera/${recipientEmail}`;
    } else if (channelType === 'DIRECT') {
      // 1-1 chat. Identifier is the staff's email.
      const staffEmail = userRole === 'SHOP_OWNER' ? recipientEmail : currentEmail;
      topic = `/topic/chat/${shopId}/direct/${staffEmail}`;
    }
      
    const sub = client.subscribe(topic, (frame) => {
      try {
        const msg: ChatMessage = JSON.parse(frame.body);
        // Ensure message belongs to current selected conversation to avoid leakage
        setMessages(prev => [...prev, msg]);
      } catch (err) {
        console.error('Error parsing msg:', err);
      }
    });

    const typingTopic = topic.replace(`/topic/chat/${shopId}/`, `/topic/chat/${shopId}/typing/`);
    const subTyping = client.subscribe(typingTopic, (frame) => {
      try {
        const data = JSON.parse(frame.body);
        if (data.senderEmail !== currentEmail) {
          setIsTyping({ typing: data.isTyping, senderEmail: data.senderEmail });
        }
      } catch (err) {}
    });

    return () => {
        console.log('Unsubscribing from:', topic);
        sub.unsubscribe();
        subTyping.unsubscribe();
        setIsTyping({ typing: false });
    };
  }, [connected, shopId, channelType, recipientEmail, currentEmail, userRole]);

  const sendMessage = useCallback((content: string, attachment?: { url: string; type: string; name: string }) => {
    const client = clientRef.current;
    if (!client || !connected || shopId === null) return;

    client.publish({
      destination: '/app/chat',
      body: JSON.stringify({ 
        shopId, 
        channelType,
        recipientEmail,
        content,
        attachmentUrl: attachment?.url,
        attachmentType: attachment?.type,
        attachmentName: attachment?.name,
      }),
    });
  }, [connected, shopId, channelType, recipientEmail]);

  const sendTypingEvent = useCallback((typing: boolean) => {
    const client = clientRef.current;
    if (!client || !connected || shopId === null) return;
    client.publish({
      destination: '/app/chat/typing',
      body: JSON.stringify({ shopId, channelType, recipientEmail, content: typing ? 'true' : 'false' }),
    });
  }, [connected, shopId, channelType, recipientEmail]);

  return { messages, connected, loading, isTyping, sendMessage, sendTypingEvent };
}
