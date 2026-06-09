import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useClinics } from '../../hooks/useClinics';
import { ShopPublicResponse } from '../../services/shop.service';
import {
  Search, MapPin, Star, Filter, ArrowRight, Grid, List as ListIcon,
  Map as MapIcon, ChevronRight, SlidersHorizontal, CheckCircle2,
  X, Phone, Navigation, Info, Sparkles, Stethoscope, Scissors, Home, Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { NearbyShopResponse } from '../../services/clinic.service';
import ShopMap from '../../components/ShopMap';
import NearbyShops from '../../components/NearbyShops';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const SHOP_TYPE_TABS = [
  { value: 'Tất cả', label: 'Tất cả', icon: <Grid size={16} /> },
  { value: 'CLINIC', label: 'Khám thú y', icon: <Stethoscope size={16} /> },
  { value: 'SPA', label: 'Spa & Grooming', icon: <Scissors size={16} /> },
  { value: 'HOTEL', label: 'Lưu trú', icon: <Home size={16} /> },
  { value: 'MIXED', label: 'Tổng hợp', icon: <Store size={16} /> },
];

const SORT_OPTIONS = ['Đánh giá cao nhất', 'Gần nhất', 'Mới nhất'];

const RATING_OPTIONS = [
  { value: 0, label: 'Tất cả' },
  { value: 3, label: '3★ trở lên' },
  { value: 4, label: '4★ trở lên' },
  { value: 4.5, label: '4.5★ trở lên' },
];



function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={`${s <= Math.floor(rating) ? 'text-amber-400 fill-amber-400' : s - rating <= 0.5 ? 'text-amber-300 fill-amber-300' : 'text-slate-300'}`}
        />
      ))}
    </span>
  );
}

export default function VetSearch() {
  const [searchParams] = useSearchParams();
  const radiusParam = searchParams.get('radius');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const {
    clinics,
    isLoading,
    searchQuery,
    setSearchQuery,
    cityQuery,
    setCityQuery,
    activeService,
    setActiveService,
    minRating,
    setMinRating,
    page,
    setPage,
    totalPages,
    totalElements,
    selectedServices,
    setSelectedServices,
    availableServices,
  } = useClinics();

  const [sortBy, setSortBy] = useState(latParam ? 'Gần nhất' : 'Đánh giá cao nhất');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [distanceKm, setDistanceKm] = useState(radiusParam ? parseInt(radiusParam, 10) : 30);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    latParam && lngParam ? { lat: parseFloat(latParam), lng: parseFloat(lngParam) } : null
  );
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(!!radiusParam);


  useEffect(() => {
    if (!latParam || !lngParam) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => console.warn('Geolocation error:', err)
        );
      }
    }
  }, [latParam, lngParam]);

  const shopsWithDistance = useMemo(() => {
    return clinics.map((shop: ShopPublicResponse) => {
      let dist = undefined;
      if (userLocation && shop.latitude && shop.longitude) {
        dist = calculateDistance(userLocation.lat, userLocation.lng, shop.latitude, shop.longitude);
      }
      return { ...shop, distanceKm: dist };
    });
  }, [clinics, userLocation]);

  const sortedClinics = useMemo(() => {
    return [...shopsWithDistance].filter((shop: any) => {
      // Filter by distance if we have user location
      if (userLocation && shop.distanceKm !== undefined) {
        if (shop.distanceKm > distanceKm) return false;
      }
      

      return true;
    }).sort((a: any, b: any) => {
      if (sortBy === 'Gần nhất' && a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'Đánh giá cao nhất') return b.ratingAvg - a.ratingAvg;
      return b.id - a.id;
    });
  }, [shopsWithDistance, userLocation, distanceKm, sortBy]);
  const springTransition = {
    type: "spring",
    stiffness: 100,
    damping: 15
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { ...springTransition }
  };

  const staggerContainer = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { ...springTransition } },
  };

  // All shops mapped for sidebar list (includes shops without coordinates)
  const allShopsForList: NearbyShopResponse[] = useMemo(() => {
    return sortedClinics.map((shop: any) => ({
      id: shop.id,
      shopName: shop.shopName,
      shopType: shop.shopType,
      address: shop.address,
      city: shop.city,
      latitude: shop.latitude || 0,
      longitude: shop.longitude || 0,
      logoUrl: shop.licenseImageUrl || '',
      ratingAvg: shop.ratingAvg,
      distanceKm: shop.distanceKm ?? 0,
      durationMinutes: null
    }));
  }, [sortedClinics]);

  // Only shops with valid coordinates for map markers
  const shopsForMap: NearbyShopResponse[] = useMemo(() => {
    return allShopsForList.filter(shop => shop.latitude !== 0 && shop.longitude !== 0);
  }, [allShopsForList]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-display">
      {/* ── Hero Banner ── */}
      <div className="relative bg-slate-900 text-white pt-24 pb-32 px-6 overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-mesh opacity-30" />
          <div className="pattern-dots absolute inset-0 opacity-10 pointer-events-none" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 backdrop-blur-md shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={12} />
              Cơ sở đã được xác thực
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight drop-shadow-sm">
              Tìm cơ sở <span className="text-gradient dark:text-white">thú y</span> <br />
              &amp; Dịch vụ quanh bạn
            </h1>
          </motion.div>

          {/* Premium Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass dark:glass-dark p-2 rounded-[32px] shadow-3xl max-w-4xl mx-auto group focus-within:ring-8 ring-primary/10 transition-all"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-5 relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary dark:text-white w-5 h-5" />
                <input
                  type="text"
                  placeholder="Tên cơ sở, dịch vụ..."
                  className="w-full pl-14 pr-4 py-5 bg-white/50 dark:bg-slate-900/50 rounded-2xl border-none focus:ring-0 text-slate-900 dark:text-white font-bold placeholder:text-slate-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="md:col-span-4 relative border-l border-slate-100 dark:border-slate-800 hidden md:block">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary dark:text-white w-5 h-5" />
                <input
                  type="text"
                  placeholder="Khu vực..."
                  className="w-full pl-14 pr-4 py-5 bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white font-bold placeholder:text-slate-400"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <button className="w-full h-full bg-primary hover:bg-primary-dark text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 py-5 shadow-xl shadow-primary/20">
                  <Search size={18} />
                  TÌM KIẾM
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-20 pb-24">
        {/* ── Category Tabs ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative inline-flex bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-1.5 rounded-[24px] mb-10 overflow-hidden shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
        >
          {SHOP_TYPE_TABS.map((tab) => {
            const isActive = activeService === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveService(tab.value)}
                className={`relative flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all z-10 ${isActive
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-primary rounded-2xl shadow-lg shadow-primary/25"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* ── Sidebar ── */}
          <aside className="hidden lg:block w-72 shrink-0 space-y-6">
            <div className="glass dark:glass-dark p-6 rounded-[32px] space-y-8 sticky top-28">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-primary dark:text-white" />
                  Bộ lọc
                </h3>
                {(minRating > 0 || distanceKm !== 30 || selectedServices.length > 0) && (
                  <button
                    onClick={() => { setMinRating(0); setDistanceKm(30); setSelectedServices([]); }}
                    className="text-[10px] font-black text-primary dark:text-white uppercase tracking-wider hover:underline"
                  >
                    Đặt lại
                  </button>
                )}
              </div>


              {/* Rating filter */}
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đánh giá sao</p>
                <div className="space-y-2">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMinRating(opt.value)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border-2 ${minRating === opt.value
                          ? 'bg-primary/5 dark:bg-primary/20 border-primary text-primary'
                          : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                      <span className="text-sm font-bold">{opt.label}</span>
                      {opt.value > 0 && <StarRow rating={opt.value} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Services filter */}
              {availableServices.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Dịch vụ</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {availableServices.map((svc) => (
                      <label key={svc} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
                        <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(svc)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServices([...selectedServices, svc]);
                              } else {
                                setSelectedServices(selectedServices.filter(s => s !== svc));
                              }
                            }}
                            className="w-5 h-5 rounded-md border-2 border-slate-200 dark:border-slate-700 text-primary focus:ring-primary focus:ring-offset-0 bg-transparent transition-all checked:bg-primary checked:border-primary cursor-pointer appearance-none"
                          />
                          <CheckCircle2 size={12} className={`absolute text-white pointer-events-none transition-transform duration-200 ${selectedServices.includes(svc) ? 'scale-100' : 'scale-0'}`} />
                        </div>
                        <span className={`text-sm font-bold transition-colors ${selectedServices.includes(svc) ? 'text-primary' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                          {svc}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Distance slider */}
              <div className="space-y-6">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Khoảng cách</p>
                <div className="px-2">
                  <div className="flex justify-between items-center mb-4">
                    <button 
                      onClick={() => setDistanceKm(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="text-lg font-bold">-</span>
                    </button>
                    <div className="flex items-end">
                      <span className="text-2xl font-black text-primary dark:text-white">{distanceKm}</span>
                      <span className="text-xs font-bold text-slate-400 pb-1 ml-1 dark:text-white">km</span>
                    </div>
                    <button 
                      onClick={() => setDistanceKm(prev => Math.min(30, prev + 1))}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="text-lg font-bold">+</span>
                    </button>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-slate-100 dark:bg-slate-800 "
                  />
                  <div className="flex justify-between text-[10px] font-black text-slate-300 dark:text-white mt-2">
                    <span>1 KM</span>
                    <span>30 KM</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsMapModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-primary transition-all shadow-xl hover:shadow-primary/20 uppercase tracking-widest">
                <MapIcon size={16} />
                Xem trên bản đồ
              </button>
            </div>
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {isLoading ? 'Đang tìm kiếm...' : `${totalElements} kết quả phù hợp`}
                </h2>
                <p className="text-sm font-medium text-slate-500">Dựa trên tiêu chí lựa chọn của bạn</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative glass dark:glass-dark rounded-2xl p-1 flex">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 dark:text-white hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <ListIcon size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 dark:text-white hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <Grid size={18} />
                  </button>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="glass dark:glass-dark border-none rounded-2xl text-xs font-black px-4 py-3 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            {/* Cards Grid/List */}
            <div
              className={viewMode === 'grid' ? 'grid sm:grid-cols-2 gap-6' : 'flex flex-col gap-6'}
            >
              {isLoading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`glass dark:glass-dark rounded-[32px] overflow-hidden ${viewMode === 'list' ? 'flex h-56' : 'h-[400px]'}`}>
                      <div className="bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0 w-full h-full" />
                    </div>
                  ))}
                </>
              ) : (
                sortedClinics.map((shop: ShopPublicResponse, index: number) => (
                  <div key={`${shop.id}-${index}`} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <Link
                      to={`/clinic/${shop.id}`}
                      className={`group glass dark:glass-dark rounded-[32px] overflow-hidden hover:shadow-3xl hover:translate-y-[-4px] transition-all duration-500 border-2 border-transparent hover:border-primary/10 h-full ${viewMode === 'list' ? 'flex flex-col sm:flex-row sm:h-64' : 'flex flex-col'}`}
                    >
                      {/* Image */}
                      <div className={`relative overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 ${viewMode === 'list' ? 'sm:w-72 w-full h-48 sm:h-auto' : 'h-52'}`}>
                        <img
                          src={shop.licenseImageUrl || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop'}
                          alt={shop.shopName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={10} className="text-white" />
                            ĐỐI TÁC
                          </span>
                        </div>

                        {shop.shopType && (
                          <span className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-primary text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest dark:text-white">
                            {SHOP_TYPE_TABS.find(t => t.value === shop.shopType)?.label ?? shop.shopType}
                          </span>
                        )}
                      </div>

                      {/* Info Content */}
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                              {shop.shopName}
                            </h3>
                            <div className="flex items-center gap-1.5 shrink-0 bg-amber-50 dark:bg-amber-400/10 px-2.5 py-1.5 rounded-xl border border-amber-100 dark:border-amber-400/20">
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                              <span className="font-black text-amber-700 dark:text-amber-400 text-xs">
                                {shop.ratingAvg > 0 ? shop.ratingAvg.toFixed(1) : 'Mới'}
                              </span>
                            </div>
                          </div>

                          {(shop as any).distanceKm !== undefined && (
                            <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 text-xs font-black bg-teal-50 dark:bg-teal-400/10 w-fit px-2 py-1 rounded-lg">
                              <MapPin size={12} />
                              {(shop as any).distanceKm.toFixed(1)} km
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                            <MapPin size={14} className="text-slate-400 dark:text-white" />
                            <span className="truncate">{shop.address}{shop.city ? `, ${shop.city}` : ''}</span>
                          </div>

                          {shop.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
                              {shop.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-white">
                              <Phone size={14} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{shop.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest group-hover:gap-3 transition-all dark:text-white">
                            Xem chi tiết
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between mt-8">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Trang {page + 1} / {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-5 py-2.5 glass dark:glass-dark rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i).filter(i => Math.abs(i - page) <= 2).map(i => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                        i === page
                          ? 'bg-primary text-white shadow-lg shadow-primary/25'
                          : 'glass dark:glass-dark text-slate-600 dark:text-white hover:border-primary/50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-5 py-2.5 glass dark:glass-dark rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && sortedClinics.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-32 glass dark:glass-dark rounded-[40px] space-y-6"
              >
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Search size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-2xl text-slate-900 dark:text-white">
                    Không tìm thấy kết quả
                  </h3>
                  <p className="text-slate-400 font-medium">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
                <button
                  onClick={() => { setSearchQuery(''); setCityQuery(''); setActiveService('Tất cả'); setMinRating(0); setSelectedServices([]); }}
                  className="px-8 py-4 bg-primary text-white text-xs font-black rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 uppercase tracking-widest"
                >
                  Xóa tất cả bộ lọc
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Map Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[85vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
            >
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>

              <div className="w-full md:w-2/3 h-1/2 md:h-full relative bg-slate-100 dark:bg-slate-800">
                {userLocation ? (
                  <ShopMap 
                    userLocation={userLocation}
                    nearbyShops={shopsForMap}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <MapPin size={48} className="mb-4 text-slate-300" />
                    <p className="font-medium text-lg">Đang lấy vị trí của bạn...</p>
                    <p className="text-sm mt-2 opacity-70">Vui lòng cho phép truy cập vị trí trong trình duyệt</p>
                  </div>
                )}
              </div>
              <div className="w-full md:w-1/3 h-1/2 md:h-full bg-slate-50 dark:bg-slate-950 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    <MapIcon size={24} className="text-primary" />
                    Bản đồ các cơ sở
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Hiển thị {allShopsForList.length} kết quả ({shopsForMap.length} có vị trí trên bản đồ)
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <NearbyShops shops={allShopsForList} loading={isLoading} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radius Confirmation Modal */}
      <AnimatePresence>
        {showRadiusModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowRadiusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl w-full max-w-md p-8 relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <button onClick={() => setShowRadiusModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                  <Navigation size={36} className="fill-blue-500/20" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Đã kích hoạt bộ lọc</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Hệ thống đang hiển thị tất cả các cơ sở thú y quanh bạn trong bán kính <span className="font-black text-primary text-lg">{radiusParam} km</span>.
                </p>
                <button 
                  onClick={() => setShowRadiusModal(false)}
                  className="mt-8 w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95"
                >
                  Tuyệt vời, Khám phá ngay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
