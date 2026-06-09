import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XCircle, Wallet, AlertCircle, Clock, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ShopCancelBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
    onConfirm: (reason: string) => void;
    isSubmitting: boolean;
}

const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function ShopCancelBookingModal({ isOpen, onClose, booking, onConfirm, isSubmitting }: ShopCancelBookingModalProps) {
    const [cancelReasonOption, setCancelReasonOption] = useState<string>('');
    const [cancelReasonOther, setCancelReasonOther] = useState('');

    if (!isOpen || !booking) return null;

    // Calculate amounts
    const isPayOS = booking.paymentMethod === 'PAYOS';
    const servicePrice = booking.services?.reduce((sum: number, s: any) => sum + (s.servicePrice || 0), 0) || booking.servicePrice || 0;
    
    // Deposit amount calculation based on the same logic in the backend
    let depositAmount = 0;
    if (booking.status !== 'CONFIRMED' && booking.status !== 'IN_PROGRESS' && booking.status !== 'WAITING_SHOP_APPROVAL' && booking.status !== 'CANCEL_REQUESTED') {
         depositAmount = 0; // Don't show penalty if not paid
    } else {
         if (isPayOS) {
             depositAmount = booking.discountAmount ? (servicePrice - booking.discountAmount) * 0.1 : servicePrice * 0.1;
         } else if (booking.paymentMethod === 'CASH_DEPOSIT') {
             depositAmount = booking.discountAmount ? (servicePrice - booking.discountAmount) * 0.1 : servicePrice * 0.1;
         }
    }

    const paidAmount = isPayOS ? (servicePrice - (booking.discountAmount || 0)) : depositAmount;

    // The shop penalty is the deposit amount.
    const penaltyAmount = depositAmount;
    // The refund to the user is the full paid amount.
    const refundAmount = paidAmount;

    const handleConfirm = () => {
        const finalReason = cancelReasonOption === 'OTHER' ? cancelReasonOther : cancelReasonOption;
        if (!finalReason) return;
        onConfirm(finalReason);
    };

    const isReasonValid = cancelReasonOption !== '' && (cancelReasonOption !== 'OTHER' || cancelReasonOther.trim().length > 0);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/75 backdrop-blur-xl"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 28 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 28 }}
                    className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-950 rounded-[2rem] shadow-[0_40px_120px_-30px_rgba(15,23,42,0.45)] overflow-hidden border border-slate-200/70 dark:border-slate-800"
                >
                    <div className="bg-gradient-to-r from-red-600 to-rose-900 p-8 text-white shrink-0">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-3xl bg-white/15 flex items-center justify-center shadow-lg shadow-red-900/30">
                                <XCircle size={32} className="text-white" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black tracking-tight">Hủy lịch khách hàng</h2>
                                <p className="text-sm opacity-90 leading-relaxed">Hệ thống sẽ hoàn tiền cho khách hàng và trừ phí phạt vào ví của bạn.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-6 overflow-y-auto">
                        <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-center rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Đơn hàng</p>
                                <p className="mt-2 text-base font-black text-slate-900 dark:text-white">{booking.services && booking.services.length > 0 ? booking.services.map((s: any) => s.serviceName).join(', ') : booking.serviceName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Khách hàng: {booking.customerName} • Bé: {booking.petName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {format(parseISO(booking.appointmentDatetime), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                                </p>
                            </div>
                            <div className="rounded-3xl bg-white dark:bg-slate-950 shadow-sm border border-slate-200 dark:border-slate-800 px-4 py-3 text-right">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Tổng tiền</p>
                                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{formatVND(servicePrice)}</p>
                            </div>
                        </div>

                        {/* Chi tiết tính toán hoàn tiền */}
                        <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200">
                                <Wallet size={18} />
                                <h4 className="font-black tracking-tight text-base">Thông tin hoàn tiền & Phí phạt</h4>
                            </div>
                            
                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Tổng tiền dịch vụ:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatVND(servicePrice)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Khách đã thanh toán:</span>
                                    <span className="font-bold text-slate-900 dark:text-white flex items-center">
                                        {formatVND(paidAmount)}
                                        <span className="text-[9px] uppercase ml-2 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold tracking-widest">
                                            {isPayOS ? 'Toàn bộ' : 'Cọc'}
                                        </span>
                                    </span>
                                </div>
                                
                                <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3" />
                                
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-slate-500 flex items-center gap-1.5">
                                        <AlertCircle size={14} className="text-rose-500" />
                                        Phí giữ chỗ (Shop chịu phạt):
                                    </span>
                                    <span className="font-bold text-rose-500">-{formatVND(penaltyAmount)}</span>
                                </div>
                                
                                <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3" />
                                
                                <div className="flex flex-col gap-2 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                                    <div className="flex justify-between items-center text-lg">
                                        <span className="font-black text-slate-900 dark:text-white text-base">Tổng tiền hoàn lại cho khách:</span>
                                        <span className="font-black text-emerald-500 text-xl">{formatVND(refundAmount)}</span>
                                    </div>
                                </div>
                                
                                <div className="mt-4 bg-slate-100/80 dark:bg-slate-800/50 rounded-xl p-3 flex gap-2.5 items-start">
                                    <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        Khi bạn chủ động hủy lịch, bạn sẽ bị phạt mất cọc (trừ trực tiếp vào ví hệ thống). Khách hàng sẽ được hoàn lại 100% số tiền đã thanh toán.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Chọn lý do hủy</p>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Bắt buộc</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { value: 'Nhân viên kẹt lịch đột xuất', label: 'Nhân viên kẹt lịch đột xuất' },
                                    { value: 'Quá tải dịch vụ', label: 'Quá tải dịch vụ' },
                                    { value: 'Cửa hàng có sự cố', label: 'Cửa hàng có sự cố' },
                                    { value: 'OTHER', label: 'Khác' },
                                ].map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setCancelReasonOption(option.value)}
                                        className={`rounded-[1.5rem] border p-4 text-left transition-all duration-200 ${cancelReasonOption === option.value ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-sm' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'}`}
                                    >
                                        <p className="text-sm font-bold">{option.label}</p>
                                        <p className="text-[11px] text-slate-400 mt-1">{option.value === 'OTHER' ? 'Ghi lý do khác' : 'Chỉ chọn một'}.</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {cancelReasonOption === 'OTHER' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Lý do chi tiết</p>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Tối đa 250 ký tự</span>
                                </div>
                                <textarea
                                    value={cancelReasonOther}
                                    onChange={e => setCancelReasonOther(e.target.value)}
                                    placeholder="Mô tả ngắn gọn lý do hủy..."
                                    className="w-full min-h-[140px] rounded-[1.75rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10 resize-none"
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800 shrink-0">
                        <div className="flex gap-4 max-w-md ml-auto">
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 px-6 py-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!isReasonValid || isSubmitting}
                                className={`flex-[2] px-6 py-4 rounded-2xl text-sm font-black text-white shadow-xl transition-all
                                    ${(!isReasonValid || isSubmitting)
                                        ? 'bg-slate-300 dark:bg-slate-800 shadow-none cursor-not-allowed'
                                        : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0'
                                    }`}
                            >
                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
