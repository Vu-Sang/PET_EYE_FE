# Chức năng Email Hóa Đơn

## Tổng quan

Backend đã tích hợp chức năng tự động gửi email hóa đơn chi tiết cho khách hàng sau khi thanh toán hoặc hoàn thành dịch vụ. Frontend cũng cung cấp nút xuất hóa đơn thủ công cho Shop Owner/Staff.

## Luồng gửi Email Hóa Đơn

### 1. Tự động gửi (Backend)

| Tình huống | Khi nào | Ai nhận |
|-----------|---------|---------|
| **PayOS thành công** | Ngay sau `confirmPayment()` | Khách hàng |
| **Mock Payment** | Ngay sau `mockConfirmPayment()` | Khách hàng |
| **Cash Deposit** | Ngay sau `confirmCashDeposit()` | Khách hàng |

### 2. Thủ công gửi (Frontend → Backend)

**API Endpoint:**
```
POST /bookings/{bookingId}/send-invoice
Roles: SHOP_OWNER only
```

**Khi nào sử dụng:**
- Đơn đã hoàn thành (`COMPLETED`)
- Shop muốn gửi lại hóa đơn cho khách
- Khách hàng yêu cầu xuất hóa đơn

## Nội dung Email Hóa Đơn

Email HTML bao gồm các thông tin:

### Thông tin cửa hàng
- Tên cửa hàng
- Địa chỉ
- Số điện thoại
- Email liên hệ

### Thông tin khách hàng
- Họ tên
- Email
- Số điện thoại
- Tên thú cưng
- Ngày hẹn

### Bảng dịch vụ
- Tên từng dịch vụ + Giá riêng
- Giảm giá voucher (nếu có)
- Tổng cộng

### Thông tin thanh toán
- Số tiền đã trả
- Phương thức thanh toán
- Trạng thái thanh toán

## Frontend Implementation

### 1. Service Layer (`booking.service.ts`)

```typescript
sendInvoice: async (bookingId: number): Promise<void> => {
    await apiClient.post(`/bookings/${bookingId}/send-invoice`);
}
```

### 2. Shop Bookings Page

**Nút trong List View:**
- Hiện khi booking có status `COMPLETED`
- Gọi `handleSendInvoice(bookingId)`
- Hiển thị loading spinner khi đang gửi
- Toast thông báo thành công/thất bại

**Nút trong Detail Modal:**
- Hiện khi booking có status `COMPLETED`
- Nút màu xanh lá với icon Mail
- Text: "Xuất hóa đơn qua Email"

### 3. State Management

```typescript
const [sendingInvoiceId, setSendingInvoiceId] = useState<number | null>(null);

const handleSendInvoice = async (bookingId: number) => {
    setSendingInvoiceId(bookingId);
    try {
        await bookingService.sendInvoice(bookingId);
        toast.success('Đã gửi hóa đơn tới email khách hàng!');
    } catch (err: any) {
        toast.error(err.response?.data?.message || 'Gửi hóa đơn thất bại');
    } finally {
        setSendingInvoiceId(null);
    }
};
```

## Backend Requirements (Tham khảo)

### EmailService Interface
```java
void sendBookingInvoiceEmail(
    String toEmail, 
    Booking booking,
    BigDecimal paidAmount,
    String paymentMethod,
    String paymentStatus
);
```

### BookingService Interface
```java
void sendInvoice(int bookingId, String requesterEmail);
```

### Tích hợp trong BookingServiceImpl
- Inject `EmailService`
- Sau `confirmPayment()` → auto send invoice
- Sau `mockConfirmPayment()` → auto send invoice  
- Sau `confirmCashDeposit()` → auto send deposit confirmation
- Method `sendInvoice()` với kiểm tra quyền Shop Owner only

### BookingController Endpoint
```java
@PostMapping("/bookings/{id}/send-invoice")
@PreAuthorize("hasRole('SHOP_OWNER')")
public ResponseEntity<?> sendInvoice(@PathVariable int id) {
    // Implementation
}
```

## UI/UX

### List View
- Nút nhỏ bên dưới thông tin "Hoàn thành"
- Icon: Mail
- Text: "Xuất hóa đơn"
- Disabled khi đang gửi (hiện spinner)

### Detail Modal
- Nút to ở cuối modal
- Màu xanh lá (emerald-600)
- Text: "Xuất hóa đơn qua Email"
- Shadow effect

### Toast Messages
- **Success**: "Đã gửi hóa đơn tới email khách hàng!"
- **Error**: "Gửi hóa đơn thất bại. Vui lòng thử lại."

## Testing

### Manual Testing Steps
1. Tạo booking mới và thanh toán PayOS/Cash
2. Chờ backend tự động gửi email
3. Kiểm tra email của khách hàng
4. Sau khi booking COMPLETED, click nút "Xuất hóa đơn"
5. Verify email được gửi lại

### Edge Cases
- Booking không có email khách hàng
- Email server down
- Booking chưa thanh toán đầy đủ
- Booking đã bị hủy

## Notes

- Chỉ cho phép xuất hóa đơn khi status = `COMPLETED`
- **Chỉ Shop Owner mới có quyền xuất hóa đơn** (Staff không được phép)
- Backend tự động gửi email sau các bước thanh toán
- Frontend chỉ cung cấp nút gửi thủ công cho Shop Owner
- Cần xử lý lỗi gracefully nếu email không gửi được
