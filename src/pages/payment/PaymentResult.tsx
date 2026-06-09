import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { bookingService } from '../../services/booking.service';

export default function PaymentResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handlePaymentResult = async () => {
      // Đọc thông tin tóm tắt đơn hàng đã lưu trước khi chuyển sang PayOS
      const rawSummary = localStorage.getItem('pendingBookingSummary');
      let bookingInfo = null;
      if (rawSummary) {
        try { bookingInfo = JSON.parse(rawSummary); } catch (e) {}
      }

      // PayOS redirect params: ?code=00&id=xxx&cancel=false&status=PAID&orderCode=xxx
      const code      = searchParams.get('code');      // '00' = success
      const status    = searchParams.get('status');    // 'PAID' | 'CANCELLED'
      const orderCode = searchParams.get('orderCode');
      const cancel    = searchParams.get('cancel');    // 'true' | 'false'
      const isMock    = searchParams.get('mock') === 'true';

      // ── Bị huỷ ───────────────────────────────────────────────────────────
      if (cancel === 'true' || status === 'CANCELLED') {
        localStorage.removeItem('pendingCashDeposit');
        localStorage.removeItem('pendingBookingSummary');
        navigate('/payment/failure', {
          state: { error: 'Bạn đã huỷ thanh toán. Lịch hẹn chưa được tạo.', bookingInfo },
          replace: true
        });
        return;
      }

      // ── Thiếu orderCode ───────────────────────────────────────────────────
      if (!orderCode) {
        localStorage.removeItem('pendingBookingSummary');
        navigate('/payment/failure', {
          state: { error: 'Thông tin thanh toán không hợp lệ (thiếu orderCode).', bookingInfo },
          replace: true
        });
        return;
      }

      // ── Thanh toán không thành công ───────────────────────────────────────
      if (code !== '00' || status !== 'PAID') {
        localStorage.removeItem('pendingCashDeposit');
        localStorage.removeItem('pendingBookingSummary');
        navigate('/payment/failure', {
          state: { error: `Thanh toán không thành công (code=${code}, status=${status}). Vui lòng thử lại.`, bookingInfo },
          replace: true
        });
        return;
      }

      // ── Thanh toán thành công — xác định loại booking ─────────────────────
      const cashDepositOrderCode = localStorage.getItem('pendingCashDeposit');
      const isCashDeposit = cashDepositOrderCode === orderCode;

      try {
        let booking;
        if (isMock) {
          if (isCashDeposit) {
            localStorage.removeItem('pendingCashDeposit');
            booking = await bookingService.mockConfirmCashDeposit(parseInt(orderCode));
          } else {
            booking = await bookingService.mockConfirmPayment(parseInt(orderCode));
          }
        } else if (isCashDeposit) {
          localStorage.removeItem('pendingCashDeposit');
          booking = await bookingService.confirmCashDeposit(parseInt(orderCode));
        } else {
          booking = await bookingService.confirmPayment(parseInt(orderCode));
        }
        
        localStorage.removeItem('pendingBookingSummary'); // Dọn dẹp sau khi thành công

        navigate('/booking/success', {
          state: {
            booking,
            isCashDeposit,
            bookingInfo: {
              shopId: booking.shopId,
              shopName: booking.shopName,
              shopAddress: booking.shopAddress,
              serviceId: booking.serviceId,
              serviceName: booking.serviceName,
              servicePrice: booking.servicePrice,
              services: bookingInfo?.services, // Bảo toàn danh sách dịch vụ đã đặt
              petId: booking.petId,
              petName: booking.petName,
              petNote: booking.note,
              staffId: booking.staffId,
              staffName: booking.staffName,
              appointmentDatetime: booking.appointmentDatetime,
              date: booking.checkIn && booking.checkOut
                ? `Lưu trú: ${new Date(booking.checkIn).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} → ${new Date(booking.checkOut).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                : new Date(booking.appointmentDatetime).toLocaleDateString('vi-VN', {
                    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit'
                  }),
              time: booking.checkIn && booking.checkOut
                ? `${Math.max(1, Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000))} ngày`
                : new Date(booking.appointmentDatetime).toLocaleTimeString('vi-VN', {
                    hour: '2-digit', minute: '2-digit'
                  })
            }
          },
          replace: true
        });
      } catch (error: any) {
        console.error('Error confirming payment:', error);
        localStorage.removeItem('pendingBookingSummary');
        const msg = error?.response?.data?.message
          || error?.message
          || 'Không thể xác nhận thanh toán. Vui lòng liên hệ hỗ trợ.';
        navigate('/payment/failure', {
          state: { error: msg, bookingInfo },
          replace: true
        });
      }
    };

    handlePaymentResult();
  }, [searchParams, navigate]);

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a2b4c] mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Đang xác nhận thanh toán...</p>
        <p className="text-slate-400 text-sm mt-1">Vui lòng không đóng trang này</p>
      </div>
    </div>
  );
}