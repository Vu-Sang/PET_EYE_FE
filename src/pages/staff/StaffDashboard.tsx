import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Clock, CheckCircle2, Search, Filter, Camera, Zap, Heart, User, Plus, LayoutGrid, X,
    Activity, Syringe, Utensils, Loader2, Sparkles, ClipboardList, AlertCircle, Calendar, Play, Save, PlayCircle, MonitorPlay,
    StopCircle, VideoOff, UserX, XCircle, MessageCircle
} from 'lucide-react';
import type { BookingResponse } from '../../types/api';
import { motion, AnimatePresence } from 'motion/react';
import { taskService, type TaskResponse, type TaskStatus } from '../../services/task.service';
import { careLogService, type CareLogResponse } from '../../services/care-log.service';
import { petMedicalService, type PetMedicalRecordRequest } from '../../services/pet-medical.service';
import { bookingService } from '../../services/booking.service';
import { petService } from '../../services/pet.service';
import type { Pet } from '../../types';
import { fileService } from '../../services/file.service';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import HLSPlayer from '../../components/HLSPlayer';
import { checkStreamReady, resolveStreamUrl } from '../../utils/streamHelper';
import { useShopChat } from '../../hooks/useShopChat';
import ConversationThread from '../../components/chat/shared/ConversationThread';

// Constants
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    WAITING_SHOP_APPROVAL: { label: 'Chờ duyệt', color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: Clock },
    CONFIRMED: { label: 'Chờ xử lý', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock },
    IN_PROGRESS: { label: 'Đang làm', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Zap },
    COMPLETED: { label: 'Hoàn thành', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
    CANCELLED: { label: 'Đã hủy', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: X },
    CANCEL_REQUESTED: { label: 'Yêu cầu hủy', color: 'text-orange-600 bg-orange-50 border-orange-100', icon: AlertCircle },
    PENDING_PAYMENT: { label: 'Chờ thanh toán', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: Clock },
    WAITING_REFUND: { label: 'Chờ hoàn tiền', color: 'text-slate-600 bg-slate-50 border-slate-100', icon: Clock },
};

const CARE_LOG_TYPES = [
    { id: 'FEEDING', label: 'Cho ăn', icon: Utensils, color: 'text-orange-500 bg-orange-50' },
    { id: 'CLEANING', label: 'Vệ sinh', icon: Activity, color: 'text-blue-500 bg-blue-50' },
    { id: 'MEDICAL', label: 'Y tế', icon: Syringe, color: 'text-emerald-500 bg-emerald-50' },
    { id: 'EXERCISE', label: 'Vui chơi', icon: Heart, color: 'text-purple-500 bg-purple-50' },
];

const EARLY_BOARDING_SUGGESTIONS = [
    'Khách hàng muốn đón thú cưng sớm hơn dự kiến',
    'Thú cưng đã phục hồi sức khỏe tốt và hoàn thành dịch vụ sớm',
    'Có việc đột xuất từ phía gia đình chủ nuôi',
    'Chủ nuôi thay đổi kế hoạch di chuyển/công tác'
];

const LATE_BOARDING_SUGGESTIONS = [
    'Khách hàng bận việc đột xuất nên đến đón trễ',
    'Phát sinh thêm dịch vụ chăm sóc ngoài giờ theo yêu cầu',
    'Thời tiết/Giao thông không thuận lợi, khách đến đón muộn',
    'Đợi khách hàng xác nhận thanh toán/bàn giao'
];

const EARLY_SERVICE_SUGGESTIONS = [
    'Nhân viên thao tác nhanh, hoàn thành dịch vụ trước thời hạn',
    'Thú cưng rất hợp tác, không gặp khó khăn khi thực hiện',
    'Khách hàng yêu cầu rút ngắn quy trình để đón sớm',
    'Tình trạng thú cưng đơn giản, xử lý nhanh chóng'
];

const LATE_SERVICE_SUGGESTIONS = [
    'Thú cưng nghịch ngợm, không hợp tác nên cần thêm thời gian',
    'Phát sinh thêm yêu cầu từ phía chủ nuôi',
    'Lượng khách tại cửa hàng đông, xử lý chậm hơn dự kiến',
    'Gặp khó khăn kỹ thuật trong quá trình thực hiện dịch vụ'
];

const guessCategory = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('lưu trú') || n.includes('boarding') || n.includes('trông') || n.includes('khách sạn') || n.includes('hotel')) return 'BOARDING';
    // broaden grooming detection: include words like 'spa', 'tắm', 'cắt', 'grooming', 'vệ sinh', 'massage', 'kiểu', 'tạo kiểu'
    if (n.includes('spa') || n.includes('tắm') || n.includes('cắt') || n.includes('grooming') || n.includes('vệ sinh') || n.includes('massage') || n.includes('kiểu') || n.includes('tạo kiểu')) return 'GROOMING';
    return 'CLINIC';
};

const formatTime = (iso: string) => format(parseISO(iso), 'HH:mm', { locale: vi });
const formatDate = (iso: string) => format(parseISO(iso), 'dd/MM/yyyy', { locale: vi });

const StaffChatTab = ({ bookingDetails, user, selectedTask }: { bookingDetails: BookingResponse | null, user: any, selectedTask: TaskResponse | null }) => {
    const shopId = bookingDetails?.shopId || selectedTask?.shopId || null;
    const customerEmail = bookingDetails?.customerEmail || selectedTask?.customerEmail;

    const [input, setInput] = useState('');
    const { messages, connected, sendMessage } = useShopChat(
        shopId,
        user?.token,
        'CAMERA_CHAT',
        customerEmail
    );

    if (!shopId || !customerEmail) {
        return (
            <div className="flex justify-center items-center py-10 flex-col gap-3">
                <Loader2 className="animate-spin text-slate-400 w-6 h-6" />
                <p className="text-xs text-slate-500">Đang tải thông tin kết nối...</p>
            </div>
        );
    }

    return (
        <div className="h-[600px] max-h-[70vh] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col">
            <ConversationThread
                messages={messages}
                currentUserEmail={user?.email}
                connected={connected}
                input={input}
                setInput={setInput}
                onSendMessage={(msg, attachment) => sendMessage(msg, attachment)}
                hideHeader={false}
                headerInfo={{
                    title: `Trò chuyện với ${bookingDetails?.customerName || 'Khách hàng'}`,
                    subtitle: bookingDetails?.customerEmail,
                    icon: <MessageCircle size={20} className="text-primary" />,
                    showStatus: true
                }}
            />
        </div>
    );
};

export default function StaffDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [myTasks, setMyTasks] = useState<TaskResponse[]>([]);
    const [poolTasks, setPoolTasks] = useState<TaskResponse[]>([]);
    const [activeTab, setActiveTab] = useState<'mine' | 'pool'>('mine');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');

    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);

    // Workspace states
    const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'info' | 'logs' | 'medical' | 'chat'>('info');

    // Care log states
    const [careLogs, setCareLogs] = useState<CareLogResponse[]>([]);
    const [careLogNote, setCareLogNote] = useState('');
    const [careLogType, setCareLogType] = useState('FEEDING');
    const [careLogImage, setCareLogImage] = useState<File | null>(null);
    const [submittingLog, setSubmittingLog] = useState(false);

    // Medical record states
    const [medicalForm, setMedicalForm] = useState<PetMedicalRecordRequest>({
        diagnosis: '', symptoms: '', treatment: '', prescription: '', notes: '', visitDate: new Date().toISOString()
    });
    const [submittingMedical, setSubmittingMedical] = useState(false);

    // Camera configuration states
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [rtspInput, setRtspInput] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [workspaceRtspInput, setWorkspaceRtspInput] = useState('');
    const [dashboardPreviewUrl, setDashboardPreviewUrl] = useState('');
    const [isCheckingStream, setIsCheckingStream] = useState(false);
    const [isStreamReady, setIsStreamReady] = useState(false);
    const [streamError, setStreamError] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    const [modalCheckingStream, setModalCheckingStream] = useState(false);
    const [modalStreamReady, setModalStreamReady] = useState(false);
    const [modalStreamError, setModalStreamError] = useState(false);
    const [bookingDetails, setBookingDetails] = useState<BookingResponse | null>(null);
    const [petDetails, setPetDetails] = useState<Pet | null>(null);
    const [isStoppingCamera, setIsStoppingCamera] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [checkoutReason, setCheckoutReason] = useState('');
    const [checkoutType, setCheckoutType] = useState<'EARLY' | 'LATE'>('EARLY');
    const [localStartTime, setLocalStartTime] = useState<string | null>(null);
    const [localCompletionTime, setLocalCompletionTime] = useState<string | null>(null);

    // No-Show states
    const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
    const [isNoShowProcessing, setIsNoShowProcessing] = useState(false);
    
    const [isPetDetailsModalOpen, setIsPetDetailsModalOpen] = useState(false);

    // Clinic sub-service completion modal
    const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
    const [pendingClinicServiceId, setPendingClinicServiceId] = useState<number | null>(null);
    const [clinicMedicalForm, setClinicMedicalForm] = useState<PetMedicalRecordRequest>({
        diagnosis: '', symptoms: '', treatment: '', prescription: '', notes: '', visitDate: new Date().toISOString()
    });
    const [vaccinationForm, setVaccinationForm] = useState({
        hasVaccination: false, name: '', drug: '', date: new Date().toISOString(), status: 'done'
    });
    const [submittingClinicMedical, setSubmittingClinicMedical] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [mine, pool] = await Promise.all([
                taskService.getMyTasks(),
                taskService.getUnassignedTasks().catch(() => []),
            ]);
            setMyTasks(mine);
            setPoolTasks(pool);
        } catch {
            toast.error('Không thể kết nối máy chủ');
        } finally {
            setLoading(false);
        }
    };

    const refreshTasks = async () => {
        try {
            const [mine, pool] = await Promise.all([
                taskService.getMyTasks(),
                taskService.getUnassignedTasks().catch(() => []),
            ]);
            setMyTasks(mine);
            setPoolTasks(pool);
            return { mine, pool };
        } catch {
            return { mine: [], pool: [] };
        }
    };

    useEffect(() => { loadData(); }, []);

    // Handle deep links from old /staff/tasks
    useEffect(() => {
        if (!loading && location.state?.taskId) {
            const task = myTasks.find(t => t.bookingId === location.state.taskId) ||
                poolTasks.find(t => t.bookingId === location.state.taskId);
            if (task && (!selectedTask || selectedTask.bookingId !== task.bookingId)) {
                handleSelectTask(task);
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [loading, myTasks, poolTasks, location.state, selectedTask, navigate, location.pathname]);

    useEffect(() => {
        if (selectedTask) {
            setWorkspaceRtspInput(selectedTask.rtspLink || '');
            setDashboardPreviewUrl(selectedTask.rtspLink || '');
            setRtspInput(selectedTask.rtspLink || '');
            setBookingDetails(null);

            bookingService.getById(selectedTask.bookingId)
                .then(booking => {
                    if (booking) {
                        setBookingDetails(booking);
                        setWorkspaceRtspInput(booking.cameraRtspUrl || selectedTask.rtspLink || '');
                        setDashboardPreviewUrl(booking.cameraStreamUrl || booking.cameraRtspUrl || selectedTask.rtspLink || '');
                        setRtspInput(booking.cameraRtspUrl || selectedTask.rtspLink || '');
                    }
                })
                .catch(err => {
                    console.error('Error loading booking stream details:', err);
                });
        }
    }, [selectedTask?.bookingId, selectedTask?.rtspLink]);

    // Check stream readiness when the dashboard preview URL is updated
    useEffect(() => {
        if (!dashboardPreviewUrl) {
            setIsStreamReady(false);
            setIsCheckingStream(false);
            return;
        }

        let isMounted = true;
        setIsCheckingStream(true);
        setIsStreamReady(false);
        setStreamError(false);

        const checkReady = async () => {
            const ready = await checkStreamReady(dashboardPreviewUrl);
            if (!isMounted) return;

            setIsCheckingStream(false);
            if (ready) {
                setIsStreamReady(true);
            } else {
                setStreamError(true);
            }
        };

        checkReady();

        return () => {
            isMounted = false;
        };
    }, [dashboardPreviewUrl]);

    // Check stream readiness when the modal preview is triggered
    useEffect(() => {
        if (!showPreview || !dashboardPreviewUrl) {
            setModalStreamReady(false);
            setModalCheckingStream(false);
            return;
        }

        let isMounted = true;
        setModalCheckingStream(true);
        setModalStreamReady(false);
        setModalStreamError(false);

        const checkReady = async () => {
            const ready = await checkStreamReady(dashboardPreviewUrl);
            if (!isMounted) return;

            setModalCheckingStream(false);
            if (ready) {
                setModalStreamReady(true);
            } else {
                setModalStreamError(true);
            }
        };

        checkReady();

        return () => {
            isMounted = false;
        };
    }, [showPreview, dashboardPreviewUrl]);

    const handleConfigureModalPreview = async () => {
        if (!selectedTask || !rtspInput.trim()) return;
        setModalCheckingStream(true);
        setModalStreamError(false);
        try {
            const updated = await bookingService.configureCamera(selectedTask.bookingId, rtspInput);
            setBookingDetails(updated);
            setDashboardPreviewUrl(updated.cameraStreamUrl || '');
            setWorkspaceRtspInput(updated.cameraRtspUrl || '');
            setShowPreview(true);
        } catch (err: any) {
            setModalCheckingStream(false);
            setModalStreamError(true);
            toast.error(err.response?.data?.message || 'Lỗi khởi chạy camera Docker');
        }
    };

    const handleConfigureDashboardPreview = async () => {
        if (!selectedTask || !workspaceRtspInput.trim()) return;
        setIsCheckingStream(true);
        setStreamError(false);
        try {
            const updated = await bookingService.configureCamera(selectedTask.bookingId, workspaceRtspInput);
            setBookingDetails(updated);
            setDashboardPreviewUrl(updated.cameraStreamUrl || '');
            setRtspInput(updated.cameraRtspUrl || '');
        } catch (err: any) {
            setIsCheckingStream(false);
            setStreamError(true);
            toast.error(err.response?.data?.message || 'Lỗi khởi chạy camera Docker');
        }
    };

    const handleDeleteCamera = async () => {
        if (!selectedTask) return;
        if (!window.confirm('Bạn có chắc muốn tắt camera và dừng luồng stream cho đơn này?')) return;

        setIsStoppingCamera(true);
        try {
            const updated = await bookingService.deleteCamera(selectedTask.bookingId);
            setBookingDetails(updated);
            setDashboardPreviewUrl('');
            setWorkspaceRtspInput('');
            setRtspInput('');
            toast.success('Đã tắt camera và dừng Docker container thành công');
        } catch (err: any) {
            console.error('Delete camera failed:', err);
            toast.error(err.response?.data?.message || 'Tắt camera thất bại');
        } finally {
            setIsStoppingCamera(false);
        }
    };

    const handleSaveDashboardConfig = async () => {
        if (!selectedTask || !workspaceRtspInput.trim()) return;
        setUpdatingId(selectedTask.bookingId);
        try {
            const updated = await bookingService.configureCamera(selectedTask.bookingId, workspaceRtspInput);
            setBookingDetails(updated);
            setDashboardPreviewUrl(updated.cameraStreamUrl || '');
            setRtspInput(updated.cameraRtspUrl || '');

            const { mine } = await refreshTasks();
            const newSelected = mine.find((t: any) => t.bookingId === selectedTask.bookingId && t.category === selectedTask.category) || mine.find((t: any) => t.bookingId === selectedTask.bookingId);
            setSelectedTask(newSelected || (prev => prev ? { ...prev, rtspLink: updated.cameraRtspUrl } : null));

            toast.success('Đã lưu cấu hình camera thành công!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Lỗi lưu cấu hình camera');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleSelectTask = async (task: TaskResponse | null) => {
        setSelectedTask(task);
        setActiveWorkspaceTab('info');
        setCareLogNote('');
        setCareLogImage(null);
        setLocalStartTime(null);
        setLocalCompletionTime(null);
        setPetDetails(null);
        setMedicalForm({ diagnosis: '', symptoms: '', treatment: '', prescription: '', notes: '', visitDate: new Date().toISOString() });

        if (task) {
            try {
                const logs = await careLogService.getLogs(task.bookingId);
                setCareLogs(logs);
            } catch (e) {
                setCareLogs([]);
            }
            try {
                const pet = await petService.getById(task.petId);
                setPetDetails(pet);
            } catch (e) {
                setPetDetails(null);
            }
        }
    };

    const handleUpdateStatus = async (bookingId: number, nextStatus: TaskStatus, rtspLink?: string): Promise<boolean> => {
        setUpdatingId(bookingId);
        try {
            const updated = await taskService.updateStatus(bookingId, nextStatus, rtspLink);
            const { mine } = await refreshTasks();
            if (selectedTask?.bookingId === bookingId) {
                const newSelected = mine.find((t: any) => t.bookingId === bookingId && t.category === selectedTask.category) || mine.find((t: any) => t.bookingId === bookingId);
                setSelectedTask(newSelected || updated);
            }
            if (nextStatus === 'IN_PROGRESS') {
                setLocalStartTime(new Date().toISOString());
            }
            if (nextStatus === 'COMPLETED') {
                setLocalCompletionTime(new Date().toISOString());
            }

            // Fetch updated booking details
            const booking = await bookingService.getById(bookingId);
            if (booking) {
                setBookingDetails(booking);
            }

            toast.success(nextStatus === 'IN_PROGRESS' ? 'Đã bắt đầu công việc' : 'Đã hoàn thành công việc!');
            setIsCameraModalOpen(false);
            return true;
        } catch (err: any) {
            const code = err?.response?.data?.code;
            if (code === 5016) {
                toast.error('Vui lòng điền Hồ sơ y tế trước khi hoàn thành!');
                setActiveWorkspaceTab('medical');
            } else {
                toast.error(err?.response?.data?.message || 'Thao tác thất bại');
            }
            return false;
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCompleteServiceItem = async (bookingId: number, serviceId: number) => {
        setUpdatingId(bookingId);
        try {
            const updated = await taskService.completeServiceItem(bookingId, serviceId);
            // Immediately merge returned updated booking into local task lists to avoid stale API responses
            setMyTasks(prev => prev.map(t => (t.bookingId === updated.bookingId ? updated : t)));
            setPoolTasks(prev => prev.map(t => (t.bookingId === updated.bookingId ? updated : t)));
            if (selectedTask?.bookingId === bookingId) {
                setSelectedTask(updated);
            }
            // Also trigger a background refresh to keep data consistent
            refreshTasks().catch(() => {});
            toast.success('Đã đánh dấu hoàn thành dịch vụ!');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể hoàn thành dịch vụ');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleOpenClinicModal = (serviceId: number) => {
        setPendingClinicServiceId(serviceId);
        setClinicMedicalForm({ diagnosis: '', symptoms: '', treatment: '', prescription: '', notes: '', visitDate: new Date().toISOString() });
        setVaccinationForm({ hasVaccination: false, name: '', drug: '', date: new Date().toISOString(), status: 'done' });
        setIsMedicalModalOpen(true);
    };

    const handleSubmitClinicMedical = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask || !pendingClinicServiceId || !clinicMedicalForm.diagnosis) return;

        setSubmittingClinicMedical(true);
        try {
            // Step 1: Save medical record & optional vaccination
            const medicalPromise = petMedicalService.addMedicalRecord(selectedTask.bookingId, clinicMedicalForm);
            
            const promises: Promise<any>[] = [medicalPromise];
            if (vaccinationForm.hasVaccination && vaccinationForm.name.trim()) {
                promises.push(petMedicalService.addVaccination(selectedTask.bookingId, {
                    name: vaccinationForm.name,
                    drug: vaccinationForm.drug,
                    date: vaccinationForm.date,
                    status: vaccinationForm.status
                }));
            }
            
            await Promise.all(promises);
            
            // Step 2: Mark sub-service as complete
            const updated = await taskService.completeServiceItem(selectedTask.bookingId, pendingClinicServiceId);
            setMyTasks(prev => prev.map(t => (t.bookingId === updated.bookingId ? updated : t)));
            setPoolTasks(prev => prev.map(t => (t.bookingId === updated.bookingId ? updated : t)));
            setSelectedTask(updated);
            refreshTasks().catch(() => {});
            toast.success('Đã lưu hồ sơ y tế và hoàn thành dịch vụ khám!');
            setIsMedicalModalOpen(false);
            setPendingClinicServiceId(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể lưu hồ sơ y tế');
        } finally {
            setSubmittingClinicMedical(false);
        }
    };

    const handleClaimTask = async (bookingId: number) => {
        setUpdatingId(bookingId);
        try {
            const claimed = await taskService.claimTask(bookingId);
            const { mine } = await refreshTasks();
            toast.success('Đã nhận công việc thành công!');
            setActiveTab('mine');
            if (selectedTask?.bookingId === bookingId) {
                const newSelected = mine.find((t: any) => t.bookingId === bookingId && t.category === selectedTask.category) || mine.find((t: any) => t.bookingId === bookingId);
                setSelectedTask(newSelected || claimed);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể nhận task');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleNoShow = async () => {
        if (!selectedTask) return;
        setIsNoShowProcessing(true);
        try {
            const updated = await taskService.cancelNoShow(selectedTask.bookingId);
            const { mine } = await refreshTasks();
            const newSelected = mine.find((t: any) => t.bookingId === selectedTask.bookingId && t.category === selectedTask.category) || mine.find((t: any) => t.bookingId === selectedTask.bookingId);
            setSelectedTask(newSelected || updated);
            setIsNoShowModalOpen(false);
            toast.success('Đã hủy đơn do khách không đến');
        } catch (err: any) {
            const code = err?.response?.data?.code;
            if (code === 10009) {
                toast.error('Chưa đủ thời gian chờ! Vui lòng đợi thêm.');
            } else {
                toast.error(err?.response?.data?.message || 'Không thể hủy đơn');
            }
        } finally {
            setIsNoShowProcessing(false);
        }
    };

    const handleAddCareLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!careLogNote.trim() || !selectedTask) return;

        setSubmittingLog(true);
        try {
            let imageUrl = '';
            if (careLogImage) {
                imageUrl = await fileService.upload(careLogImage);
            }
            const newLog = await careLogService.addLog(selectedTask.bookingId, {
                type: careLogType,
                note: careLogNote,
                imageUrl
            });
            setCareLogs(prev => [newLog, ...prev]);
            setCareLogNote('');
            setCareLogImage(null);
            toast.success('Đã lưu nhật ký!');
        } catch {
            toast.error('Không thể lưu nhật ký');
        } finally {
            setSubmittingLog(false);
        }
    };

    const handleSubmitMedical = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask || !medicalForm.diagnosis) return;

        setSubmittingMedical(true);
        try {
            await petMedicalService.addMedicalRecord(selectedTask.bookingId, medicalForm);
            toast.success('Đã lưu hồ sơ y tế thành công!');
            setActiveWorkspaceTab('info');
        } catch {
            toast.error('Không thể lưu hồ sơ y tế');
        } finally {
            setSubmittingMedical(false);
        }
    };

    const getEffectiveStatus = (t: any) => {
        // If backend provided final status, prefer it
        if (!t) return undefined;
        if (t.status === 'COMPLETED' || t.status === 'CANCELLED') return t.status;
        // If services are present and all are completed, consider booking COMPLETED
        if (t.services && t.services.length > 0) {
            const allCompleted = t.services.every((s: any) => !!s.completedAt || (t.completedServiceIds || []).includes(s.serviceId));
            if (allCompleted) return 'COMPLETED';
        }
        return t.status;
    };

    const inProgressTasks = myTasks.filter(t => getEffectiveStatus(t) === 'IN_PROGRESS');
    const pendingTasks = myTasks.filter(t => getEffectiveStatus(t) === 'CONFIRMED');

    let displayTasks = activeTab === 'mine' ? myTasks : poolTasks;

    // Dev-only: log status vs effectiveStatus when debugging filters
    if (process.env.NODE_ENV !== 'production' && statusFilter === 'CANCELLED') {
        try {
            // eslint-disable-next-line no-console
            console.debug('StaffDashboard: CANCELLED filter debug', displayTasks.map((t: any) => ({
                bookingId: t.bookingId,
                rawStatus: t.status,
                effectiveStatus: getEffectiveStatus(t),
                services: (t.services || []).map((s: any) => ({ id: s.serviceId, completedAt: s.completedAt })),
                completedServiceIds: t.completedServiceIds || []
            })));
        } catch (e) { }
    }

    if (statusFilter === 'WAITING') {
        displayTasks = displayTasks.filter(t => ['WAITING_SHOP_APPROVAL'].includes(getEffectiveStatus(t)));
    } else if (statusFilter === 'ACTIVE') {
        displayTasks = displayTasks.filter(t => ['CONFIRMED', 'IN_PROGRESS', 'PENDING_PAYMENT', 'WAITING_REFUND'].includes(getEffectiveStatus(t)));
    } else if (statusFilter === 'COMPLETED') {
        displayTasks = displayTasks.filter(t => getEffectiveStatus(t) === 'COMPLETED');
    } else if (statusFilter === 'CANCELLED') {
        displayTasks = displayTasks.filter(t => getEffectiveStatus(t) === 'CANCELLED' || getEffectiveStatus(t) === 'CANCEL_REQUESTED');
    }

    displayTasks = [...displayTasks].sort((a, b) => {
        const order: Record<string, number> = { 'WAITING_SHOP_APPROVAL': 1, 'IN_PROGRESS': 2, 'CONFIRMED': 3, 'PENDING_PAYMENT': 4, 'WAITING_REFUND': 5, 'COMPLETED': 6, 'CANCELLED': 7, 'CANCEL_REQUESTED': 7 };
        const statusA = getEffectiveStatus(a) || a.status;
        const statusB = getEffectiveStatus(b) || b.status;
        const orderA = order[statusA] || 99;
        const orderB = order[statusB] || 99;

        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.appointmentDatetime).getTime() - new Date(a.appointmentDatetime).getTime();
    });

    // Expand tasks so that if a booking contains multiple services we show one card per service
    const expandedDisplayTasks = (() => {
        const out: TaskResponse[] = [];
        for (const t of displayTasks) {
            if (t.services && t.services.length > 1) {
                for (const svc of t.services) {
                    const item: any = {
                        ...t,
                        // represent this row as a single-service task for UI
                        serviceId: svc.serviceId,
                        serviceName: svc.serviceName,
                        servicePrice: svc.servicePrice,
                        services: [svc]
                    };
                    out.push(item);
                }
            } else if (t.services && t.services.length === 1) {
                // keep as-is but ensure services is present
                out.push({ ...t, services: t.services });
            } else {
                out.push(t);
            }
        }

        return out;
    })();

    const isMultiService = !!(selectedTask?.services && selectedTask.services.length > 0);
    const boardingServices = selectedTask?.services
        ? selectedTask.services.filter((s: any) => (s.category || guessCategory(s.serviceName)) === 'BOARDING')
        : [];
    const nonBoardingServices = selectedTask?.services
        ? selectedTask.services.filter((s: any) => (s.category || guessCategory(s.serviceName)) !== 'BOARDING')
        : [];
    const incompleteNonBoardingServices = nonBoardingServices.filter(
        (s: any) => !(selectedTask?.completedServiceIds || []).includes(s.serviceId)
    );
    const hasIncompleteNonBoarding = selectedTask?.status === 'IN_PROGRESS' && incompleteNonBoardingServices.length > 0;
    const nonBoardingTaskIndex = selectedTask ? ((selectedTask.cameraEnabled || (selectedTask.serviceName || '').toLowerCase().includes('camera')) ? 2 : 1) : 1;

    return (
        <div className="h-[calc(100vh-4rem)] bg-[#f8fafc] dark:bg-background-dark flex overflow-hidden">
            {/* LEFT PANEL: Task List */}
            <div className={`w-full lg:w-[400px] xl:w-[450px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full transition-transform duration-300 ${selectedTask ? 'hidden lg:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                        Xin chào, {user?.name || 'Staff'} 👋
                    </h1>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-3">
                        <button
                            onClick={() => setActiveTab('mine')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'mine' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <User size={16} /> Của tôi ({inProgressTasks.length + pendingTasks.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('pool')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pool' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid size={16} /> Kho chung ({poolTasks.length})
                        </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {['ALL', 'WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter as any)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${statusFilter === filter ? 'bg-slate-800 text-white border-slate-800 dark:bg-primary dark:border-primary shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
                            >
                                {filter === 'ALL' ? 'Tất cả' : filter === 'WAITING' ? 'Chờ duyệt' : filter === 'ACTIVE' ? 'Đang thực hiện' : filter === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã hủy'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : displayTasks.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-medium">Không có công việc nào</p>
                        </div>
                        ) : (
                            expandedDisplayTasks.map((task, listIdx) => (
                                <div
                                    key={`${task.bookingId}-${task.serviceId || (task.services && task.services[0]?.serviceId) || task.category || 'GENERAL'}-${listIdx}`}
                                onClick={() => handleSelectTask(task)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedTask?.bookingId === task.bookingId && selectedTask?.category === task.category
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900">{task.petName}</h3>
                                        <p className="text-xs text-slate-500 font-medium mt-1">{task.customerName}</p>
                                    </div>
                                    {(() => {
                                        const displayStatus = getEffectiveStatus(task) || task.status;
                                        return (
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase ${STATUS_CONFIG[displayStatus]?.color || 'bg-slate-50 text-slate-500'}`}>
                                                {STATUS_CONFIG[displayStatus]?.label || displayStatus}
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                                    <ClipboardList size={14} className="text-primary" />
                                    <span className="font-medium truncate">{task.services && task.services.length > 0 ? task.services.map((s: any) => s.serviceName).join(', ') : task.serviceName}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <div className="flex items-center gap-1"><Clock size={14} /> {formatTime(task.appointmentDatetime)}</div>
                                    <div className="flex items-center gap-1"><Calendar size={14} /> {formatDate(task.appointmentDatetime)}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANEL: Workspace Detail */}
            {selectedTask ? (
                <div className={`fixed inset-0 z-50 lg:static lg:z-auto lg:flex-1 bg-slate-50 dark:bg-background-dark flex flex-col h-full transition-transform duration-300`}>
                    {/* Header Mobile Support */}
                    <div className="lg:hidden flex items-center gap-4 p-4 bg-white border-b border-slate-200 pt-8">
                        <button onClick={() => handleSelectTask(null)} className="p-2 -ml-2 text-slate-600 bg-slate-100 rounded-full">
                            <X size={20} />
                        </button>
                        <h2 className="font-bold text-lg">Chi tiết công việc</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                        <div className="max-w-4xl mx-auto space-y-6">

                            {/* Main Info Card */}
                            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-200">
                                <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                    <div 
                                        className="flex items-center gap-6 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded-2xl transition-colors"
                                        onClick={() => setIsPetDetailsModalOpen(true)}
                                    >
                                        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-slate-100 relative shrink-0 overflow-hidden">
                                            {petDetails?.avatar ? (
                                                <img src={petDetails.avatar} alt={selectedTask.petName} className="w-full h-full object-cover" />
                                            ) : (
                                                '🐾'
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
                                                {selectedTask.petName}
                                                {petDetails && (
                                                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-2">
                                                        <span>{petDetails.species} - {petDetails.breed}</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                        <span>{petDetails.weight}kg</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                        <span>{petDetails.gender === 'MALE' ? 'Đực' : petDetails.gender === 'FEMALE' ? 'Cái' : 'Chưa rõ'}</span>
                                                        {petDetails.dob && (
                                                            <>
                                                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                <span>{new Date().getFullYear() - new Date(petDetails.dob).getFullYear()} tuổi</span>
                                                            </>
                                                        )}
                                                    </span>
                                                )}
                                            </h2>
                                            <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                                                <span className="font-medium text-slate-600 flex items-center gap-1"><User size={14} /> {selectedTask.customerName}</span>
                                                {selectedTask.customerPhone && (
                                                    <span className="font-medium text-slate-600 flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                        {selectedTask.customerPhone}
                                                    </span>
                                                )}
                                                <span className="hidden sm:inline text-slate-300">|</span>
                                                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${STATUS_CONFIG[selectedTask.status]?.color}`}>
                                                    {STATUS_CONFIG[selectedTask.status]?.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-3 min-w-[200px]">
                                        {activeTab === 'pool' ? (
                                            <button
                                                onClick={() => handleClaimTask(selectedTask.bookingId)}
                                                disabled={updatingId === selectedTask.bookingId}
                                                className="w-full py-3 bg-[#1a2b4c] text-white rounded-xl font-bold text-sm shadow-md hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
                                            >
                                                {updatingId === selectedTask.bookingId ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                                Nhận ca trực
                                            </button>
                                        ) : (
                                            <>
                                                {selectedTask.status === 'CONFIRMED' && (
                                                    ((selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'BOARDING') && (selectedTask.cameraEnabled || selectedTask.serviceName.toLowerCase().includes('camera')) ? (
                                                        <button
                                                            onClick={() => {
                                                                setRtspInput(rtspInput || selectedTask.rtspLink || '');
                                                                setShowPreview(!!dashboardPreviewUrl || !!rtspInput || !!selectedTask.rtspLink);
                                                                setIsCameraModalOpen(true);
                                                            }}
                                                            disabled={updatingId === selectedTask.bookingId}
                                                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {updatingId === selectedTask.bookingId ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                                            Bắt đầu cấu hình
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUpdateStatus(selectedTask.bookingId, 'IN_PROGRESS')}
                                                            disabled={updatingId === selectedTask.bookingId}
                                                            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {updatingId === selectedTask.bookingId ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                                            Bắt đầu làm
                                                        </button>
                                                    )
                                                )}
                                                {selectedTask.status === 'IN_PROGRESS' && (
                                                    (() => {
                                                        const isBoarding = (selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'BOARDING';
                                                        const checkOutDateStr = selectedTask.checkOutDatetime || (selectedTask as any).checkOut;

                                                        const getCheckoutTime = () => {
                                                            if (checkOutDateStr) return new Date(checkOutDateStr);
                                                            // Fallback to 1 hour after appointment start time
                                                            return new Date(new Date(selectedTask.appointmentDatetime).getTime() + 60 * 60 * 1000);
                                                        };

                                                        let isBeforeCheckOut = false;
                                                        let isAfterCheckOut = false;

                                                        const checkout = getCheckoutTime();
                                                        const now = new Date();
                                                        if (isBoarding) {
                                                            const checkoutDay = new Date(checkout.getFullYear(), checkout.getMonth(), checkout.getDate());
                                                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                                            isBeforeCheckOut = today.getTime() < checkoutDay.getTime();
                                                            isAfterCheckOut = today.getTime() > checkoutDay.getTime();
                                                        } else {
                                                            // For non-boarding services, compare exact timestamps
                                                            isBeforeCheckOut = now.getTime() < checkout.getTime();
                                                            isAfterCheckOut = now.getTime() > checkout.getTime();
                                                        }

                                                        return (
                                                            <div className="space-y-2">
                                                                <button
                                                                    onClick={() => {
                                                                        if (hasIncompleteNonBoarding) return;
                                                                        if (isBeforeCheckOut) {
                                                                            setCheckoutType('EARLY');
                                                                            setCheckoutReason('');
                                                                            setIsCheckoutModalOpen(true);
                                                                        } else if (isAfterCheckOut) {
                                                                            setCheckoutType('LATE');
                                                                            setCheckoutReason('');
                                                                            setIsCheckoutModalOpen(true);
                                                                        } else {
                                                                            handleUpdateStatus(selectedTask.bookingId, 'COMPLETED');
                                                                        }
                                                                    }}
                                                                    disabled={updatingId === selectedTask.bookingId || hasIncompleteNonBoarding}
                                                                    className={`w-full py-3 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                                                                        hasIncompleteNonBoarding
                                                                            ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                                                                            : 'bg-emerald-500 hover:bg-emerald-650 text-white shadow-emerald-500/20 hover:scale-[1.02]'
                                                                    }`}
                                                                >
                                                                    {updatingId === selectedTask.bookingId ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                                    {isBoarding ? 'Kết thúc lưu trú' : 'Hoàn thành'}
                                                                </button>
                                                                {hasIncompleteNonBoarding && (
                                                                    <p className="text-[10px] text-rose-500 font-bold text-center flex items-center justify-center gap-1 mt-1">
                                                                        ⚠️ Hoàn thành tất cả dịch vụ khác trước
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                                {/* Nút Hủy do khách trễ (No-Show) — chỉ hiện khi đơn CONFIRMED và đã qua giờ hẹn */}
                                                {selectedTask.status === 'CONFIRMED' && new Date() > new Date(selectedTask.appointmentDatetime) && (
                                                    <button
                                                        onClick={() => setIsNoShowModalOpen(true)}
                                                        className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <UserX size={16} />
                                                        Hủy do khách trễ
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Workspace Tabs */}
                            {selectedTask && (
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                                    <div className="flex border-b border-slate-100 overflow-x-auto custom-scrollbar">
                                        <button
                                            onClick={() => setActiveWorkspaceTab('info')}
                                            className={`flex-1 min-w-[120px] py-4 text-sm font-bold border-b-2 transition-all ${activeWorkspaceTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            Thông tin chung
                                        </button>
                                        <button
                                            onClick={() => setActiveWorkspaceTab('logs')}
                                            className={`flex-1 min-w-[140px] py-4 text-sm font-bold border-b-2 transition-all ${activeWorkspaceTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            Nhật ký chăm sóc
                                        </button>
                                        {(selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'CLINIC' && (
                                            <button
                                                onClick={() => setActiveWorkspaceTab('medical')}
                                                className={`flex-1 min-w-[120px] py-4 text-sm font-bold border-b-2 transition-all ${activeWorkspaceTab === 'medical' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                Hồ sơ y tế
                                            </button>
                                        )}
                                        {((selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'BOARDING') && (
                                            <button
                                                onClick={() => setActiveWorkspaceTab('chat')}
                                                className={`flex-1 min-w-[140px] py-4 text-sm font-bold border-b-2 transition-all ${activeWorkspaceTab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                            >
                                                Trò chuyện
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-4 lg:p-6">
                                        {activeWorkspaceTab === 'chat' && (
                                            <StaffChatTab bookingDetails={bookingDetails} user={user} selectedTask={selectedTask} />
                                        )}
                                        {activeWorkspaceTab === 'info' && (
                                            <div className="space-y-6">
                                                {/* Danh sách dịch vụ cần làm */}
                                                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                            <ClipboardList size={16} className="text-primary" />
                                                            Dịch vụ cần thực hiện
                                                        </h3>
                                                    </div>
                                                    <div className="p-5 space-y-6">
                                                        {selectedTask?.services && selectedTask.services.length > 0 && (
                                                            <div className="text-sm text-slate-600">
                                                                <span className="font-semibold">Dịch vụ: </span>
                                                                <span className="truncate block md:inline">{selectedTask.services.map((s: any) => s.serviceName).join(', ')}</span>
                                                            </div>
                                                        )}
                                                        {isMultiService ? (
                                                            <>
                                                                {/* Dịch vụ lưu trú */}
                                                                {boardingServices.length > 0 && (
                                                                    <div className="space-y-3">
                                                                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-405">Dịch vụ lưu trú</h4>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            {boardingServices.map((svc: any, idx: number) => (
                                                                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-150 dark:border-slate-700/50 hover:border-primary/20 transition-all">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-primary shadow-sm border border-slate-100 dark:border-slate-600">
                                                                                            <Sparkles size={16} className="text-primary animate-pulse" />
                                                                                        </div>
                                                                                        <div>
                                                                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{svc.serviceName}</span>
                                                                                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Dịch vụ #{svc.serviceId}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <span className="text-xs font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                                                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(svc.servicePrice || 0)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>

                                                                        {/* Nhiệm vụ 1: Cấu hình camera */}
                                                                        {(selectedTask.cameraEnabled || selectedTask.serviceName.toLowerCase().includes('camera')) && (
                                                                            <div className="mt-4 p-5 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                                                                                <div className="flex items-center justify-between">
                                                                                    <h5 className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                                                                                        <Camera size={14} />
                                                                                        Nhiệm vụ 1: Cấu hình camera
                                                                                    </h5>
                                                                                    {bookingDetails?.cameraConfiguredAt && (
                                                                                        <span className="text-[10px] bg-emerald-105 text-emerald-800 px-2 py-1 rounded-md font-bold">
                                                                                            Đã cấu hình
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                
                                                                                {/* Camera Player & Controls inside Nhiệm vụ 1 */}
                                                                                <div className="w-full bg-slate-900 rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[200px] border border-slate-800 shadow-inner">
                                                                                    {dashboardPreviewUrl ? (
                                                                                        isCheckingStream ? (
                                                                                            <div className="text-center p-6 text-slate-400 space-y-3 z-10">
                                                                                                <Loader2 size={32} className="mx-auto text-blue-500 animate-spin" />
                                                                                                <p className="text-xs font-semibold">Đang kết nối tới camera...</p>
                                                                                            </div>
                                                                                        ) : streamError ? (
                                                                                            <div className="text-center p-6 text-slate-400 space-y-3 z-10">
                                                                                                <AlertCircle size={32} className="mx-auto text-slate-500" />
                                                                                                <p className="text-xs">Không thể tải luồng video.</p>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => {
                                                                                                        setStreamError(false);
                                                                                                        setIsCheckingStream(true);
                                                                                                        checkStreamReady(dashboardPreviewUrl).then(ready => {
                                                                                                            setIsCheckingStream(false);
                                                                                                            if (ready) setIsStreamReady(true);
                                                                                                            else setStreamError(true);
                                                                                                        });
                                                                                                    }}
                                                                                                    className="px-2 py-1 bg-slate-700 text-white rounded-lg text-[10px] hover:bg-slate-600 transition-colors"
                                                                                                >
                                                                                                    Thử lại
                                                                                                </button>
                                                                                            </div>
                                                                                        ) : isStreamReady ? (
                                                                                            <HLSPlayer
                                                                                                streamUrl={dashboardPreviewUrl}
                                                                                                isMuted={isMuted}
                                                                                                onError={() => setStreamError(true)}
                                                                                            />
                                                                                        ) : null
                                                                                    ) : (
                                                                                        <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                                                                                            <Camera size={36} className="opacity-25 text-slate-500" />
                                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chưa cấu hình RTSP</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {selectedTask.status === 'IN_PROGRESS' && (
                                                                                    <div className="flex gap-2 flex-wrap">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={workspaceRtspInput}
                                                                                            onChange={e => setWorkspaceRtspInput(e.target.value)}
                                                                                            placeholder="Nhập đường dẫn RTSP..."
                                                                                            className="flex-1 min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 transition-all shadow-inner text-slate-900 dark:text-white"
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={handleConfigureDashboardPreview}
                                                                                            disabled={!workspaceRtspInput.trim() || isCheckingStream}
                                                                                            className="px-3 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 text-xs"
                                                                                        >
                                                                                            {isCheckingStream ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                                                                            Kiểm tra
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={handleSaveDashboardConfig}
                                                                                            disabled={updatingId === selectedTask.bookingId || !workspaceRtspInput.trim() || workspaceRtspInput === selectedTask.rtspLink}
                                                                                            className="px-3 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-md shadow-blue-500/20 disabled:opacity-50 text-xs"
                                                                                        >
                                                                                            {updatingId === selectedTask.bookingId ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                                                            Lưu cấu hình
                                                                                        </button>
                                                                                        {bookingDetails?.cameraStreamUrl && (
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={handleDeleteCamera}
                                                                                                disabled={isStoppingCamera}
                                                                                                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 text-xs"
                                                                                            >
                                                                                                {isStoppingCamera ? <Loader2 size={12} className="animate-spin" /> : <VideoOff size={12} />}
                                                                                                Dừng Camera
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Dịch vụ khác */}
                                                                {nonBoardingServices.length > 0 && (
                                                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                                                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-405">Dịch vụ khác</h4>
                                                                        
                                                                        {/* Nhiệm vụ 2: Hoàn thành dịch vụ khác */}
                                                                        <div className="p-5 bg-emerald-50/30 dark:bg-emerald-950/5 rounded-2xl border border-emerald-100/55 dark:border-emerald-900/20 space-y-4">
                                                                            <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-450 flex items-center gap-2">
                                                                                <ClipboardList size={14} />
                                                                                {`Nhiệm vụ ${nonBoardingTaskIndex}: Hoàn thành dịch vụ khác`}
                                                                            </h5>
                                                                            
                                                                            <div className="space-y-3">
                                                                                {nonBoardingServices.map((svc: any, idx: number) => {
                                                                                    const isCompleted = (selectedTask.completedServiceIds || []).includes(svc.serviceId);
                                                                                    const cat = svc.category || guessCategory(svc.serviceName);
                                                                                    return (
                                                                                        <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700 shadow-sm">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                                                                    {isCompleted ? '✓' : idx + 1}
                                                                                                </div>
                                                                                                <div>
                                                                                                    <span className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-850 dark:text-slate-200'}`}>
                                                                                                        {svc.serviceName}
                                                                                                    </span>
                                                                                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Mã dịch vụ: #{svc.serviceId}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-3">
                                                                                                <span className="text-xs font-black text-slate-650 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                                                                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(svc.servicePrice || 0)}
                                                                                                </span>
                                                                                                {selectedTask.status === 'IN_PROGRESS' && (
                                                                                                    isCompleted ? (
                                                                                                        <div className="flex flex-col items-end gap-1">
                                                                                                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/50">
                                                                                                                <CheckCircle2 size={12} /> Đã xong
                                                                                                            </span>
                                                                                                            {svc.completedAt && (
                                                                                                                <span className="text-[10px] text-slate-400 font-semibold">
                                                                                                                    {format(parseISO(svc.completedAt), 'HH:mm - dd/MM', { locale: vi })}
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => {
                                                                                                                if (cat === 'CLINIC') {
                                                                                                                    handleOpenClinicModal(svc.serviceId);
                                                                                                                } else {
                                                                                                                    handleCompleteServiceItem(selectedTask.bookingId, svc.serviceId);
                                                                                                                }
                                                                                                            }}
                                                                                                            disabled={updatingId === selectedTask.bookingId}
                                                                                                            className={`px-3 py-1.5 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                                                                                                                cat === 'CLINIC'
                                                                                                                    ? 'bg-violet-500 hover:bg-violet-600 shadow-violet-500/10'
                                                                                                                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                                                                                                            }`}
                                                                                                        >
                                                                                                            {updatingId === selectedTask.bookingId ? <Loader2 size={12} className="animate-spin" /> : cat === 'CLINIC' ? '📋 Nhập kết quả' : 'Hoàn thành'}
                                                                                                        </button>
                                                                                                    )
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            // Single service fallback
                                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-150 dark:border-slate-700/50 hover:border-primary/20 transition-all">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-primary shadow-sm border border-slate-100 dark:border-slate-600">
                                                                        <Sparkles size={16} className="text-primary" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedTask.serviceName}</span>
                                                                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Dịch vụ #{selectedTask.serviceId}</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedTask.servicePrice || 0)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Pet Profile Details */}
                                                {petDetails && (
                                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                                            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                                <Heart size={16} className="text-rose-500" />
                                                                Hồ sơ chi tiết của bé
                                                            </h3>
                                                        </div>
                                                        <div className="p-5">
                                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                {petDetails.color && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Màu lông</p>
                                                                        <p className="text-sm font-medium text-slate-700">{petDetails.color}</p>
                                                                    </div>
                                                                )}
                                                                {petDetails.favoriteFood && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Utensils size={10} /> Yêu thích</p>
                                                                        <p className="text-sm font-medium text-slate-700">{petDetails.favoriteFood}</p>
                                                                    </div>
                                                                )}
                                                                {petDetails.allergies && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertCircle size={10} className="text-rose-500" /> Dị ứng</p>
                                                                        <p className="text-sm font-medium text-rose-600">{petDetails.allergies}</p>
                                                                    </div>
                                                                )}
                                                                {petDetails.hobbies && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sở thích</p>
                                                                        <p className="text-sm font-medium text-slate-700">{petDetails.hobbies}</p>
                                                                    </div>
                                                                )}
                                                                {petDetails.walkTime && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Activity size={10} /> Vận động</p>
                                                                        <p className="text-sm font-medium text-slate-700">{petDetails.walkTime}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {petDetails.healthNote && (
                                                                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                                                                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1 flex items-center gap-1"><Syringe size={10} /> Lưu ý sức khỏe đặc biệt</p>
                                                                    <p className="text-sm font-medium text-amber-900">{petDetails.healthNote}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {(selectedTask.status === 'IN_PROGRESS' || selectedTask.status === 'COMPLETED' || selectedTask.status === 'CANCELLED' || selectedTask.status === 'CANCEL_REQUESTED') && (
                                                    <div className="p-5 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-3 shadow-inner">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-xl">
                                                                <PlayCircle size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Thời gian bắt đầu thực tế</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    <strong className="text-slate-700 dark:text-slate-300">
                                                                        {(selectedTask.status === 'CANCELLED' || selectedTask.status === 'CANCEL_REQUESTED')
                                                                            ? ((selectedTask.updatedAt || bookingDetails?.updatedAt) ? format(parseISO(selectedTask.updatedAt || bookingDetails?.updatedAt!), 'HH:mm - dd/MM/yyyy', { locale: vi }) : format(new Date(), 'HH:mm - dd/MM/yyyy', { locale: vi }))
                                                                            : ((localStartTime || bookingDetails?.serviceStartDatetime || selectedTask.serviceStartDatetime) ? format(parseISO(localStartTime || bookingDetails?.serviceStartDatetime || selectedTask.serviceStartDatetime!), 'HH:mm - dd/MM/yyyy', { locale: vi }) : 'Chưa cập nhật')}
                                                                    </strong>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedTask.status === 'COMPLETED' && (
                                                    <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-3 shadow-inner">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl">
                                                                <CheckCircle2 size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Dịch vụ đã hoàn thành</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    Thời gian kết thúc thực tế: <strong className="text-slate-700 dark:text-slate-300">{(localCompletionTime || bookingDetails?.serviceEndDatetime || selectedTask.serviceEndDatetime) ? format(parseISO(localCompletionTime || bookingDetails?.serviceEndDatetime || selectedTask.serviceEndDatetime!), 'HH:mm - dd/MM/yyyy', { locale: vi }) : 'Chưa cập nhật'}</strong>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {(() => {
                                                            const earlyLog = careLogs.find(log => log.note && log.note.startsWith('[Kết thúc sớm] Lý do:'));
                                                            const lateLog = careLogs.find(log => log.note && log.note.startsWith('[Kết thúc trễ] Lý do:'));

                                                            if (earlyLog) {
                                                                return (
                                                                    <div className="pt-3 border-t border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                                                                        <span className="font-black text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-450 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-900/45 px-2.5 py-1 rounded-md">Kết thúc sớm</span>
                                                                        <span>Lý do: <strong className="italic text-slate-700 dark:text-slate-300">"{earlyLog.note.replace('[Kết thúc sớm] Lý do:', '').trim()}"</strong></span>
                                                                    </div>
                                                                );
                                                            }
                                                            if (lateLog) {
                                                                return (
                                                                    <div className="pt-3 border-t border-emerald-100 dark:border-emerald-900/40 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                                                                        <span className="font-black text-[9px] uppercase tracking-wider text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-900/45 px-2.5 py-1 rounded-md">Kết thúc trễ</span>
                                                                        <span>Lý do: <strong className="italic text-slate-700 dark:text-slate-300">"{lateLog.note.replace('[Kết thúc trễ] Lý do:', '').trim()}"</strong></span>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                )}
                                                {(selectedTask.status === 'CANCELLED' || selectedTask.status === 'CANCEL_REQUESTED') && (
                                                    <div className="p-5 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 space-y-3 shadow-inner">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-xl">
                                                                <XCircle size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Dịch vụ đã hủy</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                    Thời gian hủy: <strong className="text-slate-700 dark:text-slate-300">{(selectedTask.updatedAt || bookingDetails?.updatedAt) ? format(parseISO(selectedTask.updatedAt || bookingDetails?.updatedAt!), 'HH:mm - dd/MM/yyyy', { locale: vi }) : format(new Date(), 'HH:mm - dd/MM/yyyy', { locale: vi })}</strong>
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {selectedTask.cancellationReason === 'LATE_NO_SHOW' && (
                                                            <div className="pt-3 border-t border-rose-100 dark:border-rose-900/40 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                                                                <span className="font-black text-[9px] uppercase tracking-wider text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-900/45 px-2.5 py-1 rounded-md">LỖI KHÁCH HÀNG</span>
                                                                <span>Lý do: <strong className="italic text-slate-700 dark:text-slate-300">"Khách hàng đến trễ (No-show)"</strong></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {(selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'BOARDING' ? (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <div className="flex items-center gap-2 mb-2 text-primary font-bold text-sm">
                                                                <ClipboardList size={16} /> Số phòng
                                                            </div>
                                                            <p className="font-semibold text-slate-800">P-{(selectedTask.bookingId % 20) + 101}</p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-sm">
                                                                <Clock size={16} /> T.gian nhận thú
                                                            </div>
                                                            <p className="font-semibold text-slate-800">{formatTime(selectedTask.appointmentDatetime)} - {formatDate(selectedTask.appointmentDatetime)}</p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-sm">
                                                                <Calendar size={16} /> Ngày kết thúc
                                                            </div>
                                                            <p className="font-semibold text-slate-800">
                                                                {selectedTask.checkOutDatetime || (selectedTask as any).checkOut
                                                                    ? `${formatTime(selectedTask.checkOutDatetime || (selectedTask as any).checkOut)} - ${formatDate(selectedTask.checkOutDatetime || (selectedTask as any).checkOut)}`
                                                                    : 'Chưa xác định'}
                                                            </p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <div className="flex items-center gap-2 mb-2 text-primary font-bold text-sm">
                                                                <ClipboardList size={16} /> Kích thước
                                                            </div>
                                                            <p className="font-semibold text-slate-800">{selectedTask.cageSize || 'Tiêu chuẩn'}</p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <div className="flex items-center gap-2 mb-2 text-primary font-bold text-sm">
                                                                <ClipboardList size={16} /> Loại phòng
                                                            </div>
                                                            <p className="font-semibold text-slate-800">{selectedTask.roomType || 'Thường'}</p>
                                                        </div>
                                                        {(selectedTask.cameraEnabled || selectedTask.serviceName.toLowerCase().includes('camera') || (selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'BOARDING') && !isMultiService && (
                                                            <>
                                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                    <div className="flex items-center gap-2 mb-2 text-blue-600 font-bold text-sm">
                                                                        <Camera size={16} /> Camera
                                                                    </div>
                                                                    <p className="font-semibold text-slate-800">Cơ bản (720p)</p>
                                                                </div>
                                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                    <div className="flex items-center gap-2 mb-2 text-emerald-600 font-bold text-sm">
                                                                        <Play size={16} /> Trạng thái
                                                                    </div>
                                                                    <p className="font-semibold text-emerald-600">Sẵn sàng</p>
                                                                </div>
                                                                {bookingDetails?.cameraConfiguredAt && (
                                                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                        <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-sm">
                                                                            <Clock size={16} /> Cấu hình lúc
                                                                        </div>
                                                                        <p className="font-semibold text-slate-800">
                                                                            {format(parseISO(bookingDetails.cameraConfiguredAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                <div className="col-span-2 md:col-span-3 mt-2">
                                                                    <p className="text-slate-500 mb-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                                                        <MonitorPlay size={16} /> Màn hình giám sát trực tiếp
                                                                    </p>
                                                                    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[250px] border border-slate-800 shadow-inner">
                                                                        {dashboardPreviewUrl ? (
                                                                            isCheckingStream ? (
                                                                                <div className="text-center p-6 text-slate-400 space-y-3 z-10">
                                                                                    <Loader2 size={40} className="mx-auto text-blue-500 animate-spin" />
                                                                                    <p className="text-sm font-semibold">Đang kết nối tới camera...</p>
                                                                                </div>
                                                                            ) : streamError ? (
                                                                                <div className="text-center p-6 text-slate-400 space-y-3 z-10">
                                                                                    <AlertCircle size={40} className="mx-auto text-slate-500" />
                                                                                    <p className="text-sm">Không thể tải luồng video.</p>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setStreamError(false);
                                                                                            setIsCheckingStream(true);
                                                                                            checkStreamReady(dashboardPreviewUrl).then(ready => {
                                                                                                setIsCheckingStream(false);
                                                                                                if (ready) setIsStreamReady(true);
                                                                                                else setStreamError(true);
                                                                                            });
                                                                                        }}
                                                                                        className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs hover:bg-slate-600 transition-colors"
                                                                                    >
                                                                                        Thử lại
                                                                                    </button>
                                                                                </div>
                                                                            ) : isStreamReady ? (
                                                                                <HLSPlayer
                                                                                    streamUrl={dashboardPreviewUrl}
                                                                                    isMuted={isMuted}
                                                                                    onError={() => setStreamError(true)}
                                                                                />
                                                                            ) : null
                                                                        ) : (
                                                                            <div className="flex flex-col items-center justify-center text-slate-600 gap-3">
                                                                                <Camera size={48} className="opacity-20" />
                                                                                <p className="text-[10px] font-black uppercase tracking-widest">Chưa cấu hình RTSP</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {selectedTask.status === 'IN_PROGRESS' && (
                                                                        <div className="mt-4 flex gap-2 flex-wrap">
                                                                            <input
                                                                                type="text"
                                                                                value={workspaceRtspInput}
                                                                                onChange={e => setWorkspaceRtspInput(e.target.value)}
                                                                                placeholder="Nhập đường dẫn RTSP mới (nếu cần)..."
                                                                                className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
                                                                            />
                                                                            <button
                                                                                onClick={handleConfigureDashboardPreview}
                                                                                disabled={!workspaceRtspInput.trim() || isCheckingStream}
                                                                                className="px-4 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 text-sm"
                                                                            >
                                                                                {isCheckingStream ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                                                                Kiểm tra
                                                                            </button>
                                                                            <button
                                                                                onClick={handleSaveDashboardConfig}
                                                                                disabled={updatingId === selectedTask.bookingId || !workspaceRtspInput.trim() || workspaceRtspInput === selectedTask.rtspLink}
                                                                                className="px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-md shadow-blue-500/20 disabled:opacity-50 text-sm"
                                                                            >
                                                                                {updatingId === selectedTask.bookingId ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                                                Lưu cấu hình
                                                                            </button>
                                                                            {bookingDetails?.cameraStreamUrl && (
                                                                                <button
                                                                                    onClick={handleDeleteCamera}
                                                                                    disabled={isStoppingCamera}
                                                                                    className="px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 text-sm"
                                                                                >
                                                                                    {isStoppingCamera ? <Loader2 size={16} className="animate-spin" /> : <VideoOff size={16} />}
                                                                                    Dừng Camera
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <div className="flex items-center gap-2 mb-2 text-primary font-bold text-sm">
                                                                <ClipboardList size={16} /> Dịch vụ
                                                            </div>
                                                            <p className="font-semibold text-slate-800">{selectedTask.services && selectedTask.services.length > 0 ? selectedTask.services.map((s: any) => s.serviceName).join(', ') : selectedTask.serviceName}</p>
                                                        </div>
                                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                            <div className="flex items-center gap-2 mb-2 text-indigo-600 font-bold text-sm">
                                                                <Clock size={16} /> Thời gian bắt đầu
                                                            </div>
                                                            <p className="font-semibold text-slate-800">{formatTime(selectedTask.appointmentDatetime)} - {formatDate(selectedTask.appointmentDatetime)}</p>
                                                        </div>
                                                        <div className={`p-4 rounded-2xl border ${(bookingDetails?.serviceEndDatetime || localCompletionTime) ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                                            <div className={`flex items-center gap-2 mb-2 font-bold text-sm ${(bookingDetails?.serviceEndDatetime || localCompletionTime) ? 'text-emerald-600' : 'text-violet-600'}`}>
                                                                {(bookingDetails?.serviceEndDatetime || localCompletionTime) ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                                                                {(bookingDetails?.serviceEndDatetime || localCompletionTime) ? 'Thời gian kết thúc' : 'Thời gian kết thúc dự kiến'}
                                                            </div>
                                                            <p className={`font-semibold ${(bookingDetails?.serviceEndDatetime || localCompletionTime) ? 'text-emerald-800' : 'text-slate-800'}`}>
                                                                {(bookingDetails?.serviceEndDatetime || localCompletionTime)
                                                                    ? format(parseISO(bookingDetails?.serviceEndDatetime || localCompletionTime!), 'HH:mm - dd/MM/yyyy', { locale: vi })
                                                                    : selectedTask.checkOutDatetime ? `${formatTime(selectedTask.checkOutDatetime)} - ${formatDate(selectedTask.checkOutDatetime)}` : 'Chưa xác định'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedTask.note && (
                                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                                        <div className="flex items-center gap-2 mb-2 text-amber-600 font-bold text-sm">
                                                            <AlertCircle size={16} /> Ghi chú từ khách hàng
                                                        </div>
                                                        <p className="text-amber-900 text-sm font-medium">{selectedTask.note}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeWorkspaceTab === 'logs' && (
                                            <div className="space-y-8">
                                                {selectedTask.status === 'IN_PROGRESS' && (
                                                    <form onSubmit={handleAddCareLog} className="bg-slate-50 p-4 lg:p-5 rounded-3xl border border-slate-100">
                                                        <h3 className="font-bold text-slate-900 mb-4">Thêm nhật ký mới</h3>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                                            {CARE_LOG_TYPES.map(type => (
                                                                <button
                                                                    key={type.id}
                                                                    type="button"
                                                                    onClick={() => setCareLogType(type.id)}
                                                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${careLogType === type.id
                                                                        ? 'bg-primary text-white border-primary shadow-sm'
                                                                        : 'bg-white border-slate-200 text-slate-500 hover:border-primary/30'
                                                                        }`}
                                                                >
                                                                    <type.icon size={18} />
                                                                    <span className="text-xs font-semibold">{type.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <textarea
                                                            value={careLogNote}
                                                            onChange={(e) => setCareLogNote(e.target.value)}
                                                            placeholder="Mô tả nội dung chăm sóc..."
                                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24 mb-4"
                                                            required
                                                        />
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            <div className="flex items-center gap-4">
                                                                <label className="cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
                                                                    <Camera size={18} />
                                                                    {careLogImage ? 'Đã chọn ảnh' : 'Đính kèm ảnh'}
                                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setCareLogImage(e.target.files?.[0] || null)} />
                                                                </label>
                                                                {careLogImage && <span className="text-xs text-green-600 font-medium whitespace-nowrap">✓ Sẵn sàng</span>}
                                                            </div>
                                                            <button
                                                                type="submit"
                                                                disabled={submittingLog}
                                                                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                            >
                                                                {submittingLog ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu nhật ký
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}

                                                <div className="space-y-4">
                                                    <h3 className="font-bold text-slate-900">Lịch sử chăm sóc</h3>
                                                    {careLogs.filter(log => !log.note?.startsWith('[Kết thúc')).length === 0 ? (
                                                        <p className="text-slate-500 text-sm text-center py-6 bg-slate-50 rounded-2xl border border-slate-100">Chưa có nhật ký nào được ghi lại.</p>
                                                    ) : (
                                                        careLogs.filter(log => !log.note?.startsWith('[Kết thúc')).map((log) => {
                                                            const typeCfg = CARE_LOG_TYPES.find(t => t.id === log.type) || CARE_LOG_TYPES[0];
                                                            const LogIcon = typeCfg.icon;
                                                            return (
                                                                <div key={log.id} className="flex gap-4 p-4 lg:p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeCfg.color}`}>
                                                                        <LogIcon size={20} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className="font-bold text-sm truncate pr-2">{typeCfg.label}</span>
                                                                            <span className="text-xs font-semibold text-slate-400 shrink-0">{formatTime(log.timestamp)}</span>
                                                                        </div>
                                                                        <p className="text-slate-700 text-sm break-words">{log.note}</p>
                                                                        {log.imageUrl && (
                                                                            <img src={log.imageUrl} alt="Care log" className="mt-3 rounded-xl max-h-48 object-cover border border-slate-100" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeWorkspaceTab === 'medical' && (selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'CLINIC' && (
                                            <div className="space-y-6">
                                                {selectedTask.status === 'COMPLETED' ? (
                                                    <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-100">
                                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                            <CheckCircle2 size={32} />
                                                        </div>
                                                        <h3 className="font-bold text-slate-900 mb-2">Ca khám đã hoàn thành</h3>
                                                        <p className="text-slate-500 text-sm">Hồ sơ y tế đã được lưu trữ an toàn.</p>
                                                    </div>
                                                ) : (
                                                    <form onSubmit={handleSubmitMedical} className="space-y-5">
                                                        <div>
                                                            <label className="block text-sm font-bold text-slate-700 mb-2">Chẩn đoán <span className="text-red-500">*</span></label>
                                                            <input
                                                                type="text" required
                                                                value={medicalForm.diagnosis}
                                                                onChange={e => setMedicalForm({ ...medicalForm, diagnosis: e.target.value })}
                                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all"
                                                                placeholder="Nhập kết luận chẩn đoán..."
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-bold text-slate-700 mb-2">Triệu chứng</label>
                                                            <textarea
                                                                value={medicalForm.symptoms}
                                                                onChange={e => setMedicalForm({ ...medicalForm, symptoms: e.target.value })}
                                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all h-24 resize-none"
                                                                placeholder="Mô tả triệu chứng lâm sàng..."
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                            <div>
                                                                <label className="block text-sm font-bold text-slate-700 mb-2">Đơn thuốc</label>
                                                                <textarea
                                                                    value={medicalForm.prescription}
                                                                    onChange={e => setMedicalForm({ ...medicalForm, prescription: e.target.value })}
                                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all h-24 resize-none"
                                                                    placeholder="Kê đơn thuốc..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-bold text-slate-700 mb-2">Hướng dẫn điều trị</label>
                                                                <textarea
                                                                    value={medicalForm.treatment}
                                                                    onChange={e => setMedicalForm({ ...medicalForm, treatment: e.target.value })}
                                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 transition-all h-24 resize-none"
                                                                    placeholder="Phương pháp điều trị..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="pt-4 flex justify-end">
                                                            <button
                                                                type="submit"
                                                                disabled={submittingMedical}
                                                                className="w-full md:w-auto px-8 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                                            >
                                                                {submittingMedical ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Lưu hồ sơ
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="hidden lg:flex flex-1 bg-slate-50/50 dark:bg-slate-950 items-center justify-center p-8">
                    <div className="text-center max-w-sm">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Sparkles size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Chọn một công việc</h2>
                        <p className="text-slate-500 font-medium">Chọn một công việc từ danh sách bên trái để xem chi tiết và bắt đầu làm việc.</p>
                    </div>
                </div>
            )}

            {/* Camera Configuration Modal */}
            {/* Camera Configuration Modal */}
            <AnimatePresence>
                {isCameraModalOpen && selectedTask && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsCameraModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl bg-slate-900 dark:bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl overflow-hidden flex flex-col md:flex-row gap-8"
                        >
                            <button
                                onClick={() => setIsCameraModalOpen(false)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-xl bg-slate-800/50 z-10"
                            >
                                <X size={20} />
                            </button>

                            {/* Left Side: Form */}
                            <div className="flex-1 min-w-0 md:min-w-[300px]">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 rounded-[1.2rem] bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                                        <Camera size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight">Cấu hình Camera</h3>
                                        {selectedTask ? (
                                            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                                Phòng P-{(selectedTask.bookingId % 20) + 101}
                                                {rtspInput && showPreview && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />}
                                            </p>
                                        ) : (
                                            <div className="w-20 h-4 bg-slate-800 rounded animate-pulse mt-2" />
                                        )}
                                    </div>
                                </div>

                                {selectedTask ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 mb-1.5 text-[9px] font-black uppercase tracking-widest">Thú cưng</p>
                                                <p className="font-bold text-slate-200">{selectedTask.petName}</p>
                                            </div>
                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 mb-1.5 text-[9px] font-black uppercase tracking-widest">Tình trạng thanh toán</p>
                                                {selectedTask.paymentMethod === 'PAYOS' ? (
                                                    <p className="font-bold text-emerald-400">Đã thanh toán đủ 100%</p>
                                                ) : selectedTask.paymentMethod === 'CASH_DEPOSIT' ? (
                                                    <p className="font-bold text-amber-500">Đã đặt cọc (Cần thu phần còn lại)</p>
                                                ) : (
                                                    <p className="font-bold text-slate-400">Chưa xác định</p>
                                                )}
                                            </div>

                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 mb-1.5 text-[9px] font-black uppercase tracking-widest">Ngày bắt đầu lưu trú</p>
                                                <p className="font-bold text-slate-200">
                                                    {selectedTask.appointmentDatetime
                                                        ? `${formatTime(selectedTask.appointmentDatetime)} - ${formatDate(selectedTask.appointmentDatetime)}`
                                                        : 'Chưa có thông tin'}
                                                </p>
                                            </div>
                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 mb-1.5 text-[9px] font-black uppercase tracking-widest">Ngày kết thúc lưu trú</p>
                                                <p className="font-bold text-slate-200">
                                                    {selectedTask.checkOutDatetime || (selectedTask as any).checkOut
                                                        ? `${formatTime(selectedTask.checkOutDatetime || (selectedTask as any).checkOut)} - ${formatDate(selectedTask.checkOutDatetime || (selectedTask as any).checkOut)}`
                                                        : 'Chưa có thông tin'}
                                                </p>
                                            </div>

                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 mb-1.5 text-[9px] font-black uppercase tracking-widest">Kích thước chuồng</p>
                                                <p className="font-bold text-slate-200">{selectedTask.cageSize || 'Tiêu chuẩn'}</p>
                                            </div>
                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 mb-1.5 text-[9px] font-black uppercase tracking-widest">Loại phòng</p>
                                                <p className="font-bold text-amber-400">{selectedTask.roomType || 'Thường'}</p>
                                            </div>

                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 mb-1.5 text-[9px] font-black uppercase tracking-widest">Camera</p>
                                                <p className="font-bold text-blue-400">Cơ bản (720p)</p>
                                            </div>
                                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-slate-500 mb-1.5 text-[9px] font-black uppercase tracking-widest">Trạng thái kết nối</p>
                                                <p className="font-bold text-emerald-400">Sẵn sàng</p>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2 block">Đường dẫn RTSP</label>
                                            <div className="flex gap-2 mb-6">
                                                <input
                                                    type="text"
                                                    value={rtspInput}
                                                    onChange={e => {
                                                        setRtspInput(e.target.value);
                                                        setShowPreview(false);
                                                    }}
                                                    placeholder="rtsp://admin:pass@ip:port/stream"
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
                                                />
                                                <button
                                                    onClick={handleConfigureModalPreview}
                                                    disabled={!rtspInput.trim() || modalCheckingStream}
                                                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all border border-slate-700 shrink-0 whitespace-nowrap flex items-center gap-2 justify-center"
                                                >
                                                    {modalCheckingStream ? <Loader2 size={14} className="animate-spin" /> : null}
                                                    Cấu hình
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => handleUpdateStatus(selectedTask.bookingId, 'IN_PROGRESS', rtspInput)}
                                                disabled={updatingId === selectedTask.bookingId || !rtspInput.trim() || !showPreview}
                                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-[1.5rem] font-black text-sm uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20"
                                            >
                                                {updatingId === selectedTask.bookingId ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
                                                {updatingId === selectedTask.bookingId ? 'Đang lưu...' : 'Lưu cấu hình & Bắt đầu ca'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-16 flex flex-col items-center justify-center gap-4">
                                        <Loader2 size={32} className="animate-spin text-blue-500" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Đang tải thông tin phòng...</p>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Preview */}
                            <div className="flex-1 bg-black rounded-[2rem] overflow-hidden relative flex items-center justify-center min-h-[300px] border border-slate-800">
                                {showPreview ? (
                                    modalCheckingStream ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-2 z-10 bg-black">
                                            <Loader2 size={32} className="animate-spin text-blue-500 opacity-80" />
                                            <p className="text-xs font-black uppercase tracking-widest text-blue-400 animate-pulse">Đang kết nối camera...</p>
                                        </div>
                                    ) : modalStreamError ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-3 z-10 bg-black">
                                            <AlertCircle size={40} className="mx-auto text-slate-500" />
                                            <p className="text-sm">Không thể tải luồng video.</p>
                                            <button
                                                onClick={() => {
                                                    setModalStreamError(false);
                                                    setModalCheckingStream(true);
                                                    checkStreamReady(dashboardPreviewUrl).then(ready => {
                                                        setModalCheckingStream(false);
                                                        if (ready) setModalStreamReady(true);
                                                        else setModalStreamError(true);
                                                    });
                                                }}
                                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
                                            >
                                                Thử lại
                                            </button>
                                        </div>
                                    ) : modalStreamReady ? (
                                        <div className="absolute inset-0 bg-black">
                                            <HLSPlayer
                                                streamUrl={dashboardPreviewUrl}
                                                isMuted={isMuted}
                                                onError={() => setModalStreamError(true)}
                                            />
                                        </div>
                                    ) : null
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 gap-3">
                                        <Camera size={48} className="opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Không có tín hiệu camera</p>
                                    </div>
                                )}
                                {selectedTask && (rtspInput || selectedTask.rtspLink) && !showPreview && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-550 gap-3 bg-black">
                                        <PlayCircle size={48} className="opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nhấp cấu hình để xem trước</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Checkout Confirmation Modal (Early / Late) */}
            <AnimatePresence>
                {isCheckoutModalOpen && selectedTask && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsCheckoutModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 text-slate-900 dark:text-white shadow-2xl z-10"
                        >
                            <button
                                onClick={() => setIsCheckoutModalOpen(false)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-650 dark:hover:text-white transition-colors rounded-xl bg-slate-100 dark:bg-slate-800"
                            >
                                <X size={18} />
                            </button>

                            <div className="flex items-center gap-3.5 mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${checkoutType === 'EARLY'
                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    }`}>
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight">
                                        {checkoutType === 'EARLY' ? 'Xác nhận Kết thúc Sớm' : 'Xác nhận Kết thúc Trễ'}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        {(selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'BOARDING'
                                            ? 'Thời gian kết thúc lưu trú dự kiến'
                                            : 'Thời gian kết thúc dự kiến'}
                                        : <strong>
                                            {(() => {
                                                const rawCheckOut = selectedTask.checkOutDatetime || (selectedTask as any).checkOut;
                                                const isBoarding = (selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'BOARDING';

                                                const checkout = rawCheckOut
                                                    ? new Date(rawCheckOut)
                                                    : new Date(new Date(selectedTask.appointmentDatetime).getTime() + 60 * 60 * 1000);

                                                return isBoarding
                                                    ? formatDate(checkout.toISOString())
                                                    : `${formatTime(checkout.toISOString())} - ${formatDate(checkout.toISOString())}`;
                                            })()}
                                        </strong>
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                                        {checkoutType === 'EARLY' ? 'Lý do kết thúc sớm' : 'Lý do kết thúc trễ'}
                                    </label>
                                    <div className="space-y-2">
                                        {(() => {
                                            const isBoarding = (selectedTask?.category || guessCategory(selectedTask.serviceName)) === 'BOARDING';
                                            const suggestionsList = checkoutType === 'EARLY'
                                                ? (isBoarding ? EARLY_BOARDING_SUGGESTIONS : EARLY_SERVICE_SUGGESTIONS)
                                                : (isBoarding ? LATE_BOARDING_SUGGESTIONS : LATE_SERVICE_SUGGESTIONS);
                                            return suggestionsList;
                                        })().map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => setCheckoutReason(suggestion)}
                                                className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${checkoutReason === suggestion
                                                    ? 'border-primary bg-primary/5 text-primary font-bold'
                                                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-650 dark:text-slate-400'
                                                    }`}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                                        Lý do chi tiết
                                    </label>
                                    <textarea
                                        value={checkoutReason}
                                        onChange={(e) => setCheckoutReason(e.target.value)}
                                        placeholder={checkoutType === 'EARLY' ? 'Nhập lý do kết thúc sớm...' : 'Nhập lý do kết thúc trễ...'}
                                        rows={3}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCheckoutModalOpen(false)}
                                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!checkoutReason.trim()) {
                                                toast.error(checkoutType === 'EARLY' ? 'Vui lòng nhập hoặc chọn lý do kết thúc sớm.' : 'Vui lòng nhập hoặc chọn lý do kết thúc trễ.');
                                                return;
                                            }
                                            
                                            // 1. Try to update status first
                                            const success = await handleUpdateStatus(selectedTask.bookingId, 'COMPLETED');
                                            
                                            if (success) {
                                                // 2. Only add log if status update succeeded
                                                const prefix = checkoutType === 'EARLY' ? '[Kết thúc sớm]' : '[Kết thúc trễ]';
                                                try {
                                                    await careLogService.addLog(selectedTask.bookingId, {
                                                        type: 'CLEANING', // Use CLEANING or default type for now
                                                        note: `${prefix} Lý do: ${checkoutReason}`,
                                                        imageUrl: ''
                                                    });
                                                    const logs = await careLogService.getLogs(selectedTask.bookingId);
                                                    setCareLogs(logs);
                                                } catch (e) {
                                                    console.error('Failed to log checkout reason:', e);
                                                }
                                                // 3. Clear reason and close modal
                                                setCheckoutReason('');
                                                setIsCheckoutModalOpen(false);
                                            } else {
                                                // If failed (e.g. missing medical record), close modal but KEEP reason
                                                // so user doesn't have to retype after filling medical record
                                                setIsCheckoutModalOpen(false);
                                            }
                                        }}
                                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                                    >
                                        <CheckCircle2 size={14} />
                                        Xác nhận
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Xác nhận No-Show */}
            <AnimatePresence>
                {isNoShowModalOpen && selectedTask && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => !isNoShowProcessing && setIsNoShowModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                        <UserX className="text-rose-600" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                            Khách hàng không đến
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            Hủy lịch hẹn của {selectedTask.petName}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl mb-6">
                                    <p className="text-sm text-rose-700">
                                        Lưu ý: Bạn chỉ có thể hủy đơn nếu khách hàng đến trễ quá thời gian châm chước (Grace Period). Hệ thống sẽ tự động giữ lại phí cọc làm phí phạt.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsNoShowModalOpen(false)}
                                        disabled={isNoShowProcessing}
                                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                    >
                                        Đóng
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNoShow}
                                        disabled={isNoShowProcessing}
                                        className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-500/10 disabled:opacity-50"
                                    >
                                        {isNoShowProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                                        Xác nhận hủy đơn
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Nhập hồ sơ y tế - Dịch vụ khám */}
            <AnimatePresence>
                {isMedicalModalOpen && selectedTask && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => !submittingClinicMedical && setIsMedicalModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                        >
                            {/* Header */}
                            <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                                    <Syringe className="text-violet-600 dark:text-violet-400" size={22} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nhập kết quả khám bệnh</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Bé <strong>{selectedTask.petName}</strong> — Lưu hồ sơ y tế trước khi hoàn thành dịch vụ
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsMedicalModalOpen(false)}
                                    disabled={submittingClinicMedical}
                                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmitClinicMedical} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {/* Chẩn đoán */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Chẩn đoán <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={clinicMedicalForm.diagnosis}
                                        onChange={e => setClinicMedicalForm({ ...clinicMedicalForm, diagnosis: e.target.value })}
                                        placeholder="Kết luận chẩn đoán của bác sĩ..."
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:bg-white dark:focus:bg-slate-750 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all"
                                    />
                                </div>

                                {/* Triệu chứng */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Triệu chứng lâm sàng</label>
                                    <textarea
                                        value={clinicMedicalForm.symptoms}
                                        onChange={e => setClinicMedicalForm({ ...clinicMedicalForm, symptoms: e.target.value })}
                                        placeholder="Mô tả các triệu chứng quan sát được..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Đơn thuốc */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Đơn thuốc / Thuốc sử dụng</label>
                                        <textarea
                                            value={clinicMedicalForm.prescription}
                                            onChange={e => setClinicMedicalForm({ ...clinicMedicalForm, prescription: e.target.value })}
                                            placeholder="Liệt kê các loại thuốc đã dùng, liều lượng..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all resize-none"
                                        />
                                    </div>

                                    {/* Hướng điều trị */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Hướng điều trị</label>
                                        <textarea
                                            value={clinicMedicalForm.treatment}
                                            onChange={e => setClinicMedicalForm({ ...clinicMedicalForm, treatment: e.target.value })}
                                            placeholder="Phương pháp và lộ trình điều trị..."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Ghi chú thêm */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Ghi chú thêm</label>
                                    <textarea
                                        value={clinicMedicalForm.notes}
                                        onChange={e => setClinicMedicalForm({ ...clinicMedicalForm, notes: e.target.value })}
                                        placeholder="Các lưu ý đặc biệt, dặn dò cho chủ nuôi..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all resize-none"
                                    />
                                </div>

                                {/* Tiêm ngừa */}
                                <div className="p-4 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="hasVaccination"
                                            checked={vaccinationForm.hasVaccination}
                                            onChange={e => setVaccinationForm({ ...vaccinationForm, hasVaccination: e.target.checked })}
                                            className="w-5 h-5 rounded text-violet-600 focus:ring-violet-500 border-slate-300 cursor-pointer"
                                        />
                                        <label htmlFor="hasVaccination" className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                                            Có thực hiện tiêm ngừa trong lần khám này
                                        </label>
                                    </div>
                                    
                                    <AnimatePresence>
                                        {vaccinationForm.hasVaccination && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-violet-100 dark:border-violet-900/30">
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                                            Tên Vắc xin / Bệnh phòng ngừa <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required={vaccinationForm.hasVaccination}
                                                            value={vaccinationForm.name}
                                                            onChange={e => setVaccinationForm({ ...vaccinationForm, name: e.target.value })}
                                                            placeholder="VD: Dại, Care, Parvo..."
                                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                                            Tên Thuốc / Hãng sản xuất
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={vaccinationForm.drug}
                                                            onChange={e => setVaccinationForm({ ...vaccinationForm, drug: e.target.value })}
                                                            placeholder="VD: Zoetis, Nobivac..."
                                                            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Footer buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsMedicalModalOpen(false)}
                                        disabled={submittingClinicMedical}
                                        className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                    >
                                        Huỷ bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingClinicMedical || !clinicMedicalForm.diagnosis.trim() || (vaccinationForm.hasVaccination && !vaccinationForm.name.trim())}
                                        className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-500/20 disabled:opacity-50"
                                    >
                                        {submittingClinicMedical ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        {submittingClinicMedical ? 'Đang lưu...' : 'Lưu & Hoàn thành dịch vụ'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Pet Details Modal */}
            <AnimatePresence>
                {isPetDetailsModalOpen && selectedTask && petDetails && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsPetDetailsModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                                    <ClipboardList className="text-primary" /> Thông tin tổng hợp
                                </h2>
                                <button
                                    onClick={() => setIsPetDetailsModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: Pet Info */}
                                    <div className="space-y-6">
                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                            <Heart className="text-rose-500" size={18} /> Hồ sơ thú cưng
                                        </h3>
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-4xl shadow-inner overflow-hidden border border-slate-200 shrink-0">
                                                {petDetails.avatar ? <img src={petDetails.avatar} alt="pet" className="w-full h-full object-cover" /> : '🐾'}
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{petDetails.name}</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold">{petDetails.species} - {petDetails.breed}</span>
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold">{petDetails.weight}kg</span>
                                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold">{petDetails.gender === 'MALE' ? 'Đực' : petDetails.gender === 'FEMALE' ? 'Cái' : 'Chưa rõ'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {petDetails.color && (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Màu lông</p>
                                                    <p className="font-semibold text-slate-800 dark:text-white">{petDetails.color}</p>
                                                </div>
                                            )}
                                            {petDetails.favoriteFood && (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Thức ăn yêu thích</p>
                                                    <p className="font-semibold text-slate-800 dark:text-white">{petDetails.favoriteFood}</p>
                                                </div>
                                            )}
                                            {petDetails.hobbies && (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Thói quen / Sở thích</p>
                                                    <p className="font-semibold text-slate-800 dark:text-white">{petDetails.hobbies}</p>
                                                </div>
                                            )}
                                            {petDetails.walkTime && (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Thời gian vận động</p>
                                                    <p className="font-semibold text-slate-800 dark:text-white">{petDetails.walkTime}</p>
                                                </div>
                                            )}
                                        </div>

                                        {petDetails.allergies && (
                                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                                <p className="text-[10px] font-bold text-rose-500 uppercase mb-1 flex items-center gap-1"><AlertCircle size={12}/> Dị ứng</p>
                                                <p className="font-bold text-rose-700 dark:text-rose-400">{petDetails.allergies}</p>
                                            </div>
                                        )}

                                        {petDetails.healthNote && (
                                            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                                <p className="text-[10px] font-bold text-amber-600 uppercase mb-1 flex items-center gap-1"><Syringe size={12}/> Ghi chú sức khỏe</p>
                                                <p className="font-semibold text-amber-800 dark:text-amber-500">{petDetails.healthNote}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column: Task/Service Details */}
                                    <div className="space-y-4 lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-8">
                                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                            <CheckCircle2 className="text-emerald-500" size={18} /> Dịch vụ cần thực hiện
                                        </h3>
                                        
                                        <div className="space-y-3">
                                            {selectedTask.services && selectedTask.services.length > 0 ? (
                                                selectedTask.services.map((svc: any, idx: number) => (
                                                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-150 dark:border-slate-700/50">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-primary shadow-sm border border-slate-100 dark:border-slate-600">
                                                                <Sparkles size={18} className="text-primary" />
                                                            </div>
                                                            <div>
                                                                <span className="font-bold text-slate-800 dark:text-slate-200">{svc.serviceName}</span>
                                                                <p className="text-xs text-slate-400 font-semibold mt-0.5">Mã dịch vụ: #{svc.serviceId}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(svc.servicePrice || 0)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between border border-slate-150 dark:border-slate-700/50">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-primary shadow-sm border border-slate-100 dark:border-slate-600">
                                                            <Sparkles size={18} className="text-primary" />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTask.serviceName}</span>
                                                            <p className="text-xs text-slate-400 font-semibold mt-0.5">Mã dịch vụ: #{selectedTask.serviceId}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-black text-primary bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/10">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedTask.servicePrice || 0)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-6 p-5 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                            <p className="text-xs font-bold text-blue-800 dark:text-blue-400 mb-2 uppercase">Ghi chú từ khách hàng</p>
                                            <p className="text-sm text-blue-900 dark:text-blue-300">
                                                {selectedTask.note || 'Không có ghi chú thêm.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
