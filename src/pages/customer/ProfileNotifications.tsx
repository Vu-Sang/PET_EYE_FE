import React, { useState } from 'react';
import { Bell, CheckCheck, Loader2, AlertCircle, RefreshCw, BellOff, Inbox, Trash2 } from 'lucide-react';
import { useNotifications, type AppNotification } from '../../hooks/useNotifications';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

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
  onDelete 
}: { 
  notif: AppNotification; 
  onRead: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      onClick={() => !notif.isRead && onRead(notif.id)}
      className={`w-full text-left flex items-start gap-4 px-5 py-4 rounded-2xl transition-all group relative cursor-pointer
        ${notif.isRead
          ? 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800'
          : 'bg-blue-50/60 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-500/20'
        }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 transition-all
        ${notif.isRead
          ? 'bg-slate-100 dark:bg-slate-700 text-slate-400'
          : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
        }`}
      >
        <Bell className="w-4.5 h-4.5" size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-8">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${notif.isRead ? 'font-medium text-slate-700 dark:text-slate-300' : 'font-bold text-slate-900 dark:text-white'}`}>
            {notif.title}
          </p>
          {!notif.isRead && (
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {notif.content}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
          {formatNotifTime(notif.createdAt)}
        </p>
      </div>

      {/* Delete button shown on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif.id);
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Xóa thông báo"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'unread' | 'read';

export default function ProfileNotifications() {
  const [page, setPage] = useState(1);
  const { notifications, totalPages, unreadCount, isLoading, refetch, markRead, markAllRead, deleteRead, deleteSingle } = useNotifications(page);
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const grouped = groupByDate(filtered);

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Thông báo
            {unreadCount > 0 && (
              <span className="text-sm font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc.` : 'Tất cả thông báo đã được đọc.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#122143] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#122143]/20 hover:-translate-y-0.5 transition-all"
            >
              <CheckCheck className="w-4 h-4" />
              Đánh dấu tất cả đã đọc
            </button>
          )}
          {notifications.some(n => n.isRead) && (
            <button
              onClick={() => deleteRead()}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-600/20 hover:-translate-y-0.5 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Xóa thông báo đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
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
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                filter === t.key
                  ? t.key === 'unread' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
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
                <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
              </div>

              {/* Items */}
              <div className="flex flex-col gap-2">
                {group.items.map(n => (
                  <NotifItem key={n.id} notif={n} onRead={markRead} onDelete={deleteSingle} />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>

              <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPage(idx + 1)}
                    className={`w-10 h-10 flex-shrink-0 rounded-xl font-bold text-sm transition-all ${page === idx + 1
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
