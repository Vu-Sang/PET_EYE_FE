import React, { useState } from 'react';
import { Bell, CheckCheck, Loader2, AlertCircle, RefreshCw, BellOff, Trash2 } from 'lucide-react';
import { useNotifications, type AppNotification } from '../../hooks/useNotifications';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNotifTime(iso: string): string {
  try {
    const d = parseISO(iso);
    if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true, locale: vi });
    if (isYesterday(d)) return 'Hôm qua ' + format(d, 'HH:mm', { locale: vi });
    return format(d, 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch {
    return iso;
  }
}

function groupByDate(notifications: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const groups: Record<string, AppNotification[]> = {};
  for (const n of notifications) {
    try {
      const d = parseISO(n.createdAt);
      let key: string;
      if (isToday(d)) key = 'Hôm nay';
      else if (isYesterday(d)) key = 'Hôm qua';
      else key = format(d, 'dd/MM/yyyy', { locale: vi });
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    } catch {
      if (!groups['Khác']) groups['Khác'] = [];
      groups['Khác'].push(n);
    }
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotifItem({ 
  notif, 
  onRead, 
  onDelete,
  isDark
}: { 
  notif: AppNotification; 
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
  isDark: boolean;
}) {
  return (
    <div
      onClick={() => !notif.isRead && onRead(notif.id)}
      className={`w-full text-left flex items-start gap-4 px-5 py-4 rounded-2xl transition-all group relative cursor-pointer border
        ${notif.isRead
          ? (isDark ? 'bg-slate-800/30 border-transparent hover:bg-slate-800/60' : 'bg-white border-slate-100 hover:bg-slate-50')
          : (isDark ? 'bg-indigo-900/30 hover:bg-indigo-900/50 border-indigo-500/20 glow-indigo' : 'bg-blue-50 hover:bg-blue-100 border-blue-200')
        }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 transition-all
        ${notif.isRead
          ? (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')
          : (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-100 text-blue-600')
        }`}
      >
        <Bell className="w-4.5 h-4.5" size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${notif.isRead ? (isDark ? 'font-medium text-slate-300' : 'font-medium text-slate-700') : (isDark ? 'font-bold text-white' : 'font-bold text-slate-900')}`}>
            {notif.title}
          </p>
          {!notif.isRead && (
            <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${isDark ? 'bg-indigo-500 shadow-indigo-500/50' : 'bg-blue-500'}`} />
          )}
        </div>
        <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {notif.content}
        </p>
        <p className={`text-[10px] mt-2 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {formatNotifTime(notif.createdAt)}
        </p>
      </div>

      {/* Delete button shown on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif.id);
        }}
        className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 ${isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-950/30' : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50'}`}
        title="Xóa thông báo"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'unread' | 'read';

export default function ShopNotifications() {
  const { isDark } = useTheme();
  const { notifications, unreadCount, isLoading, refetch, markRead, markAllRead, deleteRead, deleteSingle } = useNotifications(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const grouped = groupByDate(filtered);

  return (
    <div className={`p-6 md:p-8 space-y-6 max-w-4xl mx-auto rounded-3xl m-6 animate-in fade-in duration-500 ${isDark ? 'admin-glass-card bg-slate-900/40 border border-white/10' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Thông báo
            {unreadCount > 0 && (
              <span className={`text-sm font-black px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-blue-600 text-white'}`}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc.` : 'Tất cả thông báo đã được đọc.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className={`p-2.5 rounded-xl border transition-all ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-bold text-xs transition-all hover:-translate-y-0.5 shadow-lg ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-[#122143] shadow-[#122143]/20'}`}
            >
              <CheckCheck className="w-4 h-4" />
              Đánh dấu tất cả đã đọc
            </button>
          )}
          {notifications.some(n => n.isRead) && (
            <button
              onClick={() => deleteRead()}
              className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-bold text-xs transition-all hover:-translate-y-0.5 shadow-lg ${isDark ? 'bg-rose-600/90 shadow-rose-600/20' : 'bg-rose-600 shadow-rose-600/20'}`}
            >
              <Trash2 className="w-4 h-4" />
              Xóa thông báo đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className={`flex gap-1 p-1 rounded-2xl w-fit ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
        {([
          { key: 'all' as FilterKey, label: 'Tất cả', count: notifications.length },
          { key: 'unread' as FilterKey, label: 'Chưa đọc', count: notifications.filter(n => !n.isRead).length },
          { key: 'read' as FilterKey, label: 'Đã đọc', count: notifications.filter(n => n.isRead).length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === t.key
                ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                filter === t.key
                  ? t.key === 'unread' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white') : (isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600')
                  : (isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-500')
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin text-[#122143]" />
          <p className="font-bold">Đang tải thông báo...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400 dark:text-slate-500">
          {filter === 'unread' ? (
            <>
              <CheckCheck className="w-12 h-12 opacity-30" />
              <p className="font-bold text-lg">Không có thông báo chưa đọc</p>
              <p className="text-sm">Bạn đã đọc hết rồi!</p>
            </>
          ) : (
            <>
              <BellOff className="w-12 h-12 opacity-30" />
              <p className="font-bold text-lg">Chưa có thông báo nào</p>
              <p className="text-sm">Thông báo từ hệ thống sẽ xuất hiện ở đây.</p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(group => (
            <div key={group.label}>
              {/* Date label */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {group.label}
                </span>
                <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
              </div>

              {/* Items */}
              <div className="flex flex-col gap-2">
                {group.items.map(n => (
                  <NotifItem key={n.id} notif={n} onRead={markRead} onDelete={deleteSingle} isDark={isDark} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
