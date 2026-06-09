import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, TrendingUp, Lock, ArrowDownToLine, CheckCircle2,
  XCircle, Clock, RefreshCw, Plus, Loader2, AlertCircle,
  Building2, CreditCard, User, FileText, ChevronRight,
  BadgeCheck, X, Info
} from 'lucide-react';
import { walletService, type WithdrawalRequestCreate } from '../../services/wallet.service';
import { transactionService } from '../../services/transaction.service';
import toast from 'react-hot-toast';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

function formatDate(s: string) {
  try { return format(parseISO(s.replace(' ', 'T')), 'dd/MM/yyyy HH:mm', { locale: vi }); }
  catch { return s; }
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:  { label: 'Đang chờ duyệt', color: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:shadow-[0_0_10px_rgba(251,191,36,0.2)]',       icon: <Clock className="w-3.5 h-3.5" /> },
  PAYING:   { label: 'Đang chuyển',    color: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 dark:shadow-[0_0_10px_rgba(59,130,246,0.2)]',            icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  APPROVED: { label: 'Đã duyệt',       color: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 dark:shadow-[0_0_10px_rgba(16,185,129,0.2)]', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  REJECTED: { label: 'Bị từ chối',     color: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 dark:shadow-[0_0_10px_rgba(244,63,94,0.2)]',               icon: <XCircle className="w-3.5 h-3.5" /> },
  EXPIRED:  { label: 'Hết hạn',        color: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30',           icon: <Clock className="w-3.5 h-3.5" /> },
};

const BANKS = [
  'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank',
  'MB Bank', 'ACB', 'VPBank', 'TPBank', 'Sacombank', 'HDBank',
  'OCB', 'SHB', 'SeABank', 'MSB', 'Eximbank', 'Khác',
];

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({ available, onClose, onSuccess }: {
  available: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { isDark } = useTheme();
  const [form, setForm] = useState<WithdrawalRequestCreate>({
    amount: 0,
    bankName: '',
    bankAccount: '',
    accountHolder: '',
    note: '',
  });

  const mutation = useMutation({
    mutationFn: walletService.createWithdrawal,
    onSuccess: () => {
      toast.success('Yêu cầu rút tiền đã được gửi!');
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const code = err.response?.data?.code;
      if (code === 8002) toast.error('Số dư không đủ');
      else if (code === 8005) toast.error('Bạn đang có yêu cầu rút tiền chờ duyệt');
      else toast.error('Gửi yêu cầu thất bại');
    },
  });

  const handleSubmit = () => {
    if (!form.amount || form.amount < 200000) { toast.error('Số tiền tối thiểu 200,000đ'); return; }
    if (form.amount > available) { toast.error('Số tiền vượt quá số dư khả dụng'); return; }
    if (!form.bankName) { toast.error('Vui lòng chọn ngân hàng'); return; }
    if (!form.bankAccount.trim()) { toast.error('Vui lòng nhập số tài khoản'); return; }
    if (!form.accountHolder.trim()) { toast.error('Vui lòng nhập tên chủ tài khoản'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-transparent'}`}>
        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between ${isDark ? 'bg-slate-900 border-b border-white/10' : 'bg-gradient-to-r from-[#1a2b4c] to-slate-700'}`}>
          <div>
            <h3 className="text-white font-black text-lg">Yêu cầu rút tiền</h3>
            <p className="text-slate-300 text-xs mt-0.5">Số dư khả dụng: <span className="text-teal-300 font-bold">{formatVND(available)}</span></p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Số tiền muốn rút</label>
            <div className="relative">
              <input
                type="number"
                min={200000}
                max={available}
                value={form.amount || ''}
                onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                placeholder="Nhập số tiền..."
                className={`w-full px-4 py-3 pr-16 rounded-2xl border text-sm font-bold outline-none focus:ring-2 transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:ring-[#1a2b4c]/20'}`}
              />
              <button
                onClick={() => setForm(f => ({ ...f, amount: available }))}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${isDark ? 'text-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/30' : 'text-teal-600 bg-teal-50 hover:bg-teal-100'}`}
              >
                TỐI ĐA
              </button>
            </div>
            {form.amount > 0 && (
              <p className="text-xs text-slate-400 mt-1 ml-1">{formatVND(form.amount)}</p>
            )}
          </div>

          {/* Bank */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Ngân hàng</label>
            <select
              value={form.bankName}
              onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none focus:ring-2 transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:ring-[#1a2b4c]/20'}`}
            >
              <option value="">-- Chọn ngân hàng --</option>
              {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Account number */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Số tài khoản</label>
            <input
              type="text"
              value={form.bankAccount}
              onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))}
              placeholder="Nhập số tài khoản..."
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none focus:ring-2 transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:ring-[#1a2b4c]/20'}`}
            />
          </div>

          {/* Account holder */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Tên chủ tài khoản</label>
            <input
              type="text"
              value={form.accountHolder}
              onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))}
              placeholder="Nhập tên chủ tài khoản (IN HOA)..."
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none focus:ring-2 transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:ring-[#1a2b4c]/20'}`}
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Ghi chú (tuỳ chọn)</label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Ghi chú thêm cho Admin..."
              rows={2}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium outline-none focus:ring-2 transition-all resize-none ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:ring-[#1a2b4c]/20'}`}
            />
          </div>

          {/* Info note */}
          <div className={`flex items-start gap-2 p-3 rounded-2xl border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-blue-50 border-blue-100'}`}>
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-indigo-400' : 'text-blue-500'}`} />
            <p className={`text-xs leading-relaxed ${isDark ? 'text-indigo-200' : 'text-blue-700'}`}>
              Yêu cầu sẽ được Admin xem xét và xử lý trong vòng 1-3 ngày làm việc. Tiền sẽ được chuyển khoản trực tiếp vào tài khoản của bạn.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className={`flex-1 py-3 rounded-2xl border text-sm font-bold transition-colors ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Huỷ
            </button>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-[#1a2b4c] shadow-[#1a2b4c]/20'}`}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
              Gửi yêu cầu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ShopWallet() {
  const qc = useQueryClient();
  const { isDark } = useTheme();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['shop-wallet'],
    queryFn: walletService.getMyWallet,
    staleTime: 30_000,
  });

  const { data: withdrawals = [], isLoading: wLoading, refetch: refetchW } = useQuery({
    queryKey: ['my-withdrawals'],
    queryFn: walletService.getMyWithdrawals,
    staleTime: 30_000,
  });

  const { data: pageData, isLoading: tLoading, refetch: refetchT } = useQuery({
    queryKey: ['my-transactions', page],
    queryFn: () => transactionService.getShopTransactions(page, 10),
    staleTime: 30_000,
  });

  const transactions = pageData?.content || [];
  const totalPages = pageData?.totalPages || 1;

  const filteredW = filterStatus === 'ALL'
    ? withdrawals
    : withdrawals.filter(w => w.status === filterStatus);

  const handleSuccess = () => {
    qc.invalidateQueries({ queryKey: ['shop-wallet'] });
    qc.invalidateQueries({ queryKey: ['my-withdrawals'] });
    qc.invalidateQueries({ queryKey: ['my-transactions'] });
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Wallet className={`w-8 h-8 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`} />
            Ví của tôi
          </h1>
          <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Quản lý doanh thu và yêu cầu rút tiền</p>
        </div>
        <div className="flex items-center gap-2">
          <button
             onClick={() => { refetchWallet(); refetchW(); refetchT(); }}
             className={`p-2.5 rounded-xl border transition-all ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}
           >
             <RefreshCw className="w-4 h-4" />
           </button>
          <button
            onClick={() => setShowWithdraw(true)}
            disabled={!wallet || wallet.availableBalance <= 0}
            className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-[#1a2b4c] shadow-[#1a2b4c]/20'}`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Rút tiền
          </button>
        </div>
      </header>

      {/* Wallet Cards */}
      {walletLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`rounded-3xl p-6 animate-pulse h-36 border ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`} />
          ))}
        </div>
      ) : wallet ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Available */}
          <div className={`rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${isDark ? 'admin-glass-card bg-slate-900/60 border border-white/10 shadow-indigo-500/10' : 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20'}`}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/20'}`}>
                  <Wallet className="w-4 h-4" />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'opacity-80'}`}>Khả dụng</span>
              </div>
              <p className="text-2xl font-black">{formatVND(wallet.availableBalance)}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'opacity-70'}`}>Sẵn sàng rút</p>
            </div>
          </div>

          {/* Frozen */}
          <div className={`rounded-3xl p-6 border shadow-sm ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đóng băng</span>
            </div>
            <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatVND(wallet.frozenBalance)}</p>
            <p className="text-xs text-slate-400 mt-1">Đơn chưa hoàn thành</p>
          </div>

          {/* Total earned */}
          <div className={`rounded-3xl p-6 border shadow-sm ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-100 text-blue-600'}`}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng thu nhập</span>
            </div>
            <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatVND(wallet.totalEarned)}</p>
            <p className="text-xs text-slate-400 mt-1">Sau khi trừ phí nền tảng</p>
          </div>

          {/* Total withdrawn */}
          <div className={`rounded-3xl p-6 border shadow-sm ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã rút</span>
            </div>
            <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatVND(wallet.totalWithdrawn)}</p>
            <p className="text-xs text-slate-400 mt-1">Tổng đã rút thành công</p>
          </div>
        </div>
      ) : null}

      {/* Fee info banner */}
      <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-4 ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-blue-50 border-blue-100'}`}>
        <Info className={`w-5 h-5 shrink-0 ${isDark ? 'text-indigo-400' : 'text-blue-500'}`} />
        <p className={`text-sm ${isDark ? 'text-indigo-200' : 'text-blue-700'}`}>
          <span className="font-bold">Chính sách phí:</span> Peteye thu phí nền tảng trên mỗi đơn hoàn thành tùy thuộc vào loại dịch vụ (Spa, Lưu trú, Khám bệnh...). Phần doanh thu hiển thị trong ví là số tiền thực tế bạn nhận được sau khi đã trừ phí.
        </p>
      </div>

      {/* PAYING expiry warning */}
      {withdrawals.filter(w => w.status === 'PAYING').map(w => {
        try {
          const createdAt = parseISO(w.createdAt.replace(' ', 'T'));
          const expireAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
          const hoursLeft = differenceInHours(expireAt, new Date());
          const minutesLeft = differenceInMinutes(expireAt, new Date()) % 60;
          if (hoursLeft < 0) return null;
          const isUrgent = hoursLeft < 4;
          return (
            <div key={w.id} className={`flex items-start gap-3 p-4 rounded-2xl border mb-4 ${
              isUrgent
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30'
            }`}>
              <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
              <div>
                <p className={`text-sm font-bold ${isUrgent ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {isUrgent ? '⚠️ Yêu cầu rút tiền sắp hết hạn!' : '🕐 Yêu cầu rút tiền đang chờ Admin xử lý'}
                </p>
                <p className={`text-xs mt-0.5 ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  Yêu cầu #{w.id} ({formatVND(w.amount)}) sẽ tự động hết hạn sau{' '}
                  <span className="font-black">{hoursLeft}h {minutesLeft}m</span>.
                  {' '}Nếu hết hạn, tiền sẽ được hoàn lại vào ví và bạn có thể tạo yêu cầu mới.
                </p>
              </div>
            </div>
          );
        } catch { return null; }
      })}

      {/* Withdrawal history */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden mt-4 ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
        <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h3 className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Lịch sử rút tiền</h3>
          {/* Filter */}
          <div className={`flex gap-1 p-1 rounded-xl overflow-x-auto ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`}>
            {(['ALL', 'PENDING', 'PAYING', 'APPROVED', 'REJECTED', 'EXPIRED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  filterStatus === s
                    ? (isDark ? 'bg-slate-700 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')
                }`}
              >
                {s === 'ALL' ? 'Tất cả'
                  : s === 'PENDING' ? 'Chờ duyệt'
                  : s === 'PAYING' ? 'Đang chuyển'
                  : s === 'APPROVED' ? 'Đã duyệt'
                  : s === 'EXPIRED' ? 'Hết hạn'
                  : 'Từ chối'}
              </button>
            ))}
          </div>
        </div>

        {wLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-indigo-400' : ''}`} />
            <span className="text-sm font-medium">Đang tải...</span>
          </div>
        ) : filteredW.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ArrowDownToLine className="w-10 h-10 opacity-30 mb-3" />
            <p className="font-bold">Chưa có yêu cầu rút tiền nào</p>
            <p className="text-sm mt-1">Nhấn "Rút tiền" để tạo yêu cầu đầu tiên.</p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-50'}`}>
            {filteredW.map(w => {
              const meta = STATUS_META[w.status] ?? STATUS_META.PENDING;
              return (
                <div key={w.id} className={`flex items-start gap-4 px-6 py-5 transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                    w.status === 'APPROVED' ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                    : w.status === 'REJECTED' ? (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-500')
                    : w.status === 'PAYING'   ? (isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-100 text-blue-600')
                    : (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-600')
                  }`}>
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${meta.color}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold text-slate-400 font-mono">#{w.id}</span>
                    </div>
                    <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatVND(w.amount)}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {w.bankName}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> {w.bankAccount}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {w.accountHolder}
                      </span>
                    </div>
                    {w.adminNote && (
                      <p className={`text-xs mt-1.5 italic rounded-xl px-3 py-1.5 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                        Admin: "{w.adminNote}"
                      </p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">{formatDate(w.createdAt)}</p>
                    {w.processedAt && (
                      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-300'}`}>
                        Xử lý: {formatDate(w.processedAt)}
                      </p>
                    )}
                    {w.status === 'PAYING' && (() => {
                      try {
                        const expireAt = new Date(parseISO(w.createdAt.replace(' ', 'T')).getTime() + 24 * 60 * 60 * 1000);
                        const h = differenceInHours(expireAt, new Date());
                        const m = differenceInMinutes(expireAt, new Date()) % 60;
                        if (h >= 0) return (
                          <p className={`text-[10px] font-bold mt-1 ${h < 4 ? 'text-red-500' : 'text-amber-500'}`}>
                            Hết hạn sau {h}h {m}m
                          </p>
                        );
                      } catch { return null; }
                    })()}
                    {w.status === 'EXPIRED' && (
                      <p className="text-[10px] text-slate-400 mt-1 italic">Đã hoàn tiền về ví</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction history */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden mt-8 ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
        <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div>
            <h3 className={`font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <RefreshCw className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-blue-500'}`} />
              Biến động số dư
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Lịch sử doanh thu, bồi thường và các khoản trừ</p>
          </div>
        </div>

        {tLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-indigo-400' : ''}`} />
            <span className="text-sm font-medium">Đang tải...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <RefreshCw className="w-10 h-10 opacity-30 mb-3" />
            <p className="font-bold">Chưa có giao dịch nào</p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-50'}`}>
            {transactions.map(t => {
              const isPlus = t.type === 'WALLET_CREDIT' || t.type === 'PAYMENT';
              const isMinus = t.type === 'WALLET_DEDUCT' || t.type === 'WITHDRAWAL';
              
              return (
                <div key={t.id} className={`flex items-start gap-4 px-6 py-5 transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}`}>
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isPlus ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                    : isMinus ? (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-500')
                    : (isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-100 text-blue-600')
                  }`}>
                    {isPlus ? <Plus className="w-5 h-5" /> : <ArrowDownToLine className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        isPlus ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                      }`}>
                        {(() => {
                          switch (t.type) {
                            case 'WALLET_CREDIT': return 'Cộng tiền ví';
                            case 'WALLET_DEDUCT': return 'Trừ tiền ví';
                            case 'PAYMENT': return 'Thanh toán';
                            case 'WITHDRAWAL': return 'Rút tiền';
                            case 'REFUND': return 'Hoàn tiền';
                            case 'CASH_DEPOSIT': return 'Tiền mặt';
                            case 'MOCK': return 'MOCK';
                            default: return t.type;
                          }
                        })()}
                      </span>
                      <span className="text-xs font-bold text-slate-400 font-mono">#{t.id}</span>
                      {t.bookingId && (
                        <span className="text-xs font-bold text-indigo-500 font-mono bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                          Đơn #{t.bookingId}
                        </span>
                      )}
                    </div>
                    <p className={`text-base font-black ${isPlus ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPlus ? '+' : '-'}{formatVND(t.amount)}
                    </p>
                    <p className={`text-sm mt-1.5 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {(t.description || '')
                        .replace(/Mock payment for booking/gi, 'Thanh toán (Mock) cho đơn')
                        .replace(/Wallet credit for booking/gi, 'Cộng tiền vào ví cho đơn')
                        .replace(/shop share of/gi, 'phần của shop:')
                        .replace(/Customer paid 10% deposit/gi, 'Khách hàng đã đặt cọc 10%')
                        .replace(/Refund for booking/gi, 'Hoàn tiền cho đơn')
                        .replace(/Wallet deduct for booking/gi, 'Trừ tiền ví cho đơn')
                        .replace(/shop share deduct/gi, 'trừ phần của shop')
                        .replace(/Withdrawal request/gi, 'Yêu cầu rút tiền')
                        .replace(/Booking/gi, 'Đơn')
                        .replace(/payment/gi, 'thanh toán')
                      }
                    </p>
                    {t.serviceName && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <BadgeCheck className="w-3 h-3 text-indigo-400" /> Dịch vụ: {t.serviceName}
                      </p>
                    )}
                  </div>

                  {/* Date & Status */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">{formatDate(t.createdAt)}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {(() => {
                        switch (t.status) {
                          case 'SUCCESS': return 'Thành công';
                          case 'FAILED': return 'Thất bại';
                          case 'CANCELLED': return 'Đã hủy';
                          case 'PENDING': return 'Đang xử lý';
                          case 'NO_SHOW_PENALTY': return 'Phạt vắng mặt';
                          default: return t.status;
                        }
                      })()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <span className="text-sm text-slate-500">Trang {page} / {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && wallet && (
        <WithdrawModal
          available={wallet.availableBalance}
          onClose={() => setShowWithdraw(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
