import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Calendar, DollarSign, Users, TrendingUp, TrendingDown, Bell, LayoutDashboard,
    ArrowUpRight, Video, MessageCircle, Package, Activity, Loader2,Store, Filter, PieChart as PieChartIcon, Search
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { shopService } from '../../services/shop.service';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

export default function ShopDashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [dateRange, setDateRange] = useState<'today'|'week'|'month'|'all'|'custom'>('month');
  const [customDateInput, setCustomDateInput] = useState({ start: '', end: '' });
  const [appliedCustomDate, setAppliedCustomDate] = useState({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const getDateParams = () => {
    if (dateRange === 'custom') {
      return { 
        startDate: appliedCustomDate.start || undefined, 
        endDate: appliedCustomDate.end || undefined 
      };
    }
    const end = new Date();
    let start = new Date();
    if (dateRange === 'today') {
      // start is today
    } else if (dateRange === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (dateRange === 'month') {
      start.setDate(end.getDate() - 30);
    } else {
      return { startDate: undefined, endDate: undefined };
    }
    return { 
      startDate: start.toISOString().split('T')[0], 
      endDate: end.toISOString().split('T')[0] 
    };
  };

  const { startDate, endDate } = getDateParams();

  const { data: dashboardData, isLoading, isError } = useQuery({
    queryKey: ['shopDashboard', startDate, endDate],
    queryFn: () => shopService.getDashboard(startDate, endDate),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={`w-12 h-12 animate-spin ${isDark ? 'text-indigo-400' : 'text-[#1a2b4c]'}`} />
          <p className={`font-bold animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Đang tải dữ liệu kinh doanh...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    toast.error("Không thể tải dữ liệu dashboard");
    return (
      <div className="min-h-[80vh] p-8 flex items-center justify-center">
        <p className="text-red-500 font-bold">Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  const kpis = [
    { 
      label: 'Doanh thu (Kỳ)', 
      value: formatCurrency(dashboardData?.periodRevenue || 0), 
      icon: DollarSign, 
      color: 'bg-emerald-500', 
      shadow: 'shadow-emerald-500/20',
      glow: 'glow-emerald',
      desc: `Tổng: ${formatCurrency(dashboardData?.totalRevenue || 0)}` 
    },
    { 
      label: 'Lịch hẹn (Kỳ)', 
      value: formatNumber(dashboardData?.periodBookings || 0), 
      icon: Calendar, 
      color: 'bg-blue-500', 
      shadow: 'shadow-blue-500/20',
      glow: 'glow-blue',
      desc: `${dashboardData?.pendingBookings || 0} đơn đang chờ xử lý`
    },
    { 
      label: 'Khách mới (Kỳ)', 
      value: formatNumber(dashboardData?.periodNewCustomers || 0), 
      icon: Users, 
      color: 'bg-violet-500', 
      shadow: 'shadow-violet-500/20',
      glow: 'glow-indigo',
      desc: `Tổng số khách: ${formatNumber(dashboardData?.totalCustomers || 0)}` 
    },
    { 
      label: 'Thú cưng', 
      value: formatNumber(dashboardData?.totalPets || 0), 
      icon: Activity, 
      color: 'bg-orange-500', 
      shadow: 'shadow-orange-500/20',
      glow: 'glow-rose',
      desc: 'Tổng số thú cưng đã phục vụ'
    },
  ];

  const pieData = dashboardData?.bookingStatusStats ? [
    { name: 'Chờ/Xác nhận', value: dashboardData.bookingStatusStats.pending + dashboardData.bookingStatusStats.confirmed, color: '#f59e0b' },
    { name: 'Hoàn thành', value: dashboardData.bookingStatusStats.completed, color: '#10b981' },
    { name: 'Huỷ/Không đến', value: dashboardData.bookingStatusStats.cancelled, color: '#ef4444' }
  ].filter(d => d.value > 0) : [];

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
           <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
             <LayoutDashboard className={`w-8 h-8 text-blue-500 ${isDark ? 'drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]' : ''}`} />
             Tổng quan kinh doanh
           </h1>
           <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
             Xin chào {user?.name || 'Chủ Shop'}. Chúc bạn một ngày kinh doanh hồng phát!
           </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            {/* Date Filters */}
            <div className="relative">
                <div className={`flex items-center gap-1 p-1 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'}`}>
                    {[
                        { id: 'today', label: 'Hôm nay' },
                        { id: 'week', label: '7 ngày' },
                        { id: 'month', label: '30 ngày' },
                        { id: 'all', label: 'Toàn thời gian' }
                    ].map(f => (
                        <button 
                            key={f.id}
                            onClick={() => {
                                setDateRange(f.id as any);
                                setShowDatePicker(false);
                            }}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${dateRange === f.id ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 glow-indigo' : 'bg-indigo-50 text-indigo-700 shadow-sm') : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <button 
                        onClick={() => {
                            setShowDatePicker(!showDatePicker);
                            if (dateRange !== 'custom') setDateRange('custom');
                        }}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${dateRange === 'custom' ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 glow-indigo' : 'bg-indigo-50 text-indigo-700 shadow-sm') : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
                    >
                        <Calendar size={14} /> Tuỳ chọn
                    </button>
                </div>

                {showDatePicker && dateRange === 'custom' && (
                    <div className={`absolute top-full right-0 mt-3 p-5 rounded-3xl border shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-slate-900 border-white/10 shadow-black/50' : 'bg-white border-slate-200 shadow-indigo-900/10'}`}>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className={`text-[10px] font-bold uppercase tracking-wider pl-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Từ ngày</label>
                                <div className={`flex items-center px-4 py-2.5 rounded-2xl border-2 transition-all cursor-pointer ${isDark ? 'bg-slate-800 border-transparent hover:border-indigo-500/30 focus-within:border-indigo-500' : 'bg-slate-50 border-transparent hover:border-indigo-200 focus-within:border-indigo-400'}`}>
                                    <input 
                                        type="date" 
                                        value={customDateInput.start}
                                        onChange={(e) => setCustomDateInput(prev => ({ ...prev, start: e.target.value }))}
                                        className={`text-sm font-bold outline-none bg-transparent cursor-pointer w-[120px] ${isDark ? 'text-white [color-scheme:dark]' : 'text-slate-700'}`}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 mt-5">
                                <span className={`font-black ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>-</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className={`text-[10px] font-bold uppercase tracking-wider pl-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Đến ngày</label>
                                <div className={`flex items-center px-4 py-2.5 rounded-2xl border-2 transition-all cursor-pointer ${isDark ? 'bg-slate-800 border-transparent hover:border-indigo-500/30 focus-within:border-indigo-500' : 'bg-slate-50 border-transparent hover:border-indigo-200 focus-within:border-indigo-400'}`}>
                                    <input 
                                        type="date" 
                                        value={customDateInput.end}
                                        onChange={(e) => setCustomDateInput(prev => ({ ...prev, end: e.target.value }))}
                                        className={`text-sm font-bold outline-none bg-transparent cursor-pointer w-[120px] ${isDark ? 'text-white [color-scheme:dark]' : 'text-slate-700'}`}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-5 flex justify-end">
                            <button 
                                onClick={() => {
                                    setAppliedCustomDate(customDateInput);
                                    setShowDatePicker(false);
                                }}
                                className={`px-6 py-3 text-sm font-bold text-white rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 w-full justify-center ${isDark ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-[#1a2b4c] hover:bg-indigo-900 shadow-indigo-900/20'}`}
                            >
                                <Search size={16} /> Lấy dữ liệu
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </header>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {kpis.map((s) => (
            <Link 
              key={s.label} 
              to={s.label.includes('Lịch hẹn') ? '/shop/bookings' : '#'}
              className={`p-6 rounded-[2rem] transition-all duration-300 group block ${isDark ? 'admin-glass-card bg-slate-900/40 hover:bg-slate-900/60' : 'bg-white shadow-sm border border-slate-100 hover:shadow-xl'}`}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${s.color} shadow-lg ${s.shadow} ${isDark ? s.glow : ''} group-hover:scale-110 transition-transform`}>
                        <s.icon size={22} />
                    </div>
                </div>
                <p className="text-fluid-sm font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                <h3 className={`text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.value}</h3>
                <p className="text-[10px] text-slate-400 mt-2 font-medium">{s.desc}</p>
            </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Main Chart Column */}
        <div className="lg:col-span-2 space-y-8">
            <div className={`p-8 rounded-[2.5rem] transition-all ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white shadow-sm border border-slate-100'}`}>
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Biểu đồ doanh thu</h3>
                        <p className={`text-fluid-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {dateRange === 'all' ? 'Toàn thời gian' : `Trong ${dateRange === 'today' ? 'hôm nay' : (dateRange === 'week' ? '7 ngày' : '30 ngày')} gần nhất`}
                        </p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                      <div className={`w-2 h-2 rounded-full bg-blue-500 ${isDark ? 'glow-blue' : ''}`} />
                      <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Đã hoàn thành</span>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData?.revenueChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                tickFormatter={(val) => `${val/1000}k`}
                            />
                            <Tooltip 
                                formatter={(val: number) => [formatCurrency(val), 'Doanh thu']}
                                contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#fff',
                                    color: isDark ? '#fff' : '#000',
                                    backdropFilter: 'blur(8px)'
                                }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="amount" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorVal)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Status Pie Chart */}
        <div className={`p-8 rounded-[2.5rem] transition-all flex flex-col ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white shadow-sm border border-slate-100'}`}>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Trạng thái lịch hẹn</h3>
            <p className={`text-fluid-sm font-medium mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tỉ lệ trong kỳ</p>
            <div className="flex-1 min-h-[250px] w-full relative">
                {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(val: number) => [`${val} đơn`, 'Số lượng']}
                                contentStyle={{ 
                                    borderRadius: '12px', 
                                    border: 'none', 
                                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#fff',
                                    color: isDark ? '#fff' : '#000',
                                    backdropFilter: 'blur(8px)'
                                }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-slate-400 font-medium text-sm">Chưa có dữ liệu</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className={`p-8 rounded-[2.5rem] transition-all ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white shadow-sm border border-slate-100'}`}>
              <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Dịch vụ thịnh hành</h3>
              <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData?.topServices}>
                          <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                          />
                          <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} 
                              contentStyle={{
                                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : '#fff',
                                  color: isDark ? '#fff' : '#000',
                                  border: 'none',
                                  borderRadius: '12px',
                                  backdropFilter: 'blur(8px)'
                              }}
                          />
                          <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                              {dashboardData?.topServices?.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden flex flex-col justify-center glow-blue">
              <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                  {dashboardData?.growthPercentage !== undefined && dashboardData.growthPercentage < 0 ? (
                      <TrendingDown size={40} className="mb-6 text-red-200 drop-shadow-md" />
                  ) : (
                      <TrendingUp size={40} className="mb-6 text-emerald-200 drop-shadow-md" />
                  )}
                  <h3 className="text-xl font-black mb-2 text-white/90">Tăng trưởng so với kỳ trước</h3>
                  <p className="text-4xl font-black mb-4 tracking-tight drop-shadow-md">
                      {dashboardData?.growthPercentage !== undefined 
                          ? (dashboardData.growthPercentage > 0 ? '+' : '') + dashboardData.growthPercentage.toFixed(1) + '%'
                          : '0.0%'}
                  </p>
                  <p className="text-fluid-sm text-white/80 font-medium leading-relaxed">
                    {dashboardData?.growthDescription || "Chưa có đủ dữ liệu để đánh giá."}
                  </p>
                  <Link to="/shop/bookings" className="mt-6 w-full py-3 bg-white text-indigo-900 rounded-xl text-fluid-sm font-black shadow-lg hover:bg-slate-50 transition-colors block text-center">Xem đơn hàng</Link>
              </div>
          </div>

          <div className="space-y-6">
              <div className={`p-8 rounded-[2.5rem] transition-all ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white shadow-sm border border-slate-100'}`}>
                  <div className="flex items-center gap-3 mb-6">
                      <div className={`p-3 rounded-2xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                          <PieChartIcon size={20} />
                      </div>
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Gợi ý hành động</h3>
                  </div>
                  <div className="space-y-4">
                      {dashboardData?.pendingBookings && dashboardData.pendingBookings > 0 ? (
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-100'}`}>
                              <p className={`text-fluid-sm font-bold mb-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Xử lý đơn chờ</p>
                              <p className={`text-[10px] leading-relaxed ${isDark ? 'text-orange-300' : 'text-orange-600/80'}`}>Đang có {dashboardData.pendingBookings} đơn chờ xử lý.</p>
                          </div>
                      ) : null}
                      
                      {dashboardData?.growthPercentage !== undefined ? (
                          dashboardData.growthPercentage >= 0 ? (
                              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                  <p className={`text-fluid-sm font-bold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Duy trì phong độ</p>
                                  <p className={`text-[10px] leading-relaxed ${isDark ? 'text-emerald-300' : 'text-emerald-600/80'}`}>
                                      Dịch vụ {dashboardData.topServices?.[0]?.name || 'nổi bật'} đang làm rất tốt!
                                  </p>
                              </div>
                          ) : (
                              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                  <p className={`text-fluid-sm font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>Kích cầu</p>
                                  <p className={`text-[10px] leading-relaxed ${isDark ? 'text-blue-300' : 'text-blue-600/80'}`}>
                                      Gửi mã giảm giá để kéo thêm khách hàng quay lại.
                                  </p>
                              </div>
                          )
                      ) : (
                          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                              <p className={`text-fluid-sm font-bold mb-1 ${isDark ? 'text-indigo-400' : 'text-[#1a2b4c]'}`}>Khởi đầu suôn sẻ</p>
                              <p className="text-[10px] text-slate-500 leading-relaxed">Hệ thống sẽ cập nhật gợi ý thông minh dựa trên dữ liệu thật của bạn.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}
