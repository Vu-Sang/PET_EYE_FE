import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Send, Paperclip, MoreVertical, Phone, Video, Shield, User, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useShopChat } from '../../hooks/useShopChat';
import { shopService } from '../../services/shop.service';
import { staffService } from '../../services/staff.service';
import { useQuery } from '@tanstack/react-query';
import ConversationThread from '../../components/chat/shared/ConversationThread';
import { useTheme } from '../../contexts/ThemeContext';

type ChannelType = 'ADMIN_SUPPORT' | 'INTERNAL_STAFF' | 'DIRECT' | 'CUSTOMER_CHAT';

export default function ShopMessages() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState<{
    type: ChannelType;
    id: string | number; // For DIRECT, this is staff email
    title: string;
  }>({ type: 'ADMIN_SUPPORT', id: 'admin', title: 'Hệ thống Admin' });

  const { data: myShop } = useQuery({
    queryKey: ['my-shop'],
    queryFn: () => shopService.getMyShop()
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['my-shop-staff'],
    queryFn: () => staffService.getMyShopStaff(),
    enabled: !!myShop
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['my-shop-customers', myShop?.id],
    queryFn: () => shopService.getShopCustomers(myShop!.id),
    enabled: !!myShop
  });

  const { messages, connected, loading, isTyping, sendMessage, sendTypingEvent } = useShopChat(
    myShop?.id ?? null,
    user?.token,
    activeChannel.type,
    (activeChannel.type === 'DIRECT' || activeChannel.type === 'CUSTOMER_CHAT') ? (activeChannel.id as string) : undefined
  );

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.customerEmail) {
      setActiveChannel({
        type: 'CUSTOMER_CHAT',
        id: location.state.customerEmail,
        title: `Khách hàng: ${location.state.customerName || location.state.customerEmail}`
      });
    }
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !connected) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div className={`flex h-[calc(100vh-140px)] rounded-3xl overflow-hidden shadow-xl border m-4 transition-all duration-300 animate-in fade-in zoom-in-95 ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
      {/* Sidebar */}
      <div className={`w-80 border-r flex flex-col transition-colors ${isDark ? 'border-white/10 bg-slate-900/50 backdrop-blur-sm' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className="p-6">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tin nhắn</h1>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm hội thoại..."
              className={`w-full pl-10 pr-4 py-2.5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm outline-none ${isDark ? 'bg-slate-800/50 text-white placeholder-slate-500' : 'bg-white text-slate-900 placeholder-slate-400'}`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hệ thống</span>
          </div>
          
          {user?.role === 'SHOP_OWNER' && (
            <button 
              onClick={() => setActiveChannel({ type: 'ADMIN_SUPPORT', id: 'admin', title: 'Hệ thống Admin' })}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                activeChannel.type === 'ADMIN_SUPPORT' 
                ? (isDark ? 'bg-indigo-500/20 shadow-sm ring-1 ring-indigo-500/50' : 'bg-white shadow-sm ring-1 ring-slate-200') 
                : (isDark ? 'hover:bg-white/5' : 'hover:bg-white/50')
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                <Shield size={20} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-bold text-sm leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Admin Hỗ trợ</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">Chỉ Chủ shop truy cập</p>
              </div>
            </button>
          )}

          <button 
            onClick={() => setActiveChannel({ type: 'INTERNAL_STAFF', id: 'internal', title: 'Nhóm Nội bộ Shop' })}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
              activeChannel.type === 'INTERNAL_STAFF' 
              ? (isDark ? 'bg-indigo-500/20 shadow-sm ring-1 ring-indigo-500/50' : 'bg-white shadow-sm ring-1 ring-slate-200') 
              : (isDark ? 'hover:bg-white/5' : 'hover:bg-white/50')
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Users size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-bold text-sm leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Nhóm Nội bộ</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">Tất cả nhân viên</p>
            </div>
          </button>

          <div className="px-3 pt-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng (Bookings)</span>
          </div>

          {customers.length === 0 ? (
            <div className="px-6 py-4 text-[11px] text-slate-400 italic">Chưa có khách hàng nào</div>
          ) : customers.map(customer => (
            <button 
              key={customer.email}
              onClick={() => setActiveChannel({ 
                type: 'CUSTOMER_CHAT', 
                id: customer.email, 
                title: `Khách hàng: ${customer.fullName}`,
                recipientEmail: customer.email 
              })}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                activeChannel.id === customer.email 
                ? (isDark ? 'bg-indigo-500/20 shadow-sm ring-1 ring-indigo-500/50' : 'bg-white shadow-sm ring-1 ring-slate-200') 
                : (isDark ? 'hover:bg-white/5' : 'hover:bg-white/50')
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                <MessageCircle size={20} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={`font-bold text-sm leading-tight truncate ${activeChannel.id === customer.email ? 'text-white' : (isDark ? 'text-slate-200' : 'text-slate-900')} ${(customer as any).unreadCount > 0 ? 'font-black' : ''}`}>{customer.fullName}</p>
                <p className={`text-xs truncate mt-0.5 ${(customer as any).unreadCount > 0 ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                  {(customer as any).lastMessage || customer.email}
                </p>
              </div>
              {(customer as any).unreadCount > 0 && activeChannel.id !== customer.email && (
                <div className="absolute right-4 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce shadow-md">
                  {(customer as any).unreadCount}
                </div>
              )}
            </button>
          ))}

          <div className="px-3 pt-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên (1-1)</span>
          </div>

          {staffList.filter(s => s.email !== user?.email).map(staff => (
            <button 
              key={staff.id}
              onClick={() => setActiveChannel({ type: 'DIRECT', id: staff.email!, title: staff.fullName })}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                activeChannel.type === 'DIRECT' && activeChannel.id === staff.email
                ? (isDark ? 'bg-indigo-500/20 shadow-sm ring-1 ring-indigo-500/50' : 'bg-white shadow-sm ring-1 ring-slate-200') 
                : (isDark ? 'hover:bg-white/5' : 'hover:bg-white/50')
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <User size={20} className="text-slate-500" />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-bold text-sm leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{staff.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{staff.specialization || 'Nhân viên'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <ConversationThread 
        key={`${activeChannel.type}-${activeChannel.id}`}
        containerClassName={`flex-1 rounded-r-3xl ${isDark ? 'bg-slate-900/60' : 'bg-white'}`}
        isDark={isDark}
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
            title: activeChannel.title,
            icon: activeChannel.type === 'ADMIN_SUPPORT' ? <Shield size={24} className="text-blue-600" /> :
                  activeChannel.type === 'INTERNAL_STAFF' ? <Users size={24} className="text-emerald-500" /> : 
                  activeChannel.type === 'CUSTOMER_CHAT' ? <MessageCircle size={24} className="text-primary" /> :
                  <User size={24} className="text-slate-500" />
        }}
      />
    </div>
  );
}
