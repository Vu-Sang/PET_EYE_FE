import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Store, Bell, LogOut, Menu, X, ChevronDown,
  Calendar, MessageCircle, Award,
  LayoutDashboard, UserCircle, Settings, Check, Clock, AlertCircle,
  Video
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, cb]);
}

export default function StaffNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);

  const notiRef = useRef<HTMLDivElement>(null);

  useOutsideClick(notiRef, () => setNotiOpen(false));

  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(!!user);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
    { label: 'Hồ sơ chuyên môn', path: '/staff/profile', icon: Award },
    { label: 'Tin nhắn', path: '/staff/messages', icon: MessageCircle },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-background-dark/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand */}
          <div className="flex items-center gap-6">
            <Link to="/staff/dashboard" className="flex items-center gap-3.5 group">
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-11 h-11 bg-gradient-to-br from-primary to-slate-700 rounded-[1rem] flex items-center justify-center shadow-lg shadow-primary/20 transition-all"
              >
                <Store className="text-white" size={22} />
              </motion.div>
              <div className="hidden sm:block">
                <p className="text-base font-black text-slate-900 dark:text-white leading-none tracking-tight">PetEye Staff</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Workspace v2.0</p>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const Active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${Active ? 'text-primary' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  {Active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-primary/5 rounded-2xl border border-primary/10"
                    />
                  )}
                  <item.icon size={16} className={Active ? 'text-primary' : 'text-slate-400'} />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: User Actions */}
          <div className="flex items-center gap-3">

            <div ref={notiRef} className="relative">
              <button
                onClick={() => { setNotiOpen(!notiOpen); }}
                className={`flex p-3 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all relative ${notiOpen ? 'bg-slate-50 text-primary' : ''}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notiOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed inset-x-4 top-20 sm:absolute sm:inset-auto sm:top-[calc(100%+12px)] sm:right-0 sm:w-[380px] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50"
                  >
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Thông báo</h4>
                      <button
                        onClick={() => markAllRead()}
                        className="text-[10px] font-black text-primary hover:underline"
                      >
                        Đọc tất cả ({unreadCount})
                      </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                          {notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => !n.isRead && markRead(n.id)}
                              className={`p-5 transition-colors cursor-pointer flex gap-4 ${n.isRead ? 'opacity-60' : 'bg-primary/[0.02] hover:bg-primary/[0.04]'}`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                                {n.isRead ? <Check size={18} /> : <AlertCircle size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm mb-1 line-clamp-2 ${n.isRead ? 'text-slate-500 font-medium' : 'text-slate-900 dark:text-white font-black'}`}>
                                  {n.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                                  {n.content}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Clock size={12} className="text-slate-300" />
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {format(parseISO(n.createdAt), 'HH:mm - dd/MM', { locale: vi })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-20 text-center">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                            <Bell size={32} />
                          </div>
                          <p className="text-sm font-bold text-slate-400 italic">Không có thông báo nào</p>
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="w-full py-3 text-[10px] text-center font-bold text-slate-300 uppercase tracking-widest border-t border-slate-100 dark:border-slate-800">
                        Hết thông báo
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block" />

            <div className="flex items-center gap-2 p-1.5 pr-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-black shadow-md shadow-primary/20">
                {user?.fullName?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="hidden lg:block text-left mr-2">
                <p className="text-[12px] font-black text-slate-900 dark:text-white leading-none">
                  {user?.fullName?.split(' ').pop() || 'Staff'}
                </p>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Nhân viên</p>
              </div>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden lg:block mx-1" />
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded-xl transition-all flex items-center gap-1.5 group"
              >
                <LogOut size={16} />
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 transition-colors"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
            >
              <div className="py-6 space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest ${isActive(item.path) ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
