import React, { useEffect } from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine, CheckCircle2, XCircle, Clock, Loader2,
  Building2, CreditCard, User, ChevronRight, Store,
  RefreshCw, Search, ExternalLink, X, Info, AlertCircle, MessageCircle
} from 'lucide-react';
import { walletService, type WithdrawalRequestResponse } from '../../services/wallet.service';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';
import { adminService } from '../../services/admin.service';
import { bookingService } from '../../services/booking.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function formatDate(s: string) {
  try { return format(parseISO(s.replace(' ', 'T')), 'dd/MM/yyyy HH:mm', { locale: vi }); }
  catch { return s; }
}

function statusMeta(status: string, isDark: boolean) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = isDark ? {
    PENDING:  { label: 'Chờ duyệt',  color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',     icon: <Clock className="w-3.5 h-3.5" /> },
    PAYING:   { label: 'Đang chuyển', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',       icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    APPROVED: { label: 'Đã duyệt',   color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    REJECTED: { label: 'Từ chối',    color: 'bg-red-500/10 text-red-400 border border-red-500/20',            icon: <XCircle className="w-3.5 h-3.5" /> },
    EXPIRED:  { label: 'Hết hạn',    color: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',      icon: <Clock className="w-3.5 h-3.5" /> },
  } : {
    PENDING:  { label: 'Chờ duyệt',  color: 'bg-amber-100 text-amber-700',     icon: <Clock className="w-3.5 h-3.5" /> },
    PAYING:   { label: 'Đang chuyển', color: 'bg-blue-100 text-blue-700',       icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    APPROVED: { label: 'Đã duyệt',   color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    REJECTED: { label: 'Từ chối',    color: 'bg-red-100 text-red-600',          icon: <XCircle className="w-3.5 h-3.5" /> },
    EXPIRED:  { label: 'Hết hạn',    color: 'bg-slate-100 text-slate-500',      icon: <Clock className="w-3.5 h-3.5" /> },
  };
  return map[status] ?? map.PENDING;
}

// ─── PayOS Modal ──────────────────────────────────────────────────────────────

function PayOSModal({ request, checkoutUrl, onConfirm, onClose, confirming }: {
  request: WithdrawalRequestResponse;
  checkoutUrl: string;
  onConfirm: () => void;
  onClose: () => void;
  confirming: boolean;
}) {
  const { isDark } = useTheme();
  const [opened, setOpened] = useState(false);

  const handleOpenPayOS = () => {
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    setOpened(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isDark ? 'admin-glass-card bg-slate-900/95' : 'bg-white'}`}>
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Chuyển tiền qua PayOS</h3>
            <p className="text-emerald-100 text-xs mt-0.5">{request.shopName} — {formatVND(request.amount)}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: <Building2 className="w-4 h-4" />, label: 'Ngân hàng', value: request.bankName },
              { icon: <CreditCard className="w-4 h-4" />, label: 'Số tài khoản', value: request.bankAccount },
              { icon: <User className="w-4 h-4" />, label: 'Chủ tài khoản', value: request.accountHolder },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-3 p-3 rounded-2xl ${isDark ? 'bg-white/[0.03] border border-white/5' : 'bg-slate-50'}`}>
                <span className="text-slate-400">{item.icon}</span>
                <div>
                  <p className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={`p-4 rounded-2xl text-center ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Số tiền chuyển</p>
            <p className={`text-3xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{formatVND(request.amount)}</p>
          </div>

          <div className="space-y-2">
            <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${opened ? (isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50') : (isDark ? 'border-white/5' : 'border-slate-100')}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${opened ? 'bg-emerald-500 text-white' : (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500')}`}>
                {opened ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Mở PayOS và hoàn tất chuyển khoản</p>
            </div>
            <div className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${opened ? (isDark ? 'border-blue-500/20 bg-blue-500/5' : 'border-blue-200 bg-blue-50') : (isDark ? 'border-white/5 opacity-50' : 'border-slate-100 opacity-50')}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${opened ? 'bg-blue-500 text-white' : (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-500')}`}>2</div>
              <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Xác nhận đã chuyển tiền thành công</p>
            </div>
          </div>

          <div className={`flex items-start gap-2 p-3 rounded-2xl border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
              Chỉ nhấn "Xác nhận đã chuyển" sau khi PayOS báo thanh toán thành công.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleOpenPayOS} className={`flex-1 py-3 rounded-2xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-[#1a2b4c] text-white hover:bg-[#243a60]'}`}>
              <ExternalLink className="w-4 h-4" />{opened ? 'Mở lại PayOS' : 'Mở PayOS'}
            </button>
            <button onClick={onConfirm} disabled={!opened || confirming}
              className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 glow-emerald">
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Xác nhận đã chuyển
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ request, onClose, onApprove, onReject, approving, rejecting }: {
  request: WithdrawalRequestResponse;
  onClose: () => void;
  onApprove: (id: number, note: string, type: string) => void;
  onReject: (id: number, note: string, type: string) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const { isDark } = useTheme();
  const [adminNote, setAdminNote] = useState('');
  const meta = statusMeta(request.status, isDark);

  const requestBankInfoMutation = useMutation({
    mutationFn: async (req: WithdrawalRequestResponse) => {
      if (!req.userEmail) return Promise.reject('Không có email khách hàng');
      
      let extraInfo = '';
      if (req.type === 'REFUND') {
        try {
          const booking = await bookingService.getBookingById(req.id);
          const servicesList = booking.services?.map(s => s.name).join(', ') || 'Không rõ';
          const petName = booking.pet?.name || 'Không rõ';
          extraInfo = `🐾 Thú cưng: ${petName}\n✂️ Dịch vụ: ${servicesList}\n`;
        } catch (e) {
          console.warn('Could not fetch booking details for refund notification', e);
        }
      }

      const content = `🚨 [HỆ THỐNG] YÊU CẦU THÔNG TIN HOÀN TIỀN\n\nBạn có một đơn đã bị hủy cần được hoàn tiền 100% (Mã đơn: #${req.id})\n\n📋 THÔNG TIN CHI TIẾT:\n${extraInfo}📝 Lý do hủy: ${req.note || 'Không rõ'}\n🕒 Thời gian hủy: ${formatDate(req.createdAt)}\n\n💳 Vui lòng cung cấp thông tin ngân hàng của bạn ngay tại khung chat này (Bao gồm: Tên Ngân Hàng, Số Tài Khoản, Tên Chủ Tài Khoản) để chúng tôi có thể xử lý hoàn tiền cho bạn một cách nhanh nhất.\n\nXin chân thành cảm ơn! 💖`;
      
      return adminService.sendChatMessage({
        shopId: 0,
        channelType: 'CUSTOMER_CHAT',
        recipientEmail: req.userEmail,
        content
      });
    },
    onSuccess: () => {
      toast.success('Đã gửi tin nhắn yêu cầu thông tin ngân hàng cho khách hàng.');
    },
    onError: () => {
      toast.error('Gửi tin nhắn thất bại.');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto admin-scrollbar ${isDark ? 'admin-glass-card bg-slate-900/95' : 'bg-white'}`}>
        <div className={`px-6 py-5 sticky top-0 z-10 ${isDark ? 'bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/5' : 'bg-gradient-to-r from-[#1a2b4c] to-slate-700'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">Chi tiết yêu cầu rút tiền</h3>
              <p className="text-slate-300 text-xs mt-0.5">#{request.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${meta.color}`}>
                {meta.icon}{meta.label}
              </span>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className={`flex items-center gap-3 p-4 rounded-2xl ${isDark ? 'bg-white/[0.03] border border-white/5' : 'bg-slate-50'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Cửa hàng</p>
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{request.shopName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-teal-50 border border-teal-100'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-400' : 'text-teal-600'}`}>Số tiền</p>
              <p className={`text-xl font-bold ${isDark ? 'text-emerald-300' : 'text-teal-700'}`}>{formatVND(request.amount)}</p>
            </div>
            <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-slate-50'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ngày tạo</p>
              <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatDate(request.createdAt)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Thông tin ngân hàng</p>
            {!request.bankName || request.bankName.trim() === '' ? (
              <div className={`p-4 rounded-xl flex items-center justify-between ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Khách hàng chưa cung cấp thông tin</p>
                {request.type === 'REFUND' && request.userId && (
                  <button 
                    onClick={() => requestBankInfoMutation.mutate(request)}
                    disabled={requestBankInfoMutation.isPending}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {requestBankInfoMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    Nhắn tin yêu cầu
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { icon: <Building2 className="w-3.5 h-3.5" />, label: 'Ngân hàng', value: request.bankName },
                  { icon: <CreditCard className="w-3.5 h-3.5" />, label: 'Số TK', value: request.bankAccount },
                  { icon: <User className="w-3.5 h-3.5" />, label: 'Chủ TK', value: request.accountHolder },
                ].map(item => (
                  <div key={item.label} className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-slate-50'}`}>
                    <span className="text-slate-400">{item.icon}</span>
                    <div className="min-w-0">
                      <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.label}</p>
                      <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {request.note && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ghi chú từ shop</p>
              <p className={`text-sm rounded-xl px-4 py-3 italic ${isDark ? 'text-slate-400 bg-white/[0.02] border border-white/5' : 'text-slate-600 bg-slate-50'}`}>"{request.note}"</p>
            </div>
          )}

          {request.adminNote && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ghi chú Admin</p>
              <p className={`text-sm rounded-xl px-4 py-3 ${isDark ? 'text-slate-300 bg-blue-500/5 border border-blue-500/10' : 'text-slate-600 bg-blue-50 border border-blue-100'}`}>
                {request.adminNote}
              </p>
              {request.processedAt && (
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Xử lý: {formatDate(request.processedAt)}</p>
              )}
            </div>
          )}

          {request.status === 'PENDING' && (
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ghi chú Admin (tuỳ chọn)</p>
              <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Nhập ghi chú khi duyệt/từ chối..." rows={2}
                className={`w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all resize-none ${isDark ? 'admin-glass-input' : 'border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20'}`} />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {request.status === 'PENDING' ? (
              request.type === 'REFUND' ? (
                <button onClick={() => onApprove(request.id, adminNote, request.type)} disabled={approving}
                  className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-emerald">
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Xác nhận đã hoàn tiền
                </button>
              ) : (
                <>
                  <button onClick={() => onReject(request.id, adminNote, request.type)} disabled={rejecting}
                    className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${isDark ? 'border border-red-500/20 text-red-400 hover:bg-red-500/10' : 'border border-red-200 text-red-600 hover:bg-red-50'}`}>
                    {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Từ chối
                  </button>
                  <button onClick={() => onApprove(request.id, adminNote, request.type)} disabled={approving}
                    className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-emerald">
                    {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Duyệt & Chuyển tiền
                  </button>
                </>
              )
            ) : (
              <button onClick={onClose} className={`w-full py-3 rounded-2xl text-sm font-bold transition-all ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminWithdrawals() {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequestResponse | null>(null);
  const [payosModal, setPayosModal] = useState<{ request: WithdrawalRequestResponse; checkoutUrl: string } | null>(null);

  useEffect(() => {
    const cancelled    = searchParams.get('cancelled');
    const paid         = searchParams.get('paid');
    const withdrawalId = searchParams.get('withdrawalId');
    const orderCode    = searchParams.get('orderCode');

    if (cancelled === 'true' && withdrawalId) {
      toast('Link PayOS đã bị huỷ. Đang tạo link mới...', { icon: '🔄' });
      regenerateMutation.mutate(parseInt(withdrawalId));
      setSearchParams({}, { replace: true });
    } else if (paid === 'true' && orderCode) {
      toast('Đang xác nhận thanh toán...', { icon: '⏳' });
      confirmMutation.mutate(parseInt(orderCode));
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: withdrawals = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-withdrawals', filterStatus],
    queryFn: async () => {
      if (filterStatus === 'ALL' || filterStatus === 'PENDING') {
        const [w, r] = await Promise.all([
          walletService.getAllWithdrawals(filterStatus === 'ALL' ? undefined : filterStatus),
          walletService.getWaitingRefunds()
        ]);
        return [...w, ...r].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        return walletService.getAllWithdrawals(filterStatus);
      }
    },
    staleTime: 30_000,
    refetchInterval: 15_000,
  });

  const { data: adminBalance = 0 } = useQuery({
    queryKey: ['admin-balance'],
    queryFn: walletService.getAdminBalance,
    staleTime: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note, type }: { id: number; note: string; type: string }) => {
      if (type === 'REFUND') return walletService.confirmRefundForBooking(id);
      return walletService.approveWithdrawal(id, note);
    },
    onSuccess: (data: any, variables) => {
      if (variables.type === 'REFUND') {
        toast.success('Đã xác nhận hoàn tiền cho khách hàng');
        qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
        setSelectedRequest(null);
      } else {
        toast.success('Đã tạo link PayOS — vui lòng hoàn tất chuyển khoản');
        qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
        setSelectedRequest(null);
        if (data?.checkoutUrl) setPayosModal({ request: data, checkoutUrl: data.checkoutUrl });
      }
    },
    onError: (err: any) => {
      const code = err.response?.data?.code;
      if (code === 5007) toast.error('Lỗi kết nối PayOS');
      else toast.error('Xử lý thất bại');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note, type }: { id: number; note: string; type: string }) => {
      if (type === 'REFUND') return Promise.reject(new Error('Cannot reject refund'));
      return walletService.rejectWithdrawal(id, note);
    },
    onSuccess: () => {
      toast.success('Đã từ chối yêu cầu, tiền đã hoàn lại ví shop');
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      setSelectedRequest(null);
    },
    onError: () => toast.error('Từ chối thất bại'),
  });

  const confirmMutation = useMutation({
    mutationFn: (orderCode: number) => walletService.confirmPayout(orderCode),
    onSuccess: () => {
      toast.success('✅ Xác nhận thành công! Tiền đã được ghi nhận.');
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      qc.invalidateQueries({ queryKey: ['admin-balance'] });
      setPayosModal(null);
    },
    onError: (err: any) => {
      const code = err.response?.data?.code;
      if (code === 5007) toast.error('Lỗi kết nối PayOS — vui lòng thử lại');
      else if (code === 5001) toast.error('PayOS chưa ghi nhận thanh toán — vui lòng đợi vài giây rồi thử lại');
      else toast.error('Xác nhận thất bại');
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: number) => walletService.regeneratePayoutLink(id),
    onSuccess: (data) => {
      toast.success('Đã tạo link PayOS mới');
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      if (data.checkoutUrl) setPayosModal({ request: data, checkoutUrl: data.checkoutUrl });
    },
    onError: (err: any) => {
      const code = err.response?.data?.code;
      if (code === 5007) toast.error('Lỗi kết nối PayOS');
      else toast.error('Không thể tạo lại link PayOS');
    },
  });

  const expireStaleMutation = useMutation({
    mutationFn: walletService.expireStale,
    onSuccess: () => {
      toast.success('Đã kiểm tra và expire các yêu cầu quá hạn');
      qc.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      qc.invalidateQueries({ queryKey: ['admin-balance'] });
    },
    onError: () => toast.error('Thao tác thất bại'),
  });

  const filtered = withdrawals.filter(w =>
    w.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.bankAccount.includes(searchTerm) ||
    w.accountHolder.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = withdrawals.filter(w => w.status === 'PENDING').length;
  const payingCount = withdrawals.filter(w => w.status === 'PAYING').length;
  const filteredUsers = filtered.filter(w => w.type === 'REFUND');
  const filteredShops = filtered.filter(w => w.type !== 'REFUND');

  const renderItem = (w: any) => {
    const meta = statusMeta(w.status, isDark);
    const isPaying = w.status === 'PAYING';
    return (
      <div key={w.id} className={`flex items-start gap-4 px-6 py-5 transition-colors ${isPaying ? (isDark ? 'bg-blue-500/5' : 'bg-blue-50/50') : (isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50')}`}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
          w.status === 'APPROVED' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
          : w.status === 'REJECTED' ? (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-500')
          : w.status === 'PAYING' ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-600')
          : (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-600')
        }`}>
          <ArrowDownToLine className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
              {meta.icon}{meta.label}
            </span>
            <span className={`text-xs font-bold font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>#{w.id}</span>
          </div>
          <p className={`text-sm font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{w.shopName}</p>
          <p className={`text-lg font-bold mb-1 ${isDark ? 'text-emerald-400' : 'text-teal-600'}`}>{formatVND(w.amount)}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}><Building2 className="w-3 h-3" />{w.bankName}</span>
            <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}><CreditCard className="w-3 h-3" />{w.bankAccount}</span>
            <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}><User className="w-3 h-3" />{w.accountHolder}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{formatDate(w.createdAt)}</p>
          {w.status === 'PAYING' && (() => {
            try {
              const expireAt = new Date(parseISO(w.createdAt.replace(' ', 'T')).getTime() + 24 * 60 * 60 * 1000);
              const h = differenceInHours(expireAt, new Date());
              const m = differenceInMinutes(expireAt, new Date()) % 60;
              if (h < 0) return <p className="text-[10px] text-red-400 font-bold">Đã hết hạn</p>;
              return <p className={`text-[10px] font-bold ${h < 4 ? 'text-red-500' : 'text-amber-500'}`}>⏱ Hết hạn sau {h}h {m}m</p>;
            } catch { return null; }
          })()}
          {w.status === 'EXPIRED' && <p className={`text-[10px] italic ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Đã hoàn tiền về shop</p>}
          {w.status === 'PENDING' && (
            <button onClick={() => setSelectedRequest(w)} className={`flex items-center gap-1 text-xs font-bold hover:underline ${isDark ? 'text-blue-400' : 'text-[#1a2b4c]'}`}>
              Xem & Duyệt <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          {w.status === 'PAYING' && w.checkoutUrl && (
            <button onClick={() => setPayosModal({ request: w, checkoutUrl: w.checkoutUrl! })} className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:underline">
              Tiếp tục chuyển <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          {(w.status === 'APPROVED' || w.status === 'REJECTED') && (
            <button onClick={() => setSelectedRequest(w)} className={`flex items-center gap-1 text-xs font-bold hover:underline ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderListState = (list: any[], emptyText: string) => {
    if (isLoading) {
      return (
        <div className={`flex items-center justify-center py-16 gap-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium">Đang tải...</span>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className={`flex flex-col items-center justify-center py-16 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          <ArrowDownToLine className="w-10 h-10 opacity-30 mb-3" />
          <p className="font-bold">{emptyText}</p>
          <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm.</p>
        </div>
      );
    }
    return <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-50'}`}>{list.map(renderItem)}</div>;
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <ArrowDownToLine className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-teal-500'}`} />
            Quản lý rút tiền
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Duyệt yêu cầu và chuyển tiền cho shop qua PayOS</p>
        </div>
        <div className="flex items-center gap-2">
          {payingCount > 0 && (
            <button onClick={() => expireStaleMutation.mutate()} disabled={expireStaleMutation.isPending} title="Expire thủ công các PAYING quá 24h"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15' : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'}`}>
              {expireStaleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Expire quá hạn
            </button>
          )}
          <button onClick={() => refetch()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <RefreshCw className="w-4 h-4" />Làm mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg col-span-2 sm:col-span-1 glow-emerald">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">Ví Admin (Phí hoa hồng)</p>
          <p className="text-xl font-bold">{formatVND(adminBalance)}</p>
        </div>
        {[
          { label: 'Chờ duyệt', value: pendingCount, accent: isDark ? 'text-amber-400' : 'text-amber-600' },
          { label: 'Đang chuyển', value: payingCount, accent: isDark ? 'text-blue-400' : 'text-blue-600' },
          { label: 'Tổng yêu cầu', value: withdrawals.length, accent: isDark ? 'text-white' : 'text-slate-900' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-5 ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* PAYING alert */}
      {payingCount > 0 && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isDark ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
          <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            Có <span className="font-bold">{payingCount}</span> giao dịch đang chờ xác nhận PayOS.{' '}
            <button onClick={() => setFilterStatus('PAYING')} className="underline font-bold hover:no-underline">Xem ngay</button>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className={`rounded-2xl p-5 ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Tìm shop, số TK, chủ TK..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all ${isDark ? 'admin-glass-input' : 'bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20'}`} />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 flex-wrap">
            {(['PENDING', 'PAYING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ALL'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                  filterStatus === s
                    ? (isDark ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 glow-blue' : 'bg-[#1a2b4c] text-white border-[#1a2b4c]')
                    : (isDark ? 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10' : 'bg-white text-slate-400 border-slate-100')
                }`}>
                {s === 'ALL' ? 'Tất cả' : s === 'PENDING' ? 'Chờ duyệt' : s === 'PAYING' ? 'Đang chuyển' : s === 'APPROVED' ? 'Đã duyệt' : s === 'EXPIRED' ? 'Hết hạn' : 'Từ chối'}
                {s === 'PENDING' && pendingCount > 0 && <span className="ml-1 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[8px]">{pendingCount}</span>}
                {s === 'PAYING' && payingCount > 0 && <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[8px]">{payingCount}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-2xl overflow-hidden flex flex-col ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm'}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
            <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Yêu cầu hoàn tiền (User)</h3>
          </div>
          {renderListState(filteredUsers, 'Không có yêu cầu hoàn tiền nào')}
        </div>

        <div className={`rounded-2xl overflow-hidden flex flex-col ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm'}`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50/50 border-slate-100'}`}>
            <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Yêu cầu rút tiền (Shop)</h3>
          </div>
          {renderListState(filteredShops, 'Không có yêu cầu rút tiền nào')}
        </div>
      </div>

      {selectedRequest && (
        <DetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={(id, note, type) => approveMutation.mutate({ id, note, type })}
          onReject={(id, note, type) => rejectMutation.mutate({ id, note, type })}
          approving={approveMutation.isPending}
          rejecting={rejectMutation.isPending}
        />
      )}

      {payosModal && (
        <PayOSModal
          request={payosModal.request}
          checkoutUrl={payosModal.checkoutUrl}
          onClose={() => setPayosModal(null)}
          onConfirm={() => {
            if (payosModal.request.payosOrderCode) confirmMutation.mutate(payosModal.request.payosOrderCode);
          }}
          confirming={confirmMutation.isPending}
        />
      )}
    </div>
  );
}
