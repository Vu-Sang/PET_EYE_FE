import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Store, Bell, LogOut, Menu, X, User, ChevronDown, Settings, BarChart3, Package, Calendar, Users as UsersIcon, Video, MessageCircle, Sparkles, Wallet, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import { useNotifications } from '../hooks/useNotifications';
import { walletService, ShopWalletResponse } from '../services/wallet.service';

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

export default function ShopNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [wallet, setWallet] = useState<ShopWalletResponse | null>(null);
  
  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  useOutsideClick(userRef, () => setUserMenuOpen(false));
  useOutsideClick(notifRef, () => setNotifOpen(false));

  useEffect(() => {
    if (user) {
      walletService.getMyWallet()
        .then(setWallet)
        .catch(err => console.error("Failed to fetch wallet:", err));
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', path: '/shop/dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Lịch đặt hẹn', path: '/shop/bookings', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Dịch vụ', path: '/shop/services', icon: <Package className="w-4 h-4" /> },
    { label: 'Ví của tôi', path: '/shop/wallet', icon: <Wallet className="w-4 h-4" /> },
    { label: 'Camera', path: '/shop/camera', icon: <Video className="w-4 h-4" /> },
    { label: 'Nhân viên', path: '/shop/staff', icon: <UsersIcon className="w-4 h-4" /> },
    { label: 'Khách hàng', path: '/shop/customers', icon: <UsersIcon className="w-4 h-4" /> },
    { label: 'Đánh giá', path: '/shop/reviews', icon: <Star className="w-4 h-4" /> },
    { label: 'AI Assistant', path: '/shop/ai-assistant', icon: <Sparkles className="w-4 h-4" />, highlight: true },
  ];

  const isActive = (path: string) => location.pathname === path;

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(!!user);

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-[56px]">
          {/* Left: Logo + Badge */}
          <div className="flex items-center gap-4">
            <Link to="/shop/dashboard" className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-[#1a2b4c] to-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                <Store className="text-white" size={18} />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">Peteye Partner</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Quản lý cửa hàng</p>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 text-[13.5px]">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 h-8 px-3 rounded-lg font-medium transition-colors ${
                  (item as any).highlight
                    ? isActive(item.path)
                      ? 'text-white bg-gradient-to-r from-[#1a2b4c] to-indigo-600 shadow-sm'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800'
                    : isActive(item.path)
                      ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                }`}
              >
                {item.icon}
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            {/* Wallet Balance */}
            {wallet && (
              <Link to="/shop/wallet" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-800/40 mr-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <Wallet size={13} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 leading-none">Số dư khả dụng</span>
                  <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-300 leading-tight">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.availableBalance)}
                  </span>
                </div>
              </Link>
            )}

            {/* Divider */}
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button 
                onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}
                className={`relative w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  notifOpen 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                }`}
              >
                <Bell className="w-[17px] h-[17px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-[7px] h-[7px] bg-red-500 rounded-full border-[1.5px] border-white dark:border-slate-900" />
                )}
              </button>

              {notifOpen && (
                <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:top-[calc(100%+8px)] sm:right-0 sm:w-[340px] bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Thông báo</p>
                    <button 
                      onClick={() => markAllRead()}
                      className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      Đọc tất cả ({unreadCount})
                    </button>
                  </div>
                  <div className="py-1 max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[12px] text-slate-400">Không có thông báo nào</div>
                    ) : notifications.map(n => (
                      <div key={n.id}
                        onClick={() => { if (!n.isRead) markRead(n.id); }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.isRead ? 'bg-slate-100' : 'bg-blue-100'}`}>
                          <Bell size={13} className={n.isRead ? 'text-slate-400' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200 leading-snug">{n.title}</p>
                          <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{n.content}</p>
                          <p className="text-[11px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                        {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div ref={userRef} className="relative">
              <button 
                onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
                className={`flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-lg transition-colors ${
                  userMenuOpen ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1a2b4c] to-slate-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <span className="hidden sm:block text-[13px] font-medium text-slate-700 dark:text-slate-200 max-w-[80px] truncate">
                  {user?.name || 'Shop'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-700 py-1.5 z-50">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700 mb-1">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Shop'}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Đối tác Peteye</p>
                  </div>

                  {[
                    { action: 'link', to: '/shop/profile', icon: <Store className="w-3.5 h-3.5" />, label: 'Thông tin cửa hàng' },
                    { action: 'link', to: '/shop/messages', icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'Tin nhắn' },
                    { action: 'link', to: '/shop/dashboard', icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Dashboard' },
                    { action: 'link', to: '/shop/notifications', icon: <Bell className="w-3.5 h-3.5" />, label: 'Thông báo' },
                  ].map((item, index) => (
                    item.action === 'link' ? (
                    <Link key={item.to} to={item.to!}
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${
                        isActive(item.to!) 
                          ? 'text-primary bg-primary/5' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="text-slate-400 dark:text-slate-500">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                    ) : (
                    <button key="notif"
                      onClick={() => { setUserMenuOpen(false); setNotifOpen(true); }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white`}
                    >
                      <span className="text-slate-400 dark:text-slate-500">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                    )
                  ))}

                  <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                    <button onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors">
                      <LogOut className="w-3.5 h-3.5" /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors ml-1"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 pt-3 pb-5 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>
            <Link
              to="/shop/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <User className="w-4 h-4" />
              Cài đặt cửa hàng
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
