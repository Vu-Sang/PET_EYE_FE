import React, { useState, useEffect, useRef } from 'react';
import {
    Video, Camera, Maximize2, Minimize2, Volume2, VolumeX, ShieldCheck, Activity, Clock, Heart, Send, MessageCircle,
    Wifi, WifiOff, Monitor, LayoutGrid, ArrowLeft, Thermometer, Utensils, Droplets, CheckCircle, Loader2, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import apiClient from '../../services/apiClient';
import { resolveStreamUrl, checkStreamReady } from '../../utils/streamHelper';
import { useShopChat } from '../../hooks/useShopChat';
import { useAuth } from '../../contexts/AuthContext';
import { careLogService, CareLogResponse } from '../../services/care-log.service';



/* ─── ICON HELPER ────────────────────────────────────────────────────────── */
function getLogIconConfig(type: string) {
    const t = type.toLowerCase();
    
    // Map backend enums to Vietnamese display names
    let label = type;
    if (t === 'feeding') label = 'Cho ăn / Uống nước';
    else if (t === 'cleaning') label = 'Vệ sinh / Tắm';
    else if (t === 'medical') label = 'Kiểm tra sức khoẻ';
    else if (t === 'playing') label = 'Vận động / Chơi đùa';
    else if (t === 'other') label = 'Khác';

    const checkStr = t + ' ' + label.toLowerCase();

    if (checkStr.includes('ăn') || checkStr.includes('uống') || checkStr.includes('feed')) return { label, icon: <Utensils className="w-4 h-4" />, color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-100' };
    if (checkStr.includes('vệ sinh') || checkStr.includes('tắm') || checkStr.includes('nước') || checkStr.includes('clean')) return { label, icon: <Droplets className="w-4 h-4" />, color: '#00b4d8', bg: 'bg-sky-50', border: 'border-sky-100' };
    if (checkStr.includes('sức khoẻ') || checkStr.includes('khám') || checkStr.includes('nhiệt độ') || checkStr.includes('thuốc') || checkStr.includes('medic')) return { label, icon: <Activity className="w-4 h-4" />, color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100' };
    if (checkStr.includes('vận động') || checkStr.includes('chơi') || checkStr.includes('đi dạo') || checkStr.includes('play')) return { label, icon: <Heart className="w-4 h-4" />, color: '#ec4899', bg: 'bg-pink-50', border: 'border-pink-100' };
    return { label, icon: <CheckCircle className="w-4 h-4" />, color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-100' };
}

/* ─── CAMERA CELL ──────────────────────────────────────────────────────── */
interface CamCellProps {
    cam: any;
    isMain?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
}

function CamCell({ cam, isMain, isSelected, onClick }: CamCellProps) {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const ts = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const online = cam.status === 'online';

    return (
        <div
            onClick={onClick}
            className={`relative overflow-hidden w-full h-full cursor-pointer group
        ${isSelected ? 'ring-2 ring-secondary shadow-md' : 'ring-1 ring-slate-200 hover:ring-secondary/50'}
        bg-white rounded-2xl transition-all duration-300`}
        >
            {online ? (
                <>
                    <img
                        src={cam.img}
                        alt={cam.label}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Light gradient for readable text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/30" />
                </>
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50">
                    <WifiOff className="w-8 h-8 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500">Mất kết nối</p>
                </div>
            )}

            {/* Top-left: LIVE badge + cam label */}
            <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                {online ? (
                    <span className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        LIVE
                    </span>
                ) : (
                    <span className="flex items-center gap-1 bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full">
                        OFFLINE
                    </span>
                )}
                {isMain && (
                    <span className="text-[10px] font-semibold text-white bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                        {cam.label}
                    </span>
                )}
            </div>

            {/* Top-right: timestamp */}
            {online && (
                <div className="absolute top-3 right-3 z-10 font-mono text-[10px] font-medium text-white bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20">
                    {ts}
                </div>
            )}

            {/* Bottom: area label */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
                <div>
                    {!isMain && (
                        <p className="text-[10px] font-semibold text-white leading-tight truncate max-w-[120px]">{cam.label}</p>
                    )}
                    <p className="text-[9px] font-medium text-white/80">{cam.area}</p>
                </div>
                {isMain && online && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-white/90">
                        <Wifi className="w-3 h-3" /> HD
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── MAIN PAGE ────────────────────────────────────────────────────────── */
export default function CameraView() {
    const navigate = useNavigate();
    const [cameras, setCameras] = useState<any[]>([]);
    const [activeCam, setActiveCam] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [tab, setTab] = useState<'logs' | 'chat'>('logs');
    const [msg, setMsg] = useState('');
    const [layout, setLayout] = useState<'split' | 'main'>('split');
    const [currentTime, setCurrentTime] = useState(new Date());
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    const { user } = useAuth();
    const token = user?.token;

    // Real data states
    const [realLogs, setRealLogs] = useState<CareLogResponse[]>([]);
    
    const { messages: chatMessages, connected, sendMessage: sendWsMessage } = useShopChat(
        activeCam?.shopId || null,
        token,
        'CAMERA_CHAT',
        user?.email
    );

    const [isCheckingStream, setIsCheckingStream] = useState(false);
    const [isStreamReady, setIsStreamReady] = useState(false);
    const [streamError, setStreamError] = useState(false);

    // Auto retry stream when it drops
    useEffect(() => {
        let retryTimer: NodeJS.Timeout;
        if (streamError) {
            console.log("Stream dropped, auto-retrying in 3s...");
            retryTimer = setTimeout(() => {
                handleRetryStream();
            }, 3000);
        }
        return () => clearTimeout(retryTimer);
    }, [streamError, activeCam]);

    useEffect(() => {
        if (!activeCam || !activeCam.streamUrl) {
            setIsStreamReady(false);
            setIsCheckingStream(false);
            setStreamError(false);
            return;
        }

        let isMounted = true;
        setIsCheckingStream(true);
        setIsStreamReady(false);
        setStreamError(false);

        const checkReady = async () => {
            const ready = await checkStreamReady(activeCam.streamUrl);
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
    }, [activeCam?.id, activeCam?.streamUrl]);

    const handleRetryStream = () => {
        if (!activeCam?.streamUrl) return;
        setStreamError(false);
        setIsCheckingStream(true);
        checkStreamReady(activeCam.streamUrl).then((ready) => {
            setIsCheckingStream(false);
            if (ready) {
                setIsStreamReady(true);
            } else {
                setStreamError(true);
            }
        });
    };

    // ─── Fetch User's Active Cameras ───
    useEffect(() => {
        const fetchActiveCameras = async () => {
            setLoading(true);
            try {
                const response = await apiClient.get('/v1/camera/active');
                const list = response.data?.result || [];
                
                const mapped = list.map((booking: any, idx: number) => ({
                    id: booking.id.toString(),
                    shopId: booking.shopId,
                    label: `CAM ${String(idx + 1).padStart(2, '0')} – ${booking.shopName}`,
                    pet: booking.petName,
                    area: booking.serviceName,
                    img: `https://images.unsplash.com/photo-${booking.id % 2 === 0 ? '1548199973-03cce0bbc87b' : '1516734212186-a967f81ad0d7'}?auto=format&fit=crop&q=80&w=400`,
                    status: 'online',
                    streamUrl: resolveStreamUrl(booking.cameraStreamUrl),
                    cameraConfiguredAt: booking.cameraConfiguredAt,
                    serviceEndDatetime: booking.serviceEndDatetime,
                    appointmentDatetime: booking.appointmentDatetime,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut
                }));

                setCameras(mapped);

                if (mapped.length > 0) {
                    const queryParams = new URLSearchParams(window.location.search);
                    const targetBookingId = queryParams.get('bookingId');
                    const target = mapped.find((c: any) => c.id === targetBookingId);
                    setActiveCam(target || mapped[0]);
                } else {
                    setActiveCam(null);
                }
            } catch (err) {
                console.error('Failed to fetch active cameras:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchActiveCameras();
    }, []);

    useEffect(() => {
        const id = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    // Fetch logs when activeCam changes
    useEffect(() => {
        if (activeCam) {
            careLogService.getLogs(Number(activeCam.id))
                .then(logs => setRealLogs(logs))
                .catch(err => console.error('Failed to fetch logs', err));
        }
    }, [activeCam]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, tab]);

    const handleSendMessage = () => {
        if (!msg.trim() || !activeCam || !connected) return;
        sendWsMessage(msg.trim());
        setMsg('');
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] gap-4 bg-[#f5efe6] h-[calc(100vh-64px)]">
                <Loader2 className="w-10 h-10 animate-spin text-secondary" />
                <p className="text-sm font-semibold text-slate-500">Đang tải luồng camera...</p>
            </div>
        );
    }

    if (cameras.length === 0 || !activeCam) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-[#f5efe6] text-center p-8 text-primary">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                    <WifiOff className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Không có camera trực tuyến nào hoạt động</h2>
                <p className="text-slate-500 max-w-sm text-sm leading-relaxed mb-6">
                    Hệ thống giám sát camera chỉ khả dụng khi bạn đăng ký dịch vụ **Lưu trú** có tích hợp camera và đã được Shop phê duyệt đơn đặt.
                </p>
                <button
                    onClick={() => navigate('/profile/bookings')}
                    className="px-6 py-3 bg-[#1a2b4c] text-white rounded-xl text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-transform"
                >
                    Kiểm tra Đơn đặt chỗ
                </button>
            </div>
        );
    }


    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-[#f5efe6] overflow-hidden text-primary">

            {/* ── HEADER ────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 rounded-full hover:bg-slate-50 text-slate-500 hover:text-primary transition-colors border border-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                            <Video className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-primary leading-tight">Camera Giám Sát</h1>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Peteye PetCare · {cameras.filter(c => c.status === 'online').length}/{cameras.length} camera đang hoạt động</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Date+time */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600 font-medium bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                        <Clock className="w-4 h-4 text-secondary" />
                        {currentTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        <span className="text-slate-300">|</span>
                        <span className="text-primary font-bold">{currentTime.toLocaleTimeString('vi-VN')}</span>
                    </div>

                    {/* Layout toggle */}
                    <div className="flex items-center gap-1 bg-slate-50 rounded-full p-1 border border-slate-100">
                        <button
                            onClick={() => setLayout('main')}
                            className={`p-2 rounded-full transition-all ${layout === 'main' ? 'bg-white shadow-sm text-secondary' : 'text-slate-400 hover:text-primary'}`}
                            title="Chế độ tập trung"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setLayout('split')}
                            className={`p-2 rounded-full transition-all ${layout === 'split' ? 'bg-white shadow-sm text-secondary' : 'text-slate-400 hover:text-primary'}`}
                            title="Chế độ lưới"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* ── BODY ──────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden p-6 gap-6">

                {/* LEFT: Camera Area */}
                <main className={`flex flex-col gap-4 transition-all duration-500 ${fullscreen ? 'fixed inset-0 z-50 bg-primary p-6 gap-4' : 'flex-1'}`}>

                    {/* Main / Primary Camera */}
                    <div className={`relative overflow-hidden rounded-3xl shadow-soft border border-black/5 bg-primary transition-all duration-500 ${(layout === 'split' && cameras.length > 1) ? 'flex-[3]' : 'flex-1'}`}>
                        {/* LIVE large camera */}
                        <div className="absolute inset-0">
                            {activeCam.status === 'online' ? (
                                activeCam.streamUrl ? (
                                    isCheckingStream ? (
                                        <div className="w-full h-full bg-[#0f172a] flex flex-col items-center justify-center gap-3 text-slate-400">
                                            <Loader2 className="w-10 h-10 animate-spin text-[#d4af37]" />
                                            <p className="text-sm font-semibold text-white">Đang kết nối tới camera...</p>
                                            <p className="text-xs text-slate-400">Đang khởi chạy và kiểm tra luồng phát...</p>
                                        </div>
                                    ) : streamError ? (
                                        <div className="w-full h-full bg-[#0f172a] flex flex-col items-center justify-center gap-3 text-slate-400 p-6 text-center">
                                            <AlertCircle className="w-12 h-12 text-slate-500" />
                                            <p className="text-sm text-white">Không thể tải luồng video HLS từ Docker container.</p>
                                            <button
                                                onClick={handleRetryStream}
                                                className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-xl text-xs transition-colors shadow-md mt-2 font-bold"
                                            >
                                                Thử lại
                                            </button>
                                        </div>
                                    ) : isStreamReady ? (
                                        <div className="w-full h-full bg-black">
                                            <ReactPlayer
                                                url={activeCam.streamUrl}
                                                playing={true}
                                                controls={true}
                                                muted={muted}
                                                width="100%"
                                                height="100%"
                                                onError={() => setStreamError(true)}
                                                config={{
                                                    file: {
                                                        forceHLS: true,
                                                        hlsOptions: {
                                                            enableWorker: true,
                                                            lowLatencyMode: true,
                                                            maxBufferLength: 30,
                                                            liveSyncDurationCount: 3,
                                                            liveMaxLatencyDurationCount: 10,
                                                            manifestLoadingMaxRetry: 5,
                                                            manifestLoadingRetryDelay: 1000,
                                                            levelLoadingMaxRetry: 5,
                                                            fragLoadingMaxRetry: 5,
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : null
                                ) : (
                                    <>
                                        <img
                                            key={activeCam.id}
                                            src={activeCam.img}
                                            className="w-full h-full object-cover transition-opacity duration-700"
                                            alt="Live feed"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/20" />
                                    </>
                                )
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-4">
                                    <WifiOff className="w-14 h-14 text-slate-300" />
                                    <p className="text-slate-500 font-semibold text-lg">Camera đang ngoại tuyến</p>
                                </div>
                            )}
                        </div>

                        {/* Overlays – top left */}
                        {activeCam.status === 'online' && !isCheckingStream && !streamError && isStreamReady && (
                            <div className="absolute top-5 left-5 flex items-center gap-3 z-10">
                                <div className="flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-red-500/20">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />LIVE
                                </div>
                                <div className="bg-black/20 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/20 hidden sm:flex items-center gap-2">
                                    <Camera className="w-4 h-4" />
                                    {activeCam.label}
                                </div>
                            </div>
                        )}

                        {/* Top right controls */}
                        {activeCam.status === 'online' && activeCam.streamUrl && !isCheckingStream && !streamError && isStreamReady && (
                            <div className="absolute top-5 right-5 flex gap-2 z-10">
                                <button
                                    onClick={() => setMuted(!muted)}
                                    className="p-3 bg-black/20 backdrop-blur-md text-white rounded-full border border-white/20 hover:bg-black/40 transition-all"
                                >
                                    {muted ? <VolumeX className="w-5 h-5 text-red-200" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                                <button
                                    onClick={() => setFullscreen(!fullscreen)}
                                    className="p-3 bg-black/20 backdrop-blur-md text-white rounded-full border border-white/20 hover:bg-black/40 transition-all"
                                >
                                    {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                                </button>
                            </div>
                        )}

                        {/* Bottom: action bar */}
                        {activeCam.status === 'online' && !isCheckingStream && !streamError && isStreamReady && (
                            <div className="absolute bottom-0 left-0 right-0 p-6 z-10 flex items-center justify-between">
                                <div className="text-sm font-semibold text-white/90">
                                    <span className="font-mono bg-black/20 px-2 py-1 rounded-md">{currentTime.toLocaleTimeString('vi-VN')}</span>
                                    <span className="mx-2">•</span>
                                    <span>{activeCam.area}</span>
                                </div>
                            </div>
                        )}

                        {/* Fullscreen close hint */}
                        {fullscreen && !isCheckingStream && !streamError && isStreamReady && (
                            <button
                                onClick={() => setFullscreen(false)}
                                className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white text-primary text-sm font-bold px-5 py-2.5 rounded-full shadow-xl hover:scale-105 transition-transform"
                            >
                                <Minimize2 className="w-4 h-4" /> Thoát toàn màn hình
                            </button>
                        )}
                    </div>

                    {/* Thumbnail row – only in split layout and when there are multiple cameras */}
                    {layout === 'split' && cameras.length > 1 && (
                        <div className="flex gap-4 h-40 shrink-0">
                            {cameras.map(cam => (
                                <div key={cam.id} className="flex-1" onClick={() => setActiveCam(cam)}>
                                    <CamCell cam={cam} isSelected={activeCam.id === cam.id} />
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* RIGHT: Info Panel */}
                {!fullscreen && (
                    <aside className="w-[380px] xl:w-[420px] shrink-0 bg-white rounded-3xl shadow-soft border border-slate-100 flex flex-col hidden lg:flex overflow-hidden">
                        {/* Pet header */}
                        <div className="p-6 border-b border-slate-100 space-y-5 bg-gradient-to-b from-slate-50 to-white">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-slate-50 flex items-center justify-center text-2xl">
                                    🐾
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-xl font-bold text-primary">{activeCam.pet}</h2>
                                    <p className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1 mt-1">
                                        <ShieldCheck className="w-4 h-4" />
                                        Đang được chăm sóc
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                                        AN TOÀN
                                    </span>
                                </div>
                            </div>
                            
                            {/* Time info card */}
                            <div className="px-6 pb-6 mt-[-10px]">
                                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-sm">
                                    <div className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-indigo-50/40 border border-indigo-100/50">
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Nhận phòng</span>
                                        <strong className="text-indigo-700 font-mono text-sm">
                                            {activeCam.checkIn ? new Date(activeCam.checkIn).toLocaleDateString('vi-VN') : new Date(activeCam.appointmentDatetime).toLocaleDateString('vi-VN')}
                                        </strong>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100"></div>
                                    <div className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-indigo-50/40 border border-indigo-100/50">
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Trả phòng</span>
                                        <strong className="text-indigo-700 font-mono text-sm">
                                            {activeCam.checkOut ? new Date(activeCam.checkOut).toLocaleDateString('vi-VN') : (activeCam.serviceEndDatetime ? new Date(activeCam.serviceEndDatetime).toLocaleDateString('vi-VN') : '---')}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 shrink-0 p-2 gap-2 bg-slate-50">
                            {(['logs', 'chat'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === t ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-primary'}`}
                                >
                                    {t === 'logs' ? 'Nhật ký' : 'Trò chuyện'}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
                            {tab === 'logs' && (() => {
                                const displayLogs = realLogs.filter(log => !log.note?.startsWith('[Kết thúc sớm]') && !log.note?.startsWith('[Kết thúc trễ]'));
                                return (
                                    <div className="p-5 space-y-0">
                                        {displayLogs.length === 0 ? (
                                            <p className="text-sm text-center text-slate-400 py-10">Chưa có nhật ký chăm sóc nào.</p>
                                        ) : (
                                            displayLogs.map((log, i) => {
                                                const config = getLogIconConfig(log.type);
                                                return (
                                                    <div key={i} className="flex gap-4 py-3 relative group">
                                                        <div className="flex flex-col items-center gap-1 pt-1">
                                                            <div className={`w-8 h-8 rounded-full ${config.bg} ${config.border} border flex items-center justify-center shrink-0 z-10 group-hover:scale-110 transition-transform shadow-sm`} style={{ color: config.color }}>
                                                                {config.icon}
                                                            </div>
                                                            {i < displayLogs.length - 1 && <div className="w-px flex-1 bg-slate-100 absolute top-9 bottom-[-10px] left-[15px]" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0 pb-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="text-sm font-bold text-primary">{config.label}</span>
                                                                <span className="text-[10px] font-semibold text-slate-400 shrink-0 bg-slate-50 px-2 py-0.5 rounded-full">
                                                                    {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{log.note}</p>
                                                            {log.imageUrl && (
                                                                <img src={log.imageUrl} alt="Care log" className="mt-2 rounded-lg w-full object-cover max-h-32 border border-slate-200" />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                );
                            })()}

                            {tab === 'chat' && (
                                <div className="flex flex-col h-full bg-slate-50/50">
                                    <div className="flex-1 p-5 space-y-4 overflow-y-auto scrollbar-hide">
                                        {chatMessages.map((m, i) => {
                                            const isMe = m.senderEmail === user?.email;
                                            return (
                                                <div key={i} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold shadow-sm ${!isMe ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-primary text-white'}`}>
                                                        {(!isMe ? m.senderRole : 'Bạn').charAt(0)}
                                                    </div>
                                                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                                                        <p className={`text-[10px] font-bold ${!isMe ? 'text-secondary' : 'text-slate-500'}`}>{!isMe ? 'Nhân viên' : 'Bạn'}</p>
                                                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? 'bg-primary text-white rounded-tr-sm' : 'bg-white text-primary border border-slate-100 rounded-tl-sm'}`}>
                                                            {m.content}
                                                        </div>
                                                        <p className="text-[9px] font-medium text-slate-400">
                                                            {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={chatEndRef} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Message box */}
                        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl border border-slate-200 p-1.5 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/20 transition-all">
                                <input
                                    className="flex-1 bg-transparent text-sm font-medium text-primary placeholder-slate-400 focus:outline-none px-3"
                                    placeholder={tab === 'chat' ? 'Nhắn tin cho nhân viên...' : 'Tìm kiếm nhật ký...'}
                                    value={msg}
                                    onChange={e => setMsg(e.target.value)}
                                    disabled={tab !== 'chat'}
                                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={tab !== 'chat' || !connected}
                                    className="w-10 h-10 flex items-center justify-center bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-all shadow-md shadow-secondary/20"
                                >
                                    <Send className="w-4 h-4 ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
