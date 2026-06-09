# 📋 PET REAL - Luồng Booking & Cơ Chế Chi Tiết

## 📑 Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Luồng Booking Chính](#luồng-booking-chính)
3. [Cơ Chế Kiểm Tra Xung Đột](#cơ-chế-kiểm-tra-xung-đột)
4. [Hỗ Trợ Multi-Service](#hỗ-trợ-multi-service)
5. [Cơ Chế Redis & Lock](#cơ-chế-redis--lock)
6. [API Endpoints](#api-endpoints)
7. [Data Models](#data-models)

---

## 🎯 Tổng Quan

Hệ thống booking PET REAL hỗ trợ:
- ✅ **Thanh toán Online** (100% qua PayOS)
- ✅ **Thanh toán Tiền Mặt** (10% deposit qua PayOS + 90% tại cơ sở)
- ✅ **Multi-Service Booking** (đặt nhiều dịch vụ cùng lúc)
- ✅ **Conflict Detection** (kiểm tra xung đột Pet & Staff)
- ✅ **Dynamic Time Slots** (sinh khung giờ dựa trên tổng duration)
- ✅ **Staff Availability** (chỉ hiển thị slot có staff rảnh)

---

## 🔄 Luồng Booking Chính

### **Scenario 1: Thanh Toán Online (100% PayOS)**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FE: User chọn dịch vụ, pet, ngày giờ                        │
│    - selectedServiceIds: [1, 2, 3]                             │
│    - selectedPet: Pet { id: 5 }                                │
│    - appointmentDatetime: "2026-05-20T14:00:00"                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. FE: Gọi POST /bookings/initiate-payment                     │
│    Payload:                                                     │
│    {                                                            │
│      "shopId": 1,                                               │
│      "serviceId": 1,          // Primary service                │
│      "serviceIds": [1, 2, 3], // Tất cả services               │
│      "petId": 5,                                                │
│      "appointmentDatetime": "2026-05-20T14:00:00",             │
│      "note": "..."                                              │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. BE: initiatePayment()                                        │
│    ✓ Validate inputs (shop, services, pet, staff)              │
│    ✓ Tính tổng duration = sum(service.durationMinutes)         │
│    ✓ Tính tổng price = sum(service.price)                      │
│    ✓ Check Pet conflict: [appointmentDatetime, +totalDuration) │
│    ✓ Check Staff conflict (nếu có staffId)                     │
│    ✓ Lưu PendingBooking vào Redis (TTL 30 phút)                │
│    ✓ Tạo PayOS link                                            │
│    → Return: { checkoutUrl, orderCode }                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. FE: Redirect user → PayOS checkout                          │
│    User thanh toán trên PayOS                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. FE: Gọi POST /bookings/confirm-payment?orderCode=...        │
│    (Sau khi user quay lại từ PayOS)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. BE: confirmPayment()                                         │
│    ✓ Lấy PendingBooking từ Redis                               │
│    ✓ Verify PayOS payment status = PAID                        │
│    ✓ Double-check conflict lần cuối:                           │
│      - Pet conflict: [appointmentDatetime, +totalDuration)     │
│      - Staff conflict (nếu có)                                 │
│    ✓ Tạo Booking record trong DB                              │
│    ✓ Xóa PendingBooking khỏi Redis                             │
│    → Return: BookingResponse { id, status: CONFIRMED, ... }    │
└─────────────────────────────────────────────────────────────────┘
```

### **Scenario 2: Thanh Toán Tiền Mặt (10% Deposit + 90% Cash)**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FE: User chọn dịch vụ, pet, ngày giờ                        │
│    (Giống Scenario 1)                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. FE: Gọi POST /bookings/cash/initiate                        │
│    Payload: (giống initiatePayment)                            │
│    {                                                            │
│      "shopId": 1,                                               │
│      "serviceId": 1,                                            │
│      "serviceIds": [1, 2, 3],                                   │
│      "petId": 5,                                                │
│      "appointmentDatetime": "2026-05-20T14:00:00",             │
│      "note": "..."                                              │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. BE: initiateCashDeposit()                                    │
│    ✓ Validate inputs (giống initiatePayment)                   │
│    ✓ Tính tổng duration & price                                │
│    ✓ Check Pet & Staff conflict                                │
│    ✓ Tính 10% deposit = totalPrice * 0.1                       │
│    ✓ Lưu PendingBooking vào Redis (TTL 30 phút)                │
│    ✓ Tạo PayOS link cho 10% deposit                            │
│    → Return: { checkoutUrl, orderCode }                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. FE: Redirect user → PayOS checkout (10% deposit)            │
│    User thanh toán 10% trên PayOS                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. FE: Gọi POST /bookings/cash/confirm?orderCode=...           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. BE: confirmCashDeposit()                                     │
│    ✓ Lấy PendingBooking từ Redis                               │
│    ✓ Verify PayOS payment status = PAID (10% deposit)          │
│    ✓ Double-check conflict lần cuối                            │
│    ✓ Tạo Booking record trong DB                              │
│    ✓ Xóa PendingBooking khỏi Redis                             │
│    → Return: BookingResponse { status: CONFIRMED, ... }        │
│    → Message: "Vui lòng thanh toán 90% tiền mặt tại cơ sở"    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Cơ Chế Kiểm Tra Xung Đột

### **1. Pet Conflict Detection**

**Mục đích:** Đảm bảo 1 pet không có 2 booking overlap

**Logic:**
```
Booking mới: [appointmentDatetime, appointmentDatetime + totalDuration)
Booking cũ:  [existingStart, existingStart + existingDuration)

Overlap nếu: existingStart < newEnd AND existingStart + existingDuration > newStart
```

**Query (Native SQL):**
```sql
SELECT COUNT(*) FROM booking b
JOIN pet_service s ON b.service_id = s.id
WHERE b.pet_id = :petId
  AND b.status IN ('WAITING_SHOP_APPROVAL', 'CONFIRMED', 'IN_PROGRESS')
  AND b.appointment_datetime < :windowEnd
  AND DATE_ADD(b.appointment_datetime, INTERVAL s.duration_minutes MINUTE) > :windowStart
```

**Ví dụ:**
```
Pet đã có booking: 15:00 - 16:00 (60 phút)
Booking mới muốn: 14:00 - 16:30 (150 phút)

Check: 15:00 < 16:30 ✓ AND 16:00 > 14:00 ✓ → OVERLAP ❌
```

### **2. Staff Conflict Detection**

**Mục đích:** Đảm bảo 1 staff không có 2 booking overlap

**Logic:** Giống Pet conflict, nhưng check theo `staff_id`

**Query (Native SQL):**
```sql
SELECT COUNT(*) FROM booking b
JOIN pet_service s ON b.service_id = s.id
WHERE b.staff_id = :staffId
  AND b.status IN ('WAITING_SHOP_APPROVAL', 'CONFIRMED', 'IN_PROGRESS')
  AND b.appointment_datetime < :windowEnd
  AND DATE_ADD(b.appointment_datetime, INTERVAL s.duration_minutes MINUTE) > :windowStart
```

**Ví dụ:**
```
Staff đã có booking: 15:00 - 16:00 (60 phút)
Booking mới muốn: 14:00 - 16:30 (150 phút)

Check: 15:00 < 16:30 ✓ AND 16:00 > 14:00 ✓ → OVERLAP ❌
```

### **3. Khi Nào Check Conflict?**

| Thời điểm | Pet Check | Staff Check | Ghi chú |
|-----------|-----------|------------|---------|
| `initiatePayment()` | ✓ | ✓ (nếu có staffId) | Lần 1: Validate |
| `confirmPayment()` | ✓ | ✓ (nếu có staffId) | Lần 2: Double-check trước lưu DB |
| `initiateCashDeposit()` | ✓ | ✓ (nếu có staffId) | Lần 1: Validate |
| `confirmCashDeposit()` | ✓ | ✓ (nếu có staffId) | Lần 2: Double-check trước lưu DB |

---

## 🎁 Hỗ Trợ Multi-Service

### **Khái Niệm**

User có thể chọn **nhiều dịch vụ** cùng lúc cho 1 booking:
- Dịch vụ 1: Tắm (60 phút)
- Dịch vụ 2: Cắt tỉa (90 phút)
- Dịch vụ 3: Chăm sóc móng (30 phút)
- **Tổng duration: 180 phút**

### **Data Model**

**PendingBooking (Redis):**
```java
public static class PendingBooking implements Serializable {
    int userId;
    int shopId;
    int serviceId;              // Primary service (dùng cho backward compatibility)
    List<Integer> serviceIds;   // Tất cả services (NEW)
    int petId;
    Integer staffId;
    LocalDateTime appointmentDatetime;
    String note;
    int amountVnd;
    String description;
}
```

**BookingCreationRequest (FE → BE):**
```java
public class BookingCreationRequest {
    int shopId;
    int serviceId;              // Primary service
    List<Integer> serviceIds;   // Tất cả services (NEW)
    int petId;
    Integer staffId;
    LocalDateTime appointmentDatetime;
    String note;
}
```

**InitiatePaymentRequest (FE → BE):**
```java
public class InitiatePaymentRequest {
    int shopId;
    int serviceId;              // Primary service
    List<Integer> serviceIds;   // Tất cả services (NEW)
    int petId;
    Integer staffId;
    LocalDateTime appointmentDatetime;
    String note;
}
```

### **Helper Methods**

**1. resolveServiceIds()**
```java
private List<Integer> resolveServiceIds(Integer serviceId, List<Integer> serviceIds) {
    if (serviceIds != null && !serviceIds.isEmpty()) {
        return serviceIds;  // Dùng danh sách đầy đủ
    }
    if (serviceId != null && serviceId > 0) {
        return List.of(serviceId);  // Fallback: dùng single service
    }
    return Collections.emptyList();
}
```

**2. resolveTotalDuration()**
```java
private int resolveTotalDuration(List<Integer> serviceIds) {
    return serviceIds.stream()
            .mapToInt(id -> serviceRepository.findById(id)
                    .map(Service::getDurationMinutes)
                    .orElse(0))
            .sum();
}
```

**3. resolveTotalPrice()**
```java
private BigDecimal resolveTotalPrice(List<Integer> serviceIds) {
    return serviceIds.stream()
            .map(id -> serviceRepository.findById(id)
                    .map(Service::getPrice)
                    .orElse(BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
}
```

### **Flow Chi Tiết**

```
FE: User chọn services [1, 2, 3]
    ↓
FE: Gọi getAvailableTimeSlotsForServices(shopId, date, [1, 2, 3])
    ↓
BE: Tính totalDuration = 60 + 90 + 30 = 180 phút
    ↓
BE: Sinh slots theo bước 60 phút:
    08:00 → check [08:00, 11:00) có staff rảnh? → YES ✓
    09:00 → check [09:00, 12:00) có staff rảnh? → NO ❌
    10:00 → check [10:00, 13:00) có staff rảnh? → YES ✓
    ...
    ↓
FE: Hiển thị slots available: [08:00, 10:00, 11:00, ...]
    ↓
User chọn slot 10:00
    ↓
FE: Gọi initiatePayment({
      serviceIds: [1, 2, 3],
      appointmentDatetime: "2026-05-20T10:00:00"
    })
    ↓
BE: Tính totalDuration = 180 phút
    ↓
BE: Check conflict [10:00, 13:00)
    ↓
BE: Lưu PendingBooking { serviceIds: [1, 2, 3], ... }
```



---

## 🔐 Cơ Chế Redis & Lock

### **1. PendingBooking Storage**

**Mục đích:** Lưu trữ tạm thời booking chưa confirm, tránh mất dữ liệu nếu user không hoàn thành thanh toán

**Key Format:**
```
pending_booking:{orderCode}
cash_pending:{orderCode}
```

**TTL:** 30 phút (PENDING_TTL_MINUTES = 30)

**Khi nào lưu:**
- `initiatePayment()` → lưu vào `pending_booking:{orderCode}`
- `initiateCashDeposit()` → lưu vào `cash_pending:{orderCode}`

**Khi nào xóa:**
- `confirmPayment()` → xóa `pending_booking:{orderCode}`
- `confirmCashDeposit()` → xóa `cash_pending:{orderCode}`
- Hết TTL 30 phút → Redis tự động xóa

**Dữ liệu lưu:**
```java
PendingBooking {
    userId: 10,
    shopId: 1,
    serviceId: 1,
    serviceIds: [1, 2, 3],
    petId: 5,
    staffId: 2,
    appointmentDatetime: "2026-05-20T10:00:00",
    note: "...",
    amountVnd: 500000,
    description: "..."
}
```

### **2. Staff Slot Lock (Optional)**

**Mục đích:** Ngăn chặn race condition khi nhiều user cùng chọn 1 slot

**Key Format:**
```
staff_slot:{staffId}:{yyyy-MM-ddTHH:mm}
```

**TTL:** 30 phút (cùng với PendingBooking)

**Khi nào lock:**
- Khi user chọn slot → lock staff slot (nếu cần)

**Khi nào unlock:**
- Khi user confirm payment → unlock
- Khi user cancel → unlock
- Hết TTL 30 phút → Redis tự động unlock

**Ví dụ:**
```
User A chọn slot 10:00 với Staff 2
→ Lock: staff_slot:2:2026-05-20T10:00 (TTL 30 phút)

User B cũng muốn chọn slot 10:00 với Staff 2
→ Check: staff_slot:2:2026-05-20T10:00 đã lock?
→ YES → Slot không available ❌

User A confirm payment
→ Unlock: staff_slot:2:2026-05-20T10:00
→ Booking được lưu vào DB

User B thử lại
→ Check: staff_slot:2:2026-05-20T10:00 đã lock?
→ NO → Slot available ✓
```

---

## 📡 API Endpoints

### **1. Thanh Toán Online**

#### `POST /bookings/initiate-payment`
**Mục đích:** Bước 1 - Validate & tạo PayOS link

**Request:**
```json
{
  "shopId": 1,
  "serviceId": 1,
  "serviceIds": [1, 2, 3],
  "petId": 5,
  "staffId": 2,
  "appointmentDatetime": "2026-05-20T10:00:00",
  "note": "Cắt tỉa + tắm"
}
```

**Response:**
```json
{
  "code": 1000,
  "message": "Redirect user to checkoutUrl to complete payment.",
  "result": {
    "orderCode": 123456789,
    "checkoutUrl": "https://payos.vn/checkout/...",
    "amount": 500000
  }
}
```

**Xử lý:**
- ✓ Validate shop, services, pet, staff
- ✓ Tính tổng duration & price
- ✓ Check Pet conflict
- ✓ Check Staff conflict
- ✓ Lưu PendingBooking vào Redis
- ✓ Tạo PayOS link

---

#### `POST /bookings/confirm-payment`
**Mục đích:** Bước 2 - Verify payment & tạo booking

**Request:**
```
POST /bookings/confirm-payment?orderCode=123456789
```

**Response:**
```json
{
  "code": 1000,
  "message": "Booking confirmed",
  "result": {
    "id": 100,
    "status": "CONFIRMED",
    "shopId": 1,
    "petId": 5,
    "appointmentDatetime": "2026-05-20T10:00:00",
    "totalPrice": 500000,
    "paymentMethod": "PAYOS"
  }
}
```

**Xử lý:**
- ✓ Lấy PendingBooking từ Redis
- ✓ Verify PayOS payment = PAID
- ✓ Double-check Pet & Staff conflict
- ✓ Tạo Booking record
- ✓ Xóa PendingBooking khỏi Redis

---

### **2. Thanh Toán Tiền Mặt**

#### `POST /bookings/cash/initiate`
**Mục đích:** Bước 1 - Validate & tạo PayOS link cho 10% deposit

**Request:** (giống initiatePayment)
```json
{
  "shopId": 1,
  "serviceId": 1,
  "serviceIds": [1, 2, 3],
  "petId": 5,
  "appointmentDatetime": "2026-05-20T10:00:00",
  "note": "..."
}
```

**Response:**
```json
{
  "code": 1000,
  "message": "Please pay the 10% deposit via the checkoutUrl. Remaining 90% is paid in cash at the venue.",
  "result": {
    "orderCode": 123456789,
    "checkoutUrl": "https://payos.vn/checkout/...",
    "amount": 50000  // 10% của 500000
  }
}
```

**Xử lý:**
- ✓ Validate inputs
- ✓ Tính 10% deposit = totalPrice * 0.1
- ✓ Check Pet & Staff conflict
- ✓ Lưu PendingBooking vào Redis (cash_pending)
- ✓ Tạo PayOS link cho 10% deposit

---

#### `POST /bookings/cash/confirm`
**Mục đích:** Bước 2 - Verify 10% deposit & tạo booking

**Request:**
```
POST /bookings/cash/confirm?orderCode=123456789
```

**Response:**
```json
{
  "code": 1000,
  "message": "Booking confirmed. Please pay the remaining 90% in cash at the venue.",
  "result": {
    "id": 100,
    "status": "CONFIRMED",
    "totalPrice": 500000,
    "depositPaid": 50000,
    "remainingCash": 450000,
    "paymentMethod": "CASH"
  }
}
```

**Xử lý:**
- ✓ Lấy PendingBooking từ Redis
- ✓ Verify PayOS payment = PAID (10% deposit)
- ✓ Double-check Pet & Staff conflict
- ✓ Tạo Booking record
- ✓ Xóa PendingBooking khỏi Redis

---

### **3. Lấy Khung Giờ Có Sẵn**

#### `GET /bookings/shop/{shopId}/available-slots-by-services`
**Mục đích:** Lấy danh sách khung giờ còn staff rảnh

**Request:**
```
GET /bookings/shop/1/available-slots-by-services?date=2026-05-20&serviceIds=1,2,3
```

**Response:**
```json
{
  "code": 1000,
  "message": "Success",
  "result": [
    "2026-05-20T08:00:00",
    "2026-05-20T10:00:00",
    "2026-05-20T11:00:00",
    "2026-05-20T13:00:00",
    "2026-05-20T14:00:00"
  ]
}
```

**Xử lý:**
- ✓ Tính totalDuration = sum(service.durationMinutes)
- ✓ Sinh slots theo bước 60 phút
- ✓ Cho mỗi slot, check: có staff nào rảnh cho [slotStart, slotStart + totalDuration)?
- ✓ Chỉ return slots có staff rảnh

**Ví dụ Chi Tiết:**
```
Services: [1, 2, 3] → totalDuration = 180 phút
Shop hours: 08:00 - 20:00
Active staff: [Staff 1, Staff 2, Staff 3]

Slot 08:00 → [08:00, 11:00)
  Staff 1: Có booking [09:00, 10:00)? NO → Available ✓
  → Slot 08:00 available

Slot 09:00 → [09:00, 12:00)
  Staff 1: Có booking [09:00, 10:00)? YES → Busy ❌
  Staff 2: Có booking [09:00, 12:00)? NO → Available ✓
  → Slot 09:00 available

Slot 10:00 → [10:00, 13:00)
  Staff 1: Có booking [10:00, 13:00)? NO → Available ✓
  → Slot 10:00 available

...

Result: [08:00, 09:00, 10:00, 11:00, 13:00, 14:00, ...]
```

---

#### `GET /bookings/shop/{shopId}/available-slots`
**Mục đích:** Lấy khung giờ có sẵn (single service - deprecated)

**Request:**
```
GET /bookings/shop/1/available-slots?date=2026-05-20&durationMinutes=60
```

**Response:** (giống available-slots-by-services)

---

### **4. Kiểm Tra Availability**

#### `GET /bookings/pet/{petId}/availability`
**Mục đích:** Check xem pet có available tại thời điểm nào không

**Request:**
```
GET /bookings/5/availability?appointmentDatetime=2026-05-20T10:00:00&durationMinutes=180
```

**Response:**
```json
{
  "code": 1000,
  "message": "Success",
  "result": true  // Pet available
}
```

---

#### `GET /bookings/staff/{shopId}/availability`
**Mục đích:** Lấy danh sách staff với availability status

**Request:**
```
GET /bookings/staff/1/availability?appointmentDatetime=2026-05-20T10:00:00&durationMinutes=180
```

**Response:**
```json
{
  "code": 1000,
  "message": "Success",
  "result": [
    {
      "id": 1,
      "name": "Nhân viên A",
      "available": true
    },
    {
      "id": 2,
      "name": "Nhân viên B",
      "available": false
    }
  ]
}
```

---

## 📊 Data Models

### **Booking Entity**
```java
@Entity
@Table(name = "booking")
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int id;
    
    @ManyToOne
    User user;
    
    @ManyToOne
    Shop shop;
    
    @ManyToOne
    Pet pet;
    
    @ManyToOne
    Service service;  // Primary service
    
    @ManyToOne
    Staff staff;
    
    LocalDateTime appointmentDatetime;
    
    @Enumerated(EnumType.STRING)
    BookingStatus status;  // WAITING_SHOP_APPROVAL, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
    
    String note;
    BigDecimal totalPrice;
    
    @Enumerated(EnumType.STRING)
    PaymentMethod paymentMethod;  // PAYOS, CASH
    
    Long payosOrderCode;
    
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

### **Service Entity**
```java
@Entity
@Table(name = "pet_service")
public class Service {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int id;
    
    @ManyToOne
    Shop shop;
    
    String name;
    String description;
    
    int durationMinutes;  // Thời gian dịch vụ (phút)
    BigDecimal price;
    
    @Enumerated(EnumType.STRING)
    ServiceCategory category;  // GROOMING, BOARDING, MEDICAL, etc.
    
    boolean active;
    
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

### **Staff Entity**
```java
@Entity
@Table(name = "staff")
public class Staff {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int id;
    
    @ManyToOne
    Shop shop;
    
    String name;
    String email;
    String phone;
    
    boolean isActive;
    
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

### **Shop Entity**
```java
@Entity
@Table(name = "shop")
public class Shop {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    int id;
    
    String name;
    String address;
    String phone;
    
    String openTime;   // "08:00"
    String closeTime;  // "20:00"
    
    boolean active;
    
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
```

---

## 🎨 FE Flow (ClinicDetail.tsx)

### **State Management**

```typescript
// Booking state
const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
const [selectedTime, setSelectedTime] = useState<string | null>(null);
const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

// Derived values
const totalServiceDuration = useMemo(() => {
  return selectedServiceIds.reduce((sum, id) => {
    const svc = apiServices.find(s => s.id === id);
    return sum + (svc?.durationMinutes ?? 0);
  }, 0) || 60;
}, [selectedServiceIds, apiServices]);

// Available slots from API
const [availableSlots, setAvailableSlots] = useState<string[]>([]);
```

### **Fetch Available Slots**

```typescript
useEffect(() => {
  if (!shopId || !selectedDate || !hasNormalServices) {
    setAvailableSlots([]);
    return;
  }
  
  setSlotsLoading(true);
  bookingService
    .getAvailableTimeSlotsForServices(shopId, selectedDate, selectedServiceIds)
    .then((slots) => {
      // BE trả về ISO datetime, extract "HH:mm"
      const times = slots.map(s => s.substring(11, 16));
      setAvailableSlots(times);
      // Reset selected time nếu không còn available
      setSelectedTime(prev => prev && !times.includes(prev) ? null : prev);
    })
    .catch(() => setAvailableSlots([]))
    .finally(() => setSlotsLoading(false));
}, [shopId, selectedDate, selectedServiceIds, hasNormalServices]);
```

### **Generate All Time Slots**

```typescript
const allTimeSlots = useMemo(() => {
  if (!hasNormalServices) return [];
  
  const openStr = shop?.openTime ?? '08:00';
  const closeStr = shop?.closeTime ?? '20:00';
  
  const parseTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  
  const openMin = parseTime(openStr);
  const closeMin = parseTime(closeStr);
  const STEP = 60; // Bước cố định 60 phút
  
  const slots: string[] = [];
  // Sinh đến khi slot + totalDuration vẫn còn trong giờ đóng cửa
  for (let m = openMin; m + totalServiceDuration <= closeMin; m += STEP) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  
  return slots;
}, [shop?.openTime, shop?.closeTime, totalServiceDuration, hasNormalServices]);
```

### **Render Time Slots**

```typescript
{allTimeSlots.map((slot) => {
  const isAvailable = availableSlots.includes(slot);
  const isSelected = selectedTime === slot;
  
  return (
    <button
      key={slot}
      onClick={() => isAvailable && setSelectedTime(slot)}
      disabled={!isAvailable}
      className={`
        px-4 py-2 rounded
        ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200'}
        ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {slot}
    </button>
  );
})}
```

### **Handle Confirm Pet**

```typescript
const handleConfirmPet = () => {
  if (!selectedPet) {
    toast.error('Vui lòng chọn thú cưng');
    return;
  }
  
  const primaryServiceId = selectedServiceIds[0];
  if (!primaryServiceId) {
    toast.error('Vui lòng chọn dịch vụ');
    return;
  }
  
  if (!selectedDate || !selectedTime) {
    toast.error('Vui lòng chọn ngày và giờ');
    return;
  }
  
  const appointmentDatetime = `${selectedDate}T${selectedTime}:00`;
  
  navigate('/payment', {
    state: {
      booking: {
        shopId: shopId,
        serviceId: primaryServiceId,
        serviceIds: selectedServiceIds,  // Gửi tất cả services
        petId: selectedPet.id,
        appointmentDatetime,
        note: bookingNote,
        totalPrice,
        totalServiceDuration,
      },
    },
  });
};
```

---

## 🔧 Error Handling

### **Common Error Codes**

| Code | Message | Nguyên nhân |
|------|---------|-----------|
| 5001 | SHOP_NOT_FOUND | Shop không tồn tại |
| 5002 | SERVICE_NOT_FOUND | Dịch vụ không tồn tại |
| 5003 | PET_NOT_FOUND | Pet không tồn tại |
| 5004 | STAFF_NOT_FOUND | Staff không tồn tại |
| 5005 | PET_BOOKING_CONFLICT | Pet đã có booking overlap |
| 5006 | STAFF_BOOKING_CONFLICT | Staff đã có booking overlap |
| 5007 | INVALID_APPOINTMENT_TIME | Thời gian không hợp lệ |
| 5008 | PAYMENT_FAILED | Thanh toán thất bại |
| 5009 | PENDING_BOOKING_NOT_FOUND | Không tìm thấy pending booking |
| 5010 | PENDING_BOOKING_EXPIRED | Pending booking đã hết hạn |
| 5015 | NO_STAFF_AVAILABLE | Không có staff nào rảnh |

---

## 📝 Tóm Tắt Các Cơ Chế Mới

| Cơ Chế | Mục đích | Khi nào dùng |
|-------|---------|------------|
| **Multi-Service** | Cho phép chọn nhiều dịch vụ | Booking grooming + tắm + cắt tỉa |
| **Dynamic Duration** | Tính tổng duration từ tất cả services | Sinh khung giờ, check conflict |
| **Pet Conflict Check** | Đảm bảo pet không overlap | initiatePayment, confirmPayment |
| **Staff Conflict Check** | Đảm bảo staff không overlap | initiatePayment, confirmPayment |
| **Redis PendingBooking** | Lưu trữ tạm thời booking | Giữ dữ liệu trong 30 phút |
| **Double-Check** | Verify conflict lần cuối trước lưu DB | confirmPayment, confirmCashDeposit |
| **Dynamic Time Slots** | Sinh slots dựa trên totalDuration | getAvailableTimeSlotsForServices |
| **Staff Availability** | Chỉ hiển thị slot có staff rảnh | Lọc slots trước khi return |

---

## 🚀 Ví Dụ Thực Tế

### **Scenario: Pet đặt 2 dịch vụ, 2 tiếng, lúc 14:00**

```
Pet: Mèo Miu (id: 5)
Services: Tắm (60 phút) + Cắt tỉa (90 phút) = 180 phút
Appointment: 2026-05-20 14:00 - 17:00
Staff: Nhân viên A (id: 2)

Step 1: FE gọi getAvailableTimeSlotsForServices(1, "2026-05-20", [1, 2])
  BE: totalDuration = 60 + 90 = 150 phút
  BE: Sinh slots: 08:00, 09:00, 10:00, ..., 18:00
  BE: Cho mỗi slot, check staff availability:
    - 14:00 → [14:00, 16:30) → Staff A có booking [15:00, 16:00)? YES → OVERLAP ❌
    - 15:00 → [15:00, 17:30) → Staff A có booking [15:00, 16:00)? YES → OVERLAP ❌
    - 16:00 → [16:00, 18:30) → Staff A có booking [15:00, 16:00)? NO → AVAILABLE ✓
  BE: Return: [08:00, 09:00, 10:00, ..., 16:00, 17:00, 18:00]

Step 2: FE hiển thị slots, user chọn 16:00
  FE: Gọi initiatePayment({
    serviceIds: [1, 2],
    appointmentDatetime: "2026-05-20T16:00:00"
  })

Step 3: BE initiatePayment()
  ✓ Validate services [1, 2]
  ✓ Tính totalDuration = 150 phút
  ✓ Tính totalPrice = 500000 VND
  ✓ Check Pet conflict: [16:00, 18:30) → NO CONFLICT ✓
  ✓ Check Staff conflict: [16:00, 18:30) → NO CONFLICT ✓
  ✓ Lưu PendingBooking vào Redis
  ✓ Tạo PayOS link
  → Return: { checkoutUrl, orderCode: 123456789 }

Step 4: FE redirect user → PayOS checkout
  User thanh toán 500000 VND

Step 5: FE gọi confirmPayment(orderCode=123456789)

Step 6: BE confirmPayment()
  ✓ Lấy PendingBooking từ Redis
  ✓ Verify PayOS payment = PAID ✓
  ✓ Double-check Pet conflict: [16:00, 18:30) → NO CONFLICT ✓
  ✓ Double-check Staff conflict: [16:00, 18:30) → NO CONFLICT ✓
  ✓ Tạo Booking record:
    - id: 100
    - pet_id: 5
    - service_id: 1 (primary)
    - staff_id: 2
    - appointment_datetime: 2026-05-20 16:00:00
    - total_price: 500000
    - status: CONFIRMED
  ✓ Xóa PendingBooking khỏi Redis
  → Return: BookingResponse { id: 100, status: CONFIRMED, ... }

✅ Booking thành công!
```

---

**Tài liệu này được cập nhật lần cuối: 2026-05-19**
