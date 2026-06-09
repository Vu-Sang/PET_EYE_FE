import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Shield, User, Users, MessageCircle, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useShopChat } from '../../hooks/useShopChat';
import { shopService } from '../../services/shop.service';
import { staffService } from '../../services/staff.service';
import { useQuery } from '@tanstack/react-query';
import ConversationThread from '../../components/chat/shared/ConversationThread';

type ChannelType = 'ADMIN_SUPPORT' | 'INTERNAL_STAFF' | 'DIRECT' | 'CUSTOMER_CHAT';

export default function StaffMessages() {
  const { user } = useAuth();
  
  // Fetch my profile to get shopId
  const { data: profile } = useQuery({
    queryKey: ['staff-profile'],
    queryFn: () => staffService.getMyProfile()
  });

  const shopId = profile?.shopId;

  const { data: myShop } = useQuery({
    queryKey: ['my-shop', shopId],
    queryFn: () => shopService.getPublicById(shopId!),
    enabled: !!shopId
  });

  const [activeChannel, setActiveChannel] = useState<{
    type: ChannelType;
    id: string | number;
    title: string;
  }>({ type: 'INTERNAL_STAFF', id: 'internal', title: 'Nhóm Nội bộ Shop' });

  const { data: staffList = [] } = useQuery({
    queryKey: ['my-shop-staff', shopId],
    queryFn: () => staffService.getMyShopStaff(),
    enabled: !!shopId
  });

  const { messages, connected, isTyping, sendMessage, sendTypingEvent } = useShopChat(
    shopId ?? null,
    user?.token,
    activeChannel.type,
    activeChannel.type === 'DIRECT' ? (activeChannel.id as string) : undefined
  );

  const [input, setInput] = useState('');

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800 m-4 sm:m-6">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tin nhắn</h1>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border-none rounded-xl text-sm shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cửa hàng</span>
          </div>

          {/* Chat with Shop Owner */}
          {myShop && (
            <button 
              onClick={() => setActiveChannel({ type: 'DIRECT', id: myShop.email, title: 'Chủ cửa hàng' })}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                activeChannel.type === 'DIRECT' && activeChannel.id === myShop.email
                ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700' 
                : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                <Store size={20} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">Chủ cửa hàng</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{myShop.shopName}</p>
              </div>
            </button>
          )}
          
          <button 
            onClick={() => setActiveChannel({ type: 'INTERNAL_STAFF', id: 'internal', title: 'Nhóm Nội bộ Shop' })}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
              activeChannel.type === 'INTERNAL_STAFF' 
              ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700' 
              : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Users size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">Nhóm Nội bộ</p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">Tất cả nhân viên</p>
            </div>
          </button>



          <div className="px-3 pt-4 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đồng nghiệp</span>
          </div>

          {staffList.filter(s => s.email !== user?.email).map(staff => (
            <button 
              key={staff.id}
              onClick={() => setActiveChannel({ type: 'DIRECT', id: staff.email!, title: staff.fullName })}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                activeChannel.type === 'DIRECT' && activeChannel.id === staff.email
                ? 'bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700' 
                : 'hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <User size={20} className="text-slate-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{staff.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{staff.specialization || 'Nhân viên'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <ConversationThread 
        containerClassName="flex-1 rounded-r-3xl"
        messages={messages}
        currentUserEmail={user?.email}
        connected={connected}
        input={input}
        setInput={setInput}
        onSendMessage={(msg, attachment) => sendMessage(msg, attachment)}
        isTyping={isTyping}
        onTyping={(typing) => sendTypingEvent(typing)}
        headerInfo={{
            title: activeChannel.title,
            icon: activeChannel.type === 'INTERNAL_STAFF' ? <Users size={24} className="text-emerald-500" /> : 
                  activeChannel.type === 'CUSTOMER_CHAT' ? <MessageCircle size={24} className="text-primary" /> :
                  activeChannel.type === 'DIRECT' && activeChannel.id === myShop?.email ? <Store size={24} className="text-amber-500" /> :
                  <User size={24} className="text-slate-500" />
        }}
      />
    </div>
  );
}
