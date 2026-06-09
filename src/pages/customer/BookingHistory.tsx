import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
    Calendar, Clock, Plus, Home, Stethoscope, Scissors,
    Video, Star, CheckCircle, AlertCircle, XCircle, Wifi, Loader2,
    ChevronRight, MessageCircle, RefreshCw, Sparkles,
    Search, ArrowUpRight, Wallet, Heart, Info, X, Check, UserPlus, User,
    Activity, Utensils, Syringe, BookOpen, Save, Bookmark
} from 'lucide-react';
import { bookingService } from '../../services/booking.service';
import { reviewService } from '../../services/review.service';
import { taskService } from '../../services/task.service';
import { careLogService } from '../../services/care-log.service';
import { petService } from '../../services/pet.service';
import type { BookingResponse } from '../../types/api';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

// ─── Helpers & Meta ──────────────────────────────────────────────────────────

type TabKey = 'all' | 'upcoming' | 'active' | 'completed' | 'cancelled';

function getTabKey(b: BookingResponse): TabKey {
    const s = b.status;
    if (s === 'CANCELLED' || s === 'PENDING_PAYMENT' || s === 'WAITING_REFUND') return 'cancelled';
    if (s === 'COMPLETED') return 'completed';
    if (s === 'IN_PROGRESS') return 'active';
    return 'upcoming';
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    PENDING_PAYMENT: { label: 'Chờ thanh toán', bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-600', icon: Info },
    WAITING_SHOP_APPROVAL: { label: 'Chờ duyệt', bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-600', icon: Clock },
    CONFIRMED: { label: 'Sắp diễn ra', bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600', icon: Calendar },
    IN_PROGRESS: { label: 'Đang thực hiện', bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-600', icon: Wifi },
    COMPLETED: { label: 'Hoàn tất', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500', icon: CheckCircle },
    CANCEL_REQUESTED: { label: 'Chờ duyệt hủy', bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-600', icon: AlertCircle },
    WAITING_REFUND: { label: 'Đợi hoàn tiền', bg: 'bg-pink-100 dark:bg-pink-500/10', text: 'text-pink-600', icon: Clock },
    CANCELLED: { label: 'Đã hủy lịch', bg: 'bg-rose-100 dark:bg-rose-500/10', text: 'text-rose-600', icon: XCircle },
};

function getCategory(booking: BookingResponse): 'boarding' | 'grooming' | 'clinic' {
    // Use actual category from DB (set by shop when creating service)
    const cat = booking.category?.toUpperCase();
    if (cat === 'BOARDING' || cat === 'HOTEL') return 'boarding';
    if (cat === 'GROOMING' || cat === 'SPA') return 'grooming';
    if (cat === 'CLINIC') return 'clinic';
    // Fallback: check services array for category
    if (booking.services && booking.services.length > 0) {
        const svcCat = booking.services[0].category?.toUpperCase();
        if (svcCat === 'BOARDING' || svcCat === 'HOTEL') return 'boarding';
        if (svcCat === 'GROOMING' || svcCat === 'SPA') return 'grooming';
        if (svcCat === 'CLINIC') return 'clinic';
    }
    return 'clinic';
}

const CATEGORY_META = {
    boarding: { label: 'Boarding', icon: Home, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    grooming: { label: 'Grooming', icon: Scissors, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    clinic: { label: 'Clinic', icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
};

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

const CARE_LOG_TYPES = [
    { id: 'FEEDING', label: 'Cho ăn', icon: Utensils, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400' },
    { id: 'CLEANING', label: 'Vệ sinh', icon: Activity, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400' },
    { id: 'MEDICAL', label: 'Y tế', icon: Syringe, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400' },
    { id: 'EXERCISE', label: 'Vui chơi', icon: Heart, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400' },
];

const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'upcoming', label: 'Sắp tới' },
    { key: 'active', label: 'Đang diễn ra' },
    { key: 'completed', label:'Đã hoàn tất' },
    { key: 'cancelled', label: 'Đã huỷ' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, delay }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none flex flex-col gap-4 relative overflow-hidden group"
        >
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shadow-inner`}>
                <Icon size={22} className="text-white" />
            </div>
            <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        </motion.div>
    );
}

function BookingItem({ booking, onCancel, cancelling, onReview, onUpdateBank }: any) {
    const category = getCategory(booking);
    const cat = CATEGORY_META[category];
    const status = STATUS_META[booking.status] || STATUS_META.CONFIRMED;
    const isLive = !!booking.cameraStreamUrl;

    const queryClient = useQueryClient();
    const [showLogs, setShowLogs] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const isOld = booking.status === 'COMPLETED' || booking.status === 'CANCELLED' || booking.status === 'WAITING_REFUND';
    const [isExpanded, setIsExpanded] = useState(false);
    const [savingAlbumId, setSavingAlbumId] = useState<number | null>(null);

    const handleSaveAlbum = async (logId: number) => {
        if (!booking.petId || !logId) return;
        setSavingAlbumId(logId);
        try {
            await petService.saveAlbumImageFromCareLog(booking.petId, logId);
            toast.success('Đã lưu ảnh vào Album của bé!');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể lưu ảnh');
        } finally {
            setSavingAlbumId(null);
        }
    };


    const { data: rawCareLogs = [] } = useQuery({
        queryKey: ['bookingCareLogs', booking.id],
        queryFn: () => careLogService.getLogs(booking.id),
        enabled: !!booking.id && (booking.status === 'IN_PROGRESS' || booking.status === 'COMPLETED'),
    });
    
    const careLogs = rawCareLogs.filter((log: any) => !log.note?.startsWith('[Kết thúc sớm]') && !log.note?.startsWith('[Kết thúc trễ]'));

    if (!isExpanded) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setIsExpanded(true)}
                className="group bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 p-4 flex items-center justify-between gap-4 cursor-pointer hover:shadow-lg transition-all duration-300"
            >
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img
                            src={`https://images.unsplash.com/photo-${booking.id % 2 === 0 ? '1548199973-03cce0bbc87b' : '1516734212186-a967f81ad0d7'}?auto=format&fit=crop&q=80&w=150`}
                            alt="shop" className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[150px] sm:max-w-xs">{booking.shopName}</h4>
                            <span className="text-[10px] text-slate-400 font-bold">• Bé: {booking.petName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{booking.services && booking.services.length > 0 ? booking.services.map((s: any) => `${s.serviceName}${s.durationMinutes ? ` (${s.durationMinutes}p)` : ''}`).join(', ') : booking.serviceName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:block text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {category === 'boarding' ? 'Thời hạn lưu trú' : 'Thời gian'}
                        </p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {category === 'boarding' && booking.checkIn && booking.checkOut
                                ? `${format(parseISO(booking.checkIn), 'dd/MM/yyyy')} → ${format(parseISO(booking.checkOut), 'dd/MM/yyyy')}`
                                : format(parseISO(booking.appointmentDatetime), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1 rounded-full ${status.bg} ${status.text} text-[9px] font-black uppercase tracking-widest flex items-center gap-1`}>
                            <status.icon size={10} /> {status.label}
                        </div>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">{formatVND(booking.servicePrice)}</span>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col md:flex-row gap-8 hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] transition-all relative overflow-hidden"
        >
            {/* Left: Visual & Category */}
            <div className="w-full md:w-56 h-48 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 overflow-hidden relative shrink-0">
                <img
                    src={`https://images.unsplash.com/photo-${booking.id % 2 === 0 ? '1548199973-03cce0bbc87b' : '1516734212186-a967f81ad0d7'}?auto=format&fit=crop&q=80&w=400`}
                    alt="shop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full ${cat.bg} backdrop-blur-md flex items-center gap-2 border border-white/20`}>
                    <cat.icon size={12} className={cat.color} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${cat.color}`}>{cat.label}</span>
                </div>
                {isLive && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg animate-pulse flex items-center gap-1">
                        <div className="w-1 h-1 bg-white rounded-full" /> LIVE
                    </div>
                )}
                <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">ID Đơn</p>
                    <p className="text-sm font-black tracking-tight">#{booking.id.toString().padStart(5, '0')}</p>
                </div>
            </div>

            {/* Middle: Core Info */}
            <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-primary transition-colors">
                            {booking.shopName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`px-3 py-1 rounded-full ${status.bg} ${status.text} text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5`}>
                                <status.icon size={12} /> {status.label}
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dành cho: {booking.petName}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-slate-900 dark:text-white">{formatVND(booking.servicePrice)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trọn gói dịch vụ</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm">
                            <cat.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dịch vụ</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{booking.services && booking.services.length > 0 ? booking.services.map((s: any) => `${s.serviceName}${s.durationMinutes ? ` (${s.durationMinutes}p)` : ''}`).join(', ') : booking.serviceName}</p>
                        </div>
                    </div>
                    {booking.status === 'CANCEL_REQUESTED' && booking.cancellationReason && (
                        <div className="mt-4 rounded-3xl border border-orange-100 dark:border-orange-900/30 bg-orange-50 dark:bg-orange-950/20 p-4 text-sm text-slate-700 dark:text-orange-200">
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-2">Lý do hủy</p>
                            <p className="leading-relaxed">{booking.cancellationReason}</p>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {category === 'boarding' ? 'Thời hạn lưu trú' : 'Thời gian'}
                            </p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {category === 'boarding' && booking.checkIn && booking.checkOut
                                    ? `${format(parseISO(booking.checkIn), 'dd/MM/yyyy')} → ${format(parseISO(booking.checkOut), 'dd/MM/yyyy')}`
                                    : format(parseISO(booking.appointmentDatetime), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                                {booking.staffName || 'Chưa phân công'}
                            </p>
                        </div>
                    </div>
                </div>


                {/* Details Section */}
                <AnimatePresence>
                    {showDetails && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pt-2 pb-4 border-t border-slate-100 dark:border-slate-800/80"
                        >
                            <div className="flex items-center gap-2 mb-4 mt-2">
                                <Info className="text-emerald-500" size={14} />
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Chi tiết dịch vụ & Thanh toán</h4>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="space-y-3">
                                    <h5 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Danh sách dịch vụ</h5>
                                    {booking.services && booking.services.length > 0 ? (
                                        <div className="space-y-2">
                                            {booking.services.map((svc: any) => (
                                                <div key={svc.serviceId} className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-shadow">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{svc.serviceName}</p>
                                                        {svc.durationMinutes > 0 && <p className="text-[10px] font-bold text-slate-400 mt-0.5">⏱ Thời gian làm: {svc.durationMinutes} phút</p>}
                                                    </div>
                                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{formatVND(svc.servicePrice)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{booking.serviceName}</p>
                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{formatVND(booking.servicePrice)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Thời gian cần tới</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {category === 'boarding' && booking.checkIn
                                                ? format(parseISO(booking.checkIn), 'HH:mm • dd/MM/yyyy')
                                                : format(parseISO(booking.appointmentDatetime), 'HH:mm • dd/MM/yyyy')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                            {booking.status === 'COMPLETED' ? 'Thời gian hoàn thành' : 'Dự kiến hoàn thành'}
                                        </p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {booking.status === 'COMPLETED' && booking.updatedAt
                                                ? format(parseISO(booking.updatedAt), 'HH:mm • dd/MM/yyyy')
                                                : booking.serviceEndDatetime
                                                    ? format(parseISO(booking.serviceEndDatetime), 'HH:mm • dd/MM/yyyy')
                                                    : '—'}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-4">
                                    <div className="flex justify-between">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Phương thức thanh toán</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {booking.paymentMethod === 'PAYOS' ? '100% qua PayOS' : booking.paymentMethod === 'CASH_DEPOSIT' ? 'Đặt cọc (Tiền mặt tại quầy)' : booking.paymentMethod === 'MOCK' ? 'MOCK Payment' : 'Tiền mặt'}
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-4 flex justify-between items-center">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Đã thanh toán</p>
                                    <span className="text-lg font-black text-emerald-600">{formatVND(booking.paidAmount || 0)}</span>
                                </div>
                                {(booking.servicePrice - (booking.paidAmount || 0)) > 0 && booking.status !== 'CANCELLED' && booking.status !== 'WAITING_REFUND' && (
                                <div className="flex justify-between items-center">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Cần thanh toán thêm tại quầy</p>
                                    <span className="text-lg font-black text-rose-500">{formatVND(booking.servicePrice - (booking.paidAmount || 0))}</span>
                                </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Care Logs Timeline Section */}
                <AnimatePresence>
                    {showLogs && careLogs.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pt-2 pb-4 border-t border-slate-100 dark:border-slate-800/80"
                        >
                            <div className="flex items-center gap-2 mb-4 mt-2">
                                <Sparkles className="text-indigo-500 animate-pulse" size={14} />
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dòng thời gian hoạt động chăm sóc</h4>
                            </div>

                            <div className="relative pl-6 border-l-2 border-indigo-100 dark:border-indigo-900/40 ml-3 space-y-6">
                                {careLogs.map((log: any) => {
                                    const logType = CARE_LOG_TYPES.find(t => t.id === log.type) || {
                                        label: log.type,
                                        icon: Activity,
                                        color: 'text-slate-500 bg-slate-50 dark:bg-slate-900 dark:text-slate-400'
                                    };
                                    const LogIcon = logType.icon;

                                    return (
                                        <div key={log.id} className="relative group/timeline-item">
                                            {/* Dot icon */}
                                            <div className={`absolute -left-[37px] top-0 w-7 h-7 rounded-xl ${logType.color} border-4 border-white dark:border-slate-950 flex items-center justify-center shadow-sm group-hover/timeline-item:scale-115 transition-transform duration-300`}>
                                                <LogIcon size={11} />
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100/80 dark:border-slate-800/55 hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all duration-300">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{logType.label}</span>
                                                        <span className="text-[9px] text-slate-400 font-bold">• Nhân viên: {log.staffName}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                        {format(parseISO(log.timestamp), 'HH:mm • dd/MM/yyyy', { locale: vi })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                                    {log.note}
                                                </p>
                                                {log.imageUrl && (
                                                    <div className="mt-3 max-w-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 relative group/img">
                                                        <img src={log.imageUrl} alt="Đính kèm" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleSaveAlbum(log.id); }}
                                                                disabled={savingAlbumId === log.id}
                                                                className="px-4 py-2 bg-white/90 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-xl hover:bg-white transition-all flex items-center gap-2 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                                                            >
                                                                {savingAlbumId === log.id ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} />}
                                                                Lưu vào Album
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                        {isLive && (
                            <Link to={`/camera?bookingId=${booking.id}`} className="px-5 py-2.5 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">
                                <Video size={14} /> Xem Camera
                            </Link>
                        )}
                        {booking.status === 'COMPLETED' && (
                            <button onClick={() => onReview(booking)} className="px-5 py-2.5 bg-amber-400 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-400/20 hover:scale-105 transition-all">
                                <Star size={14} className="fill-current" /> Đánh giá
                            </button>
                        )}
                        {careLogs.length > 0 && (
                            <button
                                onClick={() => setShowLogs(!showLogs)}
                                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showLogs
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60'
                                    }`}
                            >
                                <BookOpen size={14} /> Nhật ký chăm sóc ({careLogs.length})
                            </button>
                        )}
                        <button
                            onClick={() => { setShowDetails(!showDetails); setShowLogs(false); }}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${showDetails
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                                }`}
                        >
                            <Info size={14} /> Chi tiết
                        </button>
                        <Link to="/messages" className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                            <MessageCircle size={14} /> Nhắn tin
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        {(booking.status === 'CONFIRMED' || booking.status === 'WAITING_SHOP_APPROVAL') && (
                            <button
                                onClick={() => onCancel(booking)} disabled={cancelling}
                                className="px-5 py-2.5 border border-rose-100 dark:border-rose-900/30 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all flex items-center gap-2"
                            >
                                {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Hủy lịch
                            </button>
                        )}
                        {booking.status === 'CANCEL_REQUESTED' && (
                            <div className="px-5 py-2.5 rounded-2xl bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-orange-100 dark:border-orange-900/40">
                                <AlertCircle size={14} /> Đang chờ shop duyệt hủy
                            </div>
                        )}
                        {booking.status === 'WAITING_REFUND' && (!booking.bankAccount || booking.bankAccount.trim() === '') && (
                            <button
                                onClick={() => onUpdateBank(booking)}
                                className="px-5 py-2.5 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center gap-2 animate-pulse shadow-lg shadow-rose-500/20"
                            >
                                <AlertCircle size={14} /> Cập nhật STK nhận tiền
                            </button>
                        )}
                        {booking.status === 'WAITING_REFUND' && booking.bankAccount && booking.bankAccount.trim() !== '' && (
                            <div className="px-5 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-indigo-100 dark:border-indigo-900/40">
                                <Clock size={14} /> Đang chờ Admin hoàn tiền
                            </div>
                        )}
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="px-5 py-2.5 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-all flex items-center gap-2"
                        >
                            Thu gọn
                        </button>
                        <Link to={`/clinic/${booking.shopId}`} className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                            <ChevronRight size={20} />
                        </Link>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function BookingHistory() {
    const qc = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [page, setPage] = useState(0);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPet, setSelectedPet] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    // Review state
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
    const [cancelReasonOption, setCancelReasonOption] = useState<string>('');
    const [cancelReasonOther, setCancelReasonOther] = useState('');
    const [cancelBankOption, setCancelBankOption] = useState('Vietcombank');
    const [cancelBankName, setCancelBankName] = useState('');
    const [cancelBankAccount, setCancelBankAccount] = useState('');
    const [cancelAccountHolder, setCancelAccountHolder] = useState('');
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [showUpdateBankModal, setShowUpdateBankModal] = useState(false);

    const { data: pagedBookings, isLoading, isError, refetch } = useQuery({
        queryKey: ['my-bookings', page, activeTab],
        queryFn: () => bookingService.getMyBookings(page + 1, 10, activeTab),
        staleTime: 30_000,
    });

    const bookings = pagedBookings?.content ?? [];
    const totalPages = pagedBookings?.totalPages ?? 1;
    const totalElements = pagedBookings?.totalElements ?? 0;

    const petsList = useMemo(() => {
        const pets = bookings.map(b => b.petName).filter(Boolean);
        return ['all', ...Array.from(new Set(pets))];
    }, [bookings]);

    const cancelMutation = useMutation({
        mutationFn: ({ id, reason, bankName, bankAccount, accountHolder }: { id: number; reason: string; bankName: string; bankAccount: string; accountHolder: string }) => bookingService.requestCancel(id, { reason, bankName, bankAccount, accountHolder }),
        onMutate: ({ id }) => setCancellingId(id),
        onSuccess: () => {
            toast.success('Yêu cầu hủy lịch đã được gửi tới shop');
            qc.invalidateQueries({ queryKey: ['my-bookings'] });
        },
        onError: () => toast.error('Không thể gửi yêu cầu hủy. Vui lòng thử lại.'),
        onSettled: () => setCancellingId(null),
    });

    const directCancelMutation = useMutation({
        mutationFn: (id: number) => bookingService.cancel(id),
        onMutate: () => setCancellingId(selectedBooking?.id || null),
        onSuccess: () => {
            toast.success('Hủy lịch thành công');
            qc.invalidateQueries({ queryKey: ['my-bookings'] });
        },
        onError: () => toast.error('Không thể hủy lịch. Vui lòng thử lại.'),
        onSettled: () => setCancellingId(null),
    });

    const updateBankMutation = useMutation({
        mutationFn: ({ id, bankName, bankAccount, accountHolder }: { id: number; bankName: string; bankAccount: string; accountHolder: string }) => bookingService.updateBankInfo(id, { bankName, bankAccount, accountHolder }),
        onSuccess: () => {
            toast.success('Cập nhật thông tin nhận hoàn tiền thành công!');
            setShowUpdateBankModal(false);
            qc.invalidateQueries({ queryKey: ['my-bookings'] });
        },
        onError: () => toast.error('Không thể cập nhật thông tin ngân hàng. Vui lòng thử lại.')
    });

    const handleOpenReview = (booking: BookingResponse) => {
        setSelectedBooking(booking);
        setRating(5);
        setComment('');
        setShowReviewModal(true);
    };

    const handleOpenCancel = (booking: BookingResponse) => {
        setSelectedBooking(booking);
        setCancelReasonOption('');
        setCancelReasonOther('');
        setCancelBankOption('Vietcombank');
        setCancelBankName('');
        setCancelBankAccount('');
        setCancelAccountHolder('');
        setShowCancelModal(true);
    };

    const handleOpenUpdateBank = (booking: BookingResponse) => {
        setSelectedBooking(booking);
        const knownBanks = ['Vietcombank', 'Techcombank', 'MBBank', 'VietinBank', 'BIDV', 'Agribank', 'ACB', 'TPBank', 'VPBank', 'Sacombank'];
        const isKnown = booking.bankName && knownBanks.includes(booking.bankName);
        setCancelBankOption(booking.bankName ? (isKnown ? booking.bankName : 'OTHER') : 'Vietcombank');
        setCancelBankName(booking.bankName || '');
        setCancelBankAccount(booking.bankAccount || '');
        setCancelAccountHolder(booking.accountHolder || '');
        setShowUpdateBankModal(true);
    };

    const handleSubmitUpdateBank = async () => {
        if (!selectedBooking) return;
        const finalBankName = cancelBankOption === 'OTHER' ? cancelBankName.trim() : cancelBankOption;
        if (!finalBankName || !cancelBankAccount.trim() || !cancelAccountHolder.trim()) {
            toast.error('Vui lòng cung cấp đầy đủ thông tin ngân hàng để nhận hoàn tiền');
            return;
        }
        await updateBankMutation.mutateAsync({
            id: selectedBooking.id,
            bankName: finalBankName,
            bankAccount: cancelBankAccount.trim(),
            accountHolder: cancelAccountHolder.trim(),
        });
    };

    const handleSubmitCancelRequest = async () => {
        if (!selectedBooking) return;
        const reason = cancelReasonOption === 'OTHER' ? cancelReasonOther.trim() : cancelReasonOption;
        
        if (!reason) {
            toast.error('Vui lòng chọn hoặc nhập lý do hủy');
            return;
        }

        if (selectedBooking.paymentMethod === 'CASH_DEPOSIT') {
            try {
                await directCancelMutation.mutateAsync(selectedBooking.id);
                setShowCancelModal(false);
            } catch {
                setShowCancelModal(false);
            }
            return;
        }

        const finalBankName = cancelBankOption === 'OTHER' ? cancelBankName.trim() : cancelBankOption;

        if (!finalBankName || !cancelBankAccount.trim() || !cancelAccountHolder.trim()) {
            toast.error('Vui lòng cung cấp đầy đủ thông tin ngân hàng để nhận hoàn tiền');
            return;
        }
        try {
            await cancelMutation.mutateAsync({
                id: selectedBooking.id,
                reason,
                bankName: finalBankName,
                bankAccount: cancelBankAccount.trim(),
                accountHolder: cancelAccountHolder.trim(),
            });
            setShowCancelModal(false);
        } catch {
            setShowCancelModal(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!selectedBooking) return;
        if (!comment.trim()) {
            toast.error('Vui lòng nhập nhận xét');
            return;
        }

        try {
            setSubmitting(true);
            await reviewService.createReview({
                shopId: selectedBooking.shopId,
                bookingId: selectedBooking.id,
                rating,
                comment
            });
            toast.success('Đánh giá của bạn đã được gửi!');
            setShowReviewModal(false);
            refetch();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể gửi đánh giá');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = useMemo(() => {
        let list = bookings;

        // 2. Search query filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(b =>
                b.shopName.toLowerCase().includes(query) ||
                b.serviceName.toLowerCase().includes(query) ||
                (b.petName && b.petName.toLowerCase().includes(query)) ||
                b.id.toString().includes(query)
            );
        }

        // 3. Pet filter
        if (selectedPet !== 'all') {
            list = list.filter(b => b.petName === selectedPet);
        }

        // 4. Category filter
        if (selectedCategory !== 'all') {
            list = list.filter(b => getCategory(b) === selectedCategory);
        }
        
        if (sortOrder === 'asc') {
            list.sort((a, b) => new Date(a.appointmentDatetime).getTime() - new Date(b.appointmentDatetime).getTime());
        } else {
            list.sort((a, b) => new Date(b.appointmentDatetime).getTime() - new Date(a.appointmentDatetime).getTime());
        }

        return list;
    }, [bookings, searchQuery, selectedPet, selectedCategory, sortOrder]);

    const groupedBookings = useMemo(() => {
        const groups: Record<string, BookingResponse[]> = {};
        filtered.forEach(b => {
            let monthStr = 'Thời gian khác';
            try {
                const date = parseISO(b.appointmentDatetime);
                monthStr = 'Tháng ' + format(date, 'MM/yyyy');
            } catch (e) {
                console.error(e);
            }
            if (!groups[monthStr]) {
                groups[monthStr] = [];
            }
            groups[monthStr].push(b);
        });
        return groups;
    }, [filtered]);

    if (isLoading && !pagedBookings) return (
        <div className="flex-1 flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary" />
                <Loader2 className="absolute inset-0 m-auto text-primary animate-pulse" size={24} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Đang đồng bộ lịch hẹn...</p>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col gap-10 p-4 md:p-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <Calendar size={24} />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Lịch sử đặt chỗ</h1>
                    </div>
                    <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em] ml-1">Quản lý sức khỏe & Làm đẹp cho thú cưng</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refetch()} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-primary transition-all">
                        <RefreshCw size={20} />
                    </button>
                    <Link to="/search" className="px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all">
                        <Plus size={20} /> Đặt dịch vụ mới
                    </Link>
                </div>
            </div>

            {/* Filters & Search Control Panel */}
            <div className="flex flex-col gap-6 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/80">
                {/* Tabs & Search */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 w-full justify-between">
                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 w-fit overflow-x-auto shrink-0 max-w-full">
                        {TABS.map(tab => (
                            <button
                                key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(0); }}
                                className={`px-5 py-2.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.key ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full lg:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                            placeholder="Tìm kiếm cửa hàng, dịch vụ..."
                            className="w-full pl-11 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:border-primary/50 transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setPage(0); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub Filters: Pet & Category */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 w-full">
                    {/* Pet Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Thú cưng:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {petsList.map(petName => (
                                <button
                                    key={petName}
                                    onClick={() => { setSelectedPet(petName); setPage(0); }}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${selectedPet === petName
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 border-slate-100 dark:border-slate-800'
                                        }`}
                                >
                                    {petName === 'all' ? 'Tất cả' : petName}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-850" />

                    {/* Category Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Dịch vụ:</span>
                        <div className="flex items-center gap-1.5">
                            {[
                                { key: 'all', label: 'Tất cả' },
                                { key: 'boarding', label: 'Lưu trú' },
                                { key: 'grooming', label: 'Làm đẹp' },
                                { key: 'clinic', label: 'Khám bệnh' }
                            ].map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => { setSelectedCategory(cat.key); }}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${selectedCategory === cat.key
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-sm'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 border-slate-100 dark:border-slate-800'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-6 bg-slate-200 dark:bg-slate-850" />

                    {/* Sort Order */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Ngày tạo:</span>
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-1">
                            <button
                                onClick={() => setSortOrder('desc')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${sortOrder === 'desc'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Mới nhất
                            </button>
                            <button
                                onClick={() => setSortOrder('asc')}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${sortOrder === 'asc'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Cũ nhất
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-10 transition-opacity duration-200">
                {filtered.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-[4rem] border-2 border-dashed border-slate-100 dark:border-slate-800 p-24 text-center">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                            <Search size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Không tìm thấy lịch hẹn</h3>
                        <p className="text-slate-400 text-sm max-w-xs mx-auto">Chúng tôi không tìm thấy bất kỳ lịch hẹn nào khớp với bộ lọc. Hãy thử đổi từ khóa hoặc bộ lọc!</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.entries(groupedBookings).map(([monthStr, monthBookings]) => (
                            <div key={monthStr} className="space-y-4">
                                {/* Month Section Header */}
                                <div className="flex items-center gap-4 ml-2">
                                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{monthStr}</span>
                                    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800/80" />
                                </div>

                                {/* Month Bookings */}
                                <div className="space-y-6">
                                    {monthBookings.map(b => (
                                        <BookingItem
                                            key={b.id}
                                            booking={b}
                                            onCancel={handleOpenCancel}
                                            cancelling={cancellingId === b.id}
                                            onReview={handleOpenReview}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Trang {page + 1} / {totalPages} · {totalElements} cuộc hẹn
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                ← Trước
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i).filter(i => Math.abs(i - page) <= 2).map(i => (
                                <button
                                    key={i}
                                    onClick={() => setPage(i)}
                                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${
                                        i === page
                                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                                            : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-primary/50'
                                    }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Cancel Request Modal */}
            <AnimatePresence>
                {showCancelModal && selectedBooking && (() => {
                    const paymentMethod = selectedBooking.paymentMethod || 'CASH';
                    const isPayOS = paymentMethod === 'PAYOS';
                    const isDepositOnly = !isPayOS;

                    const depositAmount = selectedBooking.servicePrice * 0.1;
                    const paidAmount = isPayOS ? selectedBooking.servicePrice : depositAmount;

                    const appointmentTime = selectedBooking.appointmentDatetime ? parseISO(selectedBooking.appointmentDatetime) : new Date();
                    const hoursToAppointment = (appointmentTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

                    const isBefore5Hours = hoursToAppointment >= 5;

                    let refundAmount = 0;
                    let penaltyAmount = 0;
                    let oweAmount = 0;

                    if (isBefore5Hours) {
                        if (isPayOS) {
                            refundAmount = paidAmount - depositAmount;
                        }
                    } else {
                        penaltyAmount = selectedBooking.servicePrice * 0.5;
                        if (isPayOS) {
                            refundAmount = paidAmount - depositAmount - penaltyAmount;
                            if (refundAmount < 0) refundAmount = 0;
                        } else {
                            oweAmount = penaltyAmount;
                        }
                    }

                    return (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowCancelModal(false)}
                            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 28 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 28 }}
                            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-950 rounded-[2rem] shadow-[0_40px_120px_-30px_rgba(15,23,42,0.45)] overflow-hidden border border-slate-200/70 dark:border-slate-800"
                        >
                            <div className="bg-gradient-to-r from-[#1a2b4c] to-blue-900 p-8 text-white shrink-0">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-3xl bg-white/15 flex items-center justify-center shadow-lg shadow-[#1a2b4c]/30">
                                        <XCircle size={32} className="text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black tracking-tight">Gửi yêu cầu hủy lịch</h2>
                                        <p className="text-sm opacity-90 leading-relaxed">Chúng tôi sẽ chuyển yêu cầu này đến shop và cập nhật khi có phản hồi.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto">
                                <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-center rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Đơn hàng</p>
                                        <p className="mt-2 text-base font-black text-slate-900 dark:text-white">{selectedBooking.services && selectedBooking.services.length > 0 ? selectedBooking.services.map((s: any) => s.serviceName).join(', ') : selectedBooking.serviceName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedBooking.shopName} • Bé: {selectedBooking.petName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {getCategory(selectedBooking) === 'boarding' && selectedBooking.checkIn && selectedBooking.checkOut
                                                ? `Lưu trú: ${format(parseISO(selectedBooking.checkIn), 'dd/MM/yyyy')} → ${format(parseISO(selectedBooking.checkOut), 'dd/MM/yyyy')}`
                                                : format(parseISO(selectedBooking.appointmentDatetime), 'dd/MM/yyyy • HH:mm', { locale: vi })}
                                        </p>
                                    </div>
                                    <div className="rounded-3xl bg-white dark:bg-slate-950 shadow-sm border border-slate-200 dark:border-slate-800 px-4 py-3 text-right">
                                        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Tổng tiền</p>
                                        <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{formatVND(selectedBooking.servicePrice)}</p>
                                    </div>
                                </div>

                                {/* Chi tiết tính toán hoàn tiền */}
                                {true && (
                                    <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-6 space-y-4">
                                        <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200">
                                            <Wallet size={18} />
                                            <h4 className="font-black tracking-tight text-base">Thông tin thanh toán & hoàn tiền</h4>
                                        </div>
                                        
                                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Tổng tiền dịch vụ:</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{formatVND(selectedBooking.servicePrice)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Đã thanh toán:</span>
                                                <span className="font-bold text-slate-900 dark:text-white flex items-center">
                                                    {formatVND(paidAmount)}
                                                    <span className="text-[9px] uppercase ml-2 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold tracking-widest">
                                                        {isPayOS ? 'Toàn bộ' : 'Cọc 10%'}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">Thời gian đến giờ hẹn:</span>
                                                <span className={`font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-widest flex items-center gap-1 ${isBefore5Hours ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                                                    <Clock size={12} />
                                                    {hoursToAppointment > 0 ? `Còn ${Math.floor(hoursToAppointment)} giờ` : 'Đã quá giờ'}
                                                </span>
                                            </div>
                                            
                                            <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3" />
                                            
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-slate-500">Phí giữ chỗ (Mất cọc):</span>
                                                <span className="font-bold text-rose-500">-{formatVND(depositAmount)}</span>
                                            </div>
                                            {!isBefore5Hours && (
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="font-medium flex items-center gap-1.5 text-slate-500"><AlertCircle size={14} className="text-rose-500" /> Phạt hủy muộn (50%):</span>
                                                    <span className="font-bold text-rose-500">-{formatVND(penaltyAmount)}</span>
                                                </div>
                                            )}
                                            
                                            <div className="border-t border-slate-200 dark:border-slate-800 my-3 pt-3" />
                                            
                                            <div className="flex flex-col gap-2 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                                                <div className="flex justify-between items-center text-lg">
                                                    <span className="font-black text-slate-900 dark:text-white text-base">Tổng tiền hoàn lại:</span>
                                                    <span className="font-black text-emerald-500 text-xl">{formatVND(refundAmount)}</span>
                                                </div>
                                                {oweAmount > 0 && (
                                                    <div className="flex justify-between items-center pt-3 mt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                                                        <span className="font-black text-rose-500 text-sm flex items-center gap-1.5"><AlertCircle size={14}/> Cần đền bù cho Shop:</span>
                                                        <span className="font-black text-rose-500">{formatVND(oweAmount)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="mt-4 bg-slate-100/80 dark:bg-slate-800/50 rounded-xl p-3 flex gap-2.5 items-start">
                                                <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                                    Hủy trước 5 giờ chỉ mất phí giữ chỗ (10%). Hủy sau 5 giờ mất phí giữ chỗ và 50% tiền dịch vụ bồi thường cho cửa hàng.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Chọn lý do hủy</p>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Bắt buộc</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { value: 'Không thể đến', label: 'Không thể đến' },
                                            { value: 'Thay đổi lịch trình', label: 'Thay đổi lịch trình' },
                                            { value: 'Tìm thấy dịch vụ khác', label: 'Tìm thấy dịch vụ khác' },
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
                                            className="w-full min-h-[140px] rounded-[1.75rem] border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                                        />
                                    </div>
                                )}

                                {selectedBooking.paymentMethod === 'CASH_DEPOSIT' ? (
                                    <div className="rounded-[2rem] bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-5 text-sm text-orange-700 dark:text-orange-400">
                                        <p className="font-bold">Lưu ý về đơn đặt cọc:</p>
                                        <p className="mt-2 leading-6">Đây là đơn thanh toán một phần (đặt cọc). Theo chính sách, bạn sẽ không được hoàn lại phí cọc khi tự hủy lịch. Đơn sẽ được chuyển sang trạng thái ĐÃ HỦY ngay lập tức.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Ngân hàng</label>
                                                <select
                                                    value={cancelBankOption}
                                                    onChange={e => setCancelBankOption(e.target.value)}
                                                    className="w-full rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none"
                                                >
                                                    <option value="Vietcombank">Vietcombank</option>
                                                    <option value="Techcombank">Techcombank</option>
                                                    <option value="MBBank">MBBank</option>
                                                    <option value="VietinBank">VietinBank</option>
                                                    <option value="BIDV">BIDV</option>
                                                    <option value="Agribank">Agribank</option>
                                                    <option value="ACB">ACB</option>
                                                    <option value="TPBank">TPBank</option>
                                                    <option value="VPBank">VPBank</option>
                                                    <option value="Sacombank">Sacombank</option>
                                                    <option value="OTHER">Khác</option>
                                                </select>
                                            </div>
                                            {cancelBankOption === 'OTHER' && (
                                                <div className="space-y-3 sm:col-span-2">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Tên ngân hàng thụ hưởng</label>
                                                    <input
                                                        value={cancelBankName}
                                                        onChange={e => setCancelBankName(e.target.value)}
                                                        placeholder="Ví dụ: VIB, OCB, Bản Việt..."
                                                        className="w-full rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Số tài khoản</label>
                                                <input
                                                    value={cancelBankAccount}
                                                    onChange={e => setCancelBankAccount(e.target.value)}
                                                    placeholder="Nhập số tài khoản"
                                                    className="w-full rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Tên người hưởng thụ</label>
                                            <input
                                                value={cancelAccountHolder}
                                                onChange={e => setCancelAccountHolder(e.target.value)}
                                                placeholder="Nhập tên chủ tài khoản"
                                                className="w-full rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                            />
                                        </div>
                                        <div className="rounded-[2rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 text-sm text-slate-500 dark:text-slate-400">
                                            <p className="font-bold text-slate-700 dark:text-slate-200">Lưu ý:</p>
                                            <p className="mt-2 leading-6">Shop sẽ xem xét yêu cầu hủy và phản hồi trong vòng 24 giờ. Bạn sẽ nhận được thông báo khi yêu cầu được duyệt hoặc từ chối.</p>
                                        </div>
                                    </>
                                )}

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <button
                                        onClick={() => setShowCancelModal(false)}
                                        className="px-6 py-4 rounded-3xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-black uppercase tracking-[0.25em] hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                                    >
                                        Quay lại
                                    </button>
                                    <button
                                        onClick={handleSubmitCancelRequest}
                                        disabled={cancelMutation.isPending}
                                        className="px-6 py-4 rounded-3xl bg-[#1a2b4c] text-white font-black uppercase tracking-[0.25em] shadow-lg shadow-[#1a2b4c]/30 hover:bg-[#1a2b4c]/90 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                                    >
                                        {cancelMutation.isPending || directCancelMutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Gửi yêu cầu hủy'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )})()}
            </AnimatePresence>

            {/* Update Bank Modal */}
            <AnimatePresence>
                {showUpdateBankModal && selectedBooking && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowUpdateBankModal(false)}
                            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 28 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 28 }}
                            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-950 rounded-[2rem] shadow-[0_40px_120px_-30px_rgba(15,23,42,0.45)] overflow-hidden border border-slate-200/70 dark:border-slate-800"
                        >
                            <div className="bg-gradient-to-r from-indigo-500 to-blue-500 p-8 text-white shrink-0">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-3xl bg-white/15 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <Wallet size={32} className="text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-black tracking-tight">Cập nhật thông tin ngân hàng</h2>
                                        <p className="text-sm opacity-90 leading-relaxed">Vui lòng cung cấp STK để Admin có thể tiến hành hoàn tiền cho bạn.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Ngân hàng</label>
                                        <select
                                            value={cancelBankOption}
                                            onChange={e => setCancelBankOption(e.target.value)}
                                            className="w-full rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 appearance-none"
                                        >
                                            <option value="Vietcombank">Vietcombank</option>
                                            <option value="Techcombank">Techcombank</option>
                                            <option value="MBBank">MBBank</option>
                                            <option value="VietinBank">VietinBank</option>
                                            <option value="BIDV">BIDV</option>
                                            <option value="Agribank">Agribank</option>
                                            <option value="ACB">ACB</option>
                                            <option value="TPBank">TPBank</option>
                                            <option value="VPBank">VPBank</option>
                                            <option value="Sacombank">Sacombank</option>
                                            <option value="OTHER">Khác</option>
                                        </select>
                                    </div>
                                    {cancelBankOption === 'OTHER' && (
                                        <div className="space-y-3 sm:col-span-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Tên ngân hàng thụ hưởng</label>
                                            <input
                                                value={cancelBankName}
                                                onChange={e => setCancelBankName(e.target.value)}
                                                placeholder="Ví dụ: VIB, OCB, Bản Việt..."
                                                className="w-full rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Số tài khoản</label>
                                        <input
                                            value={cancelBankAccount}
                                            onChange={e => setCancelBankAccount(e.target.value)}
                                            placeholder="Nhập số tài khoản"
                                            className="w-full rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Tên người hưởng thụ</label>
                                    <input
                                        value={cancelAccountHolder}
                                        onChange={e => setCancelAccountHolder(e.target.value)}
                                        placeholder="Nhập tên chủ tài khoản"
                                        className="w-full rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-100 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                                    />
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 mt-4">
                                    <button
                                        onClick={() => setShowUpdateBankModal(false)}
                                        className="px-6 py-4 rounded-3xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-black uppercase tracking-[0.25em] hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                                    >
                                        Quay lại
                                    </button>
                                    <button
                                        onClick={handleSubmitUpdateBank}
                                        disabled={updateBankMutation.isPending}
                                        className="px-6 py-4 rounded-3xl bg-indigo-500 text-white font-black uppercase tracking-[0.25em] shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                                    >
                                        {updateBankMutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Gửi thông tin'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Review Modal */}
            <AnimatePresence>
                {showReviewModal && selectedBooking && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowReviewModal(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/10"
                        >
                            <div className="bg-yellow-500 p-8 text-white relative">
                                <Sparkles className="absolute top-4 right-4 text-white/40" size={60} />
                                <h2 className="text-2xl font-black tracking-tight">Đánh giá trải nghiệm</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Cảm ơn bạn đã tin tưởng hệ thống</p>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-3xl">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-yellow-600 shadow-sm">
                                        <Sparkles size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{selectedBooking.services && selectedBooking.services.length > 0 ? selectedBooking.services.map((s: any) => s.serviceName).join(', ') : selectedBooking.serviceName}</p>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedBooking.shopName}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-center text-sm font-bold text-slate-500">Mức độ hài lòng của bạn?</p>
                                    <div className="flex justify-center gap-3">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button key={star} onClick={() => setRating(star)} className="transition-transform active:scale-90">
                                                <Star size={40} className={`${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 dark:text-slate-700'} transition-all`} />
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-center text-xs font-black text-yellow-600 uppercase tracking-widest">
                                        {['Rất tệ', 'Tạm được', 'Bình thường', 'Rất tốt', 'Tuyệt vời'][rating - 1]}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Chia sẻ chi tiết</label>
                                    <textarea
                                        value={comment} onChange={e => setComment(e.target.value)}
                                        placeholder="Bạn cảm thấy thế nào về bác sĩ và cơ sở vật chất?"
                                        className="w-full h-32 px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-3xl focus:ring-4 focus:ring-yellow-500/20 outline-none font-bold text-sm text-slate-700 dark:text-white transition-all resize-none"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => setShowReviewModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Hủy bỏ</button>
                                    <button
                                        onClick={handleSubmitReview} disabled={submitting}
                                        className="flex-[2] py-4 bg-yellow-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-yellow-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
                                    >
                                        {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Gửi đánh giá ngay'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
