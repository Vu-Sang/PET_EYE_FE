import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import {
  Bell, ChevronDown, LogOut, User, Settings,
  PawPrint, Menu, X, Video, Calendar, MessageCircle, ReceiptText, Sun, Moon, LayoutDashboard
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../services/user.service';

/* ─── helpers ─────────────────────────────────────────────── */

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 dark:hover:bg-slate-700 transition-colors flex items-center justify-center">
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   GUEST NAVBAR
   Design ref: Airbnb / Linear — logo · search bar · nav · CTA
──────────────────────────────────────────────────────────────*/
function GuestNavbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const fn = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 24);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const goto = (id: string) => {
    setMobileOpen(false);
    if (window.location.pathname === '/') scrollTo(id);
    else { navigate('/'); setTimeout(() => scrollTo(id), 350); }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300
        ${scrolled
          ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-800'
          : 'bg-transparent border-b border-transparent'}`}
    >
      <div className="py-3.5 max-w-screen-xl mx-auto px-6 md:px-10 flex items-center gap-8">
        <Link 
          to="/" 
          onClick={(e) => {
            if (window.location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="shrink-0 hover:scale-105 transition-transform duration-300"
        >
          <Logo />
        </Link>

        {/* <nav className="hidden lg:flex items-center gap-1">
        </nav> */}

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-3">
          <Link to="/search"
            className={`flex items-center gap-2 h-10 px-5 rounded-2xl text-[13px] font-black transition-all ${
              window.location.pathname === '/search'
                ? 'text-primary bg-primary/10 dark:text-blue-400 dark:bg-blue-900/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
            }`}>
            Cơ sở gần tôi
          </Link>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          <ThemeToggle />
          <Link to="/login"
            className="h-10 px-6 rounded-2xl flex items-center justify-center text-[13px] font-bold bg-primary-light text-primary hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-all hover:-translate-y-1 active:scale-95">
            Đăng nhập
          </Link>
          <Link to="/register"
            className="h-10 px-6 rounded-2xl flex items-center justify-center text-[13px] font-bold bg-primary text-white hover:bg-primary-dark dark:bg-blue-600 dark:hover:bg-blue-700 transition-all hover:shadow-xl hover:shadow-primary/20 dark:hover:shadow-blue-600/20 hover:-translate-y-1 active:scale-95">
            Đăng ký
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(v => !v)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800"
          >
            <div className="px-6 py-6 space-y-2">
              <Link to="/search" onClick={() => setMobileOpen(false)}
                className="block w-full text-left px-4 py-3.5 rounded-xl text-[15px] font-bold text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-all">
                Tìm cơ sở
              </Link>

              <div className="flex flex-col gap-3 pt-4">
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-4 rounded-2xl bg-primary-light text-primary dark:bg-blue-950/40 dark:text-blue-400 font-bold">
                  Đăng nhập
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-4 bg-primary text-white dark:bg-blue-600 rounded-2xl font-black shadow-lg shadow-primary/20 dark:shadow-blue-600/20">
                  Tham gia ngay
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────
   AUTH NAVBAR
──────────────────────────────────────────────────────────────*/
function AuthNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [fullUserInfo, setFullUserInfo] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      userService.getById(Number(user.id))
        .then(setFullUserInfo)
        .catch(console.error);
    }
  }, [user?.id]);

  const userRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  useOutsideClick(userRef, () => setUserOpen(false));
  useOutsideClick(notifRef, () => setNotifOpen(false));

  const { notifications, unreadCount, markRead, markAllRead, deleteRead } = useNotifications(!!user);
  const active = (p: string) => location.pathname === p;

  useEffect(() => {
    let ticking = false;
    const fn = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const QUICK = [
    { to: '/messages', icon: <MessageCircle className="w-4.5 h-4.5" />, label: 'Tin nhắn' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,backdrop-filter,box-shadow,border-color] duration-300
        ${scrolled
          ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10'
          : 'bg-transparent border-b border-transparent'}`}
    >
      <div className="py-3.5 max-w-screen-xl mx-auto px-6 md:px-10 flex items-center gap-6">

        {/* ── Logo ──────────────────────────────── */}
        <Link 
          to="/" 
          onClick={(e) => {
            if (window.location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="shrink-0 group"
        >
          <Logo className="group-hover:scale-105 transition-transform duration-300" />
        </Link>

        {/* ── Primary nav (Trống vì đã chuyển sang phải) ───────────────────────── */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
        </nav>

        <div className="flex-1" />

        {/* ── Right cluster ─────────────────────── */}
        <div className="flex items-center gap-2">

          {/* Nút Tìm cơ sở */}
          <Link to="/search"
            className={`hidden sm:flex items-center gap-2 h-10 px-5 rounded-2xl text-[13px] font-black transition-all ${
              active('/search')
                ? 'text-primary bg-primary/10 dark:text-blue-400 dark:bg-blue-900/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
            }`}>
            Cơ sở gần tôi
          </Link>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block" />

          {/* Icon Tin nhắn */}
          {user && (
            <Link to="/messages"
              className={`relative w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${
                active('/messages')
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-slate-100/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 hover:bg-primary/5 dark:hover:bg-slate-700'
              }`}>
              <MessageCircle size={19} />
            </Link>
          )}

          <ThemeToggle />

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button onClick={() => { setNotifOpen(v => !v); setUserOpen(false); }}
              className={`relative w-10 h-10 flex items-center justify-center rounded-2xl transition-all
                ${notifOpen ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100/50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 hover:text-primary dark:hover:text-blue-400 hover:bg-primary/5 dark:hover:bg-slate-700'}`}>
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-rose-500 text-[9px] font-black text-white flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-[calc(100%+12px)] right-0 w-[380px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 z-50 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">Thông báo mới</h4>
                    <div className="flex items-center gap-3">
                      {unreadCount > 0 && (
                        <button onClick={() => markAllRead()} className="text-[11px] font-black text-primary hover:underline">Đã đọc tất cả</button>
                      )}
                      {notifications.some(n => n.isRead) && (
                        <button onClick={() => deleteRead()} className="text-[11px] font-black text-rose-500 hover:underline">Xóa đã đọc</button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto scrollbar-hide py-2">
                    {notifications.length === 0 ? (
                      <div className="px-10 py-12 text-center space-y-3">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                          <Bell size={24} />
                        </div>
                        <p className="text-xs font-bold text-slate-400">Bạn chưa có thông báo nào</p>
                      </div>
                    ) : notifications.map(n => (
                      <div key={n.id} onClick={() => !n.isRead && markRead(n.id)}
                        className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-all border-b border-slate-50 dark:border-slate-800/50 last:border-0
                          ${n.isRead ? 'opacity-60 grayscale-[0.5]' : 'bg-primary/[0.03] hover:bg-primary/[0.06]'}`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                          <Bell size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-tight mb-1 ${n.isRead ? 'font-medium text-slate-600' : 'font-black text-slate-900 dark:text-white'}`}>{n.title}</p>
                          <p className="text-[11.5px] text-slate-500 line-clamp-2 leading-relaxed">{n.content}</p>
                          <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-tighter">Vừa xong</p>
                        </div>
                        {!n.isRead && <div className="w-2.5 h-2.5 rounded-full bg-primary mt-2 shadow-lg shadow-primary/40" />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User avatar / menu */}
          <div ref={userRef} className="relative ml-1">
            <button onClick={() => { setUserOpen(v => !v); setNotifOpen(false); }}
              className={`flex items-center gap-3 pl-1.5 pr-4 h-10 rounded-2xl transition-all border-2
                ${userOpen ? 'bg-white dark:bg-slate-800 border-primary shadow-lg shadow-primary/10' : 'bg-slate-100/50 dark:bg-slate-800/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}>
              <div className="w-7 h-7 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-xs font-black shadow-lg">
                {user!.avatar ? (
                  <img src={user!.avatar} alt={user!.name} className="w-full h-full object-cover" />
                ) : (
                  user!.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden lg:block text-left mr-1">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Thành viên</p>
                <p className="text-[13px] font-black text-slate-900 dark:text-white leading-none truncate max-w-[90px]">{user!.name.split(' ').pop()}</p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${userOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {userOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-[calc(100%+12px)] right-0 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-slate-200/50 dark:border-slate-700/50 py-3 z-50"
                >
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 mb-2">
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate">{user!.name}</p>
                    <p className="text-[11px] font-bold text-primary mt-1 dark:text-blue-400 mt-1">
                      Hạng {fullUserInfo?.currentTier?.name || 'Đồng'} • {Math.floor((fullUserInfo?.totalSpending || 0) / 1000).toLocaleString('en-US')} xu
                    </p>
                  </div>

                  {[
                  { to: '/user/dashboard', icon: <LayoutDashboard size={16} />, label: 'Tổng quan' },
                    { to: '/profile', icon: <User size={16} />, label: 'Quản lý tài khoản' },
                    { to: '/profile/pets', icon: <PawPrint size={16} />, label: 'Thú cưng của tôi' },
                    { to: '/profile/bookings', icon: <Calendar size={16} />, label: 'Lịch đặt hẹn' },
                    { to: '/camera', icon: <Video size={16} />, label: 'Theo dõi Camera', badge: 'LIVE' },
                    { to: '/profile/transactions', icon: <ReceiptText size={16} />, label: 'Lịch sử giao dịch' },
                  ].map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setUserOpen(false)}
                      className={`flex items-center gap-3.5 px-6 py-3 text-[13.5px] font-bold transition-all
                        ${active(item.to) ? 'text-primary bg-primary/5 dark:bg-primary/10 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-blue-400'}`}>
                      <span className="shrink-0 opacity-80">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-[8px] font-black text-white bg-rose-500 px-2 py-0.5 rounded-lg animate-pulse">{item.badge}</span>
                      )}
                    </Link>
                  ))}

                  <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 px-3">
                    <button onClick={() => { logout(); navigate('/'); }}
                      className="flex items-center gap-3.5 px-4 py-3.5 text-[13.5px] font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 w-full rounded-2xl transition-all">
                      <LogOut size={16} /> Đăng xuất tài khoản
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 transition-colors">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu (auth) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
          >
            <div className="px-6 py-8 space-y-2">
              {[...NAV, { to: '/camera', label: 'Camera lưu trú' }, { to: '/messages', label: 'Tin nhắn' }].map(item => (
                <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-4 rounded-2xl text-[16px] font-black transition-all
                    ${active(item.to) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary'}`}>
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ─── Export ──────────────────────────────────────────────── */
export default function Navbar() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <AuthNavbar /> : <GuestNavbar />;
}
