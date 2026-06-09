import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/user.service';

const NAV_ITEMS = [
  { icon: 'person', label: 'Thông tin cá nhân', path: '/profile' },
  { icon: 'pets', label: 'Thú cưng của tôi', path: '/profile/pets' },
  { icon: 'calendar_month', label: 'Lịch sử đặt lịch', path: '/profile/bookings' },
  { icon: 'receipt_long', label: 'Lịch sử giao dịch', path: '/profile/transactions' },
  { icon: 'shield_person', label: 'Bảo mật & Mật khẩu', path: '/profile/security' },
  { icon: 'notifications', label: 'Thông báo', path: '/profile/notifications' },
];

export function ProfileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, setUserSession } = useAuth();
  const [showPerksModal, setShowPerksModal] = useState(false);
  const [fullUserInfo, setFullUserInfo] = useState<any>(null);
  const [publicVouchers, setPublicVouchers] = useState<any[]>([]);
  const [isVoucherServiceEnabled, setIsVoucherServiceEnabled] = useState(true);

  useEffect(() => {
    userService.getPublicVouchers().then(setPublicVouchers).catch(console.error);
    userService.getVoucherServiceConfig().then(setIsVoucherServiceEnabled).catch(console.error);
    if (user?.id) {
      userService.getById(Number(user.id))
        .then(data => {
            setFullUserInfo(data);
        })
        .catch(err => console.error(err));
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentTierName = fullUserInfo?.currentTier?.name || 'Đồng';
  const totalSpending = fullUserInfo?.totalSpending || 0;
  
  let nextTier = 'Bạc';
  let nextThreshold = 500000;
  let tierIcon = 'military_tech';
  let tierTextColor = 'text-slate-400';
  
  if (currentTierName === 'Bạc') {
    nextTier = 'Vàng';
    nextThreshold = 1000000;
    tierIcon = 'workspace_premium';
    tierTextColor = 'text-slate-300';
  } else if (currentTierName === 'Vàng') {
    nextTier = 'Kim Cương';
    nextThreshold = 5000000;
    tierIcon = 'stars';
    tierTextColor = 'text-yellow-500';
  } else if (currentTierName === 'Kim Cương') {
    nextTier = 'Tối đa';
    nextThreshold = 5000000;
    tierIcon = 'diamond';
    tierTextColor = 'text-cyan-400';
  }
  
  const nextTierVouchers = publicVouchers.filter(v => v.targetTier?.name === nextTier);
  let nextDiscount = 'GIẢM...';
  if (nextTierVouchers.length > 0) {
      const v = nextTierVouchers[0];
      nextDiscount = `GIẢM ${v.discountValue}${v.discountType === 'PERCENTAGE' ? '%' : 'đ'} (x${v.issueQuantity})`;
  } else if (nextTier === 'Tối đa') {
      nextDiscount = 'MAX';
  }

  const progressPercent = Math.min((totalSpending / nextThreshold) * 100, 100);

  const TIER_PERKS_BASE: Record<string, { title: string, colorClass: string, perks: { title: string, desc: string, icon: string }[] }> = {
    'Đồng': {
      title: 'Hạng Đồng',
      colorClass: 'text-slate-400',
      perks: [
        { title: 'Tích lũy chi tiêu', desc: 'Hệ thống tự động cộng dồn', icon: 'savings' },
        { title: 'Ưu đãi cơ bản', desc: 'Áp dụng cho mọi dịch vụ', icon: 'card_membership' }
      ]
    },
    'Bạc': {
      title: 'Hạng Bạc',
      colorClass: 'text-slate-300',
      perks: [
        { title: 'Ưu tiên hỗ trợ', desc: 'Phản hồi nhanh chóng', icon: 'support_agent' }
      ]
    },
    'Vàng': {
      title: 'Hạng Vàng',
      colorClass: 'text-yellow-500',
      perks: [
        { title: 'Ưu tiên đặt chỗ', desc: 'Xác nhận lịch hẹn nhanh x3', icon: 'bolt' },
        { title: 'Tích điểm x2', desc: 'Quy đổi Voucher dễ dàng', icon: 'military_tech' },
        { title: 'Hỗ trợ VIP', desc: 'Kênh CSKH riêng biệt 24/7', icon: 'headset_mic' },
      ]
    },
    'Kim Cương': {
      title: 'Hạng Kim Cương',
      colorClass: 'text-cyan-400',
      perks: [
        { title: 'Dịch vụ miễn phí', desc: '1 lần spa/tháng', icon: 'spa' },
        { title: 'Hotline VIP', desc: 'Hỗ trợ ngay lập tức 24/7', icon: 'phone_in_talk' },
        { title: 'Quà sinh nhật', desc: 'Voucher đặc biệt', icon: 'cake' },
      ]
    }
  };

  const baseData = TIER_PERKS_BASE[currentTierName] || TIER_PERKS_BASE['Đồng'];
  const currentTierVouchers = publicVouchers.filter(v => v.targetTier?.name === currentTierName);
  const voucherPerks = currentTierVouchers.map(v => ({
      title: `Voucher Giảm ${v.discountValue}${v.discountType === 'PERCENTAGE' ? '%' : 'đ'} (x${v.issueQuantity})`,
      desc: `Mã ${v.code} - HSD: ${v.validDays} ngày`,
      icon: 'local_activity'
  }));

  const currentPerksData = {
    ...baseData,
    perks: [...voucherPerks, ...baseData.perks]
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col md:flex-row max-w-[1440px] mx-auto w-full px-4 md:px-10 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-72 flex flex-col gap-6 shrink-0">
          {/* Nav */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map(item => {
                const isActive =
                  item.path === '/profile'
                    ? location.pathname === '/profile'
                    : location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                      ? 'bg-[#e0f7f9] text-[#1a2b4c] shadow-sm dark:bg-teal-900/30 dark:text-teal-300'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                  >
                    <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
                <span className="text-sm font-semibold">Đăng xuất</span>
              </button>
            </div>
          </div>

          {/* Membership card - HIDING AS REQUESTED */}
          {/*
          <div className="bg-gradient-to-br from-[#1a2b4c] to-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <span className={`bg-white/10 text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-white/20`}>
                Membership
              </span>
              <div className="w-10 h-10 bg-gradient-to-tr from-white/10 to-white/30 rounded-xl flex items-center justify-center shadow-lg transform -rotate-12 group-hover:rotate-0 transition-all duration-500">
                <span className={`material-symbols-outlined text-slate-300 text-2xl`}>stars</span>
              </div>
            </div>

            {isVoucherServiceEnabled ? (
              <>
                <div className="relative z-10">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cấp bậc hiện tại</p>
                  <h3 className="text-2xl font-black text-white mt-1">Hạng <span className={tierTextColor}>{currentTierName}</span></h3>
                  
                  <div className="mt-8 space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-slate-400 text-xs font-medium">Đến hạng {nextTier}</p>
                      <p className="text-white text-sm font-black">{(totalSpending / 1000).toLocaleString()}K / {(nextThreshold / 1000).toLocaleString()}K <span className="text-[10px] font-medium text-slate-500">VND</span></p>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)] transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowPerksModal(true)}
                  className="w-full mt-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/10 backdrop-blur-sm transition-all flex items-center justify-center gap-2"
                >
                  Xem đặc quyền của tôi
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </>
            ) : (
              <div className="relative z-10 text-center py-4">
                <h3 className="text-xl font-black text-white mt-1">Hệ Thống Hạng</h3>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-4 border border-slate-600 inline-block px-4 py-1.5 rounded-full bg-slate-800/50">
                  Sắp ra mắt
                </p>
              </div>
            )}
          </div>
          */}
        </aside>

        {/* Perks Modal */}
        {showPerksModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
              {/* Header */}
              <div className="relative h-44 bg-[#1a2b4c] flex flex-col items-center justify-center text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl -ml-16 -mb-16" />
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl transform -rotate-6 mb-3">
                        <span className="material-symbols-outlined text-white text-4xl">{tierIcon}</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">Đặc quyền <span className={currentPerksData.colorClass}>{currentPerksData.title}</span></h2>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em] mt-1">Trạng thái: Hoạt động</p>
                </div>
                
                <button 
                    onClick={() => setShowPerksModal(false)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10"
                >
                    <span className="material-symbols-outlined text-white">close</span>
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-8">
                <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Các đặc quyền đang hiệu lực</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentPerksData.perks.map(p => (
                            <div key={p.title} className="flex gap-3 p-3 rounded-2xl border border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-[#1a2b4c] dark:text-teal-400 shadow-sm shrink-0 border border-slate-100 dark:border-slate-600">
                                    <span className="material-symbols-outlined text-xl">{p.icon}</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">{p.title}</p>
                                    <p className="text-[10px] text-slate-500">{p.desc}</p>
                                </div>
                            </div>
                        ))}
                   </div>
                </div>

                {nextTier !== 'Tối đa' && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/20">
                      <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-teal-600">diamond</span>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Cấp {nextTier} đang chờ bạn!</p>
                          </div>
                          <span className="text-[10px] font-black text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">+ {nextDiscount}</span>
                      </div>
                      <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500">
                              <span>Sắp đạt được</span>
                              <span>{Math.floor(progressPercent)}% Hoàn thành</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 text-center mt-2 italic">Chi tiêu thêm {((nextThreshold - totalSpending) > 0 ? (nextThreshold - totalSpending) : 0).toLocaleString()}đ để thăng hạng!</p>
                      </div>
                  </div>
                )}

                <button 
                  onClick={() => setShowPerksModal(false)}
                  className="w-full py-4 bg-[#1a2b4c] text-white rounded-2xl font-bold shadow-xl shadow-indigo-900/20 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                >
                  Tuyệt vời, tôi đã hiểu!
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Main */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Personal Info (main profile page)
// ─────────────────────────────────────────────
export default function Profile() {
  const { user, setUserSession } = useAuth();
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatar, setAvatar] = useState(user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('Thông tin đã được lưu thành công!');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullUserInfo, setFullUserInfo] = useState<any>(null);
  const [isVoucherServiceEnabled, setIsVoucherServiceEnabled] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const [data, config] = await Promise.all([
        userService.getById(Number(user?.id)),
        userService.getVoucherServiceConfig()
      ]);
      setFullUserInfo(data);
      setFullName(data.fullName);
      setEmail(data.email);
      setPhone(data.phone || '');
      setAddress(data.address || '');
      if (data.avatar) setAvatar(data.avatar);
      setIsVoucherServiceEnabled(config);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const updatedUserResponse = await userService.update(Number(user.id), {
        fullName,
        phone,
        address,
        avatar
      });

      // Update global session while preserving the token
      setUserSession({
        ...user,
        name: updatedUserResponse.fullName,
        avatar: updatedUserResponse.avatar
      });

      setMessage('Thông tin đã được lưu thành công!');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setLoading(true); // Wait, should be false
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const url = await userService.uploadAvatar(file);
      setAvatar(url);
      // Automatically save the new avatar
      if (user?.id) {
        const updatedUserResponse = await userService.update(Number(user.id), { avatar: url });
        
        // Update global session
        setUserSession({
          ...user,
          avatar: updatedUserResponse.avatar
        });
      }
      setMessage('Ảnh đại diện đã được cập nhật!');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      await userService.deleteAvatar(Number(user.id));
      const defaultAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop';
      setAvatar(defaultAvatar); // Back to default
      
      // Update global session
      setUserSession({
        ...user,
        avatar: undefined
      });

      setMessage('Ảnh đại diện đã được xóa!');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to delete avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl text-slate-900 dark:text-slate-100 tracking-tight font-bold">Thông tin cá nhân</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Quản lý thông tin hồ sơ và tùy chọn của bạn.</p>
        </div>

        {saved && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 text-green-700 dark:text-green-300">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="font-semibold text-sm">{message}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Avatar */}
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="size-28 rounded-full border-4 border-white dark:border-slate-800 shadow-md overflow-hidden bg-slate-100">
                  <img
                    src={avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-[#1a2b4c] text-white size-9 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                </button>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{fullName}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Thành viên từ Peteye</p>
                <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="bg-[#1a2b4c] px-5 py-2 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
                  >
                    {loading ? 'Đang tải...' : 'Tải ảnh mới'}
                  </button>
                  <button 
                    type="button"
                    onClick={handleDeleteAvatar}
                    disabled={loading}
                    className="bg-slate-100 dark:bg-slate-800 px-5 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Xóa ảnh
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form className="p-6 md:p-8 flex flex-col gap-8" onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Họ và tên</label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-[#1a2b4c] focus:ring-1 focus:ring-[#1a2b4c] outline-none transition-all"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  Địa chỉ Email
                  <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    Đã xác minh
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Số điện thoại</label>
                <input
                  type="tel"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-[#1a2b4c] focus:ring-1 focus:ring-[#1a2b4c] outline-none transition-all"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Quốc gia/Vùng lãnh thổ</label>
                <div className="relative">
                  <input
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-500 dark:text-slate-400 outline-none transition-all"
                    value="Việt Nam"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Địa chỉ</label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:border-[#1a2b4c] focus:ring-1 focus:ring-[#1a2b4c] outline-none transition-all resize-none"
                  rows={3}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-500 max-w-xs">Dữ liệu cá nhân của bạn được mã hóa và bảo mật theo chính sách riêng tư của Peteye.</p>
              <div className="flex gap-3">
                <button type="button" className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm">Hủy</button>
                <button type="submit" disabled={loading} className="bg-[#1a2b4c] px-8 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-[#1a2b4c]/20 hover:opacity-90 active:scale-[0.98] transition-all text-sm disabled:opacity-50">
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Membership Tiers Explanation - HIDING AS REQUESTED */}

        {/* {isVoucherServiceEnabled && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600">
                <span className="material-symbols-outlined">military_tech</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Cấp bậc & Đặc quyền</h3>
                <p className="text-xs text-slate-500 font-medium">Càng nhiều lịch hẹn, ưu đãi càng lớn!</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { level: 'Đồng', target: 'Mặc định (0đ)', icon: 'license', color: 'slate', perks: ['Ưu đãi cơ bản', 'Tích lũy chi tiêu'] },
              { level: 'Bạc', target: 'Chi tiêu 500,000đ', icon: 'workspace_premium', color: 'blue', perks: ['Tự động nhận Voucher Bạc', 'Ưu tiên hỗ trợ'] },
              { level: 'Vàng', target: 'Chi tiêu 1,000,000đ', icon: 'stars', color: 'yellow', perks: ['Tự động nhận Voucher Vàng', 'Ưu tiên đặt chỗ', 'Tích điểm x2'] },
              { level: 'Kim Cương', target: 'Chi tiêu 5,000,000đ', icon: 'diamond', color: 'teal', perks: ['Tự động nhận Voucher Kim cương', 'Dịch vụ miễn phí', 'Hotline VIP'] },
            ].map((tier) => {
              const currentName = fullUserInfo?.currentTier?.name || 'Đồng';
              const isActive = tier.level.toLowerCase() === currentName.toLowerCase();
              return (
              <div 
                key={tier.level}
                className={`relative p-5 rounded-2xl border transition-all ${
                  isActive 
                    ? 'border-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/10 shadow-lg' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {isActive && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full shadow-md z-10 w-max">
                        Cấp hiện tại
                    </div>
                )}
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                        <span className={`material-symbols-outlined text-${tier.color}-500 text-2xl`}>{tier.icon}</span>
                        <span className="text-[10px] font-bold text-slate-400">{tier.target}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-4">Peteye {tier.level}</h4>
                    <ul className="space-y-2 mt-auto">
                        {tier.perks.map(perk => (
                            <li key={perk} className="flex items-center gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                <span className="material-symbols-outlined text-xs text-green-500">check</span>
                                {perk}
                            </li>
                        ))}
                    </ul>
                </div>
              </div>
            )})}
          </div>
        </div>
        )} */}
      </main>
  );
}

