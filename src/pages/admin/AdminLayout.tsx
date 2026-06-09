import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { walletService, type WithdrawalRequestResponse } from '../../services/wallet.service';
import { useNotifications, type AppNotification } from '../../hooks/useNotifications';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Store, Users, Bell, MessageCircle,
  LogOut, Menu, ChevronRight, Shield, Sparkles, Wallet,
  Scan, X, Building2, CreditCard, Loader2, Ticket,
  Sun, Moon, ChevronLeft, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Quản lý Shop', path: '/admin/shops', icon: Store },
  { label: 'Quản lý Member', path: '/admin/members', icon: Users },
  { label: 'Quản lý Voucher', path: '/admin/vouchers', icon: Ticket },
  { label: 'Rút tiền', path: '/admin/withdrawals', icon: Wallet },
  { label: 'Thông báo', path: '/admin/notifications', icon: Bell },
  { label: 'Tin nhắn', path: '/admin/messages', icon: MessageCircle },
  { label: 'AI Assistant', path: '/admin/ai-assistant', icon: Sparkles },
];

function AdminLayoutInner() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('peteye-admin-sidebar') === 'collapsed'; } catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem('peteye-admin-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  // Pending refund modal state
  const [showPendingRefundModal, setShowPendingRefundModal] = useState(false);

  const { notifications = [], isLoading: loadingRefundNotifications, markRead } = useNotifications(user?.role === 'ADMIN');
  const refundNotifications = notifications.filter(n =>
    !n.isRead && /(yêu cầu hoàn tiền|hoàn tiền khách hàng)/i.test(`${n.title} ${n.content}`)
  );
  const refundNotification = refundNotifications.length > 0 ? refundNotifications[0] : null;

  const confirmManualMutation = useMutation({
    mutationFn: (id: number) => walletService.confirmWithdrawal(id),
    onSuccess: () => {
      toast.success('Đã xác nhận chuyển khoản thủ công.');
      queryClient.invalidateQueries({ queryKey: ['admin-pending-refunds-global'] });
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setShowPendingRefundModal(false);
    },
    onError: () => {
      toast.error('Xác nhận thất bại. Vui lòng thử lại.');
    },
  });

  const confirmRefundMutation = useMutation({
    mutationFn: (bookingId: number) => walletService.confirmRefundForBooking(bookingId),
    onSuccess: () => {
      toast.success('Đã hoàn tiền cho khách và cập nhật ví shop.');
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-refunds-global'] });
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setShowPendingRefundModal(false);
    },
    onError: () => {
      toast.error('Hoàn tiền thất bại. Kiểm tra số dư shop hoặc thử lại.');
    }
  });

  // Fetch pending withdrawals (refund requests) so admin sees modal on login
  const { data: pendingRefunds = [], isLoading: loadingPendingRefunds } = useQuery({
    queryKey: ['admin-pending-refunds-global'],
    queryFn: () => walletService.getAllWithdrawals('PENDING'),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  });

  const pendingRequest = pendingRefunds.length > 0 ? pendingRefunds[0] : null;

  useEffect(() => {
    // Disabled auto-popup as requested by user
    // if (!loadingPendingRefunds && pendingRefunds.length > 0) {
    //   setShowPendingRefundModal(true);
    // } else if (!loadingRefundNotifications && refundNotifications.length > 0) {
    //   setShowPendingRefundModal(true);
    // }
  }, [loadingPendingRefunds, pendingRefunds, loadingRefundNotifications, refundNotifications.length]);

  function buildQRPattern(seed: number) {
    let value = seed;
    const rand = () => {
      value = (value * 9301 + 49297) % 233280;
      return value / 233280;
    };
    return Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => rand() > 0.45));
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  }

  // ─── Refund Alert Modal (Withdrawal PENDING) ──────────────────────────────────
  function RefundAlertModal({ request, onClose }: { request: WithdrawalRequestResponse; onClose: () => void }) {
    const qrPattern = useMemo(() => buildQRPattern(request.id + request.amount), [request.id, request.amount]);
    const qrText = `Ngân hàng:${request.bankName}|TK:${request.bankAccount}|Chủ:${request.accountHolder}`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <div className="admin-glass-card bg-slate-900/95 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-100 font-bold mb-2">Yêu cầu hoàn tiền mới</p>
              <h2 className="text-2xl font-bold text-white">Có yêu cầu hoàn tiền chờ xử lý</h2>
              <p className="mt-2 text-sm text-emerald-100/85 max-w-2xl">Bên trái là thông tin chi tiết, bên phải là QR giả. Quét hoặc nhấn hoàn thành để cập nhật ví shop.</p>
            </div>
            <button onClick={onClose} className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition">✕</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 p-8">
            <div className="space-y-5">
              <div className="rounded-2xl admin-glass-card p-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-1">Shop / Khách hàng</p>
                    <p className="text-xl font-bold text-white">{request.shopName || request.accountHolder}</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-emerald-400">Số tiền</p>
                    <p className="text-2xl font-bold text-emerald-300">{fmt(request.amount)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Ngân hàng', value: request.bankName },
                  { label: 'Số tài khoản', value: request.bankAccount },
                  { label: 'Chủ tài khoản', value: request.accountHolder },
                  { label: 'Ngày tạo', value: request.createdAt },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl admin-glass-card p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-200 break-words">{item.value}</p>
                  </div>
                ))}
              </div>

              {request.note && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-400 mb-2">Ghi chú</p>
                  <p className="text-sm text-slate-300">{request.note}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl admin-glass-card p-6 flex flex-col items-center gap-5">
              <div className="w-full rounded-2xl bg-slate-950/95 p-5 flex flex-col items-center gap-3">
                <div className="grid grid-cols-12 gap-1">
                  {qrPattern.flatMap((row, rowIndex) =>
                    row.map((active, colIndex) => (
                      <div key={`${rowIndex}-${colIndex}`} className={`w-2 h-2 sm:w-3 sm:h-3 ${active ? 'bg-white' : 'bg-slate-800'} rounded-sm`} />
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 text-center">QR code giả để demo thao tác quét thành công.</p>
              </div>

              <button
                type="button"
                onClick={() => request && confirmManualMutation.mutate(request.id)}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${confirmManualMutation.isPending ? 'bg-slate-700 text-slate-300 cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-500 glow-blue'}`}
                disabled={confirmManualMutation.isPending}
              >
                {confirmManualMutation.isPending ? 'Đang xử lý...' : 'Quét QR giả'}
              </button>

              <div className="w-full rounded-2xl admin-glass-card p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Nội dung QR</p>
                <div className="text-xs font-semibold text-slate-300 break-words leading-5">{qrText}</div>
              </div>

              <div className="w-full rounded-2xl admin-glass-card p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Thông tin chuyển khoản</p>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">Ngân hàng: {request.bankName}</p>
                  <p className="text-sm text-slate-400">STK: {request.bankAccount}</p>
                  <p className="text-sm text-slate-400">Tên người nhận: {request.accountHolder}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center">Nhấn Quét QR giả để xử lý chuyển tiền và trừ tiền shop theo đơn.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 p-6 border-t border-white/5">
            <button onClick={onClose} className="px-5 py-3 rounded-2xl border border-white/10 text-slate-300 bg-slate-900 hover:bg-slate-800 transition">
              Đóng
            </button>
            <button
              onClick={() => request && confirmManualMutation.mutate(request.id)}
              disabled={confirmManualMutation.isPending}
              className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition disabled:opacity-60 glow-emerald"
            >
              {confirmManualMutation.isPending ? 'Đang xác nhận...' : 'Hoàn thành và cập nhật ví'}
            </button>
            <Link
              to="/admin/withdrawals"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition glow-indigo"
            >
              Xem chi tiết yêu cầu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Parse refund notification content ────────────────────────────────────────
  function parseRefundNotification(content: string) {
    const result = {
      orderId: '',
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      customer: '',
      amount: '',
    };
    const orderMatch = content.match(/Đơn hủy.*#(\d+)/i);
    if (orderMatch) result.orderId = orderMatch[1];
    const customerMatch = content.match(/khách hàng\s+([^|]+?)\s+về:/i);
    if (customerMatch) result.customer = customerMatch[1].trim();
    const bankMatch = content.match(/về:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([0-9]+)/i);
    if (bankMatch) {
      result.bankName = bankMatch[1].trim();
      result.accountHolder = bankMatch[2].trim();
      result.accountNumber = bankMatch[3].trim();
    }
    const amountMatch = content.match(/Số tiền:\s*([^\.]+)/i);
    if (amountMatch) result.amount = amountMatch[1].trim();
    return result;
  }

  // ─── Refund Notification Modal ────────────────────────────────────────────────
  function RefundNotificationModal({ notifications, onClose }: { notifications: AppNotification[]; onClose: () => void }) {
    const [selectedNotifId, setSelectedNotifId] = useState<number | null>(notifications.length === 1 ? notifications[0].id : null);
    const [isScanning, setIsScanning] = useState(false);

    const notification = notifications.find(n => n.id === selectedNotifId) || null;
    const parsed = notification ? parseRefundNotification(notification.content) : null;
    const qrPattern = useMemo(() => buildQRPattern(notification?.id || 0), [notification?.id]);

    const handleSimulateQRScan = async () => {
      if (!notification || !parsed) return;
      setIsScanning(true);
      setTimeout(async () => {
        setIsScanning(false);
        const bookingId = parsed.orderId ? Number(parsed.orderId) : NaN;
        try {
          if (!isNaN(bookingId)) {
            await confirmRefundMutation.mutateAsync(bookingId);
          }
          markRead(notification.id);
          toast.success('Đã hoàn thành yêu cầu hoàn tiền.');
          onClose();
        } catch (error) {
          // error already handled by mutation onError
        }
      }, 1500);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="admin-glass-card bg-slate-900/95 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">

          {/* Decorative background blur */}
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-pink-500/10 to-rose-500/10 blur-3xl rounded-full -translate-y-1/2 pointer-events-none" />

          {/* Header */}
          <div className="relative shrink-0 px-8 py-6 flex items-start justify-between gap-4 border-b border-white/5 z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg text-white glow-rose">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-rose-400 font-bold mb-1">Xác nhận hoàn tiền</p>
                {notifications.length > 1 ? (
                  <div className="flex items-center gap-3 mt-1">
                    <h2 className="text-xl font-bold text-white">Yêu cầu đang chờ</h2>
                    <div className="flex items-center gap-1.5 bg-rose-500 text-white px-3 py-1 rounded-full shadow-lg animate-pulse glow-rose">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span className="font-bold text-sm">{notifications.length}</span>
                    </div>
                  </div>
                ) : (
                  <h2 className="text-xl font-bold text-white">Yêu cầu hoàn tiền khách hàng</h2>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 flex items-center justify-center transition-all duration-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-8 relative z-10 admin-scrollbar">
            {notifications.length > 1 && (
              <div className="mb-8 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 relative overflow-hidden">
                <label className="block text-[11px] font-bold text-rose-400 uppercase tracking-widest mb-3 relative z-10">
                  Vui lòng chọn 1 trong {notifications.length} yêu cầu để xử lý
                </label>
                <select
                  className="w-full relative z-10 bg-slate-900 border border-rose-500/20 rounded-xl px-4 py-3.5 text-sm font-semibold text-white focus:ring-4 focus:ring-rose-500/20 outline-none transition"
                  value={selectedNotifId || ''}
                  onChange={e => setSelectedNotifId(Number(e.target.value))}
                >
                  <option value="" disabled>-- Vui lòng chọn 1 yêu cầu --</option>
                  {notifications.map(n => {
                    const p = parseRefundNotification(n.content);
                    return (
                      <option key={n.id} value={n.id}>
                        Đơn #{p.orderId || '?'} - Khách: {p.customer || '?'} - Số tiền: {p.amount || '?'}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {notification && parsed ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Left Column: Order Details */}
                <div className="space-y-6">
                  <div className="rounded-2xl admin-glass-card p-6 transition-all duration-300 hover:shadow-md">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3 font-semibold">Thông tin đơn hủy</p>
                    <p className="text-lg font-bold text-white mb-2 leading-tight">{notification.title}</p>
                    <p className="text-sm text-slate-400 whitespace-pre-line leading-relaxed">{notification.content}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Mã đơn hủy', value: parsed.orderId || 'Chưa có', icon: <LayoutDashboard className="w-4 h-4 text-slate-500" /> },
                      { label: 'Khách hàng', value: parsed.customer || 'Chưa có', icon: <Users className="w-4 h-4 text-slate-500" /> },
                      { label: 'Ngân hàng', value: parsed.bankName || 'Chưa có', icon: <Building2 className="w-4 h-4 text-slate-500" /> },
                      { label: 'Số tài khoản', value: parsed.accountNumber || 'Chưa có', icon: <CreditCard className="w-4 h-4 text-slate-500" /> },
                    ].map((item, i) => (
                      <div key={i} className="rounded-2xl admin-glass-card p-4 hover:border-rose-500/20 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          {item.icon}
                          <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-semibold">{item.label}</p>
                        </div>
                        <p className="text-sm font-semibold text-white break-words">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: QR Scanner Simulator */}
                <div className="flex flex-col items-center justify-center relative">
                  <div className={`w-full max-w-[280px] aspect-square rounded-3xl p-6 bg-slate-950 shadow-2xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${isScanning ? 'scale-[1.02] ring-4 ring-rose-500/30' : ''}`}>

                    {/* Scanner Animation Overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-rose-500/10 z-20 flex flex-col items-center justify-center">
                        <div className="w-full h-1 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-[scan_1.5s_ease-in-out_infinite]" />
                        <Loader2 className="w-8 h-8 text-rose-500 animate-spin absolute" />
                      </div>
                    )}

                    {/* Simulated QR Code */}
                    <div className="w-full h-full grid grid-cols-12 gap-1 opacity-80">
                      {qrPattern.flatMap((row, rowIndex) =>
                        row.map((active, colIndex) => (
                          <div key={`${rowIndex}-${colIndex}`} className={`w-full h-full rounded-sm ${active ? 'bg-white' : 'bg-transparent'}`} />
                        ))
                      )}
                    </div>

                    <div className="absolute bottom-4 left-0 w-full text-center z-10">
                      <span className="bg-slate-900/90 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm text-slate-300 backdrop-blur-md">
                        {parsed.amount || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 w-full max-w-[280px]">
                    <button
                      type="button"
                      onClick={handleSimulateQRScan}
                      disabled={isScanning || confirmRefundMutation.isPending}
                      className="w-full relative group overflow-hidden rounded-2xl p-[1px]"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative bg-slate-900 px-6 py-4 rounded-[15px] flex items-center justify-center gap-2 transition-all duration-300 group-hover:bg-opacity-0">
                        {confirmRefundMutation.isPending || isScanning ? (
                          <Loader2 className="w-5 h-5 animate-spin text-rose-500 group-hover:text-white" />
                        ) : (
                          <Scan className="w-5 h-5 text-rose-500 group-hover:text-white transition-colors" />
                        )}
                        <span className="font-semibold text-white group-hover:text-white transition-colors">
                          {isScanning ? 'Đang quét...' : confirmRefundMutation.isPending ? 'Đang xử lý...' : 'Quét QR & Hoàn tiền'}
                        </span>
                      </div>
                    </button>
                    <p className="text-[11px] text-center text-slate-500 mt-4 leading-relaxed px-4">
                      Hệ thống sẽ tự động hoàn tất và trừ tiền từ ví Shop tương ứng.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-white/5 rounded-3xl">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center shadow-sm mb-4">
                  <Scan className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-300 mb-2">Chưa chọn yêu cầu</h3>
                <p className="text-sm text-slate-500 text-center max-w-md">
                  Vui lòng chọn một yêu cầu hoàn tiền từ danh sách phía trên để xem chi tiết thông tin chuyển khoản và quét mã QR.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Custom Keyframes for Scanner */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scan {
            0%, 100% { transform: translateY(-100px); }
            50% { transform: translateY(100px); }
          }
        `}} />
      </div>
    );
  }

  if (user?.role !== 'ADMIN') return <Navigate to="/" />;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  // ─── Sidebar Content ────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg glow-indigo shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="sidebar-text-transition">
            <p className="text-sm font-bold text-white leading-none">Peteye Admin</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Quản trị hệ thống</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto admin-scrollbar">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              title={sidebarCollapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all group
                ${active
                  ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border border-blue-500/20 glow-blue'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon size={18} className={`shrink-0 ${active ? 'text-blue-400' : ''}`} />
              {!sidebarCollapsed && <span className="flex-1 sidebar-text-transition">{label}</span>}
              {!sidebarCollapsed && active && <ChevronRight size={14} className="opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle + Collapse toggle */}
      <div className="px-2 py-2 border-t border-white/5 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all w-full ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          {isDark ? <Sun size={18} className="shrink-0 text-amber-400" /> : <Moon size={18} className="shrink-0 text-indigo-400" />}
          {!sidebarCollapsed && <span className="sidebar-text-transition">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(prev => !prev)}
          title={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          className={`hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all w-full ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          {sidebarCollapsed ? <PanelLeft size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}
          {!sidebarCollapsed && <span className="sidebar-text-transition">{sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}</span>}
        </button>
      </div>

      {/* User + Logout */}
      <div className="px-2 py-3 border-t border-white/5 space-y-1">
        <div className={`flex items-center gap-3 px-3 py-2.5 mb-1 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 sidebar-text-transition">
              <p className="text-[13px] font-semibold text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email || ''}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={sidebarCollapsed ? 'Đăng xuất' : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="sidebar-text-transition">Đăng xuất</span>}
        </button>
      </div>
    </div>
  );

  // Determine theme-based classes
  const themeClasses = isDark
    ? 'admin-bg-mesh text-slate-200'
    : 'bg-[#f8fafc] text-slate-900';

  const bannerClasses = isDark
    ? 'bg-rose-500/10 border-l-4 border-rose-500 text-rose-300'
    : 'bg-rose-50 border-l-4 border-rose-500 text-rose-700';

  return (
    <>
      {showPendingRefundModal && pendingRequest && (
        <RefundAlertModal request={pendingRequest} onClose={() => setShowPendingRefundModal(false)} />
      )}
      {showPendingRefundModal && !pendingRequest && refundNotifications.length > 0 && (
        <RefundNotificationModal
          notifications={refundNotifications}
          onClose={() => { setShowPendingRefundModal(false); }}
        />
      )}
      <div className={`flex h-screen overflow-hidden ${themeClasses}`}>
        {/* Desktop Sidebar */}
        <aside className={`hidden lg:flex flex-col shrink-0 sidebar-transition ${isDark ? 'bg-slate-950/80 backdrop-blur-xl border-r border-white/5' : 'bg-[#0f172a]'} ${sidebarCollapsed ? 'w-[68px]' : 'w-[220px]'}`}>
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className={`w-72 flex flex-col h-full ${isDark ? 'bg-slate-950/95 backdrop-blur-xl' : 'bg-[#0f172a]'}`}>
              <SidebarContent />
            </div>
            <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile topbar */}
          <div className={`lg:hidden flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'bg-slate-950/80 border-white/5' : 'bg-white border-slate-100'}`}>
            <button onClick={() => setMobileOpen(true)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-blue-500" />
              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Peteye Admin</span>
            </div>
            <button onClick={toggleTheme} className={`ml-auto p-2 rounded-lg ${isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
            </button>
          </div>

          {/* Top banner for pending refunds */}
          {pendingRefunds && pendingRefunds.length > 0 && (
            <div className={`${bannerClasses} p-3 m-4 rounded-xl flex items-center justify-between gap-4`}>
              <div>
                <p className="text-sm font-bold">Có {pendingRefunds.length} yêu cầu rút tiền chờ xử lý</p>
                <p className="text-xs opacity-80">Yêu cầu mới nhất từ: <span className="font-semibold">{pendingRequest?.shopName || pendingRequest?.accountHolder}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowPendingRefundModal(true)} className="px-3 py-2 rounded-xl bg-rose-600 text-white font-semibold text-sm glow-rose">Xem</button>
                <Link to="/admin/withdrawals" className={`px-3 py-2 rounded-xl border text-sm font-semibold ${isDark ? 'border-rose-500/30 text-rose-300' : 'border-rose-200 text-rose-700'}`}>Quản lý</Link>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-y-auto admin-scrollbar">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout() {
  return (
    <ThemeProvider>
      <AdminLayoutInner />
    </ThemeProvider>
  );
}
