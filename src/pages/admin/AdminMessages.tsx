import React, { useState } from 'react';
import { Search, Store, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin.service';
import { useAdminChat } from '../../hooks/useAdminChat';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ConversationThread from '../../components/chat/shared/ConversationThread';
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminMessages() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  if (user?.role !== 'ADMIN') return <Navigate to="/user/dashboard" />;
  
  const [activeTab, setActiveTab] = useState<'SHOPS' | 'CUSTOMERS'>('SHOPS');
  const [activeShopId, setActiveShopId] = useState<number | null>(null);
  const [activeCustomerEmail, setActiveCustomerEmail] = useState<string | null>(null);
  const [activeCustomerName, setActiveCustomerName] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  const { data: shops = [] } = useQuery({
    queryKey: ['admin-shops'],
    queryFn: adminService.getAllShops,
    enabled: activeTab === 'SHOPS',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['admin-support-customers'],
    queryFn: () => adminService.getShopCustomers(0),
    enabled: activeTab === 'CUSTOMERS',
  });

  const { messages, connected, loading, sendMessage } = useAdminChat(
    activeTab === 'SHOPS' ? activeShopId : 0, 
    user?.token,
    activeTab === 'SHOPS' ? 'ADMIN_SUPPORT' : 'CUSTOMER_CHAT',
    activeTab === 'SHOPS' ? undefined : (activeCustomerEmail || undefined)
  );

  const activeShop = shops.find(s => s.id === activeShopId);

  const filteredShops = shops.filter(s =>
    s.shopName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectShop = (shopId: number) => {
    setActiveShopId(shopId);
    setActiveCustomerEmail(null);
    setInput('');
  };

  const handleSelectCustomer = (email: string, name: string) => {
    setActiveCustomerEmail(email);
    setActiveCustomerName(name);
    setActiveShopId(null);
    setInput('');
  };

  return (
    <div className={`flex h-[calc(100vh-80px)] rounded-3xl overflow-hidden shadow-xl m-4 ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100'}`}>
      {/* Sidebar */}
      <div className={`w-80 border-r flex flex-col shrink-0 ${isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
        <div className="p-6">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tin nhắn</h1>
          
          <div className={`flex p-1 rounded-xl mt-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button 
              onClick={() => { setActiveTab('SHOPS'); setInput(''); setSearch(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'SHOPS' ? (isDark ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white shadow-sm text-blue-600') : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
            >
              Cửa hàng
            </button>
            <button 
              onClick={() => { setActiveTab('CUSTOMERS'); setInput(''); setSearch(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'CUSTOMERS' ? (isDark ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white shadow-sm text-blue-600') : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}
            >
              Khách hàng
            </button>
          </div>

          <div className="mt-4 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={18} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'SHOPS' ? "Tìm cửa hàng..." : "Tìm khách hàng..."}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none ${isDark ? 'admin-glass-input' : 'bg-white border-none focus:ring-2 focus:ring-blue-500/20 shadow-sm'}`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 admin-scrollbar">
          <div className="px-3 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {activeTab === 'SHOPS' ? 'Danh sách đối tác' : 'Hỗ trợ khách hàng'}
            </span>
          </div>

          {activeTab === 'SHOPS' ? (
              filteredShops.length === 0 ? (
                <div className={`px-6 py-4 text-[11px] italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Không có cửa hàng nào</div>
              ) : filteredShops.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelectShop(s.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    activeShopId === s.id
                      ? (isDark ? 'bg-white/10 shadow-sm ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-100')
                      : (isDark ? 'hover:bg-white/5' : 'hover:bg-white/50')
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <Store size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={`font-bold text-sm leading-tight truncate ${activeShopId === s.id ? (isDark ? 'text-blue-400' : 'text-blue-700') : (isDark ? 'text-slate-200' : 'text-slate-900')}`}>
                      {s.shopName}
                    </p>
                    <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{s.shopType} • {s.city}</p>
                  </div>
                </button>
              ))
          ) : (
              filteredCustomers.length === 0 ? (
                <div className={`px-6 py-4 text-[11px] italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Chưa có khách hàng liên hệ</div>
              ) : filteredCustomers.map(c => (
                <button
                  key={c.email}
                  onClick={() => handleSelectCustomer(c.email, c.fullName)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    activeCustomerEmail === c.email
                      ? (isDark ? 'bg-white/10 shadow-sm ring-1 ring-white/10' : 'bg-white shadow-sm ring-1 ring-slate-100')
                      : (isDark ? 'hover:bg-white/5' : 'hover:bg-white/50')
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                    <Shield size={18} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={`font-bold text-sm leading-tight truncate ${activeCustomerEmail === c.email ? (isDark ? 'text-purple-400' : 'text-purple-700') : (isDark ? 'text-slate-200' : 'text-slate-900')}`}>
                      {c.fullName}
                    </p>
                    <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{c.email}</p>
                  </div>
                </button>
              ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {/* We need to pass isDark prop to ConversationThread, assuming it supports it, or it uses the global context */}
      <ConversationThread
        key={activeTab === 'SHOPS' ? `shop-${activeShopId}` : `cust-${activeCustomerEmail}`}
        containerClassName={`flex-1 rounded-r-3xl ${isDark ? 'bg-slate-950/40' : ''}`}
        messages={messages}
        loading={loading}
        currentUserEmail={user?.email}
        connected={connected}
        input={input}
        setInput={setInput}
        onSendMessage={(msg, attachment) => {
          const targetId = activeTab === 'SHOPS' ? activeShopId : 0;
          if (targetId !== null) sendMessage(targetId, msg, attachment);
        }}
        headerInfo={activeTab === 'SHOPS' ? (
          activeShop ? {
            title: activeShop.shopName,
            subtitle: `${activeShop.shopType} • ${activeShop.city}`,
            icon: <Store size={22} className={isDark ? 'text-blue-400' : 'text-blue-600'} />,
            showStatus: true,
          } : undefined
        ) : (
          activeCustomerEmail ? {
            title: activeCustomerName || 'Khách hàng',
            subtitle: activeCustomerEmail,
            icon: <Shield size={22} className={isDark ? 'text-purple-400' : 'text-purple-600'} />,
            showStatus: true,
          } : undefined
        )}
        disableInput={activeTab === 'SHOPS' ? !activeShopId : !activeCustomerEmail}
        placeholder={
            activeTab === 'SHOPS' 
                ? (activeShop ? 'Nhập tin nhắn...' : 'Chọn cửa hàng để bắt đầu')
                : (activeCustomerEmail ? 'Phản hồi khách hàng...' : 'Chọn khách hàng để hỗ trợ')
        }
      />
    </div>
  );
}
