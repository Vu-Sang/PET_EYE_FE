import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday, subMonths, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { bookingService } from '../../services/booking.service';
import { careLogService } from '../../services/care-log.service';
import toast from 'react-hot-toast';
import StaffAssignmentSelect from '../../components/StaffAssignmentSelect';
import ShopAddBookingModal from '../../components/shop/ShopAddBookingModal';
import ShopCancelBookingModal from '../../components/shop/ShopCancelBookingModal';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
    Calendar as CalendarIcon, Clock, User, CheckCircle, XCircle,
    AlertCircle, Search, Filter, Loader2, ChevronDown, UserCheck,
    LayoutGrid, List as ListIcon, ChevronLeft, ChevronRight, Plus,
    Timer, MessageCircle, MoreVertical, CheckCircle2, Video,
    MapPin, Phone, Mail, Scissors, Info, X, Play,
    Activity, Utensils, Syringe, Heart, Sparkles, FileText, Download, Send, PawPrint
} from 'lucide-react';
import { taskService, type TaskResponse } from '../../services/task.service';
import { staffService, type StaffResponse } from '../../services/staff.service';
import { useTheme } from '../../contexts/ThemeContext';

// Constants
const STATUS_CONFIG: Record<string, any> = {
    CONFIRMED: { label: 'Chờ xử lý', color: 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20 dark:shadow-[0_0_10px_rgba(251,191,36,0.15)]', icon: Clock },
    IN_PROGRESS: { label: 'Đang làm', color: 'text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20 dark:shadow-[0_0_10px_rgba(59,130,246,0.15)]', icon: Clock },
    COMPLETED: { label: 'Hoàn thành', color: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:shadow-[0_0_10px_rgba(16,185,129,0.15)]', icon: CheckCircle },
    CANCELLED: { label: 'Đã hủy', color: 'text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20 dark:shadow-[0_0_10px_rgba(244,63,94,0.15)]', icon: X },
    PENDING_PAYMENT: { label: 'Chờ thanh toán', color: 'text-slate-600 bg-slate-50 border-slate-100 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20', icon: Clock },
    WAITING_REFUND: { label: 'Chờ hoàn tiền', color: 'text-slate-600 bg-slate-50 border-slate-100 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20', icon: Clock },
    WAITING_SHOP_APPROVAL: { label: 'Chờ duyệt', color: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:shadow-[0_0_10px_rgba(99,102,241,0.15)]', icon: AlertCircle }
};

interface BookingListItemProps {
    booking: any;
    staffList: StaffResponse[];
    updatingId: number | null;
    sendingInvoiceId: number | null;
    onAssign: (bookingId: number, staffId: number | 'unassign') => void;
    handleUpdateStatus: (bookingId: number, status: string) => void;
    handleSendInvoice: (bookingId: number) => void;
    setViewInvoiceBooking: (booking: any) => void;
    setSelectedBooking: (booking: any) => void;
    onAddBooking: (data: any) => void;
    onShopCancel: (booking: any) => void;
}

const CARE_LOG_TYPES = [
    { id: 'FEEDING', label: 'Cho ăn', icon: Utensils, color: 'text-orange-500 bg-orange-50' },
    { id: 'CLEANING', label: 'Vệ sinh', icon: Activity, color: 'text-blue-500 bg-blue-50' },
    { id: 'MEDICAL', label: 'Y tế', icon: Syringe, color: 'text-emerald-500 bg-emerald-50' },
    { id: 'EXERCISE', label: 'Vui chơi', icon: Heart, color: 'text-purple-500 bg-purple-50' },
];
function BookingListItem({
    booking, staffList, updatingId, sendingInvoiceId,
    onAssign, handleUpdateStatus, handleSendInvoice,
    setViewInvoiceBooking, setSelectedBooking, onAddBooking, onShopCancel
}: BookingListItemProps) {
    const { isDark } = useTheme();
    const { data: pendingRequest } = useQuery({
        queryKey: ['pendingStaffChangeRequest', booking.bookingId],
        queryFn: () => taskService.getPendingStaffChangeRequest(booking.bookingId),
        enabled: !!booking.bookingId && (booking.status === 'WAITING_SHOP_APPROVAL' || booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS'),
    });

    const isPending = !!pendingRequest;
    const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CONFIRMED;
    const StatusIcon = cfg.icon;
    const totalServices = booking.services?.length ?? (booking.serviceId ? 1 : 0);
    const completedServices = (booking.completedServiceIds && booking.completedServiceIds.length) || (booking.services ? booking.services.filter((s: any) => s.completedAt).length : 0);

    return (
        <div className={`rounded-[2rem] p-6 transition-all group relative hover:z-20 focus-within:z-50 ${isDark ? 'admin-glass-card bg-slate-900/40 hover:bg-slate-900/60' : 'bg-white shadow-sm hover:shadow-xl border border-slate-100'}`}>
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${isDark ? 'bg-slate-800/50 text-indigo-400 shadow-lg glow-indigo' : 'bg-slate-50 text-[#1a2b4c]'}`}>#{(booking.bookingId || '').toString().slice(-3)}</div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Đơn hàng #{booking.bookingId}</h3>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider ${cfg.color}`}>
                                    <StatusIcon size={10} className={booking.status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
                                    {cfg.label}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-bold">{booking.services && booking.services.length > 0 ? booking.services.map((s: any) => s.serviceName).join(', ') : booking.serviceName}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400"><User size={14} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{booking.customerName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400"><Clock size={14} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{format(parseISO(booking.appointmentDatetime), "eee, dd/MM - HH:mm", { locale: vi })}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">🐾</div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thú cưng</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{booking.petName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400"><UserCheck size={14} /></div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phụ trách</p>
                                    <StaffAssignmentSelect bookingId={booking.bookingId} status={booking.status} currentStaffId={booking.staffId} staffList={staffList} updatingId={updatingId} onAssign={onAssign} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:w-48 flex flex-col justify-center gap-2">
                    <button onClick={() => setSelectedBooking(booking)} className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg ${isDark ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-[#1a2b4c] text-white shadow-indigo-900/10'}`}>
                        <Info size={12} /> Xem chi tiết
                    </button>

                    <button
                        onClick={() => onAddBooking({ customerId: booking.customerId || booking.userId, customerName: booking.customerName || 'Khách hàng', shopId: booking.shopId, defaultPetId: booking.petId })}
                        className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 border ${isDark ? 'border-pink-500/30 text-pink-400 hover:bg-pink-500/10' : 'border-pink-200 text-pink-600 hover:bg-pink-50'}`}
                    >
                        <Plus size={12} /> Đặt lịch thêm
                    </button>

                    {booking.status === 'WAITING_SHOP_APPROVAL' && (
                        <div className="flex flex-col gap-2">
                            {!isPending && (
                                <button disabled={updatingId === booking.bookingId} onClick={() => {
                                    if (!booking.staffId) {
                                        toast.error('Vui lòng chọn nhân viên phụ trách trước khi duyệt đơn!');
                                        return;
                                    }
                                    handleUpdateStatus(booking.bookingId, 'CONFIRMED');
                                }} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                                    {updatingId === booking.bookingId ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Duyệt đơn
                                </button>
                            )}
                            <button disabled={updatingId === booking.bookingId} onClick={() => onShopCancel(booking)} className={`w-full py-3 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-100 text-red-500 hover:bg-red-50'}`}>
                                <XCircle size={12} /> Từ chối
                            </button>
                        </div>
                    )}

                    {booking.status === 'CANCEL_REQUESTED' && (
                        <div className="flex flex-col gap-3">
                            <div className="rounded-3xl border border-orange-100 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/40 p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-orange-600 mb-2">Lý do hủy</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-orange-200">{booking.cancellationReason || 'Khách hàng yêu cầu hủy lịch'}</p>
                            </div>
                            <button disabled={updatingId === booking.bookingId} onClick={() => handleUpdateStatus(booking.bookingId, 'CANCELLED')} className="w-full py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                                {updatingId === booking.bookingId ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Duyệt hủy lịch
                            </button>
                        </div>
                    )}

                    {(booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS' || booking.status === 'PENDING_PAYMENT') && (
                        <button disabled={updatingId === booking.bookingId} onClick={() => onShopCancel(booking)} className={`w-full mt-2 py-3 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isDark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-100 text-red-500 hover:bg-red-50'}`}>
                            <XCircle size={12} /> Hủy lịch
                        </button>
                    )}

                    {booking.status === 'COMPLETED' && (
                        <div className="flex flex-col gap-2">
                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">Hoàn thành</p>
                                <p className="text-[10px] font-bold">Dịch vụ đã hoàn tất.</p>
                            </div>
                            <button
                                onClick={() => setViewInvoiceBooking(booking)}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                                <FileText size={12} />
                                Xem hóa đơn
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ShopBookings() {
    const { isDark } = useTheme();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [staffList, setStaffList] = useState<StaffResponse[]>([]);
    const [filter, setFilter] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
    const [sendingInvoiceId, setSendingInvoiceId] = useState<number | null>(null);
    const [viewInvoiceBooking, setViewInvoiceBooking] = useState<any | null>(null);
    const [cancelModalData, setCancelModalData] = useState<any | null>(null);
    const [isCanceling, setIsCanceling] = useState(false);

    const handleDownloadPDF = async () => {
        const element = document.getElementById('invoice-receipt-content');
        if (!element) return;

        toast.loading('Đang tạo PDF...', { id: 'pdf-toast' });
        try {
            // Using html-to-image to handle modern CSS (like oklch) correctly
            const imgData = await toPng(element, {
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                pixelRatio: 2
            });
            const pdf = new jsPDF('p', 'mm', 'a4');

            // Calculate dimensions to fit A4 width
            const canvasWidth = element.offsetWidth;
            const canvasHeight = element.offsetHeight;

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`PetEye_HoaDon_${viewInvoiceBooking.bookingId || viewInvoiceBooking.id}.pdf`);

            toast.success('Đã tải biên lai PDF thành công!', { id: 'pdf-toast' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Có lỗi xảy ra khi tải PDF', { id: 'pdf-toast' });
        }
    };

    // Add Booking State
    const [addBookingData, setAddBookingData] = useState<{ isOpen: boolean; customerId: number; customerName: string; shopId: number; defaultPetId: number } | null>(null);


    // Calendar States
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

    // Data Fetching for List
    const { data: listBookings = [], isLoading: listLoading, refetch: refetchList } = useQuery({
        queryKey: ['allShopTasks'],
        queryFn: () => taskService.getAllShopTasks(),
    });

    // Data Fetching for Calendar (Range based)
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const { data: calendarBookings = [], isLoading: calendarLoading, refetch: refetchCalendar } = useQuery({
        queryKey: ['shopBookingsRange', format(currentDate, 'yyyy-MM')],
        queryFn: () => bookingService.getShopBookings(calendarStart.toISOString(), calendarEnd.toISOString()),
        enabled: viewMode === 'calendar'
    });

    const selectedBookingId = selectedBooking?.bookingId || selectedBooking?.id;
    const { data: rawCareLogs = [], isLoading: loadingLogs } = useQuery({
        queryKey: ['shopBookingCareLogs', selectedBookingId],
        queryFn: () => careLogService.getLogs(selectedBookingId),
        enabled: !!selectedBookingId && (selectedBooking.status === 'IN_PROGRESS' || selectedBooking.status === 'COMPLETED'),
    });

    const careLogs = rawCareLogs.filter((log: any) => !log.note?.startsWith('[Kết thúc sớm]') && !log.note?.startsWith('[Kết thúc trễ]'));

    useEffect(() => {
        staffService.getMyShopStaff().then(data => setStaffList(data.filter(s => s.isActive)));
    }, []);

    const handleUpdateStatus = async (bookingId: number, status: string) => {
        setUpdatingId(bookingId);
        try {
            if (status === 'CANCELLED') {
                await bookingService.cancel(bookingId);
                toast.success('Đã hủy đơn hàng');
            } else if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
                await taskService.updateStatus(bookingId, status as any);
                toast.success(status === 'IN_PROGRESS' ? 'Đã bắt đầu công việc' : 'Đã hoàn thành công việc');
            } else if (status === 'CONFIRMED') {
                await taskService.updateStatus(bookingId, status as any);
                toast.success('Đã duyệt đơn hàng');
            }
            refetchList();
            refetchCalendar();
            if (selectedBooking?.bookingId === bookingId || selectedBooking?.id === bookingId) {
                setSelectedBooking(null);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleAssignStaff = async (bookingId: number, staffId: number | 'unassign') => {
        if (staffId === 'unassign') return; // Not allowed

        setUpdatingId(bookingId);
        try {
            await taskService.assignTask(bookingId, staffId as number);
            toast.success('Đã giao việc thành công');
            refetchList();
            refetchCalendar();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Giao việc thất bại');
        } finally {
            setUpdatingId(null);
        }
    };



    // Xuất hóa đơn thủ công — chỉ dành cho COMPLETED + CASH
    const handleSendInvoice = async (bookingId: number) => {
        setSendingInvoiceId(bookingId);
        try {
            await bookingService.sendInvoice(bookingId);
            toast.success('Đã gửi hóa đơn tới email khách hàng!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Gửi hóa đơn thất bại. Vui lòng thử lại.');
        } finally {
            setSendingInvoiceId(null);
        }
    };

    const filteredList = listBookings.filter((b) => {
        const matchesFilter = filter === 'ALL' || b.status === filter;
        const matchesSearch =
            b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.bookingId || (b as any).id)?.toString().includes(searchTerm);
        return matchesFilter && matchesSearch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Group filteredList by bookingId to avoid duplicate booking cards when multiple service-items exist
    const groupedFilteredList = (() => {
        const map = new Map<number, any>();
        const precedence = ['IN_PROGRESS', 'CONFIRMED', 'PENDING_PAYMENT', 'WAITING_REFUND', 'COMPLETED', 'CANCELLED', 'CANCEL_REQUESTED'];

        for (const item of filteredList) {
            const bid = item.bookingId || (item as any).id;
            const existing = map.get(bid);

            const svcArr: any[] = [];
            if (item.services && item.services.length) svcArr.push(...item.services);
            else if (item.serviceId) svcArr.push({ serviceId: item.serviceId, serviceName: item.serviceName, servicePrice: item.servicePrice });

            if (!existing) {
                const cloned = { ...item, bookingId: bid, services: svcArr, completedServiceIds: item.completedServiceIds || [] };
                map.set(bid, cloned);
            } else {
                // merge services
                const merged = [...(existing.services || []), ...svcArr];
                const seen = new Map();
                const deduped: any[] = [];
                for (const s of merged) {
                    if (!s) continue;
                    const id = s.serviceId ?? `${s.serviceName}-${s.servicePrice ?? ''}`;
                    if (!seen.has(id)) { seen.set(id, true); deduped.push(s); }
                }
                existing.services = deduped;

                // compute status with precedence
                const statuses = [existing.status, item.status];
                let chosen = statuses[0];
                for (const st of statuses) {
                    if (precedence.indexOf(st) < precedence.indexOf(chosen)) chosen = st;
                }
                existing.status = chosen;

                // representative appointmentDatetime: keep the latest
                try {
                    if (new Date(item.appointmentDatetime).getTime() > new Date(existing.appointmentDatetime).getTime()) {
                        existing.appointmentDatetime = item.appointmentDatetime;
                    }
                } catch (e) { }

                // merge completedServiceIds
                const existingCompleted = new Set<number>((existing.completedServiceIds) || []);
                (item.completedServiceIds || []).forEach((id: number) => existingCompleted.add(id));
                existing.completedServiceIds = Array.from(existingCompleted);

                map.set(bid, existing);
            }
        }

        return Array.from(map.values());
    })();

    // Calendar Helpers
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const getBookingsForDay = (day: Date) => {
        return calendarBookings.filter(b => isSameDay(parseISO(b.appointmentDatetime), day));
    };

    const handleShopCancelBooking = async (reason: string) => {
        if (!cancelModalData) return;
        setIsCanceling(true);
        toast.loading('Đang hủy đơn...', { id: 'cancel-toast' });
        try {
            await bookingService.shopCancel(cancelModalData.bookingId, reason);
            toast.success('Đã hủy lịch thành công!', { id: 'cancel-toast' });
            setCancelModalData(null);
            refetchList();
            refetchCalendar();
        } catch (error: any) {
            console.error('Error canceling booking:', error);
            const msg = error.response?.data?.message || error.message || 'Lỗi khi hủy đơn';
            toast.error(msg, { id: 'cancel-toast' });
        } finally {
            setIsCanceling(false);
        }
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full px-4 md:px-8 py-6 overflow-hidden">
                {/* Header with View Toggle */}
                <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 shrink-0">
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <CalendarIcon className={`w-8 h-8 ${isDark ? 'text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'text-blue-600'}`} />
                            Quản lý đặt lịch
                        </h1>
                        <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Điều phối và theo dõi tiến độ dịch vụ cửa hàng</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center p-1 rounded-xl transition-all ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white shadow-sm border border-slate-100'}`}>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all ${viewMode === 'list' ? 'bg-[#1a2b4c] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <ListIcon size={14} />
                                Danh sách
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black transition-all ${viewMode === 'calendar' ? 'bg-[#1a2b4c] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid size={14} />
                                Lịch hẹn
                            </button>
                        </div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {viewMode === 'list' ? (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex-1 flex flex-col gap-6 overflow-hidden"
                        >
                            {/* List Filters */}
                            <div className={`rounded-3xl p-5 transition-all shrink-0 ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white shadow-sm border border-slate-100'}`}>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Tìm khách hàng, thú cưng, mã đơn..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className={`w-full pl-11 pr-4 py-3 border-none rounded-xl text-sm outline-none transition-all ${isDark ? 'bg-slate-800/50 text-white focus:ring-2 focus:ring-indigo-500/30' : 'bg-slate-50 focus:ring-2 focus:ring-[#1a2b4c]/10'}`}
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                                        {[{ v: 'ALL', l: 'Tất cả' }, { v: 'WAITING_SHOP_APPROVAL', l: 'Chờ duyệt' }, { v: 'CANCEL_REQUESTED', l: 'Yêu cầu hủy' }, { v: 'WAITING_REFUND', l: 'Đợi hoàn tiền' }, { v: 'CONFIRMED', l: 'Chờ xử lý' }, { v: 'IN_PROGRESS', l: 'Đang làm' }, { v: 'COMPLETED', l: 'Xong' }].map(t => (
                                            <button
                                                key={t.v}
                                                onClick={() => setFilter(t.v)}
                                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${filter === t.v ? (isDark ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg glow-indigo' : 'bg-[#1a2b4c] text-white border-[#1a2b4c]') : (isDark ? 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-700/50' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50')
                                                    }`}
                                            >
                                                {t.l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* List View - Scrollable */}
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                {listLoading ? (
                                    <div className="text-center py-20 flex flex-col items-center gap-4">
                                        <Loader2 size={40} className="animate-spin text-[#1a2b4c]" />
                                        <p className="text-slate-400 font-bold">Đang đồng bộ dữ liệu...</p>
                                    </div>
                                ) : groupedFilteredList.map((booking) => (
                                    <BookingListItem
                                        key={booking.bookingId}
                                        booking={booking}
                                        staffList={staffList}
                                        updatingId={updatingId}
                                        sendingInvoiceId={sendingInvoiceId}
                                        onAssign={handleAssignStaff}
                                        handleUpdateStatus={handleUpdateStatus}
                                        handleSendInvoice={handleSendInvoice}
                                        setViewInvoiceBooking={setViewInvoiceBooking}
                                        setSelectedBooking={setSelectedBooking}
                                        onAddBooking={(data) => setAddBookingData({ ...data, isOpen: true })}
                                        onShopCancel={(b) => setCancelModalData(b)}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="calendar"
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99 }}
                            className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-6 overflow-hidden"
                        >
                            {/* Calendar Grid - Flexible height */}
                            <div className={`xl:col-span-3 rounded-[2rem] transition-all overflow-hidden flex flex-col h-full ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white shadow-sm border border-slate-100'}`}>
                                <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
                                    <h2 className={`text-xl font-black capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {format(currentDate, 'MMMM yyyy', { locale: vi })}
                                    </h2>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className={`p-1.5 rounded-lg text-slate-400 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button onClick={() => setCurrentDate(new Date())} className={`px-3 py-1.5 text-[10px] font-bold ${isDark ? 'text-indigo-400' : 'text-[#1a2b4c]'}`}>Hôm nay</button>
                                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className={`p-1.5 rounded-lg text-slate-400 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className={`grid grid-cols-7 shrink-0 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
                                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                        <div key={d} className={`py-2.5 text-center text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{d}</div>
                                    ))}
                                </div>
                                <div className={`grid grid-cols-7 flex-1 overflow-y-auto custom-scrollbar border-t ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
                                    {calendarDays.map((day, idx) => {
                                        const dayBookings = getBookingsForDay(day);
                                        const isCurrentMonth = isSameMonth(day, monthStart);
                                        const hasBookings = dayBookings.length > 0;
                                        const isSelected = selectedDay && isSameDay(day, selectedDay);

                                        // Get priority status for coloring
                                        const getDayStatus = () => {
                                            if (dayBookings.some(b => b.status === 'IN_PROGRESS')) return 'IN_PROGRESS';
                                            if (dayBookings.some(b => b.status === 'CANCEL_REQUESTED')) return 'CANCEL_REQUESTED';
                                            if (dayBookings.some(b => b.status === 'WAITING_REFUND')) return 'WAITING_REFUND';
                                            if (dayBookings.some(b => b.status === 'CONFIRMED')) return 'CONFIRMED';
                                            if (dayBookings.some(b => b.status === 'PENDING_PAYMENT')) return 'PENDING_PAYMENT';
                                            if (dayBookings.some(b => b.status === 'COMPLETED')) return 'COMPLETED';
                                            return dayBookings[0]?.status || 'CANCELLED';
                                        };

                                        const dayStatus = hasBookings ? getDayStatus() : null;
                                        const statusCfg = dayStatus ? STATUS_CONFIG[dayStatus] : null;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedDay(day)}
                                                className={`min-h-[85px] p-2.5 border-b border-r cursor-pointer transition-all relative ${isDark ? 'border-white/5' : 'border-slate-50'}
                                                    ${!isCurrentMonth ? (isDark ? 'opacity-30 bg-slate-900/20' : 'opacity-30 bg-slate-50/50') : (isDark ? 'bg-transparent' : 'bg-white')}
                                                    ${isSelected ? (isDark ? 'ring-2 ring-inset ring-indigo-500/50 bg-slate-800/40' : 'ring-2 ring-inset ring-[#1a2b4c]/20') : ''}
                                                    ${hasBookings && isCurrentMonth && statusCfg ? statusCfg.color.split(' ').filter((c: string) => c.startsWith('bg-') || c.startsWith('dark:bg-')).join(' ') : ''}
                                                    ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}
                                                `}
                                            >
                                                {/* Appointment indicator line - Color based on Status */}
                                                {hasBookings && isCurrentMonth && statusCfg && (
                                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${statusCfg.color.split(' ').filter((c: string) => c.startsWith('text-') || c.startsWith('dark:text-')).map((c: string) => c.replace('text-', 'bg-')).join(' ')} shadow-[1px_0_6px_rgba(0,0,0,0.1)]`} />
                                                )}

                                                <div className="flex justify-between items-start mb-1.5 relative z-10">
                                                    <span className={`text-xs font-bold ${isToday(day) ? (isDark ? 'text-white bg-indigo-500 shadow-indigo-500/30' : 'text-white bg-[#1a2b4c] shadow-[#1a2b4c]/20') + ' size-5 flex items-center justify-center rounded-full shadow-lg' : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>
                                                        {format(day, 'd')}
                                                    </span>
                                                    {hasBookings && statusCfg && (
                                                        <span className={`flex items-center gap-1 text-[10px] font-black text-white ${statusCfg.color.split(' ').filter((c: string) => c.startsWith('text-') || c.startsWith('dark:text-')).map((c: string) => c.replace('text-', 'bg-')).join(' ')} px-1.5 py-0.5 rounded-md shadow-md`}>
                                                            <div className="size-1.5 rounded-full bg-white animate-pulse" />
                                                            {dayBookings.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5 mt-1">
                                                    {dayBookings.slice(0, 2).map((b, i) => {
                                                        const bStatus = STATUS_CONFIG[b.status] || STATUS_CONFIG.CONFIRMED;
                                                        return (
                                                            <div key={i} className={`text-[8px] font-bold px-1.5 py-1 rounded border truncate leading-tight shadow-sm ${bStatus.color}`}>
                                                                {b.petName}
                                                            </div>
                                                        );
                                                    })}
                                                    {dayBookings.length > 2 && <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 pl-1">+{dayBookings.length - 2} lịch khác</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Calendar Sidebar - Independent scroll */}
                            <div className={`p-6 rounded-[2rem] transition-all flex flex-col h-full overflow-hidden ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white shadow-sm border border-slate-100'}`}>
                                <div className="shrink-0 mb-6">
                                    <h3 className={`text-lg font-black mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {selectedDay ? format(selectedDay, 'dd MMMM', { locale: vi }) : 'Chọn ngày'}
                                    </h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                                        {selectedDay ? getBookingsForDay(selectedDay).length : 0} Lịch hẹn
                                    </p>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
                                    {selectedDay && getBookingsForDay(selectedDay).map((b, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedBooking(b)}
                                            className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                                    <Clock size={10} className="text-[#1a2b4c] dark:text-indigo-400" />
                                                    <span className="text-[9px] font-black text-slate-900 dark:text-white">
                                                        {format(parseISO(b.appointmentDatetime), 'HH:mm')}
                                                    </span>
                                                </div>
                                                <div className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border ${STATUS_CONFIG[b.status]?.className || ''}`}>
                                                    {STATUS_CONFIG[b.status]?.label || b.status}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="size-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-sm shadow-sm border border-slate-50 dark:border-slate-700">🐾</div>
                                                <div>
                                                    <h4 className="text-[11px] font-black text-slate-800 dark:text-white leading-tight">{b.petName}</h4>
                                                    <p className="text-[9px] text-slate-500 font-medium truncate max-w-[120px]">
                                                        {b.services && b.services.length > 0 ? b.services.map((s: any) => s.serviceName).join(', ') : b.serviceName}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3">
                                                <div>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Khách: <span className="text-slate-700 dark:text-slate-300 ml-1">{b.customerName || 'Khách lẻ'}</span></p>
                                                    <StaffAssignmentSelect
                                                        bookingId={b.id}
                                                        status={b.status}
                                                        currentStaffId={b.staffId}
                                                        staffList={staffList}
                                                        updatingId={updatingId}
                                                        onAssign={handleAssignStaff}
                                                        selectClassName="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                                                    />
                                                </div>

                                                {b.status === 'CONFIRMED' && (
                                                    <button
                                                        disabled={updatingId === b.id}
                                                        onClick={(e) => { e.stopPropagation(); setCancelModalData(b); }}
                                                        className="w-full py-2 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-1.5 border border-red-50/50"
                                                    >
                                                        {updatingId === b.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                                                        Hủy đơn
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {selectedDay && getBookingsForDay(selectedDay).length === 0 && (
                                        <div className="text-center py-10 text-slate-300 dark:text-slate-700">
                                            <CheckCircle2 size={24} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-[10px] font-bold">Không có lịch</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Booking Detail Modal */}
            <AnimatePresence>
                {selectedBooking && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedBooking(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
                        >
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 hover:rotate-90 transition-all z-10"
                            >
                                <X size={20} />
                            </button>

                            {/* Left: Pet & Customer Header */}
                            <div className="md:w-2/5 bg-slate-50 dark:bg-slate-900/50 p-8 flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-[2rem] bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-4xl mb-6 border-4 border-white dark:border-slate-800">
                                    🐾
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">{selectedBooking.petName}</h2>
                                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border mb-6 ${STATUS_CONFIG[selectedBooking.status]?.className}`}>
                                    {STATUS_CONFIG[selectedBooking.status]?.label}
                                </div>

                                <div className="w-full space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-[#1a2b4c] dark:text-indigo-400">
                                            <User size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{selectedBooking.customerName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-[#1a2b4c] dark:text-indigo-400">
                                            <Mail size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Liên hệ</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                                {selectedBooking.customerPhone || 'Chưa có SĐT'}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                                {selectedBooking.customerEmail || 'Chưa cập nhật email'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Detailed Info */}
                            <div className="flex-1 p-8 overflow-y-auto">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Thông tin chi tiết</h3>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mã đơn hàng</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-white">#{(selectedBooking.bookingId || selectedBooking.id)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Thời gian hẹn</p>
                                            <p className="text-xs font-bold text-slate-700 dark:text-white">
                                                {format(parseISO(selectedBooking.appointmentDatetime), "HH:mm - dd/MM/yyyy")}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Dịch vụ sử dụng</p>
                                        <div className="space-y-2">
                                            {selectedBooking.services && selectedBooking.services.length > 0 ? (
                                                selectedBooking.services.map((svc: any, idx: number) => (
                                                    <div key={idx} className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-between border border-indigo-100 dark:border-indigo-900/30">
                                                        <div className="flex items-center gap-2">
                                                            <Scissors size={16} className="text-[#1a2b4c] dark:text-indigo-400" />
                                                            <span className="text-xs font-bold text-[#1a2b4c] dark:text-indigo-400">{svc.serviceName}</span>
                                                        </div>
                                                        <span className="text-xs font-black text-[#1a2b4c] dark:text-indigo-400">
                                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(svc.servicePrice || 0)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-between border border-indigo-100 dark:border-indigo-900/30">
                                                    <div className="flex items-center gap-2">
                                                        <Scissors size={16} className="text-[#1a2b4c] dark:text-indigo-400" />
                                                        <span className="text-xs font-bold text-[#1a2b4c] dark:text-indigo-400">{selectedBooking.serviceName}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-[#1a2b4c] dark:text-indigo-400">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedBooking.servicePrice || 0)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Ghi chú</p>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 italic text-xs text-slate-500">
                                            "{selectedBooking.note || 'Không có ghi chú'}"
                                        </div>
                                    </div>

                                    {selectedBooking.status === 'CANCEL_REQUESTED' && (
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-2.5">Lý do hủy</p>
                                                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900 text-xs text-slate-700 dark:text-orange-200">
                                                    {selectedBooking.cancellationReason || 'Khách hàng chưa ghi rõ lý do hủy'}
                                                </div>
                                            </div>
                                            {(selectedBooking.bankName || selectedBooking.bankAccount || selectedBooking.accountHolder) && (
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                                                        <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Ngân hàng</p>
                                                        <p>{selectedBooking.bankName || 'N/A'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                                                        <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Số tài khoản</p>
                                                        <p>{selectedBooking.bankAccount || 'N/A'}</p>
                                                    </div>
                                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                                                        <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Chủ tài khoản</p>
                                                        <p>{selectedBooking.accountHolder || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Care Logs */}
                                    {(selectedBooking.status === 'IN_PROGRESS' || selectedBooking.status === 'COMPLETED') && (
                                        <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nhật ký chăm sóc ({careLogs.length})</p>
                                                {loadingLogs && <Loader2 size={12} className="animate-spin text-slate-400" />}
                                            </div>

                                            {careLogs.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">Chưa có hoạt động chăm sóc nào được ghi nhận.</p>
                                            ) : (
                                                <div className="relative pl-6 border-l-2 border-indigo-100 dark:border-indigo-900/40 ml-3 space-y-6 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                                <div className={`absolute -left-[37px] top-0 w-7 h-7 rounded-xl ${logType.color} border-4 border-white dark:border-slate-800 flex items-center justify-center shadow-sm`}>
                                                                    <LogIcon size={11} />
                                                                </div>

                                                                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100/80 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all duration-300">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{logType.label}</span>
                                                                            <span className="text-[9px] text-slate-400 font-bold">• Nhân viên: {log.staffName}</span>
                                                                        </div>
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                                            {format(parseISO(log.timestamp), 'HH:mm • dd/MM', { locale: vi })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                                                        {log.note}
                                                                    </p>
                                                                    {log.imageUrl && (
                                                                        <div className="mt-3 max-w-sm rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                                                                            <img src={log.imageUrl} alt="Đính kèm" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="pt-6 flex flex-col gap-3">
                                        {/* Nút xuất hóa đơn — Cash COMPLETED hoặc bất kỳ COMPLETED */}
                                        {selectedBooking.status === 'COMPLETED' && (
                                            <button
                                                onClick={() => setViewInvoiceBooking(selectedBooking)}
                                                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                <FileText size={12} />
                                                Xem hóa đơn
                                            </button>
                                        )}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setSelectedBooking(null)}
                                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-white rounded-xl font-bold text-[10px] hover:bg-slate-200 transition-all"
                                            >
                                                Đóng
                                            </button>
                                            {selectedBooking.status === 'CONFIRMED' && (
                                                <button
                                                    onClick={() => handleUpdateStatus((selectedBooking.bookingId || selectedBooking.id), 'CANCELLED')}
                                                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-[10px] shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all"
                                                >
                                                    Hủy đơn
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            {/* Modal Xem hóa đơn */}
            <AnimatePresence>
                {viewInvoiceBooking && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className={`w-full max-w-[400px] rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
                        >
                            {/* Header */}
                            <div className="px-5 py-4 flex items-center justify-between shrink-0">
                                <h3 className={`text-[15px] font-bold ${isDark ? 'text-white' : 'text-[#1a2b4c]'}`}>
                                    Chi tiết giao dịch
                                </h3>
                                <button onClick={() => setViewInvoiceBooking(null)} className="p-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div id="invoice-receipt-content" className={`px-6 pb-6 pt-2 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                                    <div className="flex flex-col items-center mt-2 mb-6">
                                        <div className="w-14 h-14 bg-[#1a2b4c] rounded-full flex items-center justify-center mb-3 shadow-md">
                                            <PawPrint className="text-white" size={26} fill="white" />
                                        </div>
                                        <h2 className="text-lg font-black text-[#1a2b4c] dark:text-white uppercase tracking-wider mb-0.5">PetEye</h2>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-5">Biên lai điện tử</p>

                                        <p className="text-xs text-slate-500 font-medium mb-1">Số tiền giao dịch</p>
                                        <h1 className="text-3xl font-black text-[#1a2b4c] dark:text-white mb-2 tracking-tight">
                                            {new Intl.NumberFormat('vi-VN').format(viewInvoiceBooking.services ? viewInvoiceBooking.services.reduce((acc: number, cur: any) => acc + (cur.servicePrice || 0), 0) : (viewInvoiceBooking.servicePrice || 0))}đ
                                        </h1>
                                        <div className="px-3 py-1 bg-green-50/80 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                                            Thành công
                                        </div>
                                    </div>

                                    <div className="border-t border-dashed border-slate-200 dark:border-slate-700 py-6 space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-xs text-slate-500 min-w-[90px]">Mã giao dịch</span>
                                            <span className="text-xs font-bold text-[#1a2b4c] dark:text-white text-right break-all">MOCK-{viewInvoiceBooking.bookingId || viewInvoiceBooking.id}</span>
                                        </div>
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-xs text-slate-500 min-w-[90px]">Thời gian</span>
                                            <span className="text-xs font-bold text-[#1a2b4c] dark:text-white text-right">
                                                {format(parseISO(viewInvoiceBooking.appointmentDatetime), "dd/MM/yyyy HH:mm:ss")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-xs text-slate-500 min-w-[90px]">Phương thức</span>
                                            <span className="text-xs font-bold text-[#1a2b4c] dark:text-white text-right uppercase">
                                                {viewInvoiceBooking.paymentMethod || 'MOCK'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-xs text-slate-500 min-w-[90px]">Cửa hàng</span>
                                            <span className="text-xs font-bold text-[#1a2b4c] dark:text-white text-right uppercase">
                                                {viewInvoiceBooking.shopName || 'PET_PHU_QUY'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-xs text-slate-500 min-w-[90px]">Dịch vụ</span>
                                            <span className="text-xs font-bold text-[#1a2b4c] dark:text-white text-right">
                                                {viewInvoiceBooking.services && viewInvoiceBooking.services.length > 0
                                                    ? viewInvoiceBooking.services.map((s: any) => s.serviceName).join(', ')
                                                    : viewInvoiceBooking.serviceName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-start gap-4">
                                            <span className="text-xs text-slate-500 min-w-[90px]">Nội dung</span>
                                            <span className="text-xs font-bold text-[#1a2b4c] dark:text-white text-right">
                                                Mock payment for booking #{viewInvoiceBooking.bookingId || viewInvoiceBooking.id}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#1a2b4c] dark:border-slate-700 pt-4 text-center">
                                        <p className="text-[10px] text-slate-500 italic mb-1">Cảm ơn bạn đã sử dụng dịch vụ của PetEye!</p>
                                        <p className="text-[9px] text-slate-400">Hotline: 1900 9999 - email: support@peteye.vn</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="p-4 bg-white dark:bg-slate-900 flex gap-3 shrink-0 rounded-b-[1.5rem]">
                                <button
                                    onClick={() => handleSendInvoice(viewInvoiceBooking.bookingId || viewInvoiceBooking.id)}
                                    disabled={sendingInvoiceId === (viewInvoiceBooking.bookingId || viewInvoiceBooking.id)}
                                    className="flex-1 py-3 bg-white dark:bg-slate-800 text-[#1a2b4c] dark:text-white border border-slate-200 dark:border-slate-700 rounded-[12px] text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {sendingInvoiceId === (viewInvoiceBooking.bookingId || viewInvoiceBooking.id) ? <Loader2 size={14} className="animate-spin" /> : null}
                                    Xuất hóa đơn
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex-[1.5] py-3 bg-[#1a2b4c] text-white rounded-[12px] text-xs font-bold hover:bg-[#111d33] transition-all flex items-center justify-center gap-2 shadow-lg"
                                >
                                    <Download size={14} />
                                    Tải biên lai PDF
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal Đặt lịch thêm */}
            <ShopAddBookingModal
                isOpen={addBookingData?.isOpen || false}
                onClose={() => setAddBookingData(prev => prev ? { ...prev, isOpen: false } : null)}
                customerId={addBookingData?.customerId || 0}
                customerName={addBookingData?.customerName || ''}
                shopId={addBookingData?.shopId || 0}
                defaultPetId={addBookingData?.defaultPetId || 0}
                onSuccess={() => {
                    refetchList();
                    refetchCalendar();
                }}
            />

            <ShopCancelBookingModal
                isOpen={cancelModalData !== null}
                onClose={() => setCancelModalData(null)}
                booking={cancelModalData}
                onConfirm={handleShopCancelBooking}
                isSubmitting={isCanceling}
            />
        </div>
    );
}
