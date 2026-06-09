import React, { useState } from 'react';
import { Bell, Send, X, Plus, Trash2, Users, Store, Globe, User, Search, CheckCircle, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/admin.service';
import type { NotificationType } from '../../services/admin.service';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

type TargetType = 'SINGLE' | 'ALL_USERS' | 'ALL_SHOPS' | 'ALL';

interface NotifForm {
  title: string;
  content: string;
  targetType: TargetType;
  notificationType: NotificationType;
  email: string;
}

const TARGET_OPTIONS: { value: TargetType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { value: 'ALL',       label: 'Tất cả',     desc: 'Toàn bộ người dùng',             icon: <Globe size={16} />,  color: 'bg-purple-600' },
  { value: 'ALL_USERS', label: 'Khách hàng', desc: 'Tất cả user có role USER',        icon: <Users size={16} />,  color: 'bg-blue-600' },
  { value: 'ALL_SHOPS', label: 'Cửa hàng',   desc: 'Tất cả user có role SHOP_OWNER', icon: <Store size={16} />,  color: 'bg-emerald-600' },
  { value: 'SINGLE',    label: 'Cá nhân',    desc: 'Gửi cho 1 người theo email',     icon: <User size={16} />,   color: 'bg-orange-500' },
];

const NOTIF_TYPE_OPTIONS_DARK: { value: NotificationType; label: string; color: string; bg: string }[] = [
  { value: 'GENERAL',   label: 'Chung',       color: 'text-slate-300',   bg: 'bg-slate-500/10' },
  { value: 'PROMOTION', label: 'Khuyến mãi',  color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  { value: 'REMINDER',  label: 'Nhắc nhở',    color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  { value: 'SYSTEM',    label: 'Hệ thống',    color: 'text-red-400',     bg: 'bg-red-500/10' },
  { value: 'BOOKING',   label: 'Booking',     color: 'text-blue-400',    bg: 'bg-blue-500/10' },
];

const NOTIF_TYPE_OPTIONS_LIGHT: { value: NotificationType; label: string; color: string; bg: string }[] = [
  { value: 'GENERAL',   label: 'Chung',       color: 'text-slate-600',   bg: 'bg-slate-100' },
  { value: 'PROMOTION', label: 'Khuyến mãi',  color: 'text-orange-600',  bg: 'bg-orange-100' },
  { value: 'REMINDER',  label: 'Nhắc nhở',    color: 'text-yellow-700',  bg: 'bg-yellow-100' },
  { value: 'SYSTEM',    label: 'Hệ thống',    color: 'text-red-600',     bg: 'bg-red-100' },
  { value: 'BOOKING',   label: 'Booking',     color: 'text-blue-600',    bg: 'bg-blue-100' },
];

const FILTER_OPTIONS_BASE = [{ value: '', label: 'Tất cả' }];
const EMPTY_FORM: NotifForm = { title: '', content: '', targetType: 'ALL', notificationType: 'GENERAL', email: '' };

export default function AdminNotifications() {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NotifForm>(EMPTY_FORM);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');

  const notifTypeOptions = isDark ? NOTIF_TYPE_OPTIONS_DARK : NOTIF_TYPE_OPTIONS_LIGHT;
  const FILTER_OPTIONS = [...FILTER_OPTIONS_BASE, ...notifTypeOptions.map(t => ({ value: t.value, label: t.label }))];

  function NotifTypeBadge({ type }: { type?: string }) {
    const opt = notifTypeOptions.find(t => t.value === type) ?? notifTypeOptions[0];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${opt.bg} ${opt.color}`}>
        <Tag size={10} />{opt.label}
      </span>
    );
  }

  const { data: pagedData, isLoading } = useQuery({
    queryKey: ['admin-notifications', page],
    queryFn: () => adminService.getNotifications(page),
  });

  const allBroadcasts = pagedData?.content ?? [];
  const broadcasts = typeFilter ? allBroadcasts.filter(b => b.notificationType === typeFilter) : allBroadcasts;
  const totalPages = pagedData?.totalPages ?? 0;
  const totalElements = pagedData?.totalElements ?? 0;

  const { data: users = [] } = useQuery({ queryKey: ['admin-members'], queryFn: adminService.getAllUsers });

  const createMutation = useMutation({
    mutationFn: () => {
      if (form.targetType === 'SINGLE') {
        const found = users.find(u => u.email.toLowerCase() === form.email.trim().toLowerCase());
        if (!found) throw new Error('EMAIL_NOT_FOUND');
        return adminService.createNotification({ title: form.title, content: form.content, targetType: 'SINGLE', notificationType: form.notificationType, userId: found.id });
      }
      return adminService.createNotification({ title: form.title, content: form.content, targetType: form.targetType, notificationType: form.notificationType });
    },
    onSuccess: (msg) => { toast.success(msg || 'Đã gửi thông báo'); qc.invalidateQueries({ queryKey: ['admin-notifications'] }); setForm(EMPTY_FORM); setShowForm(false); setPage(0); },
    onError: (err: any) => {
      if (err.message === 'EMAIL_NOT_FOUND') { toast.error('Không tìm thấy người dùng với email này'); return; }
      const code = err.response?.data?.code;
      if (code === 10010) toast.error('Người dùng không tồn tại');
      else toast.error('Gửi thất bại');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (broadcastId: string) => adminService.deleteNotification(broadcastId),
    onSuccess: () => { toast.success('Đã xóa thông báo'); qc.invalidateQueries({ queryKey: ['admin-notifications'] }); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const handleSend = () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Vui lòng điền tiêu đề và nội dung'); return; }
    if (form.targetType === 'SINGLE' && !form.email.trim()) { toast.error('Vui lòng nhập email người nhận'); return; }
    createMutation.mutate();
  };

  const emailSuggestions = form.targetType === 'SINGLE' && form.email.length > 1
    ? users.filter(u => u.email.toLowerCase().includes(form.email.toLowerCase())).slice(0, 5) : [];

  const formatDate = (s: string) => new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatTime = (s: string) => new Date(s).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Thông báo</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gửi thông báo đến người dùng và cửa hàng</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors glow-blue">
          <Plus size={16} /> Tạo thông báo
        </button>
      </div>

      <div className={`rounded-2xl p-5 flex items-center gap-4 ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
          <Bell size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        </div>
        <div>
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalElements}</p>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Tổng đợt gửi</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(f => (
          <button key={f.value} onClick={() => { setTypeFilter(f.value); setPage(0); }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              typeFilter === f.value
                ? (isDark ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 glow-blue' : 'bg-blue-600 text-white shadow-sm')
                : (isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className={`rounded-2xl flex items-center justify-center py-16 text-sm ${isDark ? 'admin-glass-card text-slate-500' : 'bg-white border border-slate-100 text-slate-400'}`}>Đang tải...</div>
        ) : broadcasts.length === 0 ? (
          <div className={`rounded-2xl flex flex-col items-center justify-center py-16 ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100'}`}>
            <Bell size={40} className={`mb-3 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Chưa có thông báo nào</p>
          </div>
        ) : (
          <>
            {broadcasts.map(b => (
              <div key={b.broadcastId} className={`rounded-2xl p-5 transition-all ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm hover:shadow-md'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                    <Bell size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <NotifTypeBadge type={b.notificationType} />
                        </div>
                        <p className={`font-bold text-sm leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>{b.title}</p>
                        <p className={`text-sm mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{b.content}</p>
                      </div>
                      <button onClick={() => deleteMutation.mutate(b.broadcastId)} disabled={deleteMutation.isPending}
                        className={`p-2 rounded-xl transition-colors shrink-0 disabled:opacity-50 ${isDark ? 'hover:bg-red-500/10 text-slate-600 hover:text-red-400' : 'hover:bg-red-50 text-slate-300 hover:text-red-400'}`}>
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className={`flex items-center gap-3 mt-3 pt-3 border-t flex-wrap ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
                      <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{formatTime(b.createdAt)}</span>
                        <span>•</span>
                        <span>{formatDate(b.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-3 ml-auto flex-wrap">
                        <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Đã gửi: <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{b.totalSent}</span>
                        </span>
                        <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          Đã đọc: <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{b.totalRead}</span>
                        </span>
                        {b.totalSent > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.round((b.totalRead / b.totalSent) * 100))}%` }} />
                            </div>
                            <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {Math.round((b.totalRead / b.totalSent) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Trang {page + 1} / {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 ${isDark ? 'border border-white/10 text-slate-400 hover:bg-white/5' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    <ChevronLeft size={13} /> Trước
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 ${isDark ? 'border border-white/10 text-slate-400 hover:bg-white/5' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    Sau <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className={`rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto admin-scrollbar ${isDark ? 'admin-glass-card bg-slate-900/95' : 'bg-white'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10 ${isDark ? 'bg-slate-900/95 border-white/5' : 'bg-white border-slate-100'}`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tạo thông báo mới</h3>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/5 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-3 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Gửi đến</label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, targetType: t.value, email: '' }))}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        form.targetType === t.value
                          ? (isDark ? 'border-blue-500/50 bg-blue-500/10' : 'border-blue-500 bg-blue-50')
                          : (isDark ? 'border-white/10 hover:border-white/20' : 'border-slate-200 hover:border-slate-300')
                      }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${form.targetType === t.value ? t.color : (isDark ? 'bg-slate-800 !text-slate-500' : 'bg-slate-100 !text-slate-500')}`}>
                        {t.icon}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${form.targetType === t.value ? (isDark ? 'text-blue-400' : 'text-blue-700') : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>{t.label}</p>
                        <p className={`text-[10px] leading-tight ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {form.targetType === 'SINGLE' && (
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Email người nhận</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Nhập email người nhận..."
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all ${isDark ? 'admin-glass-input' : 'border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'}`} />
                  </div>
                  {emailSuggestions.length > 0 && (
                    <div className={`mt-1 rounded-xl overflow-hidden ${isDark ? 'border border-white/10 divide-y divide-white/5' : 'border border-slate-200 divide-y divide-slate-50'}`}>
                      {emailSuggestions.map(u => (
                        <button key={u.id} onClick={() => setForm(f => ({ ...f, email: u.email }))}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                            {(u.fullName || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{u.fullName || '—'}</p>
                            <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{u.email}</p>
                          </div>
                          {u.email === form.email && <CheckCircle size={14} className="text-green-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-3 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Loại thông báo</label>
                <div className="flex gap-2 flex-wrap">
                  {notifTypeOptions.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, notificationType: t.value }))}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                        form.notificationType === t.value
                          ? (isDark ? `border-blue-500/50 ${t.bg} ${t.color}` : `border-blue-500 ${t.bg} ${t.color}`)
                          : (isDark ? 'border-white/10 text-slate-500 hover:border-white/20' : 'border-slate-200 text-slate-500 hover:border-slate-300')
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Tiêu đề</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nhập tiêu đề thông báo..."
                  className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all ${isDark ? 'admin-glass-input' : 'border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'}`} />
              </div>

              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Nội dung</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Nhập nội dung thông báo..." rows={4}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all resize-none ${isDark ? 'admin-glass-input' : 'border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'}`} />
              </div>

              <div className={`flex gap-3 pt-1 border-t ${isDark ? 'border-white/5' : ''}`}>
                <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${isDark ? 'border border-white/10 text-slate-400 hover:bg-white/5' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  Hủy
                </button>
                <button onClick={handleSend} disabled={createMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 glow-blue">
                  <Send size={15} />{createMutation.isPending ? 'Đang gửi...' : 'Gửi ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
