import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, Image, Paperclip, Smile, MoreVertical, Phone, Video, MessageCircle, ChevronLeft, Users, ShieldCheck } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useShopChat } from '../../hooks/useShopChat';
import { bookingService } from '../../services/booking.service';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import type { ApiResponse } from '../../types/api';
import ConversationThread from '../../components/chat/shared/ConversationThread';

export default function Messaging() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedShop, setSelectedShop] = useState<{ id: number; name: string; avatar?: string; type?: string } | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const shopIdParam = searchParams.get('shopId');
  const shopNameParam = searchParams.get('shopName');

  // Fetch unique shops from booking history
  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings-chat', user?.id],
    queryFn: async () => {
      const res = await bookingService.getMyBookings(1, 100);
      return res?.content || [];
    },
    enabled: !!user
  });

  const { data: pastShops = [] } = useQuery({
    queryKey: ['my-conversations', user?.id],
    queryFn: async () => {
        const res = await apiClient.get<ApiResponse<{id: number, shopName: string, lastMessage?: string, unreadCount?: number}[]>>('/chat/my-conversations');
        return res.data.result ?? [];
    },
    enabled: !!user,
    refetchInterval: 5000 // Refetch every 5 seconds to update badges
  });

  // Extract unique shops from bookings and past conversations
  const mergedShopsMap = new Map();
  bookings.forEach(b => mergedShopsMap.set(b.shopId, { id: b.shopId, name: b.shopName }));
  pastShops.forEach(s => mergedShopsMap.set(s.id, { id: s.id, name: s.shopName, lastMessage: s.lastMessage, unreadCount: s.unreadCount }));
  const mergedShops = Array.from(mergedShopsMap.values());

  // Merge with Admin Support and potential URL selection
  const adminSupport = { id: 0, name: 'Trung tâm hỗ trợ khách hàng', type: 'ADMIN_SUPPORT' };
  
  const allConversations = [
    adminSupport,
    ...mergedShops
  ];

  if (selectedShop && !allConversations.find(c => c.id === selectedShop.id)) {
    allConversations.push(selectedShop as any);
  }

  // If a shop is passed via URL, ensure it's in the list or added as temp
  useEffect(() => {
    if (shopIdParam && shopNameParam) {
      const sId = Number(shopIdParam);
      const exists = allConversations.find(c => c.id === sId);
      if (exists) {
        setSelectedShop(exists);
      } else {
        setSelectedShop({ id: sId, name: shopNameParam });
      }
    } else if (!selectedShop && allConversations.length > 0) {
        // Optional: select support by default or nothing
        // setSelectedShop(adminSupport);
    }
  }, [shopIdParam, shopNameParam, bookings.length]);

  const { messages, connected, loading, isTyping, sendMessage, sendTypingEvent } = useShopChat(
    selectedShop?.id ?? null,
    user?.token,
    'CUSTOMER_CHAT',
    user?.email // In CUSTOMER_CHAT, recipient is the customer (for broadcast grouping)
  );

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex-1 flex bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900 transition-all ${selectedShop ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Tin nhắn</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              placeholder="Tìm kiếm shop..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-10">
          {allConversations.map((shop) => (
            <button 
              key={shop.id}
              type="button"
              onClick={() => setSelectedShop(shop)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative ${
                selectedShop?.id === shop.id 
                  ? 'bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 shadow-sm' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                selectedShop?.id === shop.id ? 'bg-primary text-white shadow-md shadow-primary/30' : 
                shop.id === 0 ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-primary dark:group-hover:text-blue-400'
              }`}>
                {shop.id === 0 ? <ShieldCheck size={24} /> : <MessageCircle size={24} />}
              </div>
              <div className="flex-1 text-left min-w-0">
                <h4 className={`font-bold text-sm truncate transition-colors ${selectedShop?.id === shop.id ? 'text-primary dark:text-blue-400' : 'text-slate-900 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-blue-400'} ${(shop as any).unreadCount > 0 ? 'font-black' : ''}`}>
                  {shop.name}
                </h4>
                <p className={`text-xs truncate ${(shop as any).unreadCount > 0 ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                  {shop.id === 0 ? 'Hỗ trợ trực tuyến 24/7' : ((shop as any).lastMessage || 'Nhấn để nhắn tin với shop')}
                </p>
              </div>
              {(shop as any).unreadCount > 0 && selectedShop?.id !== shop.id && (
                <div className="absolute right-4 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {(shop as any).unreadCount}
                </div>
              )}
              {selectedShop?.id === shop.id && (
                <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 transition-all ${!selectedShop ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {selectedShop ? (
            <ConversationThread
                key={selectedShop.id}
                messages={messages}
                loading={loading}
                currentUserEmail={user?.email}
                connected={connected}
                input={input}
                setInput={setInput}
                onSendMessage={(msg, attachment) => sendMessage(msg, attachment)}
                isTyping={isTyping}
                onTyping={(typing) => sendTypingEvent(typing)}
                headerInfo={{
                    title: selectedShop.name,
                    icon: <MessageCircle size={20} className="text-primary" />
                }}
                onBack={() => setSelectedShop(null)}
            />
        ) : (
          <div className="text-center p-8 max-w-sm">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700">
              <MessageCircle size={40} className="text-primary/20 dark:text-blue-400/40" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Trung tâm tin nhắn</h3>
            <p className="text-sm text-slate-500">Chọn một cửa hàng từ danh sách bên trái để bắt đầu trao đổi hoặc xem lại lịch sử tư vấn.</p>
          </div>
        )}
      </main>
    </div>
  );
}
