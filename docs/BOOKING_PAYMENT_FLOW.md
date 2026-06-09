# Luồng Booking & Thanh Toán — Peteye

> Tài liệu này mô tả toàn bộ luồng đặt lịch, thanh toán, quản lý ví và rút tiền trong hệ thống Peteye.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Luồng đặt lịch — PayOS](#2-luồng-đặt-lịch--payos)
3. [Luồng đặt lịch — Tiền mặt](#3-luồng-đặt-lịch--tiền-mặt)
4. [Luồng xử lý dịch vụ (Staff)](#4-luồng-xử-lý-dịch-vụ-staff)
5. [Luồng ví Shop & Doanh thu](#5-luồng-ví-shop--doanh-thu)
6. [Luồng rút tiền](#6-luồng-rút-tiền)
7. [Trạng thái Booking](#7-trạng-thái-booking)
8. [Trạng thái Withdrawal](#8-trạng-thái-withdrawal)
9. [API Reference](#9-api-reference)

---

## 1. Tổng quan hệ thống

```
User ──────────────────────────────────────────────────────────────────────────
  │  Đặt lịch (PayOS / Cash)
  ▼
Booking CONFIRMED
  │
  │  Staff nhận việc & thực hiện dịch vụ
  ▼
Booking IN_PROGRESS
  │
  │  Staff xác nhận hoàn thành + khách trả tiền
  ▼
Booking COMPLETED ──────────────────────────────────────────────────────────────
                                                                               │
                                                              90% vào ví Shop  │  10% phí Admin
                                                                               ▼
                                                                    ShopWallet.availableBalance
                                                                               │
                                                              Shop yêu cầu rút │
                                                                               ▼
                                                                    Admin duyệt → PayOS payout
                                                                               │
                                                              PayOS PAID       │
                                                                               ▼
                                                                    Tiền chuyển khoản thực tế
```

---

## 2. Luồng đặt lịch — PayOS

### Mô tả
Khách hàng thanh toán online qua cổng PayOS trước khi booking được tạo.

### Sequence

```
User          Frontend        Backend         PayOS
 │                │               │              │
 │  Chọn dịch vụ │               │              │
 │──────────────►│               │              │
 │               │ POST /bookings/initiate-payment
 │               │──────────────►│              │
 │               │               │ Validate inputs
 │               │               │ Tạo orderCode (random 8 chữ số)
 │               │               │ Lưu PendingBooking (in-memory)
 │               │               │──────────────►│
 │               │               │               │ Tạo payment link
 │               │               │◄──────────────│
 │               │◄──────────────│ checkoutUrl   │
 │               │               │              │
 │  Redirect đến PayOS           │              │
 │◄──────────────│               │              │
 │                               │              │
 │  Thanh toán trên PayOS        │              │
 │──────────────────────────────────────────────►│
 │                               │              │ PAID
 │                               │              │
 │  Redirect về returnUrl        │              │
 │◄──────────────────────────────────────────────│
 │               │               │              │
 │               │ POST /bookings/confirm-payment?orderCode=xxx
 │               │──────────────►│              │
 │               │               │ Query PayOS status
 │               │               │──────────────►│
 │               │               │◄──────────────│ PAID
 │               │               │              │
 │               │               │ Tạo Booking (CONFIRMED)
 │               │               │ Tạo Payment (SUCCESS)
 │               │               │ Xoá PendingBooking
 │               │◄──────────────│ BookingResponse
 │◄──────────────│               │              │
```

### API

| Bước | Method | Endpoint | Auth |
|------|--------|----------|------|
| 1 | `POST` | `/api/bookings/initiate-payment` | USER |
| 2 | `POST` | `/api/bookings/confirm-payment?orderCode={code}` | USER |

### Request — Bước 1

```json
{
  "shopId": 1,
  "serviceId": 5,
  "petId": 3,
  "staffId": 2,
  "appointmentDatetime": "2026-05-15T09:00:00",
  "note": "Bé hay cắn, cần nhẹ nhàng"
}
```

### Response — Bước 1

```json
{
  "code": 0,
  "result": {
    "orderCode": 12345678,
    "checkoutUrl": "https://pay.payos.vn/web/...",
    "qrCode": "...",
    "amount": 250000,
    "description": "Booking12345"
  }
}
```

### Lưu ý kỹ thuật

- `PendingBooking` được lưu **in-memory** (`ConcurrentHashMap`) — nếu server restart trước khi confirm thì booking sẽ mất
- `amount` được làm tròn lên bội số 1000đ và tối thiểu 2000đ (yêu cầu PayOS)
- `description` tối đa 25 ký tự, chỉ chứa chữ và số

---

## 3. Luồng đặt lịch — Tiền mặt

### Mô tả
Khách hàng đặt lịch và trả tiền trực tiếp tại cửa hàng. Booking được tạo ngay lập tức.

### Sequence

```
User          Frontend        Backend
 │                │               │
 │  Chọn dịch vụ │               │
 │──────────────►│               │
 │               │ POST /bookings/cash
 │               │──────────────►│
 │               │               │ Validate inputs
 │               │               │ Tạo Booking (CONFIRMED)
 │               │               │ Tạo Payment (PENDING — chờ thu tiền mặt)
 │               │◄──────────────│ BookingResponse
 │◄──────────────│               │
```

### API

| Method | Endpoint | Auth |
|--------|----------|------|
| `POST` | `/api/bookings/cash` | USER |

### Request

```json
{
  "shopId": 1,
  "serviceId": 5,
  "petId": 3,
  "staffId": 2,
  "appointmentDatetime": "2026-05-15T09:00:00",
  "note": "Thanh toán tiền mặt tại quầy",
  "paymentMethod": "CASH"
}
```

### Lưu ý

- Payment status = `PENDING` (chưa thu tiền)
- Tiền **không** vào ví shop cho đến khi staff xác nhận COMPLETED

---

## 4. Luồng xử lý dịch vụ (Staff)

### Các bước

```
CONFIRMED ──► IN_PROGRESS ──► COMPLETED
     │                             │
     └──────────────────────────► CANCELLED
```

### Phân quyền giao việc

| Mode | Mô tả |
|------|-------|
| `MANUAL` | Owner tự giao việc cho staff cụ thể |
| `OPEN_POOL` | Staff tự nhận việc từ danh sách chưa giao |
| `AUTO` | Hệ thống tự giao ngẫu nhiên khi booking được tạo |

### API Staff

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/tasks/my-tasks` | Lấy danh sách việc được giao |
| `GET` | `/api/tasks/unassigned` | Lấy việc chưa giao (OPEN_POOL) |
| `PUT` | `/api/tasks/{id}/claim` | Staff tự nhận việc |
| `PUT` | `/api/tasks/{id}/status` | Cập nhật trạng thái |

### API Owner

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/api/tasks/all` | Xem tất cả booking của shop |
| `PUT` | `/api/tasks/{id}/assign/{staffId}` | Giao việc cho staff |
| `PUT` | `/api/tasks/{id}/unassign` | Gỡ staff khỏi booking |

### Cập nhật trạng thái

```json
PUT /api/tasks/{bookingId}/status
{
  "status": "COMPLETED"
}
```

> **Quan trọng:** Khi staff cập nhật status → `COMPLETED`, hệ thống tự động cộng tiền vào ví shop.

---

## 5. Luồng ví Shop & Doanh thu

### Nguyên tắc

| Sự kiện | `availableBalance` | `totalEarned` | `frozenBalance` |
|---------|-------------------|---------------|-----------------|
| Booking CONFIRMED (PayOS) | ❌ Không đổi | ❌ Không đổi | ❌ Không đổi |
| Booking CONFIRMED (Cash) | ❌ Không đổi | ❌ Không đổi | ❌ Không đổi |
| Booking CANCELLED | ❌ Không đổi | ❌ Không đổi | ❌ Không đổi |
| Booking **COMPLETED** | ✅ `+= 90% giá dịch vụ` | ✅ `+= 90% giá dịch vụ` | ❌ Không đổi |
| Tạo yêu cầu rút tiền | ✅ `-= amount` (tạm giữ) | ❌ Không đổi | ❌ Không đổi |
| Admin duyệt + PayOS PAID | ❌ Không đổi | ❌ Không đổi | ❌ Không đổi |
| `totalWithdrawn` | ✅ `+= amount` | — | — |
| Admin từ chối | ✅ `+= amount` (hoàn lại) | ❌ Không đổi | ❌ Không đổi |

### Phân chia doanh thu

```
Giá dịch vụ: 100,000đ
├── Admin (10%):  10,000đ  → Ví Admin (phí nền tảng)
└── Shop  (90%):  90,000đ  → ShopWallet.availableBalance
```

> Tỷ lệ phí cấu hình tại `wallet.admin-fee-rate` trong `application-local.yml` (mặc định `0.10`).

### Cấu trúc ShopWallet

```
ShopWallet
├── availableBalance  — Tiền sẵn sàng rút (đã hoàn thành dịch vụ)
├── frozenBalance     — Dự phòng (hiện không dùng trong luồng mới)
├── totalEarned       — Tổng tiền đã nhận từ trước đến nay (sau phí)
└── totalWithdrawn    — Tổng tiền đã rút thành công
```

### API

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/wallet/my` | SHOP_OWNER | Xem ví của shop |
| `GET` | `/api/wallet/admin/balance` | ADMIN | Xem tổng phí admin đã thu |
| `GET` | `/api/wallet/admin/shop/{shopId}` | ADMIN | Xem ví của shop cụ thể |

---

## 6. Luồng rút tiền

### Sequence

```
Shop Owner    Frontend        Backend         PayOS
    │              │               │              │
    │  Nhập thông tin rút tiền     │              │
    │─────────────►│               │              │
    │              │ POST /wallet/withdraw         │
    │              │──────────────►│              │
    │              │               │ Kiểm tra số dư
    │              │               │ Kiểm tra không có yêu cầu đang chờ
    │              │               │ Trừ availableBalance (tạm giữ)
    │              │               │ Tạo WithdrawalRequest (PENDING)
    │              │◄──────────────│              │
    │◄─────────────│               │              │
    │                              │              │
    │         [Admin xem danh sách yêu cầu]       │
    │                              │              │
    │              Admin           │              │
    │              │ POST /wallet/admin/withdrawals/{id}/approve
    │              │──────────────►│              │
    │              │               │ Tạo PayOS link (số tiền rút)
    │              │               │──────────────►│
    │              │               │◄──────────────│ checkoutUrl
    │              │               │ Status → PAYING
    │              │◄──────────────│ checkoutUrl   │
    │              │               │              │
    │              │  Mở PayOS, thực hiện chuyển khoản
    │              │──────────────────────────────►│
    │              │               │              │ PAID
    │              │               │              │
    │              │ POST /wallet/admin/withdrawals/confirm-payout?orderCode=xxx
    │              │──────────────►│              │
    │              │               │ Query PayOS status
    │              │               │──────────────►│
    │              │               │◄──────────────│ PAID
    │              │               │ Status → APPROVED
    │              │               │ totalWithdrawn += amount
    │              │◄──────────────│              │
```

### Trạng thái WithdrawalRequest

```
PENDING ──► PAYING ──► APPROVED
   │           │
   └───────────┴──────────────► REJECTED
```

| Trạng thái | Mô tả |
|-----------|-------|
| `PENDING` | Shop đã gửi yêu cầu, chờ Admin xem xét |
| `PAYING` | Admin đã duyệt, đang thực hiện chuyển khoản qua PayOS |
| `APPROVED` | PayOS xác nhận PAID, tiền đã chuyển thành công |
| `REJECTED` | Admin từ chối, tiền hoàn lại vào `availableBalance` |

### Ràng buộc

- Số tiền tối thiểu: **10,000đ**
- Không thể tạo yêu cầu mới khi đang có yêu cầu `PENDING` hoặc `PAYING`
- Số tiền yêu cầu không được vượt quá `availableBalance`

### API

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/wallet/withdraw` | SHOP_OWNER | Tạo yêu cầu rút tiền |
| `GET` | `/api/wallet/withdrawals/my` | SHOP_OWNER | Lịch sử yêu cầu của shop |
| `GET` | `/api/wallet/admin/withdrawals` | ADMIN | Tất cả yêu cầu (filter theo status) |
| `POST` | `/api/wallet/admin/withdrawals/{id}/approve` | ADMIN | Duyệt → tạo PayOS link |
| `POST` | `/api/wallet/admin/withdrawals/confirm-payout` | ADMIN | Xác nhận PayOS PAID |
| `POST` | `/api/wallet/admin/withdrawals/{id}/reject` | ADMIN | Từ chối yêu cầu |

### Request — Tạo yêu cầu rút tiền

```json
POST /api/wallet/withdraw
{
  "amount": 500000,
  "bankName": "Vietcombank",
  "bankAccount": "1234567890",
  "accountHolder": "NGUYEN VAN A",
  "note": "Rút tiền tháng 5"
}
```

---

## 7. Trạng thái Booking

```
PENDING_PAYMENT
      │
      │ (PayOS PAID hoặc Cash booking)
      ▼
  CONFIRMED ──────────────────────────────────────► CANCELLED
      │                                                  ▲
      │ Staff nhận việc & bắt đầu                        │
      ▼                                                  │
  IN_PROGRESS ─────────────────────────────────────────►│
      │                                                  │
      │ Staff xác nhận hoàn thành                        │
      ▼
  COMPLETED
```

| Trạng thái | Mô tả | Ai thay đổi |
|-----------|-------|-------------|
| `PENDING_PAYMENT` | Chờ thanh toán PayOS | Hệ thống |
| `CONFIRMED` | Đã xác nhận, chờ xử lý | Hệ thống (sau PayOS PAID hoặc Cash) |
| `IN_PROGRESS` | Đang thực hiện dịch vụ | Staff |
| `COMPLETED` | Hoàn thành, tiền vào ví shop | Staff |
| `CANCELLED` | Đã huỷ | User / Shop Owner |

---

## 8. Trạng thái Withdrawal

```
PENDING ──► PAYING ──► APPROVED
   │           │
   └───────────┴──► REJECTED
```

| Trạng thái | `availableBalance` | `totalWithdrawn` |
|-----------|-------------------|-----------------|
| `PENDING` | Đã trừ (tạm giữ) | Không đổi |
| `PAYING` | Đã trừ (tạm giữ) | Không đổi |
| `APPROVED` | Đã trừ (giữ nguyên) | `+= amount` |
| `REJECTED` | Hoàn lại `+= amount` | Không đổi |

---

## 9. API Reference

### Booking

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `POST` | `/api/bookings/initiate-payment` | USER | Bước 1: Tạo PayOS link |
| `POST` | `/api/bookings/confirm-payment` | USER | Bước 2: Xác nhận PayOS PAID |
| `POST` | `/api/bookings/cash` | USER | Đặt lịch tiền mặt |
| `GET` | `/api/bookings/my` | USER | Lịch sử booking của user |
| `GET` | `/api/bookings/{id}` | USER | Chi tiết booking |
| `POST` | `/api/bookings/{id}/cancel` | USER / SHOP_OWNER | Huỷ booking |
| `GET` | `/api/bookings/staff/{shopId}` | Public | Danh sách staff của shop |
| `GET` | `/api/bookings/shop` | SHOP_OWNER | Booking của shop (theo range) |

### Task (Staff / Owner)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/tasks/my-tasks` | STAFF | Việc được giao cho tôi |
| `GET` | `/api/tasks/unassigned` | STAFF / SHOP_OWNER | Việc chưa giao |
| `PUT` | `/api/tasks/{id}/claim` | STAFF | Tự nhận việc (OPEN_POOL) |
| `PUT` | `/api/tasks/{id}/status` | STAFF | Cập nhật trạng thái |
| `GET` | `/api/tasks/all` | SHOP_OWNER | Tất cả booking của shop |
| `PUT` | `/api/tasks/{id}/assign/{staffId}` | SHOP_OWNER | Giao việc cho staff |
| `PUT` | `/api/tasks/{id}/unassign` | SHOP_OWNER | Gỡ staff |

### Wallet

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| `GET` | `/api/wallet/my` | SHOP_OWNER | Xem ví |
| `POST` | `/api/wallet/withdraw` | SHOP_OWNER | Tạo yêu cầu rút tiền |
| `GET` | `/api/wallet/withdrawals/my` | SHOP_OWNER | Lịch sử rút tiền |
| `GET` | `/api/wallet/admin/balance` | ADMIN | Tổng phí admin |
| `GET` | `/api/wallet/admin/shop/{shopId}` | ADMIN | Ví của shop |
| `GET` | `/api/wallet/admin/withdrawals` | ADMIN | Tất cả yêu cầu rút |
| `POST` | `/api/wallet/admin/withdrawals/{id}/approve` | ADMIN | Duyệt → PayOS link |
| `POST` | `/api/wallet/admin/withdrawals/confirm-payout` | ADMIN | Xác nhận PayOS PAID |
| `POST` | `/api/wallet/admin/withdrawals/{id}/reject` | ADMIN | Từ chối |

---

## Ghi chú triển khai

### Cấu hình môi trường

```yaml
# application-local.yml
payos:
  client-id: ${PAYOS_CLIENT_ID}
  api-key: ${PAYOS_API_KEY}
  checksum-key: ${PAYOS_CHECKSUM_KEY}
  return-url: ${PAYOS_RETURN_URL}
  cancel-url: ${PAYOS_CANCEL_URL}

wallet:
  admin-fee-rate: 0.10   # 10% phí nền tảng
```

### Điểm cần lưu ý

1. **PendingBooking in-memory** — Nếu server restart giữa bước 1 và bước 2 của PayOS flow, booking sẽ không thể confirm. Cần migrate sang Redis hoặc DB nếu cần high availability.

2. **Idempotency** — `confirmPayment` và `confirmPayout` đều kiểm tra trạng thái trước khi xử lý, an toàn khi gọi nhiều lần.

3. **PayOS amount** — Tối thiểu 2,000đ và phải là bội số của 1,000đ. Backend tự làm tròn lên.

4. **Phí admin** — Được tính tại thời điểm booking COMPLETED, không phải lúc tạo booking. Nếu thay đổi `admin-fee-rate` thì chỉ ảnh hưởng các booking hoàn thành sau đó.
