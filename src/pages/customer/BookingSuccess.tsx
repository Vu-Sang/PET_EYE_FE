import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BookingServiceItem {
  id: number;
  name: string;
  price: number;
  durationMinutes?: number;
}

export default function BookingSuccess() {
  const location = useLocation();
  const { booking, bookingInfo, isCashDeposit } = location.state || {};
  const confettiRef = useRef<HTMLDivElement>(null);

  // Simple confetti burst on mount
  useEffect(() => {
    const container = confettiRef.current;
    if (!container) return;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6'];
    for (let i = 0; i < 48; i++) {
      const dot = document.createElement('div');
      const size = Math.random() * 8 + 4;
      dot.style.cssText = `
        position:absolute;
        width:${size}px;height:${size}px;
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        background:${colors[Math.floor(Math.random() * colors.length)]};
        left:${Math.random() * 100}%;
        top:-10px;
        opacity:1;
        transform:rotate(${Math.random() * 360}deg);
        animation:fall ${1.2 + Math.random() * 1.2}s ease-in ${Math.random() * 0.6}s forwards;
      `;
      container.appendChild(dot);
    }
    const style = document.createElement('style');
    style.textContent = `@keyframes fall{to{top:110%;opacity:0;transform:rotate(${Math.random() * 720}deg) translateX(${(Math.random() - 0.5) * 80}px);}}`;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  if (!booking || !bookingInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-8">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">error</span>
          <p className="text-slate-500 font-semibold mb-4">Không có thông tin đặt lịch.</p>
          <Link to="/" className="px-5 py-2.5 bg-[#1a2b4c] text-white font-bold rounded-xl hover:bg-[#243d6b] transition-colors">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Danh sách dịch vụ — dùng services[] nếu có, fallback về serviceName cũ
  const serviceList: BookingServiceItem[] = bookingInfo.services && bookingInfo.services.length > 0
    ? bookingInfo.services
    : [{ id: bookingInfo.serviceId ?? 0, name: bookingInfo.serviceName ?? '—', price: bookingInfo.servicePrice ?? 0 }];

  const totalPrice = serviceList.reduce((sum: number, s: BookingServiceItem) => sum + s.price, 0);

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 flex items-center justify-center py-6 px-4 min-h-[calc(100vh-64px)]">

      {/* Confetti container */}
      <div ref={confettiRef} className="fixed inset-0 pointer-events-none overflow-hidden z-50" />

      <div className="max-w-md w-full flex flex-col gap-3">

        {/* ── Hero card ── */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-700">

          {/* Top banner */}
          <div className="bg-gradient-to-r from-[#1a2b4c] to-indigo-600 px-4 pt-4 pb-4 text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/5 rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

            {/* Animated checkmark */}
            <div className="relative w-12 h-12 mx-auto mb-2">
              <div className="w-12 h-12 bg-white/15 rounded-full flex items-center justify-center animate-[ping_1s_ease-out_1]">
                <div className="absolute w-12 h-12 bg-white/10 rounded-full" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-xl text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                </div>
              </div>
            </div>

            <h1 className="text-lg font-black text-white mb-0.5">Đặt lịch thành công!</h1>
            <p className="text-indigo-200 text-[10px]">Chúng tôi sẽ nhắc bạn trước giờ hẹn 🐾</p>

            {/* Booking ID badge */}
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-white/15 backdrop-blur rounded-full text-white text-[10px] font-bold shadow-sm">
              <span className="material-symbols-outlined text-[10px]">confirmation_number</span>
              Mã đặt lịch #{booking.id}
            </div>
          </div>

          {/* Shop info strip */}
          <div className="flex items-center gap-2.5 px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
            <div
              className="w-8 h-8 rounded-lg bg-cover bg-center shrink-0 bg-slate-100 dark:bg-slate-700 shadow-sm"
              style={{ backgroundImage: bookingInfo.shopImage ? `url(${bookingInfo.shopImage})` : 'url(https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=200&auto=format&fit=crop)' }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-[13px] truncate leading-tight">{bookingInfo.shopName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[10px] text-teal-500">location_on</span>
                {bookingInfo.shopAddress}
              </p>
            </div>
            <span className="shrink-0 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800">
              Đã xác nhận
            </span>
          </div>

          {/* Body */}
          <div className="px-3 py-3 flex flex-col gap-2">

            {/* Schedule section */}
            {(() => {
              const dateStr: string = bookingInfo.date ?? '';
              const timeStr: string = bookingInfo.time ?? '';

              const boardingMatch = dateStr.match(/Lưu trú:\s*(.+?)\s*→\s*(.+?)(?:\s*\|.*)?$/);
              const normalDatePart = dateStr.includes('|')
                ? dateStr.split('|')[0].trim()
                : (!boardingMatch ? dateStr.trim() : '');

              const hasNormal = !!normalDatePart && !normalDatePart.startsWith('Lưu trú');
              const hasBoarding = !!boardingMatch;
              const isBoardingTime = timeStr.includes('ngày');

              return (
                <div className="flex flex-col gap-2">
                  {hasNormal && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#1a2b4c] dark:text-indigo-400 shrink-0">calendar_month</span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ngày hẹn</p>
                          <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-snug truncate">{normalDatePart}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#1a2b4c] dark:text-indigo-400 shrink-0">schedule</span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Giờ hẹn</p>
                          <p className="text-[11px] font-bold text-slate-900 dark:text-white">
                            {!isBoardingTime ? timeStr : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasBoarding && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 border border-indigo-100 dark:border-indigo-800">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <div className="bg-white dark:bg-indigo-900/40 rounded-lg p-2 text-center shadow-sm">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Nhận phòng</p>
                          <p className="text-xs font-black text-indigo-900 dark:text-indigo-100">{boardingMatch[1]}</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="material-symbols-outlined text-indigo-400 text-lg">arrow_forward</span>
                          {isBoardingTime && (
                            <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-800/50 px-1.5 py-0.5 rounded-full whitespace-nowrap mt-0.5">
                              {timeStr}
                            </span>
                          )}
                        </div>
                        <div className="bg-white dark:bg-indigo-900/40 rounded-lg p-2 text-center shadow-sm">
                          <p className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Trả phòng</p>
                          <p className="text-xs font-black text-indigo-900 dark:text-indigo-100">{boardingMatch[2]}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!hasNormal && !hasBoarding && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#1a2b4c] dark:text-indigo-400 shrink-0">calendar_month</span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ngày hẹn</p>
                          <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-snug truncate">{dateStr}</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-[#1a2b4c] dark:text-indigo-400 shrink-0">schedule</span>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Giờ / Thời gian</p>
                          <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{timeStr}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Pet & Staff */}
            <div className={`grid ${bookingInfo.staffId ? "grid-cols-2 gap-2" : "grid-cols-1"}`}>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-1.5 border border-amber-100/50 dark:border-amber-800/30">
                <span className="text-base">🐾</span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-0.5">Thú cưng</p>
                  <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{bookingInfo.petName}</p>
                </div>
              </div>

              {bookingInfo.staffId && (
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2.5 py-1.5 border border-blue-100/50 dark:border-blue-800/30">
                  <span className="material-symbols-outlined text-base text-blue-600 dark:text-blue-400">support_agent</span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-0.5">Nhân viên</p>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                      {bookingInfo.staffName || `Mã số #${bookingInfo.staffId}`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Services list */}
            <div className="rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {serviceList.map((svc: BookingServiceItem, i: number) => (
                  <div key={svc.id || i} className="flex items-center justify-between px-3 py-1.5 gap-2 bg-white dark:bg-slate-800">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="material-symbols-outlined text-[13px] text-indigo-600 dark:text-indigo-400 mt-0.5 self-start">
                        {svc.name.toLowerCase().includes('lưu trú') || svc.name.toLowerCase().includes('boarding')
                          ? 'hotel'
                          : svc.name.toLowerCase().includes('camera')
                            ? 'videocam'
                            : 'content_cut'}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] text-slate-700 dark:text-slate-200 leading-tight truncate">{svc.name}</span>
                        {svc.durationMinutes ? <span className="text-[9px] text-slate-400 mt-0.5">⏱ {svc.durationMinutes} phút</span> : null}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white shrink-0">
                      {svc.price.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="px-3 py-2 bg-[#1a2b4c] dark:bg-indigo-900/80 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-white/70">Phương thức thanh toán</span>
                  <span className="text-[10px] font-bold text-white/90">
                    {isCashDeposit ? 'Tiền mặt' : 'Chuyển khoản'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-1">
                  <span className="text-[11px] font-bold text-white/80">Tổng cộng</span>
                  <span className="text-[13px] font-black text-white">{totalPrice.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>

            {/* Note */}
            {bookingInfo.petNote && (
              <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-sm text-slate-400 mt-0.5">sticky_note_2</span>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Ghi chú</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{bookingInfo.petNote}</p>
                </div>
              </div>
            )}

            {/* Reminder tip */}
            <div className="flex items-start gap-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl px-3 py-2 border border-teal-100 dark:border-teal-800">
              <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400 mt-0.5">tips_and_updates</span>
              <p className="text-[11px] text-teal-700 dark:text-teal-300 leading-tight">
                Đến trước <strong> 15 phút </strong>. Nếu cần hủy, hãy thực hiện trước <strong>24 giờ</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            to="/profile/bookings"
            className="flex items-center justify-center gap-1.5 py-2.5 bg-[#1a2b4c] text-white font-bold rounded-xl hover:bg-[#243d6b] transition-all shadow-md shadow-[#1a2b4c]/20 text-xs"
          >
            <span className="material-symbols-outlined text-sm">event_note</span>
            Lịch của tôi
          </Link>
          <Link
            to="/user/dashboard"
            className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm text-xs"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            Trang chủ
          </Link>
        </div>

        {/* Share / Add to calendar row */}
        {/* <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[13px]">ios_share</span>
            Chia sẻ
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[13px]">calendar_add_on</span>
            Thêm vào lịch
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[13px]">chat</span>
            Nhắn tin
          </button>
        </div> */}

      </div>
    </div>
  );
}
