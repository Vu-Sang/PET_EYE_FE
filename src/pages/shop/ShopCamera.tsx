import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Video, Maximize2, Volume2, VolumeX, Play, X,
  Activity, Heart, CheckCircle, ClipboardList, Wifi, AlertCircle, RefreshCw, Link, Loader2, StopCircle
} from 'lucide-react';
import { bookingService } from '../../services/booking.service';
import type { BookingResponse } from '../../types/api';
import toast from 'react-hot-toast';
import { resolveStreamUrl, checkStreamReady } from '../../utils/streamHelper';
import HLSPlayer from '../../components/HLSPlayer';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Main Component ───────────────────────────────────────────────────────────



export default function ShopCamera() {
  const { isDark } = useTheme();
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamError, setStreamError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  
  // Track RTSP input values for each booking by ID
  const [rtspInputs, setRtspInputs] = useState<Record<number, string>>({});
  const [submittingIds, setSubmittingIds] = useState<Record<number, boolean>>({});

  const [isCheckingStream, setIsCheckingStream] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);

  useEffect(() => {
    if (!selectedBooking || !selectedBooking.cameraStreamUrl) {
      setIsStreamReady(false);
      setIsCheckingStream(false);
      return;
    }

    let isMounted = true;
    setIsCheckingStream(true);
    setIsStreamReady(false);
    setStreamError(false);

    const checkReady = async () => {
      const ready = await checkStreamReady(selectedBooking.cameraStreamUrl!);
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
  }, [selectedBooking?.cameraStreamUrl]);

  const handleRetryStream = () => {
    if (!selectedBooking?.cameraStreamUrl) return;
    setStreamError(false);
    setIsCheckingStream(true);
    checkStreamReady(selectedBooking.cameraStreamUrl).then((ready) => {
      setIsCheckingStream(false);
      if (ready) {
        setIsStreamReady(true);
      } else {
        setStreamError(true);
      }
    });
  };

  // ─── Load Active Lodging Bookings ──────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const allBookings = await bookingService.getShopBookings();
      // Filter: must be lodging with camera enabled, and status accepted
      const filtered = allBookings.filter(b => 
        b.cameraEnabled === true &&
        ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status)
      );
      setBookings(filtered);
      
      // Initialize inputs with current RTSP urls
      const inputs: Record<number, string> = {};
      filtered.forEach(b => {
        inputs[b.id] = b.cameraRtspUrl || '';
      });
      setRtspInputs(inputs);

      // Keep selected booking updated if it still exists in list
      if (selectedBooking) {
        const updated = filtered.find(b => b.id === selectedBooking.id);
        setSelectedBooking(updated || null);
      }
    } catch (err) {
      console.error('Failed to load shop bookings:', err);
      toast.error('Không thể tải danh sách đơn lưu trú');
    } finally {
      setLoading(false);
    }
  }, [selectedBooking]);

  useEffect(() => {
    fetchBookings();
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleInputChange = (bookingId: number, val: string) => {
    setRtspInputs(prev => ({ ...prev, [bookingId]: val }));
  };

  const handleConfigureCamera = async (bookingId: number) => {
    const rtspUrl = rtspInputs[bookingId]?.trim();
    if (!rtspUrl) {
      toast.error('Vui lòng nhập đường dẫn RTSP');
      return;
    }

    setSubmittingIds(prev => ({ ...prev, [bookingId]: true }));
    try {
      const updated = await bookingService.configureCamera(bookingId, rtspUrl);
      toast.success('Cấu hình camera thành công! Đang khởi chạy luồng stream...');
      
      // Update local state
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(updated);
      } else {
        setSelectedBooking(updated); // Auto preview upon configuring
      }
      setStreamError(false);
    } catch (err: any) {
      console.error('Configure camera failed:', err);
      toast.error(err.response?.data?.message || 'Cấu hình camera thất bại');
    } finally {
      setSubmittingIds(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleDeleteCamera = async (bookingId: number) => {
    if (!window.confirm('Bạn có chắc muốn tắt camera và dừng luồng stream cho đơn này?')) return;
    
    setSubmittingIds(prev => ({ ...prev, [bookingId]: true }));
    try {
      const updated = await bookingService.deleteCamera(bookingId);
      toast.success('Đã tắt camera và dừng Docker container thành công');
      
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(updated);
      }
    } catch (err: any) {
      console.error('Delete camera failed:', err);
      toast.error(err.response?.data?.message || 'Tắt camera thất bại');
    } finally {
      setSubmittingIds(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const totalCount = bookings.length;
  const configuredCount = bookings.filter(b => b.cameraStreamUrl).length;
  const activeCount = bookings.filter(b => b.status === 'IN_PROGRESS').length;
  const pendingConfigCount = totalCount - configuredCount;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="max-w-screen-2xl mx-auto px-5 md:px-8 py-8">

        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Video className={`w-8 h-8 ${isDark ? 'text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]' : 'text-blue-600'}`} />
              Cấu hình & Giám sát Camera Lưu Trú
            </h1>
            <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Quản lý luồng RTSP camera và tự động khởi chạy Docker container cho từng thú cưng
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchBookings}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all shadow-sm disabled:opacity-60 ${isDark ? 'admin-glass-card bg-slate-900/40 border border-slate-700 text-slate-300 hover:bg-slate-800/60' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Tải lại danh sách
            </button>
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Tổng đơn lưu trú có cam', value: totalCount, icon: '📹', color: 'from-blue-500 to-blue-600' },
            { label: 'Camera đã bật', value: configuredCount, icon: '🟢', color: 'from-green-500 to-green-600' },
            { label: 'Đang lưu trú tại shop', value: activeCount, icon: '🐾', color: 'from-purple-500 to-purple-600' },
            { label: 'Cần cấu hình RTSP', value: pendingConfigCount, icon: '⚠️', color: 'from-amber-500 to-amber-600' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl p-5 shadow-sm transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border border-slate-700' : 'bg-white border border-slate-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} opacity-10`} />
              </div>
              <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {loading ? '—' : stat.value}
              </p>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Content Grid ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={48} className={`animate-spin mb-4 ${isDark ? 'text-indigo-400 drop-shadow-[0_0_12px_rgba(129,140,248,0.5)]' : 'text-blue-500'}`} />
            <p className="font-medium">Đang tải danh sách đặt phòng và kiểm tra trạng thái Docker...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-20 text-center rounded-3xl p-8 shadow-sm ${isDark ? 'admin-glass-card bg-slate-900/40' : 'bg-white'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-blue-50 text-blue-400'}`}>
              <Video size={40} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Chưa có đơn lưu trú nào</h3>
            <p className={`mb-6 max-w-sm text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Tính năng này chỉ khả dụng khi có đơn đặt dịch vụ Khách sạn/Lưu trú (Hotel) được tích hợp camera từ trước và đã được chấp thuận.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
            
            {/* Left: Bookings list with RTSP config inputs */}
            <div className="space-y-4">
              <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Danh sách Đơn Lưu Trú
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                  {bookings.length}
                </span>
              </h2>

              <div className="space-y-4">
                {bookings.map((booking) => {
                  const isConfigured = !!booking.cameraStreamUrl;
                  const isSubmitting = submittingIds[booking.id] || false;
                  
                  return (
                    <div 
                      key={booking.id}
                      className={`p-6 rounded-2xl border transition-all ${
                        selectedBooking?.id === booking.id
                          ? (isDark ? 'admin-glass-card border-indigo-500 ring-2 ring-indigo-500/20 shadow-md bg-slate-900/60' : 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-white')
                          : (isDark ? 'admin-glass-card border-slate-700 bg-slate-900/40 hover:border-slate-600' : 'bg-white border-slate-100 hover:border-slate-300')
                      }`}
                    >
                      {/* Booking meta info */}
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-indigo-500/20' : 'bg-blue-50'}`}>
                            <span className="text-lg">🐾</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Bé: {booking.petName}</h4>
                              <span className="text-xs text-slate-400">#{booking.id.toString().padStart(5, '0')}</span>
                            </div>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Khách hàng: <strong>{booking.customerName}</strong> ({booking.customerPhone})
                            </p>
                            {booking.checkIn && booking.checkOut && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">
                                Lưu trú: {new Date(booking.checkIn).toLocaleDateString('vi-VN')} → {new Date(booking.checkOut).toLocaleDateString('vi-VN')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            booking.status === 'IN_PROGRESS' 
                              ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-600')
                              : booking.status === 'CONFIRMED'
                              ? (isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-600')
                              : (isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600')
                          }`}>
                            {booking.status}
                          </span>
                          
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            isConfigured 
                              ? (isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-150 text-green-600 border border-green-200')
                              : (isDark ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-600 border border-amber-200')
                          }`}>
                            {isConfigured ? 'Stream Online' : 'Chưa cấu hình'}
                          </span>
                        </div>
                      </div>

                      {/* RTSP input field */}
                      <div className="space-y-3">
                        <label className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                          Địa chỉ RTSP Camera (IP Camera / RTSP Stream link)
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={rtspInputs[booking.id] || ''}
                            onChange={(e) => handleInputChange(booking.id, e.target.value)}
                            placeholder="rtsp://admin:safetycode@192.168.1.100:554/cam/realmonitor"
                            disabled={isSubmitting}
                            className={`flex-1 px-4 py-2.5 border rounded-xl outline-none text-sm font-mono transition-all ${isDark ? 'bg-slate-900/50 border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`}
                          />
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleConfigureCamera(booking.id)}
                              disabled={isSubmitting || !rtspInputs[booking.id]}
                              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Link size={16} />}
                              Áp dụng
                            </button>
                            {isConfigured && (
                              <button
                                onClick={() => handleDeleteCamera(booking.id)}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <StopCircle size={16} />}
                                Tắt Cam
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Action hints and HLS url preview if configured */}
                        {isConfigured && (
                          <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
                            <div className={`text-xs font-mono truncate max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              HLS Stream: <span className={`underline ${isDark ? 'text-indigo-400' : 'text-blue-500'}`}>{resolveStreamUrl(booking.cameraStreamUrl)}</span>
                            </div>
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-700'}`}
                            >
                              <Play size={12} /> Xem Live Preview
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Live Preview Panel */}
            <div className="space-y-4">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Xem Trực Tiếp (Preview)</h2>
              
              <div className={`rounded-2xl border overflow-hidden shadow-sm flex flex-col h-[500px] ${isDark ? 'admin-glass-card bg-slate-900/40 border-slate-700' : 'bg-white border-slate-100'}`}>
                
                {/* Player screen */}
                <div className="relative bg-black flex-1 flex items-center justify-center overflow-hidden min-h-[250px]">
                  {selectedBooking && selectedBooking.cameraStreamUrl ? (
                    isCheckingStream ? (
                      <div className="text-center p-6 text-slate-400 space-y-3">
                        <Loader2 size={40} className="mx-auto text-blue-500 animate-spin" />
                        <p className="text-sm font-semibold">Đang kết nối tới camera...</p>
                        <p className="text-[10px] text-slate-500">Khởi chạy luồng Docker MediaMTX...</p>
                      </div>
                    ) : streamError ? (
                      <div className="text-center p-6 text-slate-400 space-y-3">
                        <AlertCircle size={40} className="mx-auto text-slate-500" />
                        <p className="text-sm">Không thể tải luồng video HLS từ Docker container.</p>
                        <button
                          onClick={handleRetryStream}
                          className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs hover:bg-slate-600 transition-colors"
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : isStreamReady ? (
                      <HLSPlayer
                        streamUrl={selectedBooking.cameraStreamUrl}
                        isMuted={isMuted}
                        onError={() => setStreamError(true)}
                      />
                    ) : null
                  ) : (
                    <div className="text-center p-6 text-slate-500 space-y-3">
                      <Video size={40} className="mx-auto text-slate-600 animate-pulse" />
                      <p className="text-xs max-w-[200px] leading-relaxed">
                        Chọn một camera đã được cấu hình trong danh sách để xem trực tiếp
                      </p>
                    </div>
                  )}

                  {/* Overlays */}
                  {selectedBooking && selectedBooking.cameraStreamUrl && !streamError && !isCheckingStream && isStreamReady && (
                    <>
                      <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        LIVE (DOCKER)
                      </div>
                      <div className="absolute bottom-4 right-4 flex items-center gap-2">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="w-8 h-8 bg-black/40 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
                        >
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Stream Info Detail footer */}
                <div className={`p-5 border-t ${isDark ? 'border-white/5 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                  {selectedBooking ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Bé: {selectedBooking.petName}</h4>
                        <span className="text-xs text-slate-400">Đơn #{selectedBooking.id}</span>
                      </div>
                      <div className={`text-xs space-y-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <p>Khách hàng: <strong>{selectedBooking.customerName}</strong></p>
                        <p className="truncate">Link RTSP: <code className={`px-1 py-0.5 rounded text-[10px] ${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100'}`}>{selectedBooking.cameraRtspUrl}</code></p>
                        <p className="truncate">Luồng Docker: <code className={`px-1 py-0.5 rounded text-[10px] ${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100'}`}>{resolveStreamUrl(selectedBooking.cameraStreamUrl)}</code></p>
                        {selectedBooking.checkIn && selectedBooking.checkOut ? (
                          <>
                            <p>Nhận phòng: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{new Date(selectedBooking.checkIn).toLocaleDateString('vi-VN')}</strong></p>
                            <p>Trả phòng: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{new Date(selectedBooking.checkOut).toLocaleDateString('vi-VN')}</strong></p>
                          </>
                        ) : (
                          selectedBooking.serviceEndDatetime && (
                            <p>Kết thúc dịch vụ: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{new Date(selectedBooking.serviceEndDatetime).toLocaleString('vi-VN')}</strong></p>
                          )
                        )}
                        {selectedBooking.cameraConfiguredAt && (
                          <p>Bắt đầu cấu hình: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{new Date(selectedBooking.cameraConfiguredAt).toLocaleString('vi-VN')}</strong></p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-400">
                      <ClipboardList size={18} />
                      <span className="text-xs font-semibold">Chưa chọn preview camera</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
