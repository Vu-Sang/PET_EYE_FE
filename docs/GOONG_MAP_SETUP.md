# Hướng dẫn Setup Goong Map

## ✅ Đã hoàn thành

### 1. API Keys đã được cấu hình

**Backend API Key** (cho Geocoding & Directions API):
```
xlhtvme2wiJOTq93oXbPaO43ig0DbpSIwlQp3tWR
```

**Frontend Map Key** (cho Goong Map JS):
```
Qu7Vly4VMWH8W5pYa8X1TCjzozBR21AY8PhcmQ2m
```

### 2. File `.env` đã được tạo

```env
VITE_GOONG_MAP_API_KEY=Qu7Vly4VMWH8W5pYa8X1TCjzozBR21AY8PhcmQ2m
```

### 3. Components đã được tạo

- ✅ `src/components/ShopMap.tsx` - Hiển thị bản đồ với route
- ✅ `src/components/NearbyShops.tsx` - Danh sách shop gần
- ✅ `src/services/clinic.service.ts` - API services

## 🚀 Cách sử dụng

### Bước 1: Restart Dev Server

```bash
# Stop server hiện tại (Ctrl+C)
# Sau đó chạy lại:
npm run dev
```

### Bước 2: Test trên trang Shop Detail

1. Mở trang shop detail: `http://localhost:3000/clinic/12`
2. Trong sidebar, tìm nút **"Mở bản đồ"**
3. Click nút → Bản đồ sẽ hiển thị
4. Click **"Chỉ đường đến đây"** → Đường đi sẽ được vẽ

### Bước 3: Cho phép Location Permission

Nếu browser hỏi quyền truy cập vị trí:
- Click **"Allow"** hoặc **"Cho phép"**
- Nếu đã block trước đó:
  1. Click icon 🔒 bên cạnh URL
  2. Tìm "Location" → chọn "Allow"
  3. Reload trang

## 📋 Checklist

- [x] File `.env` đã được tạo với Map Key
- [x] ShopMap component đã được cập nhật
- [x] API services đã sẵn sàng
- [ ] Restart dev server
- [ ] Test trên browser
- [ ] Cho phép location permission

## 🔍 Troubleshooting

### Map không hiển thị?

**Kiểm tra Console:**
```javascript
// Nếu thấy lỗi 403:
GET https://tiles.goong.io/assets/goong_map_web.json?api_key=... 403

// Giải pháp:
// 1. Kiểm tra file .env có đúng Map Key không
// 2. Restart dev server
```

### Route không được vẽ?

**Kiểm tra Console:**
```javascript
// Nên thấy:
Drawing route with polyline: {...}
Decoded coordinates: 123 points
✅ Route drawn successfully

// Nếu thấy lỗi:
❌ Error drawing route: ...
// → Kiểm tra backend API /shops/{id}/directions
```

### Không lấy được vị trí user?

**Kiểm tra Console:**
```javascript
⚠️ Geolocation error: User denied Geolocation
Using fallback location (TP.HCM): {lat: 10.7769, lng: 106.7009}

// Giải pháp:
// 1. Click icon 🔒 bên URL
// 2. Location → Allow
// 3. Reload trang
```

## 📝 Lưu ý quan trọng

### 1. Thứ tự tọa độ

```javascript
// ❌ SAI
new goongjs.Marker().setLngLat([latitude, longitude])

// ✅ ĐÚNG
new goongjs.Marker().setLngLat([longitude, latitude])
```

Goong Map dùng `[lng, lat]` (longitude trước, latitude sau)

### 2. API Key vs Map Key

| Loại | Dùng cho | Key |
|------|----------|-----|
| **API Key** | Backend (Geocoding, Directions) | `xlhtvme2wiJOTq93oXbPaO43ig0DbpSIwlQp3tWR` |
| **Map Key** | Frontend (Goong Map JS) | `Qu7Vly4VMWH8W5pYa8X1TCjzozBR21AY8PhcmQ2m` |

### 3. HTTPS Required

`navigator.geolocation` chỉ hoạt động trên:
- ✅ `https://...`
- ✅ `localhost`
- ❌ `http://192.168.x.x` (LAN IP)

## 🎯 Kết quả mong đợi

Sau khi setup xong:

1. **Nút "Mở bản đồ"** xuất hiện trong sidebar
2. **Click nút** → Bản đồ hiển thị với:
   - 📍 Marker xanh: Vị trí của bạn
   - 🏥 Marker shop: Vị trí shop
3. **Click "Chỉ đường"** → Đường đi màu xanh được vẽ trên map
4. **Thông tin hiển thị**:
   - Khoảng cách: X km
   - Thời gian: Y phút

## 📚 Tài liệu tham khảo

- Goong Map JS: https://docs.goong.io/
- Goong API: https://docs.goong.io/rest/
- GitHub: https://github.com/goong-io/goong-js
