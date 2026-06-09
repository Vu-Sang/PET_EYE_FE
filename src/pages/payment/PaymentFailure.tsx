import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { RefreshCw, Home, Phone, Mail, AlertTriangle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentFailure() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const errorMessage = searchParams.get('message') || location.state?.error || 'Bạn đã huỷ thanh toán hoặc quá trình giao dịch bị gián đoạn.';
  const bookingInfo = location.state?.bookingInfo;

  return (
    <div className="flex-1 min-h-screen relative overflow-hidden flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-950">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] rounded-full bg-rose-400/10 dark:bg-rose-900/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35rem] h-[35rem] rounded-full bg-red-400/10 dark:bg-red-900/20 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-md w-full relative z-10 flex flex-col gap-6"
      >
        {/* ── Main Glassmorphic Card ── */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-rose-900/5 dark:shadow-none overflow-hidden border border-white/50 dark:border-slate-700/50">
          
          {/* Top Banner section */}
          <div className="relative pt-10 pb-8 px-6 text-center flex flex-col items-center">
            {/* Animated Icon */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="relative w-24 h-24 mb-6"
            >
              <div className="absolute inset-0 bg-rose-100 dark:bg-rose-900/30 rounded-full animate-ping opacity-70" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-2 bg-rose-200 dark:bg-rose-800/40 rounded-full animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-rose-500 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <XCircle className="w-8 h-8 text-white" />
                </div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-black text-slate-800 dark:text-white mb-2"
            >
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 dark:text-slate-400 text-sm max-w-[280px] leading-relaxed"
            >
              {errorMessage}
            </motion.p>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent" />

          {/* Shop & Service info strip */}
          {bookingInfo && (
            <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-14 h-14 rounded-2xl bg-cover bg-center shrink-0 border-2 border-white dark:border-slate-700 shadow-md"
                  style={{ backgroundImage: bookingInfo.shopImage ? `url(${bookingInfo.shopImage})` : 'url(https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=200&auto=format&fit=crop)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-100 text-base truncate">{bookingInfo.shopName || 'Cơ sở thú cưng'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {bookingInfo.shopAddress || 'Chưa xác định địa chỉ'}
                  </p>
                </div>
              </div>

              {bookingInfo.services && bookingInfo.services.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Chi tiết thanh toán</p>
                  <div className="flex flex-col gap-2.5">
                    {bookingInfo.services.map((svc: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-600 dark:text-slate-300 truncate pr-4">{svc.name}</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                          {svc.price?.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-slate-200 dark:border-slate-700 mt-2 pt-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {bookingInfo.isDeposit ? 'Tổng tiền cọc' : 'Tổng tiền'}
                      </span>
                      <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                        {bookingInfo.totalPrice?.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning Section */}
          <div className="px-6 pb-6 pt-2">
            <div className="flex items-start gap-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl p-4 border border-rose-100/50 dark:border-rose-800/30">
              <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200 mb-1.5">
                  Lưu ý
                </h3>
                <p className="text-xs text-rose-700/80 dark:text-rose-300/80 leading-relaxed">
                  Lịch hẹn của bạn <strong>chưa được tạo</strong> do thanh toán chưa hoàn tất. Vui lòng kiểm tra lại số dư hoặc thử phương thức thanh toán khác.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col gap-3"
        >
          <Link to="/user/dashboard">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-rose-500 to-red-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/25 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Thử lại thanh toán
            </motion.button>
          </Link>
          <Link to="/user/dashboard">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 text-sm"
            >
              <Home className="w-4 h-4" />
              Quay về trang chủ
            </motion.button>
          </Link>
        </motion.div>

        {/* Support Links */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-6 mt-2"
        >
          <a href="tel:1900-xxxx" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <Phone className="w-3.5 h-3.5" />
            1900-xxxx
          </a>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 self-center" />
          <a href="mailto:support@peteye.com" className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <Mail className="w-3.5 h-3.5" />
            Hỗ trợ
          </a>
        </motion.div>

      </motion.div>
    </div>
  );
}
