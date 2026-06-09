import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { bookingService } from '../../services/booking.service';

type PayMethod = 'payos' | 'cash';

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

interface BookingService {
  id: number;
  name: string;
  price: number;
  durationMinutes?: number;
  category?: string;
  cameraEnabled?: boolean;
}

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();

  const booking = location.state as {
    shopId: number;
    shopName: string;
    shopAddress: string;
    shopImage?: string;
    serviceId: number;
    services?: BookingService[];
    serviceName: string;
    servicePrice: number;
    petId: number;
    petName: string;
    petNote?: string;
    staffId?: number;
    staffName?: string;
    appointmentDatetime: string;
    checkIn?: string;
    checkOut?: string;
    date: string;
    time: string;
    cageSize?: string;
    roomType?: string;
  } | null;

  const [payMethod, setPayMethod] = useState<PayMethod>('payos');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<number | null>(null);

  React.useEffect(() => {
    // Fetch user vouchers on mount
    import('../../services/user.service').then(({ userService }) => {
      userService.getMyVouchers()
        .then(data => setMyVouchers(data))
        .catch(err => console.error("Failed to fetch vouchers", err));
    });
  }, []);

  if (!booking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">calendar_month</span>
          <p className="text-slate-500 font-semibold mb-4">Không có thông tin đặt lịch.</p>
          <Link to="/search" className="px-5 py-2.5 bg-[#1a2b4c] text-white font-bold rounded-xl hover:bg-[#243d6b] transition-colors">
            Tìm cơ sở
          </Link>
        </div>
      </div>
    );
  }

  // Dùng services[] nếu có, fallback về serviceName/servicePrice cũ
  const serviceList: BookingService[] = booking.services && booking.services.length > 0
    ? booking.services
    : [{ id: booking.serviceId, name: booking.serviceName, price: booking.servicePrice }];

  const rawTotalPrice = serviceList.reduce((sum, s) => sum + s.price, 0);

  const getCommissionRateForService = (svc: BookingService) => {
    if (!svc.category) return 0.10;
    const cat = svc.category.toUpperCase();
    if (cat.includes('GROOMING') || cat.includes('SPA')) return 0.18;
    if ((cat.includes('BOARDING') || cat.includes('HOTEL')) && svc.cameraEnabled) return 0.25;
    if (cat.includes('CLINIC')) return 0.10;
    return 0.10;
  };

  const rawDepositAmount = serviceList.reduce((sum, s) => sum + (s.price * getCommissionRateForService(s)), 0);

  let depositAmount = Math.ceil(rawDepositAmount);
  depositAmount = Math.max(depositAmount, 2000);
  if (depositAmount % 1000 !== 0) {
    depositAmount = Math.floor(depositAmount / 1000 + 1) * 1000;
  }

  // Tính thời gian dự kiến hoàn thành
  const totalDurationMinutes = serviceList.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  let estimatedEndTime = '';
  if (booking.time && totalDurationMinutes > 0 && !booking.time.includes('ngày')) {
    const [hours, minutes] = booking.time.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + totalDurationMinutes * 60000);
      estimatedEndTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Voucher logic
  let discountAmount = 0;
  let totalPrice = rawTotalPrice;
  if (payMethod === 'payos' && selectedVoucherId) {
    const voucher = myVouchers.find(v => v.id === selectedVoucherId)?.voucher;
    if (voucher) {
      if (voucher.discountType === 'PERCENTAGE') {
        discountAmount = rawTotalPrice * (voucher.discountValue / 100);
      } else {
        discountAmount = voucher.discountValue;
      }
      totalPrice = Math.max(0, rawTotalPrice - discountAmount);
    }
  }

  async function handlePay() {
    if (!agreed || loading) return;
    setLoading(true);
    setError('');

    const combinedNote = bookingNote.trim()
      ? (booking.petNote ? `${booking.petNote}\n—\nGhi chú thêm: ${bookingNote.trim()}` : bookingNote.trim())
      : (booking.petNote || '');

    const serviceIds = serviceList.map(s => s.id);
    
    // Lưu tạm thông tin đơn hàng để nếu bị lỗi / huỷ vẫn hiện được lên trang PaymentFailure
    const summaryData = {
      shopName: booking.shopName,
      shopAddress: booking.shopAddress,
      shopImage: booking.shopImage,
      services: serviceList,
      totalPrice: payMethod === 'cash' ? depositAmount : totalPrice,
      isDeposit: payMethod === 'cash'
    };
    localStorage.setItem('pendingBookingSummary', JSON.stringify(summaryData));

    if (payMethod === 'cash') {
      try {
        // Cash flow: tạo PayOS link cho 10% tiền cọc
        const result = await bookingService.initiateCashDeposit({
          shopId: booking.shopId,
          serviceId: booking.serviceId,
          serviceIds: serviceIds,
          petId: booking.petId,
          staffId: booking.staffId,
          appointmentDatetime: booking.appointmentDatetime,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          note: combinedNote,
          paymentMethod: payMethod === 'cash' ? "CASH" : "PAYOS",
          cageSize: booking.cageSize || '',
          roomType: booking.roomType,
        });
        if (result.checkoutUrl) {
          // Lưu flag để PaymentResult biết đây là cash deposit
          // Dùng localStorage vì sessionStorage bị xóa khi redirect sang domain khác (PayOS)
          localStorage.setItem('pendingCashDeposit', result.orderCode.toString());
          window.location.href = result.checkoutUrl;
        } else {
          setError('Không lấy được link thanh toán cọc. Vui lòng thử lại.');
          setLoading(false);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Đặt lịch thất bại. Vui lòng thử lại.');
        setLoading(false);
      }
      return;
    }

    try {
      const result = await bookingService.initiatePayment({
        shopId: booking.shopId,
        serviceId: booking.serviceId,
        serviceIds: serviceIds,
        petId: booking.petId,
        staffId: booking.staffId,
        appointmentDatetime: booking.appointmentDatetime,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        note: combinedNote,
        cageSize: booking.cageSize,
        roomType: booking.roomType,
        userVoucherId: payMethod === 'payos' && selectedVoucherId ? selectedVoucherId : undefined,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setError('Không lấy được link thanh toán. Vui lòng thử lại.');
        setLoading(false);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Tạo đơn thanh toán thất bại. Vui lòng thử lại.');
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-slate-400">
          <Link to="/user/dashboard" className="hover:text-[#1a2b4c] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">home</span>Trang chủ
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <button onClick={() => navigate(-1)} className="hover:text-[#1a2b4c]">{booking.shopName}</button>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Thanh toán</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">Xác nhận & Thanh toán</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kiểm tra thông tin và hoàn tất đặt lịch của bạn</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['Chọn dịch vụ', 'Chọn lịch', 'Thanh toán'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 ${i === 2 ? '' : 'opacity-60'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${i < 2 ? 'bg-green-500 text-white' : 'bg-[#1a2b4c] text-white'}`}>
                  {i < 2 ? <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:inline ${i === 2 ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>{step}</span>
              </div>
              {i < 2 && <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700" />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Payment form */}
          <div className="flex flex-col gap-5">

            {/* Order Summary Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">event_note</span>
                Thông tin lịch hẹn
              </h2>
              <div className="flex gap-4">
                <div
                  className="w-20 h-20 rounded-xl bg-cover bg-center shrink-0 bg-slate-100"
                  style={{ backgroundImage: booking.shopImage ? `url(${booking.shopImage})` : 'url(https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=300&auto=format&fit=crop)' }}
                />
                <div className="flex-1 space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{booking.shopName}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-teal-500">location_on</span>
                    {booking.shopAddress}
                  </p>
                  {/* Danh sách dịch vụ đã chọn */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {serviceList.map((svc) => (
                      <span key={svc.id} className="px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs font-semibold rounded-lg flex items-center gap-1">
                        {svc.name}
                        {svc.durationMinutes ? ` (${svc.durationMinutes} phút)` : ''}
                      </span>
                    ))}
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      Bắt đầu: {booking.date} • {booking.time}
                      {estimatedEndTime ? ` - Dự kiến xong: ${estimatedEndTime}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">🐾 {booking.petName}</p>
                  {booking.staffId && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      👤 Nhân viên: {booking.staffName ?? `#${booking.staffId}`}
                    </p>
                  )}
                  {booking.petNote && (
                    <p className="text-xs text-slate-400 mt-0.5 italic">📝 {booking.petNote}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Note for Shop */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400">edit_note</span>
                Ghi chú cho cơ sở
              </h2>
              <textarea
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="Nhập ghi chú của bạn (VD: thú cưng hơi nhát người, cần chuẩn bị lồng rộng...)"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2b4c] text-slate-700 dark:text-slate-200 min-h-[100px] resize-y"
              />
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400">payments</span>
                Phương thức thanh toán
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {([
                  { id: 'payos', icon: 'qr_code_2', label: 'Chuyển khoản QR (PayOS)' },
                  { id: 'cash', icon: 'payments', label: 'Tiền mặt tại quầy' },
                ] as { id: PayMethod; icon: string; label: string }[]).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPayMethod(m.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${payMethod === m.id
                      ? 'border-[#1a2b4c] bg-[#1a2b4c]/5 dark:border-teal-400 dark:bg-teal-900/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${payMethod === m.id ? 'text-[#1a2b4c] dark:text-teal-400' : 'text-slate-400'}`}>
                      {m.icon}
                    </span>
                    <span className={`text-xs font-semibold text-center ${payMethod === m.id ? 'text-[#1a2b4c] dark:text-teal-400' : 'text-slate-500'}`}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>

              {payMethod === 'payos' && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="material-symbols-outlined text-blue-500 mt-0.5 text-xl">qr_code_2</span>
                  <div>
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Thanh toán qua PayOS</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1 leading-relaxed">
                      Bạn sẽ được chuyển sang trang PayOS để quét mã QR chuyển khoản ngân hàng. Sau khi thanh toán thành công, lịch hẹn sẽ được xác nhận tự động.
                    </p>
                  </div>
                </div>
              )}

              {payMethod === 'payos' && myVouchers.length > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500">local_activity</span>
                    Mã giảm giá (Voucher)
                  </h3>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a2b4c] text-slate-700 dark:text-slate-200"
                    value={selectedVoucherId || ''}
                    onChange={(e) => setSelectedVoucherId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Không sử dụng voucher</option>
                    {myVouchers.map(uv => {
                      const v = uv.voucher;
                      const disabled = v.minOrderValue && rawTotalPrice < v.minOrderValue;
                      return (
                        <option key={uv.id} value={uv.id} disabled={disabled}>
                          {v.code} - Giảm {v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : formatVND(v.discountValue)} 
                          {v.minOrderValue ? ` (Đơn tối thiểu ${formatVND(v.minOrderValue)})` : ''}
                          {disabled ? ' - Chưa đủ điều kiện' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {payMethod === 'cash' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Thanh toán tại quầy — Đặt cọc giữ lịch</p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs mt-1 leading-relaxed">
                      Bạn cần thanh toán tiền cọc (tương đương phí nền tảng) qua PayOS ngay bây giờ để giữ lịch.
                      Phần còn lại sẽ được thanh toán trực tiếp tại cơ sở vào ngày hẹn.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Agreement */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#1a2b4c] focus:ring-[#1a2b4c]"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Tôi đồng ý với{' '}
                <a href="#" className="text-[#1a2b4c] dark:text-teal-400 font-semibold hover:underline">Điều khoản dịch vụ</a>
                {' '}và{' '}
                <a href="#" className="text-[#1a2b4c] dark:text-teal-400 font-semibold hover:underline">Chính sách hoàn tiền</a>
                {' '}của Peteye.
              </span>
            </label>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 font-semibold">
                {error}
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div>
            <div className="sticky top-24 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Tổng đơn hàng</h2>

              {/* Từng dịch vụ */}
              <div className="space-y-2 text-sm">
                {serviceList.map((svc) => {
                  const rate = getCommissionRateForService(svc);
                  return (
                  <div key={svc.id} className="flex flex-col text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span className="flex-1 pr-2 leading-snug">{svc.name}</span>
                      <span className="shrink-0 font-semibold">{formatVND(svc.price)}</span>
                    </div>
                    {svc.durationMinutes ? (
                      <span className="text-xs text-slate-400 mt-0.5">⏱ Thời gian: {svc.durationMinutes} phút</span>
                    ) : null}
                    {payMethod === 'cash' && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                        • Cọc trước {rate * 100}%
                      </span>
                    )}
                  </div>
                )})}
              </div>

              {discountAmount > 0 && payMethod === 'payos' && (
                <div className="flex justify-between text-rose-500 text-sm font-semibold pt-2">
                  <span>Voucher giảm giá</span>
                  <span>-{formatVND(discountAmount)}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-4 flex justify-between items-center">
                <span className="font-bold text-slate-900 dark:text-slate-100">Tổng cộng</span>
                <span className="text-xl font-black text-[#1a2b4c] dark:text-teal-400">{formatVND(totalPrice)}</span>
              </div>

              {payMethod === 'cash' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 space-y-1.5 text-xs border border-amber-200 dark:border-amber-800">
                  <div className="flex justify-between text-amber-700 dark:text-amber-300 pb-1">
                    <span>Tổng tiền cọc thanh toán qua PayOS</span>
                    <span className="font-bold text-sm">{formatVND(depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 border-t border-amber-200/50 dark:border-amber-800/50 pt-1.5">
                    <span>Thanh toán tại quầy</span>
                    <span className="font-semibold">{formatVND(rawTotalPrice - depositAmount)}</span>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-green-500">verified_user</span>
                  Đặt lịch được bảo đảm bởi Peteye
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-blue-500">undo</span>
                  Hủy miễn phí trước 24 giờ
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-amber-500">lock</span>
                  Thanh toán mã hóa SSL 256-bit
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={!agreed || loading}
                className="w-full py-4 bg-[#1a2b4c] text-white font-black rounded-xl hover:bg-[#243d6b] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#1a2b4c]/25 text-base flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : payMethod === 'payos' ? (
                  <>
                    <span className="material-symbols-outlined">qr_code_2</span>
                    Thanh toán qua PayOS
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">qr_code_2</span>
                    Đặt cọc qua PayOS để giữ lịch
                  </>
                )}
              </button>

              <button
                onClick={async () => {
                  if (!agreed || loading) return;
                  setLoading(true);
                  setError('');
                  const serviceIds = serviceList.map(s => s.id);
                  const summaryData = {
                    shopName: booking.shopName,
                    shopAddress: booking.shopAddress,
                    shopImage: booking.shopImage,
                    services: serviceList,
                    totalPrice: payMethod === 'cash' ? depositAmount : totalPrice,
                    isDeposit: payMethod === 'cash'
                  };
                  localStorage.setItem('pendingBookingSummary', JSON.stringify(summaryData));
                  try {
                    const dataPayload = {
                      shopId: booking.shopId,
                      serviceId: booking.serviceId,
                      serviceIds: serviceIds,
                      petId: booking.petId,
                      staffId: booking.staffId,
                      appointmentDatetime: booking.appointmentDatetime,
                      checkIn: booking.checkIn,
                      checkOut: booking.checkOut,
                      note: bookingNote.trim()
                        ? (booking.petNote ? `${booking.petNote}\n—\nGhi chú thêm: ${bookingNote.trim()}` : bookingNote.trim())
                        : (booking.petNote || ''),
                      paymentMethod: payMethod === 'cash' ? 'CASH' : 'PAYOS',
                      cageSize: booking.cageSize,
                      roomType: booking.roomType,
                      userVoucherId: payMethod === 'payos' && selectedVoucherId ? selectedVoucherId : undefined,
                    };
                    const result = payMethod === 'cash' 
                      ? await bookingService.initiateCashDeposit(dataPayload)
                      : await bookingService.initiatePayment(dataPayload);
                    
                    if (result.orderCode) {
                      const confirmedBooking = payMethod === 'cash'
                        ? await bookingService.mockConfirmCashDeposit(result.orderCode)
                        : await bookingService.mockConfirmPayment(result.orderCode);
                      localStorage.removeItem('pendingBookingSummary');
                      
                      navigate('/booking/success', {
                        state: {
                          booking: confirmedBooking,
                          isCashDeposit: payMethod === 'cash',
                          bookingInfo: {
                            shopId: confirmedBooking.shopId,
                            shopName: confirmedBooking.shopName,
                            shopAddress: confirmedBooking.shopAddress,
                            serviceId: confirmedBooking.serviceId,
                            serviceName: confirmedBooking.serviceName,
                            servicePrice: confirmedBooking.servicePrice,
                            services: summaryData.services,
                            petId: confirmedBooking.petId,
                            petName: confirmedBooking.petName,
                            petNote: confirmedBooking.note,
                            staffId: confirmedBooking.staffId,
                            staffName: confirmedBooking.staffName,
                            appointmentDatetime: confirmedBooking.appointmentDatetime,
                            date: confirmedBooking.checkIn && confirmedBooking.checkOut
                              ? `Lưu trú: ${new Date(confirmedBooking.checkIn).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} → ${new Date(confirmedBooking.checkOut).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                              : new Date(confirmedBooking.appointmentDatetime).toLocaleDateString('vi-VN', {
                                  weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit'
                                }),
                            time: confirmedBooking.checkIn && confirmedBooking.checkOut
                              ? `${Math.max(1, Math.round((new Date(confirmedBooking.checkOut).getTime() - new Date(confirmedBooking.checkIn).getTime()) / 86400000))} ngày`
                              : new Date(confirmedBooking.appointmentDatetime).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit', minute: '2-digit'
                                })
                          }
                        },
                        replace: true
                      });
                    }
                  } catch (e: any) {
                    setError(e?.response?.data?.message || 'Lỗi giả lập thanh toán.');
                    setLoading(false);
                  }
                }}
                disabled={!agreed || loading}
                className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg text-base flex items-center justify-center gap-2 mt-3"
              >
                <span className="material-symbols-outlined">bug_report</span>
                Thanh toán giả lập (Test)
              </button>

              <button
                onClick={() => navigate(-1)}
                className="w-full py-2.5 text-slate-500 dark:text-slate-400 text-sm font-semibold hover:text-slate-700 transition-colors"
              >
                ← Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
