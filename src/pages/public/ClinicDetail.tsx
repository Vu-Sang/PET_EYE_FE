import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { shopService } from '../../services/shop.service';
import { petService } from '../../services/pet.service';
import { reviewService } from '../../services/review.service';
import { bookingService } from '../../services/booking.service';
import { clinicService } from '../../services/clinic.service';
import { useAuth } from '../../contexts/AuthContext';
import type { ServiceResponse, StaffResponse } from '../../types/api';
import type { Pet } from '../../types';
import type { DirectionsResponse } from '../../services/clinic.service';
import ShopMap from '../../components/ShopMap';


// Camera tier metadata — default fallbacks (shop can override via cameraTierLabels/cameraTierPrices)
const CAMERA_TIER_META: Record<string, { label: string; desc: string; icon: string; defaultPrice: number }> = {
  BASIC: { label: 'Cơ bản (720p)', desc: 'Giám sát tiêu chuẩn, đã bao gồm trong gói', icon: 'visibility', defaultPrice: 0 },
  HD: { label: 'Sắc nét (1080p HD)', desc: 'Hình ảnh sắc nét, màu sắc trung thực', icon: 'hd', defaultPrice: 50000 },
  PANORAMIC: { label: 'Toàn cảnh (360°)', desc: 'Xoay 360 độ, không góc chết', icon: 'flip_camera_android', defaultPrice: 100000 },
  AI: { label: 'AI Giám sát', desc: 'Cảnh báo tự động hành vi bất thường', icon: 'psychology', defaultPrice: 150000 },
};

/** Resolve effective price for a tier: use shop's custom price if set, else default */
function tierPrice(tierId: string, tierPrices?: Record<string, number>): number {
  if (tierPrices && tierId in tierPrices) return tierPrices[tierId];
  return CAMERA_TIER_META[tierId]?.defaultPrice ?? 0;
}

/** Resolve effective label for a tier: use shop's custom label if set, else default */
function tierLabel(tierId: string, tierLabels?: Record<string, string>): string {
  if (tierLabels && tierLabels[tierId]) return tierLabels[tierId];
  return CAMERA_TIER_META[tierId]?.label ?? tierId;
}

const today = new Date();

function StarRating({ rating, size = 'text-base' }: { rating: number; size?: string }) {
  return (
    <div className={`flex items-center gap-0.5 text-amber-400 ${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          {star <= Math.floor(rating) ? 'star' : star - rating <= 0.5 ? 'star_half' : 'star_border'}
        </span>
      ))}
    </div>
  );
}

export default function ClinicDetail() {
  const { id } = useParams<{ id: string }>();
  const shopId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Real data from API ──────────────────────────────────────────────────────
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['shop-public', shopId],
    queryFn: () => shopService.getPublicById(shopId),
    enabled: !!shopId,
  });

  const { data: apiServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['shop-services', shopId],
    queryFn: () => shopService.getShopServices(shopId),
    enabled: !!shopId,
  });

  const { data: apiReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['shop-reviews', shopId],
    queryFn: () => reviewService.getReviewsByShop(shopId),
    enabled: !!shopId,
  });

  const { data: reviewCount = 0 } = useQuery({
    queryKey: ['shop-reviews-count', shopId],
    queryFn: () => reviewService.getReviewCount(shopId),
    enabled: !!shopId,
  });

  // Cơ sở gần đây — lấy shop cùng thành phố, sort theo rating cao nhất
  const { data: nearbyShops = [] } = useQuery({
    queryKey: ['nearby-shops', shop?.city],
    queryFn: () => shopService.searchPublic({ city: shop!.city }),
    enabled: !!shop?.city,
    select: (data) => data
      .filter(s => s.id !== shopId)
      .sort((a, b) => b.ratingAvg - a.ratingAvg)
      .slice(0, 4),
  });

  // ── Map & Directions state ──────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<DirectionsResponse | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('✅ Got user location:', location);
          setUserLocation(location);
        },
        (error) => {
          console.warn('⚠️ Geolocation error:', error.message);
          // Fallback: Dùng tọa độ TP.HCM
          const fallbackLocation = { lat: 10.7769, lng: 106.7009 };
          console.log('Using fallback location (TP.HCM):', fallbackLocation);
          setUserLocation(fallbackLocation);

          // Thông báo cho user
          import('react-hot-toast').then(({ toast }) => {
            toast('Không lấy được vị trí của bạn. Đang dùng vị trí mặc định (TP.HCM)', {
              icon: '📍',
              duration: 3000,
            });
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      console.warn('⚠️ Geolocation not supported');
      // Fallback: TP.HCM
      const fallbackLocation = { lat: 10.7769, lng: 106.7009 };
      console.log('Using fallback location (TP.HCM):', fallbackLocation);
      setUserLocation(fallbackLocation);
    }
  }, []);

  // Add body scroll lock when modal is open
  useEffect(() => {
    if (showMap) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMap]);



  // Debug: Log shop coordinates
  useEffect(() => {
    if (shop) {
      console.log('Shop data:', {
        id: shop.id,
        name: shop.shopName,
        latitude: shop.latitude,
        longitude: shop.longitude,
        hasCoordinates: !!(shop.latitude && shop.longitude)
      });
    }
  }, [shop]);

  // Get directions to a shop
  const handleGetDirections = async (targetShopId: number) => {
    if (!userLocation) {
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Vui lòng bật định vị để xem chỉ đường');
      });
      return;
    }

    try {
      const result = await clinicService.getDirectionsToShop(
        targetShopId,
        userLocation.lat,
        userLocation.lng
      );
      setDirections(result);
      setShowMap(true);

      import('react-hot-toast').then(({ toast }) => {
        toast.success('Đã tìm thấy đường đi!');
      });
    } catch (error) {
      console.error('Failed to get directions:', error);
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Không thể lấy chỉ đường. Vui lòng thử lại.');
      });
    }
  };

  const { data: myPets = [] } = useQuery({
    queryKey: ['my-pets', user?.id],
    queryFn: () => petService.getByOwner(Number(user?.id)),
    enabled: !!user?.id && !isNaN(Number(user.id)),
  });

  // ── Booking state ───────────────────────────────────────────────────────────
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  // BOARDING: check-in / check-out dates
  const [checkInDate, setCheckInDate] = useState(today.toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [isFavorited, setIsFavorited] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('Tất cả');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [isHotelSelected, setIsHotelSelected] = useState(false);
  const [selectedCameraTier, setSelectedCameraTier] = useState<string>('BASIC');
  const [selectedCageSize, setSelectedCageSize] = useState<string>('');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('');

  // Derive the boarding service from API data
  const boardingService = apiServices.find((s: ServiceResponse) => (s.category === 'BOARDING' || s.category.toUpperCase() === 'HOTEL') && s.active);
  // Camera tiers supported by this shop's boarding service
  const supportedCameraTiers = boardingService?.cameraTiers ?? [];
  // Non-boarding services for "Dịch vụ nổi bật"
  const nonBoardingServices = apiServices.filter((s: ServiceResponse) => s.category !== 'BOARDING' && s.category.toUpperCase() !== 'HOTEL');

  useEffect(() => {
    if (boardingService) {
      if (boardingService.cageSize?.length && !selectedCageSize) {
        setSelectedCageSize(boardingService.cageSize[0]);
      }
      if (boardingService.roomType?.length && !selectedRoomType) {
        setSelectedRoomType(boardingService.roomType[0]);
      }
    }
  }, [boardingService, selectedCageSize, selectedRoomType]);

  // Number of boarding days
  const boardingDays = isHotelSelected
    ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
    : 0;

  // ── Staff selection ─────────────────────────────────────────────────────────
  const [selectedStaff, setSelectedStaff] = useState<StaffResponse | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffAvailabilityLoading, setStaffAvailabilityLoading] = useState(false);
  const [staffWithAvailability, setStaffWithAvailability] = useState<StaffResponse[]>([]);
  const [staffAvailabilityError, setStaffAvailabilityError] = useState(false);

  // Tổng duration của tất cả services đã chọn — dùng để check conflict
  const totalServiceDuration = useMemo(() => {
    if (selectedServiceIds.length === 0) return 60;
    return selectedServiceIds.reduce((sum, id) => {
      const svc = apiServices.find((s: ServiceResponse) => s.id === id);
      return sum + (svc?.durationMinutes ?? 0);
    }, 0) || 60;
  }, [selectedServiceIds, apiServices]);

  // primaryServiceDuration: duration service đầu tiên (dùng cho staff availability check)
  const primaryServiceDuration = useMemo(() => {
    if (selectedServiceIds.length > 0) {
      const svc = apiServices.find((s: ServiceResponse) => s.id === selectedServiceIds[0]);
      return svc?.durationMinutes ?? 60;
    }
    return 60;
  }, [selectedServiceIds, apiServices]);

  // ── Derived booleans — khai báo sớm để dùng trong useEffects bên dưới ──────
  const hasNormalServices = selectedServiceIds.length > 0;

  // ── Available time slots (from API) ────────────────────────────────────────
  // availableSlots: mảng "HH:mm" của các slot còn nhân viên rảnh (từ BE)
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Tất cả slots của shop trong ngày — bước cố định 60 phút để UI đẹp
  // Slot nào không có trong availableSlots thì disabled
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
    const STEP = 60; // bước cố định 60 phút
    const slots: string[] = [];

    const now = new Date();
    // Assuming selectedDate is "YYYY-MM-DD"
    // Use local timezone for "today" to match selectedDate
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const isToday = selectedDate === todayStr;
    const currentMin = now.getHours() * 60 + now.getMinutes();

    // Sinh đến khi slot + totalDuration vẫn còn trong giờ đóng cửa
    for (let m = openMin; m + totalServiceDuration <= closeMin; m += STEP) {
      if (isToday && m <= currentMin) continue; // Filter out past times for today
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  }, [shop?.openTime, shop?.closeTime, totalServiceDuration, hasNormalServices, selectedDate]);

  // Fetch available slots mỗi khi date hoặc services thay đổi
  useEffect(() => {
    if (!shopId || !selectedDate || !hasNormalServices) {
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    bookingService
      .getAvailableTimeSlotsForServices(shopId, selectedDate, selectedServiceIds)
      .then((slots) => {
        if (cancelled) return;
        // BE trả về ISO datetime "2026-05-19T08:00:00", extract "HH:mm"
        const times = slots.map((s) => s.substring(11, 16));
        setAvailableSlots(times);
        // Nếu slot đang chọn không còn available → reset
        setSelectedTime((prev) => (prev && !times.includes(prev) ? null : prev));
      })
      .catch(() => {
        if (!cancelled) setAvailableSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => { cancelled = true; };
  }, [shopId, selectedDate, selectedServiceIds, hasNormalServices]);

  // ── Pet selection modal ─────────────────────────────────────────────────────
  const [showPetModal, setShowPetModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [petNote, setPetNote] = useState('');
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<ServiceResponse | null>(null);
  const [checkingPet, setCheckingPet] = useState(false);

  // Availability map: petId → true (available) | false (busy) | undefined (loading)
  const [petAvailabilityMap, setPetAvailabilityMap] = useState<Record<number, boolean>>({});
  const [loadingPetAvailability, setLoadingPetAvailability] = useState(false);
  // Pet đang xem lịch hẹn
  const [viewingBookingsPetId, setViewingBookingsPetId] = useState<number | null>(null);
  const [petBookings, setPetBookings] = useState<any[]>([]);
  const [loadingPetBookings, setLoadingPetBookings] = useState(false);

  // Khi modal mở: check availability tất cả pets
  useEffect(() => {
    if (!showPetModal) return;
    const activePets = (myPets as any[]).filter((p: any) => p.active);
    if (activePets.length === 0) return;

    const appointmentDatetime = hasNormalServices && selectedDate && selectedTime
      ? `${selectedDate}T${selectedTime}:00`
      : checkInDate ? `${checkInDate}T12:00:00` : null;

    if (!appointmentDatetime) return;

    const durationForCheck = isHotelSelected ? boardingDays * 24 * 60 : totalServiceDuration;

    setLoadingPetAvailability(true);
    Promise.all(
      activePets.map((pet: any) =>
        bookingService.checkPetAvailability(pet.id, appointmentDatetime, durationForCheck)
          .then(available => ({ id: pet.id, available }))
          .catch(() => ({ id: pet.id, available: true })) // fallback: cho phép chọn nếu lỗi
      )
    ).then(results => {
      const map: Record<number, boolean> = {};
      results.forEach(r => { map[r.id] = r.available; });
      setPetAvailabilityMap(map);
      setLoadingPetAvailability(false);
    });
  }, [showPetModal]);

  const toggleService = (serviceId: number) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    // Reset time khi thay đổi services (tổng duration thay đổi → slots thay đổi)
    setSelectedTime(null);
    setAvailableSlots([]);
  };

  const cameraTierExtraPrice = isHotelSelected
    ? tierPrice(selectedCameraTier, boardingService?.cameraTierPrices)
    : 0;

  const totalPrice = selectedServiceIds.reduce((sum, id) => {
    const svc = apiServices.find((s: ServiceResponse) => s.id === id);
    return sum + (svc ? svc.price : 0);
  }, 0) + (isHotelSelected
    ? ((boardingService?.price ?? 0) + cameraTierExtraPrice) * boardingDays
    : 0);

  // ── Can book ────────────────────────────────────────────────────────────────
  // - Boarding only: cần checkIn + checkOut và không trùng ngày nghỉ
  // - Dịch vụ thường only: cần ít nhất 1 service + date + time và không trùng ngày nghỉ
  // - Cả 2: cần đủ cả boarding dates VÀ date+time cho dịch vụ thường
  const isSelectedDateOff = shop?.offDays ? shop.offDays.split(',').includes(selectedDate) : false;
  const isCheckInOff = shop?.offDays ? shop.offDays.split(',').includes(checkInDate) : false;
  const isCheckOutOff = shop?.offDays ? shop.offDays.split(',').includes(checkOutDate) : false;

  const boardingReady = isHotelSelected ? (!!checkInDate && !!checkOutDate && checkInDate < checkOutDate && !isCheckInOff && !isCheckOutOff) : true;
  const normalReady = hasNormalServices ? (!!selectedDate && !!selectedTime && !isSelectedDateOff) : true;

  // Fetch staff availability whenever date+time changes (for normal services)
  const appointmentDatetimeForQuery = hasNormalServices && selectedDate && selectedTime
    ? `${selectedDate}T${selectedTime}:00`
    : null;

  useEffect(() => {
    if (!appointmentDatetimeForQuery || !shopId) {
      setStaffWithAvailability([]);
      setStaffAvailabilityError(false);
      return;
    }
    let cancelled = false;
    setStaffAvailabilityLoading(true);
    setStaffAvailabilityError(false);
    bookingService
      .getShopStaffAvailability(shopId, appointmentDatetimeForQuery, primaryServiceDuration)
      .then((data) => {
        if (!cancelled) setStaffWithAvailability(data);
      })
      .catch(() => {
        if (!cancelled) {
          setStaffAvailabilityError(true);
          // Fallback: load staff without availability info
          bookingService.getShopStaff(shopId).then((data) => {
            if (!cancelled) setStaffWithAvailability(
              data.map(s => ({ ...s, available: true }))
            );
          }).catch(() => {
            if (!cancelled) setStaffWithAvailability([]);
          });
        }
      })
      .finally(() => {
        if (!cancelled) setStaffAvailabilityLoading(false);
      });
    return () => { cancelled = true; };
  }, [appointmentDatetimeForQuery, shopId, primaryServiceDuration]);

  // When selected staff is busy, find available alternatives
  const selectedStaffBusy = selectedStaffId !== null
    && staffWithAvailability.length > 0
    && staffWithAvailability.find(s => s.id === selectedStaffId)?.available === false;

  const suggestedStaff = selectedStaffBusy
    ? staffWithAvailability.filter(s => s.available === true).slice(0, 3)
    : [];
  const canBook = (isHotelSelected || hasNormalServices) && boardingReady && normalReady;

  function handleBookClick() {
    if (!canBook) return;

    const now = new Date();
    if (hasNormalServices && selectedDate && selectedTime) {
      const selectedDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      if (selectedDateTime <= now) {
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Thời gian này đã qua. Vui lòng chọn một khung giờ khác trong tương lai.');
        });
        return;
      }
    } else if (isHotelSelected && checkInDate) {
      const checkInDateTime = new Date(`${checkInDate}T12:00:00`);
      if (checkInDateTime <= now) {
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Ngày lưu trú đã qua. Vui lòng chọn lại ngày nhận phòng.');
        });
        return;
      }
    }

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setShowPetModal(true);
  }

  // ── After pet selected → go to payment page with state ──────────────────────
  async function handleConfirmPet() {
    if (!selectedPet) return;

    // appointmentDatetime:
    // - Nếu có dịch vụ thường → dùng date+time của dịch vụ thường (BE validate @Future)
    // - Nếu chỉ có boarding → dùng check-in date lúc 12:00
    const appointmentDatetime = hasNormalServices
      ? `${selectedDate}T${selectedTime}:00`
      : `${checkInDate}T12:00:00`;

    const durationForCheck = isHotelSelected ? boardingDays * 24 * 60 : totalServiceDuration;

    setCheckingPet(true);
    try {
      const isAvailable = await bookingService.checkPetAvailability(selectedPet.id, appointmentDatetime, durationForCheck);
      if (!isAvailable) {
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Thú cưng này đã có lịch hẹn trong khoảng thời gian này. Vui lòng chọn bé khác hoặc thời gian khác.');
        });
        setCheckingPet(false);
        return;
      }
    } catch (error) {
      console.error(error);
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Lỗi kiểm tra lịch trống của thú cưng. Vui lòng thử lại.');
      });
      setCheckingPet(false);
      return;
    }
    setCheckingPet(false);
    setShowPetModal(false);

    // Tập hợp tất cả services đã chọn (thường + boarding)
    const selectedServices = selectedServiceIds.map((id) => {
      const svc = apiServices.find((s: ServiceResponse) => s.id === id)!;
      return { id: svc.id, name: svc.serviceName, price: svc.price, durationMinutes: svc.durationMinutes, category: svc.category, cameraEnabled: svc.cameraEnabled };
    });

    if (isHotelSelected && boardingService) {
      const boardingPrice = ((boardingService.price ?? 0) + cameraTierExtraPrice) * boardingDays;
      selectedServices.unshift({
        id: boardingService.id,
        name: `${boardingService.serviceName} · Camera ${tierLabel(selectedCameraTier, boardingService.cameraTierLabels)} · ${boardingDays} ngày`,
        price: boardingPrice,
        durationMinutes: undefined,
        category: boardingService.category,
        cameraEnabled: boardingService.cameraEnabled,
      });
    }

    // serviceId chính để gửi lên BE:
    // - Nếu có dịch vụ thường → dùng service thường đầu tiên (có datetime cụ thể)
    // - Nếu chỉ có boarding → dùng boardingService
    const primaryServiceId = hasNormalServices
      ? selectedServiceIds[0]
      : boardingService?.id;

    const totalServicePrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    navigate('/payment', {
      state: {
        shopId,
        shopName: shop?.shopName,
        shopAddress: shop ? `${shop.address}${shop.city ? `, ${shop.city}` : ''}` : '',
        shopImage: shop?.licenseImageUrl,
        serviceId: primaryServiceId,
        // Danh sách đầy đủ để hiển thị trên Payment
        services: selectedServices,
        // Giữ lại để tương thích ngược
        serviceName: selectedServices.map(s => s.name).join(', '),
        servicePrice: totalServicePrice,
        petId: selectedPet.id,
        petName: `${selectedPet.name} (${selectedPet.species})`,
        petNote: petNote || undefined,
        staffId: selectedStaffId ?? undefined,
        staffName: selectedStaffId
          ? staffWithAvailability.find(s => s.id === selectedStaffId)?.fullName
          : undefined,
        appointmentDatetime,
        checkIn: isHotelSelected ? `${checkInDate}T12:00:00` : undefined,
        checkOut: isHotelSelected ? `${checkOutDate}T12:00:00` : undefined,
        date: (() => {
          const parts: string[] = [];
          if (hasNormalServices && selectedDate && selectedTime) {
            // Format: "Thứ Ba, 19/05/2026"
            parts.push(new Date(`${selectedDate}T${selectedTime}:00`).toLocaleDateString('vi-VN', {
              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
            }));
          }
          if (isHotelSelected) {
            // Format: "Lưu trú: 04/05/2026 → 05/05/2026"
            parts.push(`Lưu trú: ${new Date(checkInDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} → ${new Date(checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`);
          }
          return parts.join(' | ');
        })(),
        // time: giờ hẹn dịch vụ thường, hoặc "X ngày" nếu chỉ có boarding
        time: hasNormalServices ? selectedTime! : `${boardingDays} ngày`,
        // Truyền thêm để BookingSuccess hiển thị đúng
        normalServiceNames: hasNormalServices
          ? selectedServiceIds.map(id => apiServices.find((s: ServiceResponse) => s.id === id)?.serviceName).filter(Boolean).join(', ')
          : undefined,
        cageSize: isHotelSelected ? selectedCageSize : undefined,
        roomType: isHotelSelected ? selectedRoomType : undefined,
      }
    });
  }

  // Derive gallery images from banner and galleryUrls
  const galleryImages = React.useMemo(() => {
    const images = [];
    if (shop?.bannerUrl) images.push(shop.bannerUrl);
    if (shop?.galleryUrls) {
      images.push(...shop.galleryUrls.split(',').filter(Boolean));
    }

    // If shop has no images at all, show 1 placeholder
    if (images.length === 0) {
      images.push('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80');
    }

    return images;
  }, [shop?.bannerUrl, shop?.galleryUrls]);

  const dayName = today.toLocaleDateString('vi-VN', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

  if (shopLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a2b4c]" />
      </div>
    );
  }

  const handleShare = async () => {
    const shareData = {
      title: shop?.shopName || 'Peteye',
      text: `Khám phá ${shop?.shopName} trên Peteye - Nền tảng chăm sóc thú cưng hàng đầu.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        import('react-hot-toast').then(({ toast }) => {
          toast.success('Đã sao chép liên kết vào bộ nhớ tạm!');
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Clinic Header */}
        <div className="flex flex-wrap justify-between items-start gap-4 pb-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-slate-900 dark:text-slate-100 text-2xl md:text-4xl font-black leading-tight tracking-tight">
              {shop?.shopName ?? 'Đang tải...'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
              <span className="flex items-center text-amber-500 gap-1">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                {shop?.ratingAvg ? shop.ratingAvg.toFixed(1) : 'Mới'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-teal-500">location_on</span>
                {shop ? `${shop.address}${shop.city ? `, ${shop.city}` : ''}` : '---'}
              </span>
              {shop?.isVerified && (
                <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Đối tác xác minh
                </span>
              )}
            </div>
          </div>
          
        </div>

        {/* Hero Image Grid */}
        <div className={`w-full h-[280px] md:h-[380px] lg:h-[460px] gap-2 overflow-hidden rounded-2xl mb-8 ${galleryImages.length === 1 ? 'flex' :
            galleryImages.length === 2 ? 'grid grid-cols-2' :
              galleryImages.length === 3 ? 'grid grid-cols-3' :
                galleryImages.length === 4 ? 'grid grid-cols-3 grid-rows-2' :
                  'grid grid-cols-4 grid-rows-2'
          }`}>
          {/* Layout for 1 image */}
          {galleryImages.length === 1 && (
            <div
              className="w-full h-full bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
              style={{ backgroundImage: `url(${galleryImages[0]})` }}
            >
              <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
            </div>
          )}

          {/* Layout for 2 images */}
          {galleryImages.length === 2 && galleryImages.map((img, i) => (
            <div
              key={i}
              className="w-full h-full bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
              style={{ backgroundImage: `url(${img})` }}
            >
              <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
            </div>
          ))}

          {/* Layout for 3 images */}
          {galleryImages.length === 3 && (
            <>
              <div
                className="col-span-2 row-span-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[0]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
              </div>
              <div className="col-span-1 flex flex-col gap-2">
                {galleryImages.slice(1, 3).map((img, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                    style={{ backgroundImage: `url(${img})` }}
                  >
                    <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Layout for 4 images */}
          {galleryImages.length === 4 && (
            <>
              <div
                className="col-span-2 row-span-2 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[0]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
              </div>
              <div className="col-span-1 row-span-2 flex flex-col gap-2">
                {galleryImages.slice(1, 3).map((img, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                    style={{ backgroundImage: `url(${img})` }}
                  >
                    <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                  </div>
                ))}
              </div>
              <div
                className="col-span-1 row-span-2 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[3]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
              </div>
            </>
          )}

          {/* Layout for 5+ images */}
          {galleryImages.length >= 5 && (
            <>
              <div
                className="col-span-2 row-span-2 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[0]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
              </div>
              {galleryImages.slice(1, 4).map((img, i) => (
                <div
                  key={i}
                  className="col-span-1 row-span-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                  style={{ backgroundImage: `url(${img})` }}
                >
                  <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                </div>
              ))}
              <div
                className="col-span-1 row-span-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[4]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                {galleryImages.length > 5 && (
                  <button className="absolute bottom-3 right-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                    Xem tất cả ảnh
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Map & Directions Section - Đã chuyển xuống dạng Modal ở cuối file */}

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
          {/* Left Column */}
          <div className="flex flex-col gap-10">


            {/* Intro */}
            <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Giới thiệu</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-base">
                {shop?.description ?? 'Đang tải thông tin...'}
              </p>
              {shop?.shopType && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-semibold">
                    {shop.shopType}
                  </span>
                </div>
              )}
            </section>

            {/* Pet Hotel & Camera Options — chỉ hiển thị nếu shop có dịch vụ BOARDING */}
            {boardingService && (
              <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800">
                      <span className="material-symbols-outlined text-2xl">hotel</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{boardingService.serviceName}</h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{boardingService.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{boardingService.price.toLocaleString('vi-VN')}đ</span>
                    <span className="text-xs text-slate-400">/ngày</span>
                    <div
                      onClick={() => setIsHotelSelected(!isHotelSelected)}
                      className={`relative w-12 h-6 rounded-full cursor-pointer transition-all duration-300 ml-2 ${isHotelSelected ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isHotelSelected ? 'left-7 shadow-sm' : 'left-1'}`} />
                    </div>
                  </div>
                </div>

                <div className={`transition-all duration-500 overflow-hidden ${isHotelSelected ? 'max-h-[900px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm overflow-hidden mb-6">
                    {/* Service image + description */}
                    <div className="p-5 flex flex-col sm:flex-row gap-5">
                      {/* Image */}
                      <div className="w-full sm:w-48 h-40 rounded-xl overflow-hidden shadow-md shrink-0 bg-slate-100 dark:bg-slate-700">
                        <img
                          src={boardingService.imageUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80'}
                          className="w-full h-full object-cover"
                          alt={boardingService.serviceName}
                        />
                      </div>

                      {/* Description as feature list — dùng cameraDescription nếu có, fallback sang description chung */}
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2">{boardingService.serviceName}</h4>
                        {(() => {
                          const descText = boardingService.cameraEnabled && boardingService.cameraDescription
                            ? boardingService.cameraDescription
                            : boardingService.description;
                          return descText ? (
                            <div className="flex flex-col gap-1.5">
                              {descText.split(/[,;.\n]/).filter((s: string) => s.trim().length > 5).map((feature: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                  <span className="material-symbols-outlined text-indigo-500 text-base mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  <span>{feature.trim()}</span>
                                </div>
                              ))}
                            </div>
                          ) : null;
                        })()}

                        {/* Additional Boarding info (Cage, Room) */}
                        {(boardingService.roomType?.length > 0 || boardingService.cageSize?.length > 0) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                            {boardingService.roomType?.length > 0 && (
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Loại phòng</span>
                                {boardingService.roomType.length > 1 ? (
                                  <select
                                    value={selectedRoomType}
                                    onChange={(e) => setSelectedRoomType(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a2b4c] outline-none"
                                  >
                                    {boardingService.roomType.map((r: string) => (
                                      <option key={r} value={r}>{r}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{boardingService.roomType[0]}</span>
                                )}
                              </div>
                            )}
                            {boardingService.cageSize?.length > 0 && (
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Kích thước chuồng</span>
                                {boardingService.cageSize.length > 1 ? (
                                  <select
                                    value={selectedCageSize}
                                    onChange={(e) => setSelectedCageSize(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a2b4c] outline-none"
                                  >
                                    {boardingService.cageSize.map((c: string) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{boardingService.cageSize[0]}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Camera tiers — only if shop configured camera */}
                    {boardingService.cameraEnabled && supportedCameraTiers.length > 0 && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 border-t border-indigo-100 dark:border-indigo-900 mt-5">
                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-wider mb-4">
                          Nâng cấp Camera Giám sát
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {supportedCameraTiers.map((tierId: string) => {
                            const meta = CAMERA_TIER_META[tierId];
                            if (!meta) return null;
                            const isSelected = selectedCameraTier === tierId;
                            const effectiveLabel = tierLabel(tierId, boardingService?.cameraTierLabels);
                            const effectivePrice = tierPrice(tierId, boardingService?.cameraTierPrices);
                            return (
                              <div
                                key={tierId}
                                onClick={() => setSelectedCameraTier(tierId)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${isSelected
                                    ? 'bg-white dark:bg-indigo-900/40 border-indigo-500 shadow-md'
                                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'}`}>
                                    <span className="material-symbols-outlined text-xl">{meta.icon}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{effectiveLabel}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{meta.desc}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-xs font-bold ${effectivePrice === 0 ? 'text-teal-600' : 'text-slate-900 dark:text-white'}`}>
                                    {effectivePrice === 0 ? 'MIỄN PHÍ' : `+${effectivePrice.toLocaleString()}đ`}
                                  </p>
                                  {effectivePrice > 0 && <p className="text-[8px] text-slate-400">/ngày</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )} {/* end BOARDING conditional */}

            {/* Featured Services */}
            <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">Dịch vụ nổi bật</h2>

              {servicesLoading && (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                  ))}
                </div>
              )}

              {!servicesLoading && nonBoardingServices.length === 0 && (
                <p className="text-slate-400 text-sm py-4">Cơ sở này chưa có dịch vụ nào.</p>
              )}

              {!servicesLoading && apiServices.length > 0 && (
                <div className="flex flex-col gap-3">
                  {nonBoardingServices.map((svc: ServiceResponse) => {
                    return (
                      <div key={svc.id}>
                        <div
                          className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 transition-colors group border border-transparent"
                        >
                          {/* Service Image */}
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 shadow-sm bg-slate-200 dark:bg-slate-700">
                            {svc.imageUrl ? (
                              <img
                                src={svc.imageUrl}
                                alt={svc.serviceName}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 text-2xl">pets</span>
                              </div>
                            )}
                          </div>

                          {/* Service Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-[#1a2b4c] dark:group-hover:text-teal-400 transition-colors">
                              {svc.serviceName}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                              {svc.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                                ⏱ {svc.durationMinutes} phút
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedServiceForDetail(svc); }}
                                className="text-xs text-[#1a2b4c] dark:text-teal-400 hover:underline flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-xs">info</span>
                                Chi tiết
                              </button>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-right shrink-0 flex flex-col items-end gap-2">
                            <div className="flex items-baseline gap-1">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                {svc.price.toLocaleString('vi-VN')}đ
                              </span>
                              <span className="text-xs text-slate-400">/lần</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>



            {/* Doctors */}
            <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Đội ngũ Nhân viên</h2>
                <button className="text-[#1a2b4c] dark:text-teal-400 font-semibold text-sm hover:underline">
                  Xem tất cả
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(shop?.staffs || []).length > 0 ? (
                  shop?.staffs?.map((staff: any) => (
                    <div
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className="flex flex-col gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={staff.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&auto=format&fit=crop'}
                          alt={staff.fullName}
                          className="size-16 rounded-full object-cover shrink-0 border-2 border-slate-100 dark:border-slate-700 group-hover:border-teal-400 transition-colors"
                        />
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1a2b4c] dark:group-hover:text-teal-400 transition-colors">
                            {staff.fullName}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{staff.role}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">{staff.specialization}</p>
                        </div>
                      </div>

                      {/* Certificates Section */}
                      {staff.certificates && staff.certificates.filter((c: any) => c.status === 'VERIFIED').length > 0 && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Chứng chỉ chuyên môn</p>
                          <div className="flex flex-wrap gap-2">
                            {staff.certificates.filter((c: any) => c.status === 'VERIFIED').map((cert: any) => (
                              <div key={cert.id} className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded border border-teal-100 dark:border-teal-800/50">
                                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                <span className="text-[10px] font-bold">{cert.certificateName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm italic">Chưa có thông tin nhân viên.</p>
                )}
              </div>
            </section>

            {/* Live Camera Promo */}
            {/* <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8">
              <div
                className="absolute top-0 right-0 w-1/2 h-full opacity-20 bg-cover bg-no-repeat bg-center rounded-2xl"
                style={{
                  backgroundImage:
                    'url(https://images.unsplash.com/photo-1601758174184-07ba1e5b0a7a?q=80&w=600&auto=format&fit=crop)',
                }}
              />
              <div className="relative z-10 flex flex-col gap-4 max-w-[60%]">
                <div className="flex items-center gap-2 text-teal-400 font-bold tracking-wider text-xs uppercase">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
                  </span>
                  Live Camera Experience
                </div>
                <h3 className="text-2xl font-bold leading-tight">Quan sát thú cưng từ xa</h3>
                <p className="text-slate-300 text-sm">
                  Đặt lịch dịch vụ lưu trú và theo dõi bé yêu mọi lúc mọi nơi thông qua ứng dụng Peteye.
                </p>
                <button className="w-fit mt-2 px-5 py-2.5 bg-white text-slate-900 rounded-lg font-bold text-sm hover:bg-slate-100 transition-colors shadow-lg">
                  Tải App Ngay
                </button>
              </div>
            </section> */}



            {/* Reviews */}
            <section>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Đánh giá từ cộng đồng
                  <span className="text-slate-400 font-normal text-base">({reviewCount})</span>
                </h2>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{shop?.ratingAvg ? shop.ratingAvg.toFixed(1) : '0.0'}</span>
                    <div className="flex text-amber-400 justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: s <= (shop?.ratingAvg || 0) ? "'FILL' 1" : "'FILL' 0" }}>
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#1a2b4c]">
                    <option>Mới nhất</option>
                    <option>Cao nhất</option>
                    <option>Thấp nhất</option>
                  </select>
                </div>
              </div>

              {/* Filter tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['Tất cả', 'Có hình ảnh', 'Mới nhất'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setReviewFilter(f)}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${reviewFilter === f
                      ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] dark:bg-teal-500 dark:border-teal-500'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:border-[#1a2b4c] hover:text-[#1a2b4c] dark:hover:border-teal-400 dark:hover:text-teal-400'
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Review list */}
              <div className="flex flex-col gap-6">
                {(apiReviews || []).length > 0 ? (
                  apiReviews?.map((review: any) => (
                    <div
                      key={review.id}
                      className="flex gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <img
                        src={review.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop'}
                        alt={review.userName}
                        className="size-10 rounded-full object-cover shrink-0"
                      />
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{review.userName}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400">
                                {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                              {review.serviceName && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {review.serviceName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span
                                key={s}
                                className="material-symbols-outlined text-sm"
                                style={{ fontVariationSettings: s <= review.rating ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                star
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{review.comment}</p>

                        {review.reply && (
                          <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border-l-4 border-[#1a2b4c] relative overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-[#1a2b4c] uppercase tracking-widest flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">reply</span>
                                Phản hồi từ chủ shop
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(review.repliedAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-200 text-sm italic leading-relaxed">
                              "{review.reply}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm italic">Chưa có đánh giá nào cho phòng khám này.</p>
                )}
              </div>

              <div className="text-center mt-6">
                <button className="px-6 py-2.5 rounded-full border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Xem thêm {reviewCount} đánh giá
                </button>
              </div>
            </section>

          </div>

          {/* Right Column - Sticky Sidebar */}
          {/* Right Column - Sidebar */}
          <div className="hidden lg:block space-y-6">
            <div className="sticky top-24 flex flex-col gap-6">
              {/* Booking Card */}
              <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="p-6 flex flex-col gap-5">

                  {/* ── Chọn Dịch vụ (Sidebar) ──────────────── */}
                  {nonBoardingServices.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0 block">
                        Chọn Dịch vụ
                      </label>
                      <div className="flex flex-col gap-2">
                        {nonBoardingServices.map((svc: ServiceResponse) => {
                          const isSelected = selectedServiceIds.includes(svc.id);
                          return (
                            <div
                              key={svc.id}
                              onClick={() => toggleService(svc.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                  ? 'bg-[#1a2b4c]/5 border-[#1a2b4c]/30 dark:bg-teal-900/20 dark:border-teal-500/50'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#1a2b4c]/30'
                                }`}
                            >
                              <div className="flex flex-col">
                                <span className={`text-sm font-bold ${isSelected ? 'text-[#1a2b4c] dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {svc.serviceName}
                                </span>
                                <span className="text-xs text-slate-500">{svc.price.toLocaleString('vi-VN')}đ • {svc.durationMinutes} phút</span>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                  ? 'bg-[#1a2b4c] border-[#1a2b4c] dark:bg-teal-500 dark:border-teal-500'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                }`}>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary row */}
                  <AnimatePresence>
                    {(selectedServiceIds.length > 0 || isHotelSelected) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-[#1a2b4c]/5 dark:bg-slate-800 rounded-xl border border-[#1a2b4c]/10 dark:border-slate-700">
                          <div className="flex justify-between items-center text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">
                            <span>Dịch vụ đã chọn</span>
                            <span className="bg-[#1a2b4c] text-white px-2 py-0.5 rounded-full">{selectedServiceIds.length + (isHotelSelected ? 1 : 0)}</span>
                          </div>
                          {/* Hiển thị tổng thời gian nếu có dịch vụ thường */}
                          {selectedServiceIds.length > 0 && (
                            <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 mb-2">
                              <span className="flex items-center gap-1 font-medium">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                Tổng thời gian:
                              </span>
                              <span className="font-bold">{totalServiceDuration} phút</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-[#1a2b4c]/10 dark:border-slate-700">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Tổng cộng:</span>
                            <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                              {totalPrice.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Date / Check-in-out — hiển thị theo loại dịch vụ đã chọn */}

                  {/* Boarding: check-in / check-out */}
                  {isHotelSelected && (
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-0 block">
                        Lưu trú — Ngày nhận & trả phòng
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Nhận phòng</label>
                          <input
                            type="date"
                            min={today.toISOString().split('T')[0]}
                            value={checkInDate}
                            onChange={e => {
                              setCheckInDate(e.target.value);
                              if (e.target.value >= checkOutDate) {
                                const d = new Date(e.target.value + 'T00:00:00');
                                d.setDate(d.getDate() + 1);
                                setCheckOutDate(d.toISOString().split('T')[0]);
                              }
                            }}
                            className={`w-full bg-slate-50 dark:bg-slate-800 border ${isCheckInOff ? 'border-red-500 focus:ring-red-500' : 'border-indigo-200 dark:border-indigo-700 focus:ring-indigo-500'} rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1`}
                          />
                          {isCheckInOff && (
                            <p className="text-red-500 text-[10px] mt-1 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">error</span>
                              Shop nghỉ ngày này
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Trả phòng</label>
                          <input
                            type="date"
                            min={(() => { const d = new Date(checkInDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                            value={checkOutDate}
                            onChange={e => setCheckOutDate(e.target.value)}
                            className={`w-full bg-slate-50 dark:bg-slate-800 border ${isCheckOutOff ? 'border-red-500 focus:ring-red-500' : 'border-indigo-200 dark:border-indigo-700 focus:ring-indigo-500'} rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1`}
                          />
                          {isCheckOutOff && (
                            <p className="text-red-500 text-[10px] mt-1 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">error</span>
                              Shop nghỉ ngày này
                            </p>
                          )}
                        </div>
                      </div>
                      {boardingDays > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-sm">
                          <span className="text-indigo-700 dark:text-indigo-300 font-semibold">Tổng thời gian:</span>
                          <span className="font-black text-indigo-900 dark:text-indigo-200">{boardingDays} ngày</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dịch vụ thường: date + time slots — Luôn hiển thị, disabled khi chưa chọn */}
                  {!isHotelSelected && (
                    <div className={`flex flex-col gap-5 transition-opacity duration-300 ${hasNormalServices ? 'opacity-100' : 'opacity-40 pointer-events-none select-none'}`}>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                          Ngày hẹn
                        </label>
                        <input
                          type="date"
                          min={today.toISOString().split('T')[0]}
                          value={selectedDate}
                          onChange={e => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                          disabled={!hasNormalServices}
                          className={`w-full bg-slate-50 dark:bg-slate-800 border ${isSelectedDateOff ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#1a2b4c]`}
                        />
                        {isSelectedDateOff && (
                           <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1">
                             <span className="material-symbols-outlined text-[16px]">error</span>
                             Shop tạm nghỉ ngày này, hãy chọn ngày khác.
                           </p>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                            Khung giờ
                          </span>
                          <span className="text-xs text-[#1a2b4c] dark:text-teal-400 font-semibold">
                            {selectedDate
                              ? new Date(selectedDate + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })
                              : `${dayName}, ${dateStr}`}
                          </span>
                        </div>

                        <div className="relative min-h-[220px] transition-all duration-300">
                          {slotsLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg">
                              <span className="w-5 h-5 border-2 border-slate-300 border-t-[#1a2b4c] rounded-full animate-spin" />
                              <span className="text-[10px] text-slate-500 font-semibold">Đang cập nhật...</span>
                            </div>
                          )}
                          {allTimeSlots.length === 0 ? (
                            <div className="py-8 text-center flex flex-col items-center justify-center h-full">
                              <span className="material-symbols-outlined text-slate-300 text-3xl block mb-2">schedule</span>
                              <p className="text-xs text-slate-400 font-medium">
                                {hasNormalServices ? 'Đang tải khung giờ...' : 'Chọn dịch vụ để xem khung giờ'}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {allTimeSlots.map((time) => {
                                const isAvailable = availableSlots.includes(time);
                                const isSelected = selectedTime === time;
                                return (
                                  <button
                                    key={time}
                                    disabled={!isAvailable}
                                    onClick={() => isAvailable && setSelectedTime(time)}
                                    title={!isAvailable ? 'Không còn nhân viên rảnh trong khung giờ này' : undefined}
                                    className={`py-2 text-xs font-semibold rounded border transition-all relative ${isSelected
                                        ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] shadow-md dark:bg-teal-500 dark:border-teal-500'
                                        : isAvailable
                                          ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:border-[#1a2b4c] hover:text-[#1a2b4c] dark:hover:border-teal-400 dark:hover:text-teal-400 cursor-pointer'
                                          : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through'
                                      }`}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Chú thích */}
                        {allTimeSlots.length > 0 && (
                          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-sm bg-white border border-slate-300 inline-block" />
                              <span className="text-[10px] text-slate-400">Còn trống</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 inline-block" />
                              <span className="text-[10px] text-slate-400">Hết nhân viên</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Khi có hotel và có dịch vụ thường → vẫn hiện date+time */}
                  {isHotelSelected && hasNormalServices && (
                    <>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                          Dịch vụ thường — Ngày hẹn
                        </label>
                        <input
                          type="date"
                          min={today.toISOString().split('T')[0]}
                          value={selectedDate}
                          onChange={e => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#1a2b4c]"
                        />
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                            Khung giờ
                          </span>
                          <span className="text-xs text-[#1a2b4c] dark:text-teal-400 font-semibold">
                            {selectedDate
                              ? new Date(selectedDate + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })
                              : `${dayName}, ${dateStr}`}
                          </span>
                        </div>

                        <div className="relative min-h-[220px]">
                          {slotsLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg">
                              <span className="w-5 h-5 border-2 border-slate-300 border-t-[#1a2b4c] rounded-full animate-spin" />
                              <span className="text-[10px] text-slate-500 font-semibold">Đang cập nhật...</span>
                            </div>
                          )}
                          {allTimeSlots.length === 0 ? (
                            <div className="py-8 text-center flex flex-col items-center justify-center h-full">
                              <span className="material-symbols-outlined text-slate-300 text-3xl block mb-2">schedule</span>
                              <p className="text-xs text-slate-400 font-medium">Chọn dịch vụ để xem khung giờ</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {allTimeSlots.map((time) => {
                                const isAvailable = availableSlots.includes(time);
                                const isSelected = selectedTime === time;
                                return (
                                  <button
                                    key={time}
                                    disabled={!isAvailable}
                                    onClick={() => isAvailable && setSelectedTime(time)}
                                    title={!isAvailable ? 'Không còn nhân viên rảnh trong khung giờ này' : undefined}
                                    className={`py-2 text-xs font-semibold rounded border transition-all relative ${isSelected
                                        ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] shadow-md dark:bg-teal-500 dark:border-teal-500'
                                        : isAvailable
                                          ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:border-[#1a2b4c] hover:text-[#1a2b4c] dark:hover:border-teal-400 dark:hover:text-teal-400 cursor-pointer'
                                          : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through'
                                      }`}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Chú thích */}
                        {allTimeSlots.length > 0 && (
                          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-sm bg-white border border-slate-300 inline-block" />
                              <span className="text-[10px] text-slate-400">Còn trống</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 inline-block" />
                              <span className="text-[10px] text-slate-400">Hết nhân viên</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* ── Staff Selection / Auto Assignment Info ──────────────── */}
                  <AnimatePresence>
                    {hasNormalServices && selectedDate && selectedTime && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        {(!shop?.assignmentMode || shop.assignmentMode === 'MANUAL') ? (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Chọn nhân viên
                              </label>
                              {selectedStaffId && (
                                <button
                                  onClick={() => setSelectedStaffId(null)}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold transition-colors"
                                >
                                  Bỏ chọn
                                </button>
                              )}
                            </div>

                            {staffAvailabilityLoading ? (
                              <div className="flex items-center gap-2 py-3 px-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="w-4 h-4 border-2 border-slate-300 border-t-[#1a2b4c] rounded-full animate-spin shrink-0" />
                                <span className="text-xs text-slate-400">Đang kiểm tra lịch nhân viên...</span>
                              </div>
                            ) : staffWithAvailability.length === 0 ? (
                              <div className="py-3 px-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center text-xs text-slate-400">
                                Không có nhân viên nào
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {/* "Bất kỳ nhân viên" option */}
                                <button
                                  onClick={() => setSelectedStaffId(null)}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all ${selectedStaffId === null
                                      ? 'border-[#1a2b4c] bg-[#1a2b4c]/5 dark:border-teal-400 dark:bg-teal-900/10'
                                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-slate-400 text-lg">groups</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Bất kỳ nhân viên</p>
                                    <p className="text-[10px] text-slate-400">Hệ thống tự phân công</p>
                                  </div>
                                  {selectedStaffId === null && (
                                    <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400 text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  )}
                                </button>

                                {/* Staff list */}
                                {staffWithAvailability.map((staff) => {
                                  const isSelected = selectedStaffId === staff.id;
                                  const isBusy = staff.available === false;
                                  return (
                                    <button
                                      key={staff.id}
                                      onClick={() => setSelectedStaffId(staff.id)}
                                      disabled={isBusy}
                                      className={`flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all ${isSelected
                                          ? 'border-[#1a2b4c] bg-[#1a2b4c]/5 dark:border-teal-400 dark:bg-teal-900/10'
                                          : isBusy
                                            ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 opacity-60 cursor-not-allowed'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-[#1a2b4c]/40 dark:hover:border-teal-700 cursor-pointer'
                                        }`}
                                    >
                                      <div className="relative shrink-0">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-[#1a2b4c] flex items-center justify-center text-white font-bold text-sm">
                                          {staff.fullName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${isBusy ? 'bg-red-400' : 'bg-green-400'}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{staff.fullName}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{staff.specialization || staff.role || 'Nhân viên'}</p>
                                      </div>
                                      <div className="shrink-0 text-right">
                                        {isBusy ? (
                                          <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">Bận</span>
                                        ) : (
                                          isSelected
                                            ? <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            : <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">Rảnh</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Busy staff warning + suggestions */}
                            {selectedStaffBusy && (
                              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                <div className="flex items-start gap-2 mb-2">
                                  <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">warning</span>
                                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                                    Nhân viên này đã có lịch vào khung giờ bạn chọn.
                                  </p>
                                </div>
                                {suggestedStaff.length > 0 && (
                                  <>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-300 mb-2 font-medium">Gợi ý nhân viên rảnh:</p>
                                    <div className="flex flex-col gap-1.5">
                                      {suggestedStaff.map((s) => (
                                        <button
                                          key={s.id}
                                          onClick={() => setSelectedStaffId(s.id)}
                                          className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-700 hover:border-[#1a2b4c] dark:hover:border-teal-500 transition-colors text-left"
                                        >
                                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-[#1a2b4c] flex items-center justify-center text-white font-bold text-xs shrink-0">
                                            {s.fullName.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{s.fullName}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{s.specialization || s.role || 'Nhân viên'}</p>
                                          </div>
                                          <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full shrink-0">Chọn</span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                                {suggestedStaff.length === 0 && (
                                  <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                                    Không có nhân viên rảnh vào khung giờ này. Vui lòng chọn giờ khác.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 p-4 rounded-xl border border-teal-100 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-900/20 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  {shop.assignmentMode === 'AUTO' ? 'psychology' : 'groups'}
                                </span>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-teal-900 dark:text-teal-100 mb-1">
                                  {shop.assignmentMode === 'AUTO' ? 'Phân bổ thông minh (AI)' : 'Đội ngũ chuyên nghiệp'}
                                </h4>
                                <p className="text-xs text-teal-700 dark:text-teal-300 leading-relaxed">
                                  {shop.assignmentMode === 'AUTO'
                                    ? 'Hệ thống AI sẽ phân tích và lựa chọn nhân viên có chuyên môn phù hợp nhất đang rảnh vào khung giờ bạn chọn.'
                                    : 'Đơn sẽ được chuyển đến hệ thống của phòng khám. Nhân viên chuyên môn phù hợp nhất sẽ chủ động tiếp nhận để phục vụ bé.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Fixed CTA Footer */}
                <div className="p-6 pt-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-4 shrink-0">
                  {/* CTA */}
                  <button
                    onClick={handleBookClick}
                    disabled={!canBook}
                    className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold transition-all text-base ${canBook
                        ? "bg-[#1a2b4c] dark:bg-teal-500 text-white hover:bg-[#243d6b] dark:hover:bg-teal-400 hover:scale-[1.02] shadow-lg shadow-[#1a2b4c]/25 dark:shadow-teal-900/50 cursor-pointer"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border dark:border-slate-700 cursor-not-allowed"
                      }`}
                  >
                    <span className="material-symbols-outlined">calendar_month</span>
                    {canBook
                      ? "Đặt lịch ngay"
                      : !isHotelSelected && !hasNormalServices
                        ? "Chọn dịch vụ trước"
                        : isHotelSelected && !boardingReady
                          ? "Chọn ngày nhận & trả phòng"
                          : hasNormalServices && !normalReady
                            ? "Chọn ngày & giờ hẹn"
                            : "Đặt lịch ngay"}
                  </button>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        if (!user) {
                          setShowLoginPrompt(true);
                        } else {
                          window.location.href = `tel:${shop?.phone || ''}`;
                        }
                      }}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold text-sm transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-lg">call</span>
                      Gọi điện
                    </button>

                    <button
                      onClick={() => {
                        if (!user) {
                          setShowLoginPrompt(true);
                        } else {
                          navigate(`/messages?shopId=${shop?.id}&shopName=${encodeURIComponent(shop?.shopName || '')}`);
                        }
                      }}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-100 font-semibold text-sm transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-lg">chat</span>
                      Nhắn tin
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1 text-xs text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-sm text-teal-500">
                      verified_user
                    </span>
                    Đặt lịch miễn phí · Hủy dễ dàng
                  </div>
                </div>
              </div>

              {/* Map and Nearby Shops Restored to Right Column */}
              <div className="flex flex-col gap-6">
                {/* Map Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400">location_on</span>
                    Địa chỉ & Liên hệ
                  </h3>
                  <div
                    className="w-full h-40 rounded-xl overflow-hidden relative cursor-pointer group bg-slate-100 dark:bg-slate-800"
                    onClick={() => {
                      if (userLocation && shop && shop.latitude && shop.longitude) {
                        setShowMap(true);
                      }
                    }}
                  >
                    {/* The actual mini map */}
                    {userLocation && shop && shop.latitude && shop.longitude && (
                      <div className="absolute inset-0 pointer-events-none z-0">
                        <ShopMap
                          userLocation={userLocation}
                          nearbyShops={[]}
                          currentShop={{
                            id: shop.id,
                            latitude: shop.latitude,
                            longitude: shop.longitude,
                            shopName: shop.shopName,
                          }}
                        />
                      </div>
                    )}

                    {/* Overlay for hover effect */}
                    <div className="absolute inset-0 bg-transparent group-hover:bg-[#1a2b4c]/10 transition-colors z-10" />
                    {userLocation && shop && shop.latitude && shop.longitude ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMap(true);
                        }}
                        className="absolute bottom-3 right-3 bg-white text-[#1a2b4c] px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md hover:bg-slate-100 transition-all flex items-center gap-1 z-10"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Mở bản đồ
                      </button>
                    ) : (
                      <div className="absolute bottom-3 right-3 bg-slate-100 text-slate-400 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_off</span>
                        Chưa có vị trí
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 px-1">
                      <span className="material-symbols-outlined text-slate-400 mt-0.5 text-lg">map</span>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {shop ? `${shop.address}${shop.city ? `, ${shop.city}` : ''}` : '---'}
                      </p>
                    </div>
                    <div className="flex items-start gap-3 px-1">
                      <span className="material-symbols-outlined text-slate-400 mt-0.5 text-lg">schedule</span>
                      <div className="flex flex-col text-xs">
                        {shop?.openTime && shop?.closeTime ? (
                          <>
                            <span className="text-green-600 dark:text-green-400 font-semibold">Đang mở cửa</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {shop.openTime} - {shop.closeTime}
                              {shop.workingDays ? ` (${shop.workingDays})` : ''}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Chưa cập nhật giờ mở cửa</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-1">
                      <span className="material-symbols-outlined text-slate-400 text-lg">phone</span>
                      <a href={`tel:${shop?.phone}`} className="text-xs text-[#1a2b4c] dark:text-teal-400 font-semibold hover:underline">
                        {shop?.phone ?? '---'}
                      </a>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>
        {/* Mobile bottom bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 z-50 shadow-2xl">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500">Giá khám từ</span>
            <span className="font-black text-xl text-slate-900 dark:text-slate-100">150.000đ</span>
          </div>
          <div className="flex gap-2 flex-1">
            <button className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm">
              <span className="material-symbols-outlined text-base">call</span>
            </button>
            <Link
              to="/bookings"
              className="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl bg-[#1a2b4c] text-white font-bold text-sm shadow-lg shadow-[#1a2b4c]/25"
            >
              <span className="material-symbols-outlined text-base">calendar_month</span>
              Đặt lịch ngay
            </Link>
          </div>
        </div>

        {/* Space for mobile bottom bar */}
        <div className="lg:hidden h-24" />

        {/* ── Pet Selection Modal ─────────────────────────────────────────────── */}
        {showPetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chọn thú cưng</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Bé nào sẽ sử dụng dịch vụ hôm nay?</p>
                </div>
                <button
                  onClick={() => { setShowPetModal(false); setViewingBookingsPetId(null); setPetBookings([]); setPetAvailabilityMap({}); }}
                  className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-slate-500">close</span>
                </button>
              </div>

              {/* Pet list */}
              <div className="p-5 space-y-3 max-h-72 overflow-y-auto">
                {myPets.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <span className="material-symbols-outlined text-4xl block mb-2">pets</span>
                    <p className="text-sm font-semibold">Bạn chưa có thú cưng nào</p>
                    <Link
                      to="/profile/pets"
                      className="mt-2 inline-block text-sm text-[#1a2b4c] dark:text-teal-400 font-bold hover:underline"
                      onClick={() => setShowPetModal(false)}
                    >
                      + Thêm thú cưng
                    </Link>
                  </div>
                ) : loadingPetAvailability ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    <span className="text-sm">Đang kiểm tra lịch hẹn...</span>
                  </div>
                ) : (
                  (myPets as any[]).filter((p: any) => p.active).map((pet: any) => {
                    const isAvailable = petAvailabilityMap[pet.id] !== false; // undefined = chưa check = cho phép
                    const isBusy = petAvailabilityMap[pet.id] === false;
                    const isSelected = selectedPet?.id === pet.id;

                    return (
                      <div key={pet.id} className="flex items-center gap-2">
                        {/* Pet card */}
                        <button
                          onClick={() => !isBusy && setSelectedPet(pet)}
                          disabled={isBusy}
                          className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isBusy
                              ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                              : isSelected
                                ? 'border-[#1a2b4c] bg-[#1a2b4c]/5 dark:border-teal-400 dark:bg-teal-900/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-[#1a2b4c]/40'
                            }`}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-600 shadow">
                            {pet.avatar
                              ? <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400">pets</span>
                              </div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white">{pet.name}</p>
                            <p className="text-xs text-slate-500">{pet.species} · {pet.breed} · {pet.weight}kg</p>
                            {isBusy && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">
                                <span className="material-symbols-outlined text-xs">event_busy</span>
                                Đã có lịch hẹn
                              </span>
                            )}
                          </div>
                          {isSelected && !isBusy && (
                            <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          )}
                        </button>

                        {/* Nút xem lịch hẹn — chỉ hiện khi pet bị busy */}
                        {isBusy && (
                          <button
                            onClick={async () => {
                              setViewingBookingsPetId(pet.id);
                              setLoadingPetBookings(true);
                              try {
                                const bookings = await bookingService.getMyBookings();
                                const active = bookings.filter((b: any) =>
                                  b.petId === pet.id &&
                                  ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)
                                );
                                setPetBookings(active);
                              } catch {
                                setPetBookings([]);
                              } finally {
                                setLoadingPetBookings(false);
                              }
                            }}
                            className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                            title="Xem lịch hẹn của bé"
                          >
                            <span className="material-symbols-outlined text-lg">calendar_month</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Panel xem lịch hẹn của pet */}
                {viewingBookingsPetId !== null && (
                  <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">event_busy</span>
                        Lịch hẹn đang hoạt động
                      </p>
                      <button
                        onClick={() => { setViewingBookingsPetId(null); setPetBookings([]); }}
                        className="text-amber-500 hover:text-amber-700"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                    {loadingPetBookings ? (
                      <div className="flex items-center gap-2 text-amber-600 text-xs">
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        Đang tải...
                      </div>
                    ) : petBookings.length === 0 ? (
                      <p className="text-xs text-amber-600">Không tìm thấy lịch hẹn.</p>
                    ) : (
                      <div className="space-y-2">
                        {petBookings.map((b: any) => (
                          <div key={b.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 text-xs border border-amber-100 dark:border-amber-900">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800 dark:text-slate-100">#{b.id} · {b.shopName}</span>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${b.status === 'CONFIRMED'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                {b.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đang thực hiện'}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400">{b.serviceName}</p>
                            <p className="text-slate-500 dark:text-slate-500 mt-0.5">
                              🕐 {new Date(b.appointmentDatetime).toLocaleString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => { setShowPetModal(false); setViewingBookingsPetId(null); setPetBookings([]); setPetAvailabilityMap({}); }}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmPet}
                  disabled={!selectedPet || checkingPet}
                  className="flex-1 py-3 bg-[#1a2b4c] text-white font-bold rounded-xl hover:bg-[#243d6b] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {checkingPet ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      Đang kiểm tra...
                    </>
                  ) : (
                    'Tiếp tục thanh toán →'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Staff Detail Modal */}
        {selectedStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedStaff(null)}>
            <div
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header / Cover */}
              <div className="relative h-32 bg-gradient-to-r from-[#1a2b4c] to-indigo-900">
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="absolute top-4 right-4 size-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors backdrop-blur-md"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="px-8 pb-8">
                {/* Profile Info */}
                <div className="relative flex flex-col md:flex-row gap-6 -mt-12 mb-8">
                  <div className="relative">
                    <img
                      src={(selectedStaff as any).avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&auto=format&fit=crop'}
                      alt={selectedStaff.fullName}
                      className="size-32 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl"
                    />
                    <div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-teal-500 border-4 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-lg">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                    </div>
                  </div>
                  <div className="pt-14 md:pt-14 flex-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      {selectedStaff.fullName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
                        {selectedStaff.role}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
                        {selectedStaff.specialization}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detail Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">badge</span>
                        Thông tin liên hệ
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-base">call</span>
                          </div>
                          <span className="text-sm font-medium">{selectedStaff.phone || 'Chưa cập nhật'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-base">mail</span>
                          </div>
                          <span className="text-sm font-medium truncate">{(selectedStaff as any).email || 'Chưa cập nhật'}</span>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        Chứng chỉ & Bằng cấp
                      </h4>
                      {selectedStaff.certificates && selectedStaff.certificates.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {selectedStaff.certificates.map((cert) => (
                            <div
                              key={cert.id}
                              className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${cert.status === 'VERIFIED'
                                  ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/50'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cert.certificateName}</span>
                                {cert.status === 'VERIFIED' && (
                                  <span className="material-symbols-outlined text-teal-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                )}
                              </div>
                              {cert.imageUrl && (
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group/img">
                                  <img
                                    src={cert.imageUrl}
                                    alt={cert.certificateName}
                                    className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                                  />
                                  <a
                                    href={cert.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity"
                                  >
                                    <span className="material-symbols-outlined text-2xl">zoom_in</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Chưa có thông tin chứng chỉ.</p>
                      )}
                    </section>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => setSelectedStaff(null)}
                    className="px-8 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-slate-200 dark:shadow-none"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Service Detail Modal */}
        {selectedServiceForDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedServiceForDetail(null)}>
            <div
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header / Cover */}
              <div className="relative h-48 bg-slate-100 dark:bg-slate-800">
                {selectedServiceForDetail.imageUrl ? (
                  <img
                    src={selectedServiceForDetail.imageUrl}
                    alt={selectedServiceForDetail.serviceName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-[#1a2b4c] to-indigo-900">
                    <span className="material-symbols-outlined text-white text-6xl">pets</span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedServiceForDetail(null)}
                  className="absolute top-4 right-4 size-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors backdrop-blur-md"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-8">
                {/* Title & Price */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      {selectedServiceForDetail.serviceName}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
                        {selectedServiceForDetail.category}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {selectedServiceForDetail.durationMinutes} phút
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-2xl text-slate-900 dark:text-white">
                      {selectedServiceForDetail.price.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-xs text-slate-400">/lần</span>
                  </div>
                </div>

                {/* Description */}
                <section className="mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">description</span>
                    Mô tả dịch vụ
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedServiceForDetail.description || 'Chưa có mô tả chi tiết cho dịch vụ này.'}
                  </p>
                </section>

                {/* Features / Benefits */}
                <section className="mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">task_alt</span>
                    Bao gồm trong dịch vụ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-teal-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>Quy trình chuẩn y khoa / chuyên nghiệp</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-teal-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>Sử dụng sản phẩm cao cấp, an toàn</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-teal-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>Nhân viên có chứng chỉ chuyên môn</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-teal-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>Tư vấn chăm sóc sau dịch vụ</span>
                    </div>
                  </div>
                </section>

                {/* Action */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedServiceForDetail(null)}
                    className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={() => {
                      toggleService(selectedServiceForDetail.id);
                      setSelectedServiceForDetail(null);
                    }}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-xl flex items-center gap-2 ${selectedServiceIds.includes(selectedServiceForDetail.id)
                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200 dark:shadow-none'
                        : 'bg-[#1a2b4c] text-white hover:bg-[#243d6b] shadow-slate-200 dark:shadow-none'
                      }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {selectedServiceIds.includes(selectedServiceForDetail.id) ? 'remove_circle' : 'add_circle'}
                    </span>
                    {selectedServiceIds.includes(selectedServiceForDetail.id) ? 'Bỏ chọn' : 'Chọn dịch vụ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ── MAP MODAL ── */}
        <AnimatePresence>
          {showMap && userLocation && shop && shop.latitude && shop.longitude && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowMap(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className={`bg-white dark:bg-slate-900 overflow-hidden flex flex-col relative shadow-2xl transition-all duration-300 ${isMapFullscreen
                    ? 'w-full h-full rounded-none'
                    : 'rounded-[32px] w-full max-w-5xl h-[85vh]'
                  }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-3xl">map</span>
                      Vị trí & Chỉ đường
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">Đến {shop.shopName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                      className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                      title={isMapFullscreen ? "Thu nhỏ" : "Phóng to"}
                    >
                      <span className="material-symbols-outlined">
                        {isMapFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                      </span>
                    </button>
                    <button
                      onClick={() => handleGetDirections(shopId)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:-translate-y-0.5 uppercase tracking-widest"
                    >
                      <span className="material-symbols-outlined text-lg">directions</span>
                      Chỉ đường
                    </button>
                    <button
                      onClick={() => {
                        setShowMap(false);
                        setIsMapFullscreen(false);
                      }}
                      className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>

                {/* Map Body */}
                <div className="flex-1 min-h-0 relative bg-slate-50 dark:bg-slate-950 p-2">
                  <div className="w-full h-full rounded-[24px] overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-800">
                    <ShopMap
                      userLocation={userLocation}
                      nearbyShops={[]}
                      currentShop={{
                        id: shop.id,
                        latitude: shop.latitude,
                        longitude: shop.longitude,
                        shopName: shop.shopName,
                      }}
                      directions={directions}
                      onShopClick={(id) => {
                        setShowMap(false);
                        navigate(`/clinic/${id}`);
                      }}
                    />
                  </div>
                </div>

                {/* Directions Summary Footer */}
                <AnimatePresence>
                  {directions && directions.routes && directions.routes.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 dark:border-slate-800 p-6 shrink-0 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-8 justify-center">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[16px] bg-teal-500/10 text-teal-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">straighten</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Khoảng cách</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                              {directions.routes[0].legs[0].distance.text}
                            </p>
                          </div>
                        </div>
                        <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[16px] bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">schedule</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Thời gian</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                              {directions.routes[0].legs[0].duration.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Login Prompt Modal */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl relative"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-4xl text-indigo-500">lock_person</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                  Yêu cầu đăng nhập
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                  Bạn cần đăng nhập hoặc tạo tài khoản để có thể đặt lịch hẹn, gọi điện và nhắn tin với cơ sở này.
                </p>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/login', { state: { from: `/clinic/${shopId}` } })}
                    className="w-full py-3.5 px-4 bg-[#1a2b4c] text-white rounded-xl font-bold hover:bg-[#111c33] transition-colors"
                  >
                    Đăng nhập ngay
                  </button>
                  <button
                    onClick={() => navigate('/register', { state: { from: `/clinic/${shopId}` } })}
                    className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Tạo tài khoản mới
                  </button>
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="w-full py-3 px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold text-sm transition-colors mt-2"
                  >
                    Bỏ qua
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
