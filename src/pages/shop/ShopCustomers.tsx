import React, { useState } from 'react';
import { User, Mail, Phone, Calendar, Search, Filter, TrendingUp, X, ChevronRight, Clock, ChevronLeft, CreditCard, Heart, Package, Shield, Star, Gift, Rocket, Check, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '../../services/customer.service';
import { userService } from '../../services/user.service';
import { CustomerItemResponse, ShopCustomerResponse, CustomerDetailResponse } from '../../types/api';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

export default function ShopCustomers() {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'regular' | 'vip'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItemResponse | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);
  const [expandedPetId, setExpandedPetId] = useState<number | null>(null);

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['shopCustomers'],
    queryFn: customerService.getShopCustomers
  });

  const { data: customerDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['customerDetail', selectedCustomerId],
    queryFn: () => customerService.getCustomerDetail(selectedCustomerId!),
    enabled: !!selectedCustomerId
  });

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', customerDetail?.customerInfo?.id],
    queryFn: () => userService.getById(customerDetail!.customerInfo.id),
    enabled: !!customerDetail?.customerInfo?.id
  });

  const handleOpenDetail = (customer: CustomerItemResponse) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const customers = customerData?.customers || [];

  const filteredCustomers = customers.filter((customer) => {
    const searchMatch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);

    if (!searchMatch) return false;

    if (filter === 'all') return true;

    const lastVisitDate = new Date(customer.lastVisit.split('/').reverse().join('-'));
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    const isNew = daysDiff <= 7;

    const spentAmount = parseInt(customer.totalSpent.replace(/\D/g, ''));
    const isVIP = spentAmount >= 5000000 || customer.totalBookings >= 20;

    if (filter === 'new') return isNew;
    if (filter === 'vip') return isVIP;
    if (filter === 'regular') return !isNew && !isVIP;

    return true;
  });

  const getCustomerTier = (customer: CustomerItemResponse) => {
    const tierName = customer.tier || 'Đồng';
    if (tierName === 'Kim Cương') {
      return { label: 'Kim Cương', color: 'bg-cyan-500', text: 'text-white', icon: <TrendingUp size={12} /> };
    }
    if (tierName === 'Vàng' || tierName === 'VIP') {
      return { label: 'Vàng', color: 'bg-yellow-500', text: 'text-white', icon: <TrendingUp size={12} /> };
    }
    if (tierName === 'Bạc' || tierName === 'REGULAR') {
      return { label: 'Bạc', color: 'bg-slate-300', text: 'text-slate-800', icon: <Shield size={12} /> };
    }
    return { label: 'Khách mới', color: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', icon: <Award size={12} /> };
  };

  const getTierStats = (customer: CustomerItemResponse) => {
    const currentTierName = userProfile?.currentTier?.name || customer.tier || 'Đồng';
    const totalSpending = userProfile?.totalSpending || parseInt(customer.totalSpent.replace(/\D/g, '')) || 0;

    let next = 'Bạc';
    let nextThreshold = 500000;
    let perks = ['Tích lũy chi tiêu', 'Ưu đãi cơ bản'];

    if (currentTierName === 'Bạc') {
      next = 'Vàng';
      nextThreshold = 1000000;
      perks = ['Ưu tiên hỗ trợ', 'Tích lũy chi tiêu'];
    } else if (currentTierName === 'Vàng' || currentTierName === 'VIP') {
      next = 'Kim Cương';
      nextThreshold = 5000000;
      perks = ['Ưu tiên đặt chỗ', 'Tích điểm x2', 'Hỗ trợ VIP'];
    } else if (currentTierName === 'Kim Cương') {
      next = 'Tối đa';
      nextThreshold = 5000000;
      perks = ['Dịch vụ miễn phí', 'Hotline VIP', 'Quà sinh nhật'];
    }

    const progress = Math.min(100, (totalSpending / nextThreshold) * 100);
    return { current: currentTierName, next, progress, perks };
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with Image */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <User className={`w-6 h-6 ${isDark ? 'text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'text-blue-600'}`} />
              Quản lý khách hàng
            </h1>
            <p className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Danh sách khách hàng và lịch sử giao dịch
            </p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Tổng khách hàng', value: customerData?.totalCustomers || 0, gradient: isDark ? 'from-indigo-400 to-indigo-600' : 'from-[#1a2b4c] to-slate-700', icon: '👥' },
            { label: 'Khách hàng mới (tháng này)', value: customerData?.newCustomersThisMonth || 0, gradient: isDark ? 'from-green-400 to-emerald-500' : 'from-green-500 to-emerald-600', icon: '✨' },
            { label: 'Khách hàng thân thiết', value: customerData?.loyalCustomers || 0, gradient: isDark ? 'from-purple-400 to-fuchsia-500' : 'from-purple-500 to-purple-600', icon: '⭐' },
          ].map((stat) => (
            <div key={stat.label} className={`group rounded-2xl p-5 shadow-sm hover:shadow-lg transition-colors relative overflow-hidden ${isDark ? 'admin-glass-card bg-slate-900/40 border border-white/10 hover:bg-slate-800/60' : 'bg-white border border-slate-100'}`}>
              <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full group-hover:scale-110 transition-transform ${isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-slate-50 to-transparent'}`} />
              <div className="relative z-10">
                <p className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span className="text-lg">{stat.icon}</span>
                  {stat.label}
                </p>
                <p className={`text-3xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className={`rounded-2xl p-4 shadow-sm mb-5 ${isDark ? 'admin-glass-card bg-slate-900/40 border border-white/10' : 'bg-white border border-slate-100'}`}>
          <div className="flex flex-col md:flex-row gap-3 mb-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Tìm khách hàng theo tên, email, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none transition-colors ${isDark ? 'bg-slate-900/50 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500' : 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#1a2b4c]/20 focus:border-[#1a2b4c] text-slate-900'}`}
              />
            </div>
            <button className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-colors ${isDark ? 'border border-slate-700 text-slate-300 hover:bg-slate-800/60' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <Filter size={18} />
              Lọc
            </button>
          </div>

          {/* Customer Type Filters */}
          <div className="flex gap-2 overflow-x-auto">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'new', label: 'Khách hàng mới' },
              { value: 'regular', label: 'Khách hàng thường' },
              { value: 'vip', label: 'Khách hàng VIP' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${filter === tab.value
                    ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 glow-indigo' : 'bg-gradient-to-r from-[#1a2b4c] to-slate-700 text-white shadow-md')
                    : (isDark ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-white/5' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customers List */}
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className={`group rounded-2xl p-4 shadow-sm hover:shadow-lg transition-colors relative overflow-hidden ${isDark ? 'admin-glass-card bg-slate-900/40 border border-white/10 hover:bg-slate-900/60' : 'bg-white border border-slate-100'}`}>
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full group-hover:scale-110 transition-transform ${isDark ? 'bg-gradient-to-br from-white/5 to-transparent' : 'bg-gradient-to-br from-slate-50 to-transparent'}`} />
              <div className="flex flex-col lg:flex-row gap-4 relative z-10">
                <div className="flex items-center gap-3 w-full lg:w-1/3">
                  <div className="flex flex-col items-center gap-1">
                    {(() => {
                        const tier = getCustomerTier(customer);
                        return (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm ${tier.color} ${tier.text}`}>
                                {tier.icon}
                                {tier.label}
                            </div>
                        );
                    })()}
                    <div className="relative">
                      <img
                        src={customer.avatar}
                        alt={customer.name}
                        className={`w-14 h-14 rounded-xl object-cover border-2 shadow-sm ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <h3 className={`font-bold text-base leading-none mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{customer.name}</h3>
                    <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>#{customer.id}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-100 text-blue-600'}`}>
                        <Mail size={14} />
                      </div>
                      <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-green-100 text-green-600'}`}>
                        <Phone size={14} />
                      </div>
                      <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{customer.phone}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Thú cưng */}
                    <div className={`h-14 flex flex-col justify-center text-center rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-blue-50'}`}>
                      <p className={`text-[9px] font-bold ${isDark ? 'text-indigo-400' : 'text-blue-600'}`}>
                        Thú cưng
                      </p>
                      <p className={`text-base font-black ${isDark ? 'text-indigo-300' : 'text-blue-700'}`}>
                        {customer.pets}
                      </p>
                    </div>

                    {/* Lượt đặt */}
                    <div className={`h-14 flex flex-col justify-center text-center rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-emerald-50'}`}>
                      <p className={`text-[9px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Lượt đặt
                      </p>
                      <p className={`text-base font-black ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {customer.totalBookings}
                      </p>
                    </div>

                    {/* Tổng chi */}
                    <div className={`h-14 flex flex-col justify-center items-center text-center px-1 rounded-lg overflow-hidden ${isDark ? 'bg-gradient-to-br from-indigo-900 to-indigo-950/50' : 'bg-gradient-to-br from-[#1a2b4c] to-slate-700'}`}>
                      <p className="text-[9px] font-bold text-slate-300 whitespace-nowrap">
                        Tổng chi
                      </p>
                      <p className="text-xs sm:text-sm font-black text-white truncate w-full" title={customer.totalSpent}>
                        {(() => {
                          const val = parseInt(customer.totalSpent.replace(/\D/g, ''));
                          if (isNaN(val)) return customer.totalSpent;
                          if (val >= 1000000) {
                            return (val / 1000000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'M';
                          }
                          if (val >= 1000) {
                            return (val / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 }) + 'K';
                          }
                          return customer.totalSpent;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row lg:flex-col justify-center gap-2 w-full lg:w-32 mt-2 lg:mt-0">
                  <button 
                    onClick={() => handleOpenDetail(customer)}
                    className={`flex-1 px-3 py-2 rounded-lg font-bold hover:shadow-lg active:scale-95 transition-transform text-xs ${isDark ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-gradient-to-r from-[#1a2b4c] to-slate-700 text-white'}`}
                  >
                    Xem chi tiết
                  </button>
                  <Link 
                    to="/shop/messages"
                    state={{ customerEmail: customer.email, customerName: customer.name }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg font-bold transition-colors text-xs ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Nhắn tin
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {filteredCustomers.length === 0 && (
            <div className={`text-center py-16 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <User className="w-12 h-12 text-slate-400" />
              </div>
              <p className={`font-semibold text-lg ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Không tìm thấy khách hàng</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Thử tìm kiếm với từ khóa khác</p>
            </div>
          )}
        </div>

        {/* Customer Detail Modal */}
        <AnimatePresence>
        {showDetailModal && selectedCustomer && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setShowDetailModal(false)}
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" 
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative w-full max-w-4xl max-h-full rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col md:flex-row z-10 ${isDark ? 'bg-[#0f172a] border border-white/5' : 'bg-white'}`}
                >
                    {/* Left Sidebar - Profile Summary */}
                    <div className={`w-full md:w-80 p-8 border-b md:border-b-0 md:border-r flex flex-col items-center text-center relative overflow-hidden shrink-0 ${isDark ? 'bg-[#1e293b] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 to-transparent -translate-y-1/2 translate-x-1/2" />
                        <div className="relative mb-6">
                            <img 
                                src={selectedCustomer.avatar} 
                                className={`w-32 h-32 rounded-[2rem] object-cover shadow-2xl border-4 transition-all ${isDark ? 'border-indigo-500/30 shadow-indigo-500/20 glow-indigo' : 'border-white'}`} 
                                alt={selectedCustomer.name}
                            />
                            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white p-2 rounded-xl shadow-lg">
                                <TrendingUp size={16} />
                            </div>
                        </div>

                        <h3 className={`text-xl font-black leading-tight ${isDark ? 'text-white drop-shadow-md' : 'text-slate-900'}`}>{selectedCustomer.name}</h3>
                        <p className={`text-xs font-bold mt-1 uppercase tracking-widest ${isDark ? 'text-indigo-300' : 'text-slate-400'}`}>{selectedCustomer.id}</p>

                        <div className="mt-4">
                            {(() => {
                                const tier = getCustomerTier(selectedCustomer);
                                return (
                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl shadow-sm ${tier.color} ${tier.text}`}>
                                        {tier.icon}
                                        <span className="text-xs font-black uppercase tracking-wider">{tier.label}</span>
                                    </div>
                                );
                            })()}
                        </div>
                        
                        <div className="w-full space-y-3 mt-8 text-left relative z-10">
                            <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-50 text-blue-600'}`}>
                                    <Mail size={16} />
                                </div>
                                <span className={`text-[10px] sm:text-xs font-bold truncate ${isDark ? 'text-indigo-100' : 'text-slate-600'}`}>{selectedCustomer.email}</span>
                            </div>
                            <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-green-50 text-green-600'}`}>
                                    <Phone size={16} />
                                </div>
                                <span className={`text-xs font-bold ${isDark ? 'text-emerald-100' : 'text-slate-600'}`}>{selectedCustomer.phone}</span>
                            </div>
                        </div>

                        <div className="mt-auto pt-8 w-full">
                            <button className={`w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm shadow-lg ${isDark ? 'bg-indigo-600 text-white shadow-indigo-900/50 hover:bg-indigo-500' : 'bg-[#1a2b4c] text-white shadow-indigo-900/20'}`}>
                                <Mail size={18} />
                                Gửi thông báo
                            </button>
                        </div>
                    </div>

                    {/* Right Content - Tabs/Details */}
                    <div className={`flex-1 flex flex-col min-h-0 relative z-10 ${isDark ? 'bg-transparent' : 'bg-white'}`}>
                        <div className={`p-6 md:p-8 flex justify-between items-center border-b sticky top-0 z-20 ${isDark ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-100'}`}>
                            <div>
                                <h4 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Chi tiết hoạt động</h4>
                                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lịch sử giao dịch và dịch vụ đã sử dụng</p>
                            </div>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDark ? 'hover:bg-[#1a263e] text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400'}`}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 flex-1 overflow-y-auto space-y-8">
                          {isDetailLoading ? (
                              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                                  <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu khách hàng...</p>
                              </div>
                          ) : customerDetail ? (
                              <>
                                {/* Membership Progress Section */}
                                <section className="mb-6">
                                  {(() => {
                                      const tierInfo = getTierStats(customerDetail.customerInfo);
                                      const tierTheme = {
                                          'Vàng': { card: 'from-yellow-900/40 to-amber-900/5 border-yellow-500/30', bar: 'from-yellow-400 to-amber-500', text: 'text-yellow-400', icon: 'text-yellow-500', bgIcon: 'bg-yellow-500/20 text-yellow-400' },
                                          'Kim Cương': { card: 'from-cyan-900/40 to-blue-900/5 border-cyan-500/30', bar: 'from-cyan-400 to-blue-500', text: 'text-cyan-400', icon: 'text-cyan-500', bgIcon: 'bg-cyan-500/20 text-cyan-400' },
                                          'Bạc': { card: 'from-slate-700/40 to-slate-800/10 border-slate-500/30', bar: 'from-slate-300 to-slate-400', text: 'text-slate-300', icon: 'text-slate-400', bgIcon: 'bg-slate-400/20 text-slate-300' },
                                          'Đồng': { card: 'from-orange-900/20 to-stone-900/10 border-orange-500/20', bar: 'from-orange-400 to-red-400', text: 'text-orange-400', icon: 'text-orange-500', bgIcon: 'bg-orange-500/20 text-orange-400' },
                                          'VIP': { card: 'from-yellow-900/40 to-amber-900/5 border-yellow-500/30', bar: 'from-yellow-400 to-amber-500', text: 'text-yellow-400', icon: 'text-yellow-500', bgIcon: 'bg-yellow-500/20 text-yellow-400' }
                                      };
                                      const theme = tierTheme[tierInfo.current as keyof typeof tierTheme] || tierTheme['Đồng'];
                                      
                                      return (
                                          <div className={`bg-gradient-to-br p-6 rounded-[2rem] border transition-all ${isDark ? theme.card : 'from-slate-50 to-slate-100 border-slate-200/50'}`}>
                                              <div className="flex justify-between items-end mb-4">
                                                  <div>
                                                      <h5 className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isDark ? theme.text : 'text-indigo-500'}`}>Cấp bậc hiện tại</h5>
                                                      <div className="flex items-center gap-2">
                                                          <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{tierInfo.current}</span>
                                                          <Shield className={isDark ? theme.icon : 'text-indigo-500'} size={20} />
                                                      </div>
                                                  </div>
                                                  <div className="text-right">
                                                      <p className={`text-[10px] font-bold mb-1 leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mục tiêu tiếp theo: <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{tierInfo.next}</span></p>
                                                      <p className={`text-xs font-black ${isDark ? theme.text : 'text-indigo-500'}`}>{Math.round(tierInfo.progress)}%</p>
                                                  </div>
                                              </div>
                                              
                                              {/* Progress Bar */}
                                              <div className={`w-full h-3 rounded-full p-0.5 shadow-inner ${isDark ? 'bg-[#0c1220]/50' : 'bg-white'}`}>
                                                  <div 
                                                      className={`h-full rounded-full transition-all duration-1000 ${isDark ? `bg-gradient-to-r ${theme.bar}` : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                                      style={{ width: `${tierInfo.progress}%` }}
                                                  />
                                              </div>

                                              {/* Perks Grid */}
                                              <div className="mt-6">
                                                  <h6 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Quyền lợi hiện có</h6>
                                                  <div className="grid grid-cols-2 gap-3">
                                                      {tierInfo.perks.map((perk, idx) => (
                                                          <div key={idx} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'text-slate-600 bg-white border border-slate-100'}`}>
                                                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isDark ? theme.bgIcon : 'bg-green-100 text-green-500'}`}>
                                                                  <Check size={12} strokeWidth={4} />
                                                              </div>
                                                              <span className="truncate">{perk}</span>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  })()}
                                </section>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Tổng chi tiêu', value: (userProfile?.totalSpending || parseInt(customerDetail.customerInfo.totalSpent.replace(/\D/g, '')) || 0).toLocaleString('vi-VN') + 'đ', icon: <CreditCard size={18} />, color: 'teal' },
                                        { label: 'Số thú cưng', value: customerDetail.customerInfo.pets, icon: <Heart size={18} />, color: 'pink' },
                                        { label: 'Lịch đã đặt', value: customerDetail.customerInfo.totalBookings, icon: <Package size={18} />, color: 'indigo' },
                                    ].map(s => (
                                        <div key={s.label} className={`p-4 rounded-3xl border transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className={`w-9 h-9 rounded-xl text-white flex items-center justify-center mb-3 shadow-lg bg-${s.color}-500 shadow-${s.color}-500/20`}>
                                                {s.icon}
                                            </div>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest leading-none ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{s.label}</p>
                                            <h5 className={`text-xl font-black mt-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.value}</h5>
                                        </div>
                                    ))}
                                </div>

                                {/* Section: List of Pets */}
                                <section>
                                    <h5 className={`text-sm font-black mb-4 uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        <span className="w-1.5 h-4 bg-teal-500 rounded-full" />
                                        Danh sách thú cưng
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {customerDetail.pets.length > 0 ? customerDetail.pets.map(pet => (
                                            <div key={pet.id} 
                                                 onClick={() => setExpandedPetId(expandedPetId === pet.id ? null : pet.id)}
                                                 className={`flex flex-col p-4 rounded-2xl border transition-all group cursor-pointer ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:shadow-lg'}`}>
                                                <div className="flex items-center gap-4">
                                                    <img src={pet.avatar || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=300'} className="w-16 h-16 rounded-xl object-cover group-hover:scale-105 transition-transform shadow-md shrink-0" alt={pet.name} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 truncate">
                                                                <p className={`font-black truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{pet.name}</p>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-100 text-slate-600'}`}>{pet.gender}</span>
                                                            </div>
                                                            {expandedPetId === pet.id ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                                                        </div>
                                                        <p className={`text-[11px] font-medium truncate mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pet.breed} • {pet.species}</p>
                                                    </div>
                                                </div>
                                                
                                                <AnimatePresence>
                                                    {expandedPetId === pet.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className={`mt-4 pt-4 border-t grid grid-cols-2 gap-4 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                                                                <div>
                                                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Cân nặng</p>
                                                                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{pet.weight ? `${pet.weight} kg` : '—'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Ngày sinh</p>
                                                                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{pet.birthDate ? new Date(pet.birthDate).toLocaleDateString('vi-VN') : '—'}</p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-slate-400 font-medium col-span-2 text-center py-4">Chưa có thông tin thú cưng</p>
                                        )}
                                    </div>
                                </section>

                                {/* Section: Recent History */}
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h5 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                            Lịch sử gần đây
                                        </h5>
                                        <button 
                                            onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors ${isDark ? 'text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'}`}
                                        >
                                            {isHistoryCollapsed ? (
                                                <>Xem chi tiết <ChevronDown size={14} /></>
                                            ) : (
                                                <>Thu gọn <ChevronUp size={14} /></>
                                            )}
                                        </button>
                                    </div>
                                    
                                    {!isHistoryCollapsed && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {customerDetail.bookingHistory.length > 0 ? customerDetail.bookingHistory.map((h) => (
                                                <div key={h.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all border group ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-50 border-transparent hover:bg-white hover:border-slate-100'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 shadow-sm transition-colors ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                                                            <Clock size={18} />
                                                        </div>
                                                        <div>
                                                            <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{h.services && h.services.length > 0 ? h.services.map((s: any) => s.serviceName).join(', ') : h.serviceName}</p>
                                                            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(h.appointmentDatetime).toLocaleString('vi-VN')}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{String(h.servicePrice).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ</p>
                                                        <span className={`text-[9px] font-bold uppercase ${h.status === 'COMPLETED' ? 'text-green-500' : (h.status === 'CANCELLED' || h.status === 'WAITING_REFUND') ? 'text-red-500' : 'text-blue-500'}`}>
                                                            {h.status === 'COMPLETED' ? 'Thành công' : (h.status === 'CANCELLED' || h.status === 'WAITING_REFUND') ? 'Đã hủy' : 'Đã xác nhận'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <p className="text-sm text-slate-400 font-medium text-center py-4">Chưa có lịch sử giao dịch</p>
                                            )}
                                        </div>
                                    )}
                                </section>
                              </>
                          ) : null}
                        </div>

                        <div className={`p-6 border-t flex justify-end sticky bottom-0 z-20 ${isDark ? 'bg-[#0f172a] border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
                            <button 
                                onClick={() => setShowDetailModal(false)}
                                className={`px-8 py-3 border rounded-2xl font-bold transition-all text-sm ${isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
        </AnimatePresence>

      </div>
    </div>
  );
}
