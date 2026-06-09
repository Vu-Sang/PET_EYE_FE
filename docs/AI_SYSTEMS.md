# PetEye AI Systems — Tài liệu kỹ thuật (v2 — AI Gateway)

> Kiến trúc đã được refactor sang **Spring Boot AI Gateway**.
> Frontend không còn gọi Gemini trực tiếp. Mọi AI request đi qua `/api/ai/chat`.

---

## Mục lục

1. [Kiến trúc tổng quan](#1-kiến-trúc-tổng-quan)
2. [User AI — Chatbot khách hàng](#2-user-ai--chatbot-khách-hàng)
3. [Shop AI — Trợ lý kinh doanh](#3-shop-ai--trợ-lý-kinh-doanh)
4. [Admin AI — Trợ lý quản trị hệ thống](#4-admin-ai--trợ-lý-quản-trị-hệ-thống)
5. [Cấu hình](#5-cấu-hình)
6. [So sánh 3 hệ thống AI](#6-so-sánh-3-hệ-thống-ai)
7. [API Endpoints](#7-api-endpoints)

---

## 1. Kiến trúc tổng quan

```
React Frontend (thin client)
  Chatbot.tsx / ShopAIAssistant.tsx / AdminAIAssistant.tsx
  useAIChat() hook  →  aiGateway.service.ts
        │
        │  POST /api/ai/chat  { agentType, message, sessionId }
        │  Bearer JWT
        ▼
Spring Boot AI Gateway
  AIController
        │
  AIOrchestrationService
  ├── SafetyFilterService      (prompt injection detection)
  ├── ConversationMemoryService (load/save history, sliding window)
  ├── ContextBuilderService    (fetch business data từ DB)
  ├── PromptBuilderService     (build system prompt + messages)
  ├── ModelRouterService       (chọn provider, retry)
  │     └── GeminiProvider    (key rotation, model fallback)
  └── ToolExecutorService      (USER_CHAT only)
        ├── SearchShopsTool
        ├── SearchByServiceTool
        ├── GetShopDetailTool
        ├── PrepareBookingTool
        ├── CreateBookingTool
        └── GetMyPetsTool
        │
        ▼
  Google Gemini API
  (API keys chỉ tồn tại ở backend)
```

**Luồng xử lý mỗi request:**
1. FE gửi `{ agentType, message }` kèm JWT
2. `AIController` validate JWT + agentType vs role
3. `SafetyFilterService` kiểm tra prompt injection
4. `ConversationMemoryService` load lịch sử (sliding window 10 turns)
5. `ContextBuilderService` fetch dữ liệu business từ DB
6. `PromptBuilderService` build system prompt + conversation history
7. `ModelRouterService` → `GeminiProvider` gọi Gemini API
8. Nếu Gemini trả về `functionCall` (USER_CHAT): `ToolExecutorService` thực thi tool
9. Gọi Gemini lần 2 với kết quả tool
10. Lưu lịch sử vào `ai_gateway_messages`
11. Trả về `{ text, toolResultJson, sessionId, model }`

---

## 2. User AI — Chatbot khách hàng

**Component:** `src/components/Chatbot.tsx`
**Hook:** `useAIChat({ agentType: 'USER_CHAT', welcomeMessage })`
**agentType:** `USER_CHAT`
**Role yêu cầu:** `USER`

### Cách hoạt động

Dùng **Gemini Function Calling** — backend nhận `functionCall` từ Gemini, thực thi tool, gửi kết quả lại Gemini, nhận text cuối cùng.

```
User nhắn → POST /ai/chat
  → Gemini phân tích → functionCall { name, args }
  → ToolExecutorService thực thi tool (gọi ShopService/PetService/BookingService)
  → Kết quả tool → Gemini lần 2
  → text response + toolResultJson
  → FE render text + UI card (ShopCard, PetCard, BookingPicker...)
```

### 6 Tools

| Tool | Mô tả |
|------|-------|
| `search_shops` | Tìm shop theo tên/thành phố/loại |
| `search_by_service` | Tìm shop theo tên dịch vụ |
| `get_shop_detail` | Chi tiết 1 shop + dịch vụ |
| `prepare_booking` | Tự động tìm shop+service+pet → BookingPicker |
| `create_booking` | Tạo booking CASH khi đã có datetime |
| `get_my_pets` | Danh sách/chi tiết thú cưng của user |

### Booking flow (PayOS)

PayOS redirect vẫn xử lý ở FE vì cần `window.location.href`:
```
BookingPickerCard → user chọn PayOS
  → bookingService.initiatePayment() (gọi BE trực tiếp)
  → redirect đến checkoutUrl
```

### UI Cards (giữ nguyên từ v1)

`ShopListCard`, `ShopDetailCard`, `PetListCard`, `PetDetailCard`, `BookingPickerCard`, `BookingSuccessCard`

---

## 3. Shop AI — Trợ lý kinh doanh

**Component:** `src/pages/shop/ShopAIAssistant.tsx`
**Hook:** `useAIChat({ agentType: 'SHOP_ASSISTANT', welcomeMessage })`
**agentType:** `SHOP_ASSISTANT`
**Role yêu cầu:** `SHOP_OWNER`

### Cách hoạt động

Dùng **text generation thuần** — không có function calling. Backend tự động fetch dữ liệu shop từ DB và inject vào system prompt.

```
User gửi câu hỏi → POST /ai/chat
  → ContextBuilderService fetch:
      shopService.getShopDashboard(email)
      bookingService.getShopBookings(email, null, null)
      staffService.getMyShopStaff(email)
      serviceRepository.findByShopIdAndActiveTrue(shopId)
  → Build context string (doanh thu, booking, staff, dịch vụ)
  → Inject vào system prompt
  → Gemini phân tích → text response
```

### Stats bar (vẫn fetch ở FE)

Stats bar hiển thị số liệu realtime — vẫn fetch ở FE bằng React Query để hiển thị ngay lập tức, không phụ thuộc vào AI response.

### 8 Quick Actions

Phân tích doanh thu, Khách đặt nhiều nhất, Tổng quan lịch hẹn, Dịch vụ hot & kém, Thống kê nhân viên, Cảnh báo & rủi ro, Chiến lược tăng trưởng, So sánh tháng này vs trước.

---

## 4. Admin AI — Trợ lý quản trị hệ thống

**Component:** `src/pages/admin/AdminAIAssistant.tsx`
**Hook:** `useAIChat({ agentType: 'ADMIN_ASSISTANT', welcomeMessage })`
**agentType:** `ADMIN_ASSISTANT`
**Role yêu cầu:** `ADMIN`

### Cách hoạt động

Tương tự Shop AI — text generation thuần. Backend fetch dữ liệu toàn hệ thống.

```
User gửi câu hỏi → POST /ai/chat
  → ContextBuilderService fetch:
      shopService.getAllShops()
      userRepository.findAll()
  → Build context (tất cả shops, users, phân loại role)
  → Inject vào system prompt
  → Gemini phân tích → text response
```

### 8 Quick Actions

Tổng quan hệ thống, Phân tích Shop, Shop chờ duyệt, Phân tích Member, Tình trạng tin nhắn, Rủi ro & cảnh báo, Chính sách đề xuất, Chiến lược tăng trưởng.

---

## 5. Cấu hình

### Backend — `PET_EYE_BE/.env`

```env
# Gemini API Keys (comma-separated, tự động rotate khi hết quota)
GEMINI_KEY_1=AIzaSy...
GEMINI_KEY_2=AIzaSy...
GEMINI_KEY_3=          # để trống nếu chỉ có 2 key
```

### Backend — `application-local.yml`

```yaml
ai:
  gemini:
    keys: ${GEMINI_KEY_1:},${GEMINI_KEY_2:},${GEMINI_KEY_3:}
  memory:
    max-turns: 10        # Số lượt hội thoại giữ trong context
    max-tokens: 8000     # Token budget (ước tính 4 chars = 1 token)
  safety:
    max-input-length: 2000  # Giới hạn độ dài input
```

### Frontend — `PET_EYE_FE/.env`

```env
# Không còn VITE_GEMINI_API_KEY — keys đã chuyển sang backend
VITE_API_URL=http://localhost:8080/api
```

### Model fallback order

```
gemini-2.5-flash → gemini-2.5-flash-lite → gemini-flash-latest → gemini-2.0-flash
```

Với mỗi model, thử lần lượt tất cả keys. HTTP 429 (rate limit) → rotate key. HTTP 503 → skip model.

---

## 6. So sánh 3 hệ thống AI

| Tiêu chí | User AI | Shop AI | Admin AI |
|----------|---------|---------|----------|
| **agentType** | `USER_CHAT` | `SHOP_ASSISTANT` | `ADMIN_ASSISTANT` |
| **Role** | `USER` | `SHOP_OWNER` | `ADMIN` |
| **Gemini mode** | Function Calling | Text generation | Text generation |
| **Context source** | Tools (on-demand) | DB shop hiện tại | DB toàn hệ thống |
| **Có thể tạo booking** | ✅ | ❌ | ❌ |
| **Quick actions** | ❌ | ✅ 8 nút | ✅ 8 nút |
| **Stats bar** | ❌ | ✅ 6 ô | ✅ 6 ô |
| **UI dạng** | Floating popup | Full page 2 cột | Full page 1 cột |
| **Lưu toolResultJson** | ✅ | ❌ | ❌ |

### Điểm giống nhau (v2)

- Đều dùng `useAIChat()` hook ở FE — **không còn AI logic ở frontend**
- Đều gọi `POST /api/ai/chat` với JWT
- Đều lưu lịch sử vào bảng `ai_gateway_messages`
- Đều có sliding window memory (10 turns)
- Đều có safety filter (prompt injection detection)
- Đều có model fallback + key rotation ở backend
- Đều render markdown (heading, bold, bullet, numbered, blockquote, code)

### Điểm khác nhau chính

```
User AI:  Backend nhận functionCall → thực thi tool → gọi Gemini lần 2
           FE nhận toolResultJson → render UI cards

Shop AI:  Backend fetch shop data → inject vào prompt → Gemini 1 lần
Admin AI: Backend fetch system data → inject vào prompt → Gemini 1 lần
```

---

## 7. API Endpoints

### AI Gateway (mới — v2)

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/ai/chat` | JWT | Gửi message, nhận AI response |
| GET | `/api/ai/history?agentType=` | JWT | Lấy lịch sử conversation |
| DELETE | `/api/ai/history?agentType=` | JWT | Xóa lịch sử |

**Request body:**
```json
{
  "agentType": "USER_CHAT | SHOP_ASSISTANT | ADMIN_ASSISTANT",
  "message": "câu hỏi của user",
  "sessionId": "optional"
}
```

**Response:**
```json
{
  "code": 1000,
  "result": {
    "text": "phản hồi từ AI",
    "toolResultJson": "{\"type\":\"shop_list\",\"data\":[...]}",
    "sessionId": "user_chat_user@email.com",
    "model": "gemini-2.5-flash"
  }
}
```

### Legacy endpoints (vẫn hoạt động — backward compatible)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST/DELETE | `/api/chatbot/history` | User AI history (cũ) |
| GET/POST/DELETE | `/api/shop-ai/history` | Shop AI history (cũ) |
| GET/POST/DELETE | `/api/admin-ai/history` | Admin AI history (cũ) |

> Legacy endpoints vẫn hoạt động nhưng không còn được dùng bởi frontend mới.
> Lịch sử mới được lưu vào bảng `ai_gateway_messages`.

---

*Cập nhật: tháng 5/2026 — v2 AI Gateway*
