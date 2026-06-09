import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, Calendar, Package, Video, Users as UsersIcon, Sparkles, Star, MessageCircle, Store, ChevronRight, Wallet, Sun, Moon, PanelLeft, PanelLeftClose
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../../contexts/ThemeContext';

const navItems = [
  { label: 'Dashboard', path: '/shop/dashboard', icon: BarChart3 },
  { label: 'Lịch đặt hẹn', path: '/shop/bookings', icon: Calendar },
  { label: 'Dịch vụ', path: '/shop/services', icon: Package },
  { label: 'Ví của tôi', path: '/shop/wallet', icon: Wallet },
  { label: 'Camera', path: '/shop/camera', icon: Video },
  { label: 'Nhân viên', path: '/shop/staff', icon: UsersIcon },
  { label: 'Khách hàng', path: '/shop/customers', icon: UsersIcon },
  { label: 'Đánh giá', path: '/shop/reviews', icon: Star },
  { label: 'Tin nhắn', path: '/shop/messages', icon: MessageCircle },
  { label: 'AI Assistant', path: '/shop/ai-assistant', icon: Sparkles, highlight: true },
];

export default function ShopSidebar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const isActive = (path: string) => location.pathname === path;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('peteye-shop-sidebar') === 'collapsed'; } catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem('peteye-shop-sidebar', isCollapsed ? 'collapsed' : 'expanded');
  }, [isCollapsed]);

  return (
    <aside className={`h-screen sticky top-0 border-r flex flex-col z-50 transition-all duration-300 ${isCollapsed ? 'w-[88px]' : 'w-72'} ${isDark ? 'bg-slate-950/80 backdrop-blur-xl border-white/5' : 'bg-white border-slate-100'}`}>
      {/* Logo Section */}
      <div className={`p-5 flex items-center ${isCollapsed ? 'justify-center px-3' : ''}`}>
        <Link to="/shop/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1a2b4c] to-indigo-600 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 glow-indigo">
            <Store className="text-white" size={20} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className={`text-base font-black tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>Peteye</h1>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] truncate">Partner</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 flex flex-col overflow-y-auto scrollbar-hide py-2 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : undefined}
              className={`shrink-0 my-auto group flex items-center transition-all relative ${
                isCollapsed ? 'justify-center w-11 h-11 mx-auto rounded-full' : 'justify-between px-4 py-2.5 rounded-2xl'
              } ${
                active 
                  ? isDark 
                    ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border border-blue-500/20 glow-blue' 
                    : 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                  : isDark
                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'gap-0' : 'gap-3.5'}`}>
                <div className={`transition-transform shrink-0 group-hover:scale-110 ${active ? (isDark ? 'text-blue-400' : 'text-white') : 'text-slate-400'}`}>
                  <Icon size={20} />
                </div>
                {!isCollapsed && <span className="text-[13.5px] font-bold tracking-tight truncate">{item.label}</span>}
              </div>
              
              {!isCollapsed && active && (
                <motion.div 
                  layoutId="active-indicator"
                  className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-indigo-400'}`} 
                />
              )}
              
              {!isCollapsed && !active && item.highlight && (
                <Sparkles size={12} className="text-indigo-500 animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle & Profile */}
      <div className={`p-3 border-t flex flex-col gap-1.5 ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          title={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${isCollapsed ? 'justify-center' : ''} ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
        >
          {isCollapsed ? <PanelLeft size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}
          {!isCollapsed && <span className="truncate">Thu gọn sidebar</span>}
        </button>

        <Link 
          to="/shop/profile"
          title={isCollapsed ? 'Cửa hàng của tôi' : undefined}
          className={`flex items-center p-2.5 rounded-2xl transition-colors group ${isCollapsed ? 'justify-center' : 'justify-between'} ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden border ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
               <UsersIcon className="text-slate-400" size={18} />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className={`text-[12px] font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>Cửa hàng của tôi</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">Xem hồ sơ công khai</p>
              </div>
            )}
          </div>
          {!isCollapsed && <ChevronRight size={16} className="text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />}
        </Link>
      </div>
    </aside>
  );
}
