import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { X, Calendar, Clock, Loader2, Check, Scissors, AlertCircle, Dog } from 'lucide-react';
import toast from 'react-hot-toast';

import { petService } from '../../services/pet.service';
import { shopService } from '../../services/shop.service';
import { bookingService } from '../../services/booking.service';
import { useTheme } from '../../contexts/ThemeContext';
import type { Pet } from '../../types';
import type { ServiceResponse } from '../../types/api';

interface ShopAddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  shopId: number;
  defaultPetId: number;
  onSuccess: () => void;
}

export default function ShopAddBookingModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  shopId,
  defaultPetId,
  onSuccess
}: ShopAddBookingModalProps) {
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  const [selectedPetId, setSelectedPetId] = useState<number>(defaultPetId);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState<Date>(new Date());
  const [checkOutDate, setCheckOutDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffWithAvailability, setStaffWithAvailability] = useState<any[]>([]);
  const [staffAvailabilityLoading, setStaffAvailabilityLoading] = useState(false);
  const [note, setNote] = useState('');

  // Fetch pets
  const { data: pets = [], isLoading: loadingPets } = useQuery({
    queryKey: ['petsByOwner', customerId],
    queryFn: () => petService.getByOwner(customerId),
    enabled: isOpen && !!customerId,
  });

  // Fetch shop services
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['shopServices', shopId],
    queryFn: () => shopService.getShopServices(shopId),
    enabled: isOpen && !!shopId,
  });

  // Fetch shop bookings to check busy pets
  const { data: shopBookings = [] } = useQuery({
    queryKey: ['shopBookings', shopId],
    queryFn: () => bookingService.getShopBookings(),
    enabled: isOpen && !!shopId,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPetId(defaultPetId);
      setSelectedServices([]);
      setSelectedDate(new Date());
      setSelectedTime('');
      setCheckInDate(new Date());
      setCheckOutDate(addDays(new Date(), 1));
      setSelectedStaffId(null);
      setNote('');
    }
  }, [isOpen, defaultPetId]);

  const isHotelSelected = services.some(s => selectedServices.includes(s.id) && (s.category === 'BOARDING' || s.category.toUpperCase() === 'HOTEL'));
  const hasNormalServices = services.some(s => selectedServices.includes(s.id) && s.category !== 'BOARDING' && s.category.toUpperCase() !== 'HOTEL');

  const primaryServiceDuration = React.useMemo(() => {
    if (selectedServices.length > 0) {
      const svc = services.find(s => s.id === selectedServices[0]);
      return svc?.durationMinutes ?? 60;
    }
    return 60;
  }, [selectedServices, services]);

  const appointmentDatetimeForQuery = hasNormalServices && selectedDate && selectedTime
    ? `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`
    : null;

  // Fetch global availability for pets when date/time is selected
  const { data: busyPetsFromApi = {} } = useQuery({
    queryKey: ['busyPetsGlobal', appointmentDatetimeForQuery, primaryServiceDuration, pets.map(p => p.id).join(',')],
    queryFn: async () => {
      if (!appointmentDatetimeForQuery) return {};
      const results: Record<number, boolean> = {};
      await Promise.all(
        pets.map(async (pet) => {
          try {
            const isAvailable = await bookingService.checkPetAvailability(pet.id, appointmentDatetimeForQuery, primaryServiceDuration);
            results[pet.id] = !isAvailable; // busy if NOT available
          } catch (e) {
            results[pet.id] = false;
          }
        })
      );
      return results;
    },
    enabled: isOpen && !!appointmentDatetimeForQuery && pets.length > 0,
  });

  useEffect(() => {
    if (!appointmentDatetimeForQuery || !shopId) {
      setStaffWithAvailability([]);
      setSelectedStaffId(null);
      return;
    }
    
    let cancelled = false;
    setStaffAvailabilityLoading(true);
    
    bookingService
      .getShopStaffAvailability(shopId, appointmentDatetimeForQuery, primaryServiceDuration)
      .then((data) => {
        if (!cancelled) setStaffWithAvailability(data);
      })
      .catch(() => {
        // Fallback or error handling
        bookingService.getShopStaff(shopId).then(data => {
            if (!cancelled) setStaffWithAvailability(data.map((s: any) => ({...s, available: true})));
        });
      })
      .finally(() => {
        if (!cancelled) setStaffAvailabilityLoading(false);
      });
      
    return () => { cancelled = true; };
  }, [appointmentDatetimeForQuery, shopId, primaryServiceDuration]);

  // Generate next 14 days
  const availableDates = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

  // Fetch available slots
  const { data: availableSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['availableSlots', shopId, format(selectedDate, 'yyyy-MM-dd'), selectedServices],
    queryFn: () => bookingService.getAvailableTimeSlotsForServices(
      shopId,
      format(selectedDate, 'yyyy-MM-dd'),
      selectedServices
    ),
    enabled: isOpen && !!shopId && hasNormalServices,
  });

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: any) => bookingService.createBookingByShop(data),
    onSuccess: () => {
      toast.success('Tạo lịch hẹn thành công!');
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const code = error.response?.data?.code;
      const message = error.response?.data?.message;
      if (code === 5013 || message?.includes('pet already has an active booking') || message?.includes('Thú cưng này đã có lịch')) {
        toast.error('Thú cưng này đã có lịch đặt trong thời gian yêu cầu');
      } else if (code === 5014 || message?.includes('staff member is already booked') || message?.includes('Nhân viên này đã có lịch')) {
        toast.error('Nhân viên này đã có lịch đặt trong thời gian yêu cầu');
      } else if (code === 5015 || message?.includes('No staff available') || message?.includes('Không có nhân viên nào')) {
        toast.error('Không có nhân viên nào rảnh trong khung giờ này. Vui lòng chọn giờ khác.');
      } else {
        toast.error(message || 'Tạo lịch hẹn thất bại');
      }
    }
  });

  const isPetBusyAtSelectedTime = (petId: number) => {
    const isBusyLocally = shopBookings.some((b: any) => {
      if (b.petId !== petId) return false;
      if (!['WAITING_SHOP_APPROVAL', 'CONFIRMED', 'IN_PROGRESS', 'PENDING_PAYMENT'].includes(b.status)) return false;

      if (isHotelSelected) {
        if (!b.checkIn && !b.checkOut) return false;
        const bIn = new Date(b.checkIn || b.appointmentDatetime).getTime();
        const bOut = new Date(b.checkOut || b.appointmentDatetime).getTime();
        const sIn = checkInDate.getTime();
        const sOut = checkOutDate.getTime();
        return sIn < bOut && sOut > bIn;
      } 
      
      const bDate = new Date(b.appointmentDatetime || b.checkIn);
      if (!isSameDay(bDate, selectedDate)) return false;
      
      if (selectedTime && b.appointmentDatetime) {
        const bMinutes = bDate.getHours() * 60 + bDate.getMinutes();
        const [sH, sM] = selectedTime.split(':').map(Number);
        const sMinutes = sH * 60 + sM;
        return Math.abs(bMinutes - sMinutes) < 60;
      }
      
      return false;
    });

    if (isBusyLocally) return true;
    if (busyPetsFromApi[petId]) return true;

    return false;
  };

  const handleSubmit = () => {
    if (!selectedPetId) return toast.error('Vui lòng chọn thú cưng');
    
    if (isPetBusyAtSelectedTime(selectedPetId)) {
      return toast.error('Thú cưng đang có lịch bận trong khoảng thời gian này!');
    }

    if (selectedServices.length === 0) return toast.error('Vui lòng chọn dịch vụ');
    if (hasNormalServices && !selectedTime) return toast.error('Vui lòng chọn giờ hẹn cho dịch vụ thường');
    if (isHotelSelected && checkInDate >= checkOutDate) return toast.error('Ngày trả phòng phải sau ngày nhận phòng');

    const appointmentDatetime = hasNormalServices
      ? `${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}:00`
      : `${format(checkInDate, 'yyyy-MM-dd')}T12:00:00`;

    const checkIn = isHotelSelected ? `${format(checkInDate, 'yyyy-MM-dd')}T12:00:00` : undefined;
    const checkOut = isHotelSelected ? `${format(checkOutDate, 'yyyy-MM-dd')}T12:00:00` : undefined;

    createBookingMutation.mutate({
      customerId,
      shopId,
      petId: selectedPetId,
      serviceIds: selectedServices,
      appointmentDatetime,
      checkIn,
      checkOut,
      staffId: selectedStaffId || undefined,
      note
    });
  };

  const toggleService = (id: number) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    setSelectedTime(''); // Reset time when services change
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`shrink-0 flex items-center justify-between p-6 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div>
              <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Đặt lịch thêm
              </h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Cho khách hàng: <span className="font-bold text-indigo-500">{customerName}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* Thú cưng */}
            <section>
              <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Dog size={16} className="text-indigo-500" /> Chọn thú cưng
              </h3>
              
              {loadingPets ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="animate-spin text-indigo-500" />
                </div>
              ) : pets.length === 0 ? (
                <div className={`p-4 rounded-xl text-center text-sm ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                  Khách hàng này chưa có thú cưng nào.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pets.map((pet) => {
                    const isBusy = isPetBusyAtSelectedTime(pet.id);
                    
                    return (
                    <button
                      key={pet.id}
                      disabled={isBusy}
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`flex flex-col gap-2 p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                        isBusy 
                          ? (isDark ? 'border-slate-800 bg-slate-800/50 opacity-50 cursor-not-allowed' : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed')
                          : selectedPetId === pet.id
                            ? (isDark ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-600 bg-indigo-50')
                            : (isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-100 hover:border-slate-200')
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                          {pet.avatar ? (
                            <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🐾</div>
                          )}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{pet.name}</p>
                          <p className="text-xs text-slate-500 truncate">{pet.species} - {pet.weight}kg</p>
                        </div>
                      </div>
                      
                      {isBusy && (
                        <div className="w-full mt-1 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center justify-center gap-1">
                          <AlertCircle size={10} /> Đang có dịch vụ
                        </div>
                      )}
                    </button>
                  )})}
                </div>
              )}
            </section>

            {/* Dịch vụ */}
            <section>
              <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Scissors size={16} className="text-pink-500" /> Chọn dịch vụ
              </h3>
              
              {loadingServices ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="animate-spin text-pink-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.filter(s => s.active).map((service) => {
                    const isSelected = selectedServices.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                          isSelected
                            ? (isDark ? 'border-pink-500 bg-pink-500/10' : 'border-pink-600 bg-pink-50')
                            : (isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-100 hover:border-slate-200')
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-pink-500 text-white rounded-bl-2xl">
                            <Check size={14} />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{service.serviceName}</p>
                          <p className="text-xs font-medium text-pink-500 mt-1">{service.price.toLocaleString('vi-VN')} đ</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Ngày và giờ cho dịch vụ thường */}
            {hasNormalServices && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Calendar size={16} className="text-emerald-500" /> Chọn ngày
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {availableDates.map((date) => {
                      const isSelected = isSameDay(date, selectedDate);
                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedTime('');
                          }}
                          className={`flex flex-col items-center min-w-[72px] p-3 rounded-2xl border-2 transition-all ${
                            isSelected
                              ? (isDark ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-emerald-600 bg-emerald-50 text-emerald-700')
                              : (isDark ? 'border-slate-800 text-slate-400 hover:border-slate-700' : 'border-slate-100 text-slate-500 hover:border-slate-200')
                          }`}
                        >
                          <span className="text-xs font-bold uppercase mb-1">{format(date, 'eee', { locale: vi })}</span>
                          <span className="text-lg font-black">{format(date, 'dd')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    <Clock size={16} className="text-amber-500" /> Chọn giờ
                  </h3>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="animate-spin text-amber-500" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className={`p-4 flex items-center justify-center gap-2 rounded-xl text-sm ${
                      isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                    }`}>
                      <AlertCircle size={16} /> Ngày này đã hết lịch trống phù hợp với các dịch vụ đã chọn.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map((time) => {
                        // Backend might return full ISO string like "2026-06-07T08:00:00" or just "08:00:00"
                        const timeStr = time.includes('T') ? time.split('T')[1].substring(0, 5) : time.substring(0, 5);
                        return (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(timeStr)}
                            className={`py-2 px-1 rounded-xl text-xs font-black transition-all ${
                              selectedTime === timeStr
                                ? (isDark ? 'bg-amber-500 text-white' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20')
                                : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100')
                            }`}
                          >
                            {timeStr}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Check-In / Check-Out cho Boarding */}
            {isHotelSelected && (
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Calendar size={16} className="text-indigo-500" /> Ngày lưu trú
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-2">Ngày gửi (Check-in)</label>
                      <input 
                        type="date" 
                        value={format(checkInDate, 'yyyy-MM-dd')}
                        onChange={(e) => setCheckInDate(new Date(e.target.value))}
                        className={`w-full p-3 rounded-xl border-2 transition-all outline-none text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 mb-2">Ngày đón (Check-out)</label>
                      <input 
                        type="date" 
                        value={format(checkOutDate, 'yyyy-MM-dd')}
                        onChange={(e) => setCheckOutDate(new Date(e.target.value))}
                        className={`w-full p-3 rounded-xl border-2 transition-all outline-none text-sm font-bold ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Chọn nhân viên (Staff Selection) */}
            {hasNormalServices && selectedTime && (
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <h3 className={`text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  <span className="material-symbols-outlined text-teal-500">person</span> Chọn nhân viên (Tùy chọn)
                </h3>
                
                {staffAvailabilityLoading ? (
                  <div className={`flex items-center gap-2 p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <Loader2 className="animate-spin text-teal-500" size={16} />
                    <span className="text-sm text-slate-500">Đang kiểm tra lịch trống của nhân viên...</span>
                  </div>
                ) : staffWithAvailability.length === 0 ? (
                   <div className={`p-4 rounded-xl text-sm text-slate-500 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                     Không tải được danh sách nhân viên.
                   </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedStaffId(null)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                        selectedStaffId === null
                          ? (isDark ? 'border-teal-500 bg-teal-500/10' : 'border-teal-600 bg-teal-50')
                          : (isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-100 hover:border-slate-200')
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-slate-400">groups</span>
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Bất kỳ nhân viên</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Tự phân công</p>
                      </div>
                    </button>

                    {staffWithAvailability.map(staff => {
                      const isSelected = selectedStaffId === staff.id;
                      const isBusy = staff.available === false;
                      
                      return (
                        <button
                          key={staff.id}
                          onClick={() => setSelectedStaffId(staff.id)}
                          disabled={isBusy}
                          className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                            isSelected
                              ? (isDark ? 'border-teal-500 bg-teal-500/10' : 'border-teal-600 bg-teal-50')
                              : isBusy 
                                ? 'border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                                : (isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-100 hover:border-slate-200')
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-[#1a2b4c] flex items-center justify-center shrink-0 text-white font-bold">
                            {staff.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{staff.fullName}</p>
                            <p className={`text-[10px] uppercase tracking-wider font-bold mt-0.5 ${isBusy ? 'text-red-500' : 'text-green-500'}`}>
                              {isBusy ? 'Đang bận' : 'Sẵn sàng'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Ghi chú */}
            <section>
               <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Ghi chú thêm (Tùy chọn)
              </h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú cho cửa hàng..."
                className={`w-full p-4 rounded-2xl resize-none h-24 text-sm focus:ring-2 focus:outline-none transition-all ${
                  isDark ? 'bg-slate-800 text-white border-none focus:ring-indigo-500' : 'bg-slate-50 text-slate-900 border-slate-200 focus:ring-indigo-500'
                }`}
              />
            </section>

          </div>

          {/* Footer */}
          <div className={`shrink-0 p-6 border-t ${
            isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'
          }`}>
            <button
              onClick={handleSubmit}
              disabled={createBookingMutation.isPending || !selectedPetId || selectedServices.length === 0 || (hasNormalServices && !selectedTime) || (isHotelSelected && checkInDate >= checkOutDate)}
              className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {createBookingMutation.isPending ? (
                <><Loader2 className="animate-spin" size={18} /> Đang xử lý...</>
              ) : (
                'Tạo lịch hẹn'
              )}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
