import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, Search, Settings, User, Store, MessageCircle, BarChart3, Wallet, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../hooks/useNotifications';
import { walletService, ShopWalletResponse } from '../../services/wallet.service';
import { useTheme } from '../../contexts/ThemeContext';

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

export default function ShopHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
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

  const { notifications, unreadCount, markRead } = useNotifications(!!user);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={`h-16 sticky top-0 z-40 backdrop-blur-xl border-b px-8 flex items-center justify-end ${isDark ? 'bg-slate-950/80 border-white/5' : 'bg-white/80 border-slate-100'}`}>
      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors relative overflow-hidden ${
            isDark ? 'bg-white/5 text-amber-400 hover:bg-white/10 hover:text-amber-300 shadow-lg shadow-amber-400/5' : 'bg-slate-50 text-indigo-500 hover:bg-slate-100 hover:text-indigo-600 shadow-sm'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDark ? 'dark' : 'light'}
              initial={{ y: -30, opacity: 0, rotate: -90 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 30, opacity: 0, rotate: 90 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 250, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
        {/* Wallet Balance */}
        {wallet && (
          <Link to="/shop/wallet" className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-xl border transition-all shadow-sm group ${isDark ? 'bg-emerald-950/30 border-emerald-900/50 hover:bg-emerald-900/40 shadow-emerald-500/5' : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50 shadow-emerald-500/5'}`}>
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform">
              <Wallet size={14} />
            </div>
            <div className="flex flex-col">
              <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Số dư ví</p>
              <p className={`text-[13px] font-black mt-0.5 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.availableBalance)}
              </p>
            </div>
          </Link>
        )}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative ${
              notifOpen ? 'bg-primary text-white shadow-lg shadow-primary/20 glow-blue' : isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className={`absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 ${isDark ? 'border-slate-950' : 'border-white'}`} />
            )}
          </button>

          {notifOpen && (
            <div className={`absolute top-full right-0 mt-4 w-80 rounded-3xl shadow-2xl border overflow-hidden ${isDark ? 'bg-slate-900/95 backdrop-blur-2xl border-white/10' : 'bg-white border-slate-100'}`}>
              <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-slate-800/80' : 'border-slate-50'}`}>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Thông báo</h3>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">{unreadCount} mới</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className={`p-8 text-center text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Không có thông báo mới</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-4 cursor-pointer border-b last:border-0 transition-colors ${isDark ? 'hover:bg-slate-800/80 border-white/10' : 'hover:bg-slate-50 border-slate-50'}`}>
                      <p className={`text-[13px] font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{n.title}</p>
                      <p className={`text-[12px] mt-1 line-clamp-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>{n.content}</p>
                      <p className={`text-[10px] mt-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{new Date(n.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userRef} className="relative">
          <button 
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`flex items-center gap-3 pl-1 pr-3 py-1 rounded-2xl transition-all border border-transparent ${isDark ? 'bg-white/5 hover:bg-white/10 hover:border-white/10' : 'bg-slate-50 hover:bg-slate-100 hover:border-slate-200'}`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-primary/20 glow-indigo">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="hidden md:block text-left">
              <p className={`text-[12px] font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.name || 'Shop Owner'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Đối tác</p>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className={`absolute top-full right-0 mt-4 w-60 rounded-3xl shadow-2xl border py-3 overflow-hidden ${isDark ? 'bg-slate-900/95 backdrop-blur-2xl border-white/10' : 'bg-white border-slate-100'}`}>
               {[
                { action: 'link', to: '/shop/profile', icon: Store, label: 'Thông tin cửa hàng' },
                { action: 'link', to: '/shop/messages', icon: MessageCircle, label: 'Tin nhắn' },
                { action: 'link', to: '/shop/dashboard', icon: BarChart3, label: 'Dashboard' },
                { action: 'link', to: '/shop/notifications', icon: Bell, label: 'Thông báo' },
              ].map((item, index) => (
                item.action === 'link' ? (
                <Link 
                  key={item.to} 
                  to={item.to!}
                  onClick={() => setUserMenuOpen(false)}
                  className={`flex items-center gap-3 px-5 py-2.5 text-[13px] font-bold transition-colors ${
                    isActive(item.to!) ? 'text-primary bg-primary/5 glow-text' : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <item.icon size={16} className={isActive(item.to!) ? 'text-primary' : 'text-slate-400'} />
                  {item.label}
                </Link>
                ) : (
                <button
                  key="notif"
                  onClick={() => { setUserMenuOpen(false); setNotifOpen(true); }}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-bold transition-colors text-left ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  <item.icon size={16} className="text-slate-400" />
                  {item.label}
                </button>
                )
              ))}
              <div className={`h-px my-2 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`} />
              <button 
                onClick={handleLogout}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-[13px] font-bold transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-500 hover:bg-rose-50'}`}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
