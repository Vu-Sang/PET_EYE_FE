# PetEye — Nền tảng Chăm sóc Thú cưng Toàn diện

> **Dự án nhóm** | Vai trò: Full-stack Developer  
> **Thời gian**: 2025 – 2026 | **Loại**: Web Application (SPA + REST API)

---

## Tổng quan dự án

**PetEye** là nền tảng kết nối chủ thú cưng với các cơ sở chăm sóc thú y, spa, grooming và khách sạn thú cưng. Hệ thống hỗ trợ đặt lịch trực tuyến, thanh toán qua cổng PayOS, theo dõi thú cưng qua camera live, nhắn tin thời gian thực và trợ lý AI tích hợp Gemini.

Hệ thống phục vụ **4 nhóm người dùng** với giao diện và quyền hạn riêng biệt:
- **Khách hàng (User)** — tìm kiếm, đặt lịch, quản lý thú cưng, nhắn tin với shop
- **Chủ cửa hàng (Shop Owner)** — quản lý dịch vụ, nhân viên, lịch hẹn, doanh thu
- **Nhân viên (Staff)** — nhận và xử lý công việc, ghi nhật ký chăm sóc
- **Quản trị viên (Admin)** — duyệt shop, quản lý người dùng, xử lý rút tiền

---

## Công nghệ sử dụng

### Backend

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| **Java** | 21 | Ngôn ngữ lập trình chính |
| **Spring Boot** | 3.5.6 | Framework chính, auto-configuration |
| **Spring Security** | 6.x | Xác thực, phân quyền, CORS |
| **Spring Data JPA** | 3.x | ORM, tương tác database |
| **Spring WebSocket** | 3.x | Real-time messaging (STOMP) |
| **MySQL** | 8.x | Cơ sở dữ liệu chính |
| **Redis** | 7.x | Cache, session, slot locking |
| **HikariCP** | — | Connection pooling (20 max) |
| **Nimbus JOSE JWT** | 9.37.3 | Tạo và xác thực JWT |
| **MapStruct** | 1.5.5 | Mapping DTO ↔ Entity |
| **Lombok** | 1.18.30 | Giảm boilerplate code |
| **Cloudinary** | 2.0.0 | Lưu trữ và CDN ảnh |
| **PayOS** | — | Cổng thanh toán QR/chuyển khoản |
| **Gemini API** | — | AI chatbot, trợ lý thông minh |
| **Gmail SMTP** | — | Gửi email OTP, thông báo |
| **Swagger/OpenAPI** | 2.8.5 | Tài liệu API tự động |
| **Maven** | 3.x | Build tool |

### Frontend

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| **React** | 19.0.0 | UI framework |
| **TypeScript** | 5.8.2 | Type safety |
| **Vite** | 6.2.0 | Build tool, dev server |
| **Tailwind CSS** | 4.1.14 | Utility-first styling |
| **React Router** | 7.13.1 | Client-side routing, nested layouts |
| **TanStack React Query** | 5.95.2 | Server state, caching, refetch |
| **Axios** | 1.13.6 | HTTP client với interceptors |
| **SockJS Client** | 1.6.1 | WebSocket fallback |
| **@stomp/stompjs** | 7.3.0 | STOMP protocol client |
| **Recharts** | 3.8.0 | Biểu đồ doanh thu, thống kê |
| **Motion** | 12.23.24 | Animation |
| **React Hot Toast** | 2.6.0 | Thông báo toast |
| **Lucide React** | 0.546.0 | Icon library |
| **@google/genai** | 1.29.0 | Tích hợp Gemini AI phía client |
| **@react-oauth/google** | 0.13.5 | Google OAuth2 |
| **date-fns** | 4.1.0 | Xử lý ngày giờ |

---

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                  │
│  Customer UI │ Shop Owner UI │ Staff UI │ Admin UI       │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API + WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                  BACKEND (Spring Boot)                   │
│  Controllers → Services → Repositories → Entities       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  MySQL   │  │  Redis   │  │Cloudinary│              │
│  │ (main DB)│  │ (cache)  │  │ (images) │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  PayOS   │  │  Gemini  │  │  Gmail   │              │
│  │(payment) │  │  (AI)    │  │  (email) │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

**Backend** theo mô hình **Layered Architecture**:
- `Controller` → nhận request, validate, trả response
- `Service` → business logic, transaction management
- `Repository` → Spring Data JPA, custom JPQL queries
- `Entity` → JPA entities với quan hệ đầy đủ
- `DTO` → Request/Response objects tách biệt với entity

**Frontend** theo mô hình **Component-Based + Service Layer**:
- `pages/` → route-level components (Customer, Shop, Staff, Admin)
- `components/` → reusable UI components
- `services/` → API call layer (booking, auth, pet, staff...)
- `contexts/` → global state (AuthContext)
- `hooks/` → custom hooks (useAIChat, useShopChat, useNotifications...)
- `types/` → TypeScript interfaces cho toàn bộ API

---

## Tính năng chính

### 1. Xác thực & Phân quyền
- Đăng ký / đăng nhập bằng email + mật khẩu
- **OAuth2 Social Login**: Google, Facebook, Zalo
- **JWT** với access token + refresh token, tự động làm mới
- Xác thực email qua OTP (Gmail SMTP)
- Quên mật khẩu / đặt lại mật khẩu qua email
- **Role-based access control**: USER, SHOP_OWNER, STAFF, ADMIN
- Phân quyền cấp method với `@PreAuthorize`
- Token blacklist khi logout (lưu vào DB)

### 2. Đặt lịch & Thanh toán
- Tìm kiếm cơ sở theo tên, thành phố, loại dịch vụ
- Chọn dịch vụ, ngày giờ, nhân viên phụ trách
- **Kiểm tra lịch trống nhân viên** theo thời gian thực (DB + Redis)
- **Gợi ý nhân viên thay thế** khi nhân viên đã bận
- **Thanh toán PayOS** (QR chuyển khoản ngân hàng):
  - Bước 1: Tạo link thanh toán, lưu pending vào Redis (TTL 30 phút)
  - Bước 2: Xác nhận thanh toán qua webhook → tạo booking vào DB
- **Thanh toán tiền mặt**: tạo booking ngay, thu tiền tại quầy
- **Atomic slot locking** bằng Redis `SET NX` để tránh double-booking
- Hủy lịch hẹn (User và Shop Owner)

### 3. Quản lý Thú cưng
- Thêm / sửa / xóa thú cưng (tên, loài, giống, cân nặng, ngày sinh)
- Upload ảnh thú cưng lên Cloudinary
- Hồ sơ sức khỏe: hồ sơ bệnh án, lịch tiêm phòng, nhắc nhở chăm sóc
- Lịch sử đặt lịch theo từng thú cưng

### 4. Quản lý Cửa hàng (Shop Owner)
- Dashboard: doanh thu, số lịch hẹn, khách hàng mới, biểu đồ theo ngày
- Quản lý dịch vụ: tạo/sửa/xóa, upload ảnh, cấu hình camera tier (BOARDING)
- Quản lý nhân viên: tạo tài khoản, phân công, toggle trạng thái
- Quản lý chứng chỉ nhân viên: upload, duyệt/từ chối
- Xem danh sách khách hàng, lịch sử đặt lịch, tổng chi tiêu
- Trả lời đánh giá từ khách hàng
- **Ví điện tử**: xem số dư, tạo yêu cầu rút tiền qua PayOS

### 5. Quản lý Công việc (Staff)
- Xem danh sách công việc được phân công
- Nhận công việc chưa có người phụ trách (claim)
- Cập nhật trạng thái công việc (IN_PROGRESS → COMPLETED)
- Ghi nhật ký chăm sóc (care log) cho từng booking

### 6. Nhắn tin Thời gian thực
- **WebSocket STOMP** với SockJS fallback
- Nhắn tin giữa khách hàng và cửa hàng
- Nhắn tin nội bộ giữa nhân viên và chủ shop
- Kênh hỗ trợ Admin
- Lưu lịch sử tin nhắn vào DB
- Trạng thái đã đọc / chưa đọc

### 7. Trợ lý AI (Gemini)
- **3 AI agent** riêng biệt theo vai trò:
  - **User Chatbot**: tư vấn dịch vụ, hỗ trợ đặt lịch
  - **Shop Assistant**: phân tích kinh doanh, gợi ý cải thiện
  - **Admin Assistant**: hỗ trợ quản trị hệ thống
- **Multi-key rotation**: xoay vòng 3 Gemini API key để tránh rate limit
- Lưu lịch sử hội thoại (10 lượt, 8000 token)
- Giới hạn input 2000 ký tự để kiểm soát chi phí

### 8. Camera & Boarding
- Dịch vụ lưu trú thú cưng với camera giám sát 24/7
- **Camera tier**: BASIC (720p), HD (1080p), PANORAMIC (360°), AI (nhận diện hành vi)
- Giá tùy chỉnh theo tier, nhãn hiển thị tùy chỉnh
- Xem camera live từ giao diện khách hàng và shop
- Quản lý chuồng (cage): VIP / Normal

### 9. Hệ thống Thông báo
- Thông báo broadcast từ Admin đến tất cả người dùng
- Thông báo cá nhân (nhắc lịch hẹn, hoàn thành dịch vụ)
- Đánh dấu đã đọc / đọc tất cả
- Phân trang lịch sử thông báo

### 10. Quản trị Admin
- Dashboard tổng quan: doanh thu hệ thống, số shop, người dùng, booking
- Duyệt / từ chối đăng ký cửa hàng mới
- Quản lý người dùng: kích hoạt / vô hiệu hóa tài khoản
- Xử lý yêu cầu rút tiền của shop (duyệt, từ chối, tạo lại link PayOS)
- Gửi thông báo broadcast

---

## Điểm kỹ thuật nổi bật

### Atomic Slot Locking với Redis
Khi người dùng bắt đầu thanh toán, hệ thống dùng Redis `SET NX` (atomic) để giữ slot của nhân viên trong 30 phút. Điều này ngăn chặn race condition khi nhiều người cùng đặt cùng một nhân viên vào cùng một khung giờ — không cần distributed lock phức tạp.

```
staff_slot:{staffId}:{appointmentTime} → orderCode (TTL: 30 phút)
```

### Two-Phase Booking (PayOS)
Booking không được lưu vào DB ngay khi người dùng nhấn "Thanh toán". Thay vào đó:
1. **Phase 1**: Validate → tạo PayOS link → lưu `PendingBooking` vào Redis
2. **Phase 2**: Sau khi PayOS callback → verify → tạo Booking trong DB

Điều này đảm bảo chỉ những booking đã thanh toán thành công mới được lưu, tránh dữ liệu rác.

### JWT với Token Blacklist
Khi logout, JWT được lưu vào bảng `InvalidatedToken` trong DB. `CustomJwtDecoder` kiểm tra blacklist trước khi xác thực mỗi request, đảm bảo token đã logout không thể tái sử dụng dù chưa hết hạn.

### Multi-Key AI Rotation
Gemini API có rate limit theo key. Hệ thống cấu hình 3 API key và xoay vòng tự động khi một key bị giới hạn, đảm bảo tính sẵn sàng của tính năng AI.

### Role-Based Layout Routing
Frontend dùng React Router nested routes với 4 layout riêng biệt (`ShopLayout`, `StaffLayout`, `AdminLayout`, `ProfileLayout`), mỗi layout có navbar và sidebar riêng. Route guard tự động redirect dựa trên role từ JWT.

---

## Cấu trúc API

- **RESTful** với đầy đủ HTTP methods (GET, POST, PUT, PATCH, DELETE)
- **Generic response wrapper**: `ApiResponse<T>` với `code`, `message`, `result`
- **Phân trang**: `PageResponse<T>` với `page`, `size`, `totalElements`, `totalPages`
- **Xác thực**: JWT Bearer token trong `Authorization` header
- **Tài liệu**: Swagger UI tự động tại `/swagger-ui.html`
- **CORS**: Cấu hình cho phép cross-origin với credentials

---

## Số liệu dự án

| Chỉ số | Số lượng |
|---|---|
| API Endpoints | 70+ |
| Database Entities | 30+ |
| Frontend Pages | 40+ |
| React Components | 50+ |
| Service Classes (BE) | 15+ |
| User Roles | 4 |

---

## Môi trường & Triển khai

- **Backend**: Spring Boot chạy trên port 8080, context path `/api`
- **Frontend**: Vite dev server port 3000, build tĩnh cho production
- **Database**: MySQL 8 với timezone `Asia/Ho_Chi_Minh`
- **Cache**: Redis với password authentication
- **File Storage**: Cloudinary CDN
- **Frontend Deployment**: Vercel
- **Environment Variables**: `.env` file cho secrets (JWT key, API keys, DB credentials)

---

## Mô tả ngắn cho CV

> **PetEye** — Nền tảng chăm sóc thú cưng full-stack (Spring Boot 3.5 + React 19 + TypeScript).  
> Xây dựng hệ thống đặt lịch với thanh toán PayOS (two-phase booking), atomic slot locking bằng Redis SET NX để tránh double-booking, real-time chat qua WebSocket STOMP, tích hợp AI Gemini với multi-key rotation, OAuth2 (Google/Facebook/Zalo), JWT với token blacklist, upload ảnh Cloudinary, camera live cho dịch vụ boarding, và hệ thống ví điện tử cho shop. Phục vụ 4 role: User, Shop Owner, Staff, Admin với giao diện và quyền hạn riêng biệt.

---

*Tài liệu này được tạo để mô tả dự án PetEye phục vụ mục đích xin việc.*
