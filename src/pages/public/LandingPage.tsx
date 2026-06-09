import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { shopService } from '../../services/shop.service';
import { 
  Search, MapPin, Video, Star, ArrowRight, ShieldCheck, Shield, Heart, Sparkles, 
  Zap, ChevronRight, Navigation, Clock, CheckCircle2, ChevronDown, Percent, Loader2, Compass, PawPrint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

// Import assets
import heroDogImage from '../../assets/landing/hero_dog_v2.png';
import heroCatImage from '../../assets/landing/hero_cat_v2.png';
import cameraPreview from '../../assets/landing/live_camera_preview_1778855116615.png';
import spaImage from '../../assets/landing/pet_spa_grooming_1778855139420.png';
import mockMapBg from '../../assets/landing/mock_map_bg.png';
import mockMapBgDark from '../../assets/landing/mock_map_bg_dark.png';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  
  // GPS State
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [nearbyCoords, setNearbyCoords] = useState<{lat: number, lng: number} | null>(null);
  const [manualAddress, setManualAddress] = useState('');

  // Hero Search State
  const [heroCity, setHeroCity] = useState('');
  const [heroType, setHeroType] = useState('Tất cả');

  // 1. Fetch Featured Shops (API)
  const { data: featuredShops = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['featuredShops'],
    queryFn: () => shopService.searchPublic(),
  });

  // 2. Fetch Nearby Shops (API)
  const { data: nearbyShops = [], isLoading: isLoadingNearby } = useQuery({
    queryKey: ['nearbyShops', nearbyCoords],
    queryFn: () => shopService.searchNearby(nearbyCoords!.lat, nearbyCoords!.lng, 10),
    enabled: !!nearbyCoords,
  });

  const topFeaturedShops = featuredShops.slice(0, 4);

  const handleAction = (target: string) => {
    if (target === '/search') {
      const params = new URLSearchParams();
      if (heroCity.trim()) params.set('city', heroCity.trim());
      if (heroType !== 'Tất cả') params.set('type', heroType);
      navigate(`/search?${params.toString()}`);
      return;
    }

    const publicPaths = ['/search', '/camera'];
    if (publicPaths.includes(target) || user) {
      navigate(target);
    } else {
      navigate('/login');
    }
  };

  const handleGetLocation = () => {
    setLocationStatus('loading');
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNearbyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStatus('success');
        },
        (err) => {
          console.error(err);
          setLocationStatus('error');
          if (err.code === 3) {
            alert("Quá thời gian kết nối GPS. Vui lòng đảm bảo thiết bị của bạn đang bật dịch vụ định vị và thử lại.");
          } else {
            alert("Không thể lấy vị trí của bạn. Vui lòng cấp quyền truy cập vị trí trên trình duyệt.");
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      setLocationStatus('error');
      alert("Trình duyệt của bạn không hỗ trợ tính năng định vị.");
    }
  };

  // FAQ State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <main className="flex-1 overflow-x-hidden font-display relative pb-24 md:pb-0">
      
      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="relative min-h-fit md:min-h-[80vh] xl:min-h-[85vh] flex items-center justify-center pt-8 pb-8 xl:pt-16 xl:pb-12 px-6 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Navy/Indigo tint overlay */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-50/80 to-transparent dark:from-[#0B1120] dark:to-transparent" />
          <div className="absolute top-0 left-0 w-full h-full bg-mesh opacity-10 dark:opacity-20" />
          
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="pattern-dots absolute inset-0 opacity-20 pointer-events-none" />

          {/* Falling Paw Prints (Optimized with hardware acceleration) */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`paw-${i}`}
              initial={{ y: "-10vh", x: `${Math.random() * 100}vw`, opacity: 0, rotate: 0 }}
              animate={{ 
                y: "110vh", 
                x: `${Math.random() * 100}vw`,
                opacity: [0, 0.15, 0.15, 0],
                rotate: 360 
              }}
              transition={{ 
                duration: 18 + Math.random() * 15, 
                repeat: Infinity, 
                delay: Math.random() * 10,
                ease: "linear"
              }}
              style={{ willChange: "transform, opacity" }}
              className="absolute text-blue-900/10 dark:text-blue-200/5 z-0 pointer-events-none"
            >
              <PawPrint size={40 + Math.random() * 50} />
            </motion.div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 xl:gap-12 items-center">
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-8 text-center lg:text-left">
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full w-fit mx-auto lg:mx-0">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 dark:bg-white"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary dark:bg-white"></span>
                </span>
                <span className="text-[17px] font-black uppercase tracking-widest text-primary dark:text-white">
                  HỆ SINH THÁI THÚ Y TOÀN DIỆN
                </span>
              </motion.div>

              <motion.h1 variants={fadeIn} className="text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white">
                Chăm sóc <br />
                <span className="text-gradient">Thú cưng</span> <br />
                thời đại số.
              </motion.h1>

              <motion.p variants={fadeIn} className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Kết nối với mạng lưới chuyên gia, đặt lịch khám nhanh chóng và theo dõi bé yêu mọi lúc qua Live Camera 24/7.
              </motion.p>

              {/* Glassmorphic Search Bar */}
              <motion.div variants={fadeIn} className="glass dark:glass-dark p-2 rounded-3xl mt-4 shadow-2xl group focus-within:ring-4 ring-primary/10 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  <div className="md:col-span-5 relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary w-5 h-5" />
                      <input 
                        value={heroCity}
                        onChange={e => setHeroCity(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAction('/search')}
                        className="w-full pl-12 pr-4 py-3 xl:py-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-none focus:ring-0 text-sm font-bold placeholder:text-slate-400" 
                        placeholder="Tìm khu vực..." 
                      />
                  </div>
                  <div className="md:col-span-4 relative border-l border-slate-100 dark:border-slate-800 hidden md:block">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary w-5 h-5" />
                    <select 
                      value={heroType}
                      onChange={e => setHeroType(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 xl:py-4 bg-transparent border-none focus:ring-0 text-sm font-bold appearance-none cursor-pointer">
                      <option value="Tất cả">Tất cả dịch vụ</option>
                      <option value="CLINIC">Khám thú y (Clinic)</option>
                      <option value="SPA">Spa & Grooming</option>
                      <option value="HOTEL">Lưu trú (Hotel)</option>
                      <option value="MIXED">Dịch vụ tổng hợp</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <button 
                      onClick={() => handleAction('/search')}
                      className="w-full h-full bg-primary hover:bg-primary-dark text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 py-4 shadow-lg shadow-primary/20 group-hover:scale-[1.02]"
                    >
                      <Search size={18} /> TÌM KIẾM
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <div className="relative hidden lg:block h-[500px] xl:h-[600px] w-full mt-8 xl:mt-0">
              {/* Dog Image (Background, Left-aligned) */}
              <motion.div 
                initial={{ opacity: 0, x: 50, y: -20, rotate: -5 }} 
                animate={{ opacity: 1, x: 0, y: 0, rotate: -3 }} 
                transition={{ duration: 1, ease: "easeOut" }} 
                className="absolute top-0 left-0 w-[65%] h-[80%] z-10 rounded-[40px] xl:rounded-[50px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] bg-white dark:bg-slate-800"
              >
                <img src={heroDogImage} alt="Dog patient" className="w-full h-full object-cover rounded-[40px] xl:rounded-[50px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-[40px] xl:rounded-[50px]" />
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                      <Heart size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Khám tổng quát</p>
                      <p className="text-[10px] text-slate-500 font-bold">Chăm sóc toàn diện</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Cat Image (Foreground, Right-aligned overlapping) */}
              <motion.div 
                initial={{ opacity: 0, x: -50, y: 50, rotate: 5 }} 
                animate={{ opacity: 1, x: 0, y: 0, rotate: 3 }} 
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }} 
                className="absolute bottom-0 right-0 w-[55%] h-[70%] z-20 rounded-[40px] xl:rounded-[50px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] bg-white dark:bg-slate-800"
              >
                <img src={heroCatImage} alt="Cat spa" className="w-full h-full object-cover rounded-[40px] xl:rounded-[50px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-[40px] xl:rounded-[50px]" />
                <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Đối tác uy tín</p>
                      <p className="text-[10px] text-slate-500 font-bold">Xác thực 100%</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Decorative elements */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-400 rounded-full blur-[80px] opacity-30 animate-pulse z-0" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full blur-[70px] opacity-20 animate-pulse z-0" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>

        {/* Animated Scroll Indicator - Pet Theme */}
        <div 
          onClick={() => document.getElementById('co-so')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-6 lg:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20 opacity-80 hover:opacity-100 transition-opacity cursor-pointer group"
        >
          <motion.div 
            animate={{ y: [0, 10, 0] }} 
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full bg-white dark:bg-white/10 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-slate-100 dark:border-white/20 flex items-center justify-center text-primary dark:text-blue-400 group-hover:bg-primary dark:group-hover:bg-blue-500 group-hover:border-primary dark:group-hover:border-blue-500 group-hover:text-white dark:group-hover:text-white group-hover:scale-110 transition-all duration-300"
          >
            <PawPrint size={20} className="rotate-180" />
          </motion.div>
        </div>
      </section>

      {/* ─── Featured Services Showcase (API) ──────────────────────────── */}
      <section id="co-so" className="py-12 md:py-16 xl:py-24 px-6 bg-white dark:bg-slate-900 relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex items-center bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider w-fit">
                Đánh giá cao nhất
              </span>
              <h2 className="text-4xl md:text-5xl xl:text-6xl font-black text-blue-950 dark:text-white leading-[1.1]">
                Khám phá cơ sở <br />
                <span className="text-gradient">Được yêu thích</span>
              </h2>
            </div>
            <button onClick={() => navigate('/search')} className="flex items-center gap-2 font-black text-sm text-slate-400 hover:text-primary transition-colors group">
              XEM TẤT CẢ CƠ SỞ <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {isLoadingFeatured ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {topFeaturedShops.map((shop: any) => (
                <motion.div 
                  key={shop.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  onClick={() => navigate(`/clinic/${shop.id}`)}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-[32px] overflow-hidden shadow-soft hover:shadow-hover border border-slate-100 dark:border-slate-800 hover:-translate-y-2 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="h-48 bg-slate-200 relative overflow-hidden shrink-0">
                    {shop.logoUrl ? (
                      <img src={shop.logoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={shop.shopName} />
                    ) : (
                      <img src={spaImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Placeholder" />
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-white/90 backdrop-blur text-blue-950 dark:text-white dark:bg-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{shop.shopType}</span>
                    </div>
                    {shop.ratingAvg > 0 && (
                      <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-lg">
                        <Star size={12} className="fill-current" /> {shop.ratingAvg.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">{shop.shopName}</h3>
                    <div className="flex items-start gap-2 text-slate-500 mb-4">
                      <MapPin size={16} className="shrink-0 mt-0.5 text-primary dark: text-white" />
                      <span className="text-sm dark:text-white font-medium line-clamp-2 ">{shop.address}, {shop.city}</span>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-4 border-t border-slate-200 dark:border-slate-700">
                      {shop.serviceNames?.slice(0,3).map((svc: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded-lg font-bold">{svc}</span>
                      ))}
                      {shop.serviceNames?.length > 3 && <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded-lg font-bold">+{shop.serviceNames.length - 3}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Nearby Shops (Hybrid GPS) ─────────────────────────────────── */}
      <section className="bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        {/* Full Right Background Map */}
        <div className="absolute top-0 right-0 w-full lg:w-[75%] h-full pointer-events-none">
          {/* Actual Map Background */}
          <img 
            src={isDark ? mockMapBgDark : mockMapBg} 
            alt="Map Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-90 mix-blend-multiply dark:mix-blend-normal grayscale-[20%] dark:grayscale-0" 
          />
          {/* Fade out left side to blend into background */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50 dark:from-slate-950 via-slate-50/50 dark:via-slate-950/50 to-transparent" />
          {/* Fade out top/bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 dark:from-slate-950 via-transparent to-slate-50 dark:to-slate-950 opacity-80" />

          {/* Radar Sweeps */}
          <div className="absolute top-1/2 left-[65%] -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute top-1/2 left-[65%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-blue-500/30 rounded-full" />
          <div className="absolute top-1/2 left-[65%] -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-blue-500/10 rounded-full" />
          
          {/* Center User Pin */}
          <div className="absolute top-1/2 left-[65%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.6)] border-4 border-white dark:border-blue-900/50">
              <Navigation size={24} className="fill-current -rotate-45" />
            </div>
            <div className="mt-2 px-4 py-1.5 bg-white dark:bg-slate-800 rounded-full shadow-lg text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider border border-transparent dark:border-slate-700">Bạn ở đây</div>
          </div>

          {/* Mock Pins */}
          {[
            { t: "25%", l: "45%", delay: 0.5, dist: "1.2" },
            { t: "75%", l: "50%", delay: 1.2, dist: "3.5" },
            { t: "30%", l: "85%", delay: 0.8, dist: "2.1" },
            { t: "60%", l: "80%", delay: 1.5, dist: "4.0" },
            { t: "80%", l: "65%", delay: 2.1, dist: "2.8" },
          ].map((pin, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: pin.delay, repeat: Infinity, repeatType: "reverse", repeatDelay: 4 }}
              className="absolute flex flex-col items-center z-10"
              style={{ top: pin.t, left: pin.l }}
            >
              <div className="relative">
                <span className="absolute -inset-2 rounded-full bg-primary/20 dark:bg-blue-400/20 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-primary dark:text-blue-400 shadow-xl border-2 border-primary dark:border-blue-500/50">
                  <PawPrint size={18} className="fill-primary/20 dark:fill-blue-500/20" />
                </div>
              </div>
              <div className="mt-2 px-3 py-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-full shadow-sm text-[9px] font-black text-slate-500 dark:text-slate-300 border border-transparent dark:border-slate-700/50">
                {pin.dist} km
              </div>
            </motion.div>
          ))}
        </div>

        <div className="relative min-h-[600px] lg:min-h-[700px] flex flex-col justify-center py-16 xl:py-24 px-6 z-10 max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 w-full">
            <div className="lg:w-1/2 relative z-20">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xs mb-6">
                  <Navigation size={14} /> Hệ thống định vị
                </div>
                <h2 className="text-4xl md:text-5xl xl:text-6xl font-black text-blue-950 dark:text-white leading-[1.1]">
                  Tìm cơ sở <br className="hidden lg:block" />
                  <span className="text-gradient">Gần bạn nhất</span>
                </h2>
                <p className="mt-6 text-slate-600 dark:text-slate-300 text-lg max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                  Cho phép truy cập vị trí để tìm ngay các phòng khám, spa uy tín nằm trong bán kính 10km quanh bạn.
                </p>
              </div>

              {!nearbyCoords && (
                <div className="flex flex-col items-center lg:items-start">
                  <button 
                    onClick={handleGetLocation}
                    disabled={locationStatus === 'loading'}
                    className="w-full sm:w-auto px-8 py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-500 rounded-[24px] font-black flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 group"
                  >
                    {locationStatus === 'loading' ? (
                      <Loader2 className="animate-spin text-blue-500" size={24} />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <Compass size={20} className={locationStatus === 'success' ? 'text-green-500' : 'text-blue-500'} />
                      </div>
                    )}
                    TÌM QUANH ĐÂY BẰNG GPS
                  </button>
                  <p className="text-xs text-slate-500 dark:text-white mt-4 italic flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">info</span> 
                    Hệ thống sẽ tự động quét bản đồ
                  </p>
                </div>
              )}
            </div>
            
            <div className="hidden lg:block"></div>
          </div>

          {/* Results Area (Now placed inside the map overlay area so it shares the background) */}
          <AnimatePresence>
            {nearbyCoords && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full mt-12 relative z-20"
              >
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <MapPin className="text-primary w-6 h-6" /> Kết quả quanh bạn:
                </h3>
                {isLoadingNearby ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                ) : (() => {
                  const sortedShops = [...nearbyShops].sort((a: any, b: any) => (a.distanceKm || 0) - (b.distanceKm || 0));
                  const displayedShops = sortedShops.slice(0, 4);
                  
                  if (sortedShops.length === 0) {
                    return (
                      <div className="text-center text-slate-500 py-12 bg-white/60 backdrop-blur-md dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
                        Không tìm thấy cơ sở nào trong bán kính 10km.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {displayedShops.map((shop: any) => (
                          <div key={shop.id} onClick={() => navigate(`/clinic/${shop.id}`)} className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-[28px] overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800 hover:-translate-y-2 transition-all cursor-pointer group">
                            <div className="h-40 bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                              {shop.logoUrl ? <img src={shop.logoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={shop.shopName} /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><MapPin size={32} /></div>}
                              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-slate-900 px-3 py-1 rounded-full text-xs font-black shadow-sm">
                                {shop.distanceKm?.toFixed(1)} km
                              </div>
                            </div>
                            <div className="p-5">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{shop.shopType}</p>
                              <h4 className="text-lg font-black text-slate-900 dark:text-white truncate">{shop.shopName}</h4>
                              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{shop.address}, {shop.city}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {sortedShops.length > 4 && (
                        <div className="flex justify-center pt-2">
                          <button 
                            onClick={() => navigate(`/search?lat=${nearbyCoords.lat}&lng=${nearbyCoords.lng}&radius=10`)}
                            className="px-8 py-4 bg-white dark:bg-slate-900 border-2 border-primary/20 text-primary hover:bg-primary hover:text-white rounded-[20px] font-black text-sm uppercase tracking-wider flex items-center gap-3 transition-all shadow-lg shadow-primary/10 hover:shadow-primary/30 hover:-translate-y-1"
                          >
                            XEM TẤT CẢ {sortedShops.length} CƠ SỞ <ArrowRight size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ─── Live Camera Showcase ──────────────────────────────────────── */}
      <section id="camera" className="py-20 md:py-24 2xl:py-32 px-6 bg-slate-900 relative overflow-hidden">
        {/* Wave Divider */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none z-30">
          <svg className="relative block w-full h-[40px] md:h-[60px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" className="fill-slate-50 dark:fill-[#0B1120]"></path>
          </svg>
        </div>
        
        <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/10 blur-[150px] -rotate-12 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 2xl:gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6 md:space-y-8 2xl:space-y-10">
              <div className="space-y-4 2xl:space-y-6">
                <span className="inline-flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider">
                  <Video size={30} /> Tính năng độc quyền
                </span>
                <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-black text-white leading-[1.1]">
                  An tâm tuyệt đối <br /> với <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-secondary">Live Camera</span>
                </h2>
                <p className="text-base md:text-lg 2xl:text-xl text-slate-400 leading-relaxed font-medium">Theo dõi trực tiếp mọi khoảnh khắc của bé yêu 24/7 từ điện thoại. Bạn sẽ luôn cảm thấy gần gũi dù đang ở bất cứ đâu.</p>
              </div>
              <div className="space-y-4 2xl:space-y-6">
                {[
                  { t: "Chất lượng HD 4K", d: "Hình ảnh sắc nét, mượt mà cả ngày lẫn đêm.", icon: <Sparkles className="text-amber-400" /> },
                  { t: "Đàm thoại 2 chiều", d: "Trò chuyện từ xa dễ dàng.", icon: <Video className="text-secondary" /> },
                  { t: "Bảo mật nâng cao", d: "Mã hóa đầu cuối, đảm bảo chỉ bạn mới có quyền xem.", icon: <ShieldCheck className="text-green-500" /> }
                ].map((item, i) => (
                  <motion.div key={i} className="flex gap-4 2xl:gap-6 items-start group p-2 2xl:p-4 rounded-3xl hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 2xl:w-14 2xl:h-14 rounded-xl 2xl:rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-white text-base 2xl:text-lg">{item.t}</h4>
                      <p className="text-slate-500 font-medium text-xs 2xl:text-sm mt-1">{item.d}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => handleAction('/search')} className="w-fit bg-primary text-white px-6 py-3 2xl:px-10 2xl:py-5 rounded-2xl 2xl:rounded-[24px] font-black flex items-center gap-2 2xl:gap-3 hover:bg-white hover:text-slate-900 transition-all shadow-xl hover:shadow-white/20 text-sm 2xl:text-base">
                KHÁM PHÁ CƠ SỞ CÓ CAMERA <ArrowRight size={20} className="w-4 h-4 2xl:w-5 2xl:h-5" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative">
              <div className="relative z-10 p-4 glass-dark rounded-[50px] shadow-3xl">
                <div className="relative aspect-video rounded-[40px] overflow-hidden bg-black">
                  <img src={cameraPreview} alt="Live feed" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute top-6 left-6 flex items-center gap-3">
                    <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE FEED
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/5 text-[10px] font-bold text-white/80 tracking-widest uppercase">REC 00:42:15</span>
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl">
                      <p className="text-xs font-black text-white">Lucky - Golden Retriever</p>
                      <p className="text-[10px] font-medium text-white/70">Deluxe Room 102</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors"><Video size={16} /></div>
                      <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform"><ArrowRight size={16} /></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-[100px]" />
            </motion.div>
          </div>
        </div>
        
        {/* Bottom Wave Divider */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-30 rotate-180">
          <svg className="relative block w-full h-[40px] md:h-[60px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" className="fill-slate-50 dark:fill-slate-950"></path>
          </svg>
        </div>
      </section>

      {/* ─── How it Works (Quy trình) ──────────────────────────────────── */}
      <section className="py-16 md:py-24 2xl:py-32 px-6 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 xl:mb-24 space-y-4">
            <span className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider">
              <Sparkles size={16} /> Đơn giản & Nhanh chóng
            </span>
            <h2 className="text-4xl md:text-5xl xl:text-6xl font-black text-blue-950 dark:text-white tracking-tight">Sử dụng PetEye <span className="text-gradient">Chỉ với 3 bước</span></h2>
          </div>
          
          <div className="relative max-w-6xl mx-auto mt-12 lg:mt-20">
            {/* Connecting Path Line (Desktop) */}
            <div className="hidden lg:block absolute top-[40%] left-[15%] w-[70%] border-t-[3px] border-dashed border-slate-300 dark:border-slate-700 z-0" />
            
            {/* Arrow Connectors */}
            <div className="hidden lg:flex absolute top-[40%] left-[33.33%] -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg items-center justify-center z-20 text-slate-400 border border-slate-100 dark:border-slate-700 animate-pulse">
              <ArrowRight size={24} className="text-primary dark:text-blue-400" />
            </div>
            <div className="hidden lg:flex absolute top-[40%] left-[66.66%] -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg items-center justify-center z-20 text-slate-400 border border-slate-100 dark:border-slate-700 animate-pulse" style={{ animationDelay: '500ms' }}>
              <ArrowRight size={24} className="text-primary dark:text-blue-400" />
            </div>
            
            <div className="grid lg:grid-cols-3 gap-8 relative z-10 items-stretch">
              {/* Step 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 lg:p-8 rounded-[40px] shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/50 transition-all duration-500 overflow-hidden flex flex-col h-full"
              >
                <div className="absolute -top-8 -right-8 text-[180px] font-black text-slate-50 dark:text-slate-800/30 leading-none select-none z-0 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">1</div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="inline-flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 text-xs font-black px-4 py-2 rounded-full mb-6 w-fit uppercase tracking-widest shadow-sm">
                    Bước 1
                  </div>
                  
                  {/* Mock UI */}
                  <div className="w-full h-36 lg:h-40 bg-slate-50 dark:bg-slate-950/50 rounded-3xl mb-6 lg:mb-8 p-4 lg:p-5 border border-slate-100 dark:border-slate-800 flex flex-col justify-center gap-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors duration-500">
                    <div className="w-full h-10 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center px-4 gap-3 animate-pulse" style={{animationDuration: '3s'}}>
                      <Search size={16} className="text-slate-400" />
                      <div className="h-2 w-1/3 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 px-4 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center gap-2">
                        <MapPin size={12} className="text-blue-500" />
                        <div className="h-1.5 w-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </div>
                      <div className="h-8 px-4 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center gap-2">
                        <Star size={12} className="text-yellow-500" />
                        <div className="h-1.5 w-6 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mb-3">Tìm & So sánh</h4>
                  <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-auto">Khám phá và so sánh ngay các cơ sở thú y quanh bạn với đầy đủ thông tin, đánh giá và khoảng cách chi tiết.</p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 lg:p-8 rounded-[40px] shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/50 transition-all duration-500 overflow-hidden flex flex-col h-full"
              >
                <div className="absolute -top-8 -right-8 text-[180px] font-black text-slate-50 dark:text-slate-800/30 leading-none select-none z-0 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">2</div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="inline-flex items-center justify-center bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 text-xs font-black px-4 py-2 rounded-full mb-6 w-fit uppercase tracking-widest shadow-sm">
                    Bước 2
                  </div>

                  <div className="w-full h-36 lg:h-40 bg-slate-50 dark:bg-slate-950/50 rounded-3xl mb-6 lg:mb-8 p-4 lg:p-5 border border-slate-100 dark:border-slate-800 flex flex-col justify-center group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors duration-500">
                    <div className="grid grid-cols-3 gap-2">
                      {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time, idx) => (
                        <div key={time} className={`h-7 lg:h-8 rounded-xl flex items-center justify-center text-[9px] lg:text-[10px] font-black tracking-wider transition-all duration-500 ${idx === 2 ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105' : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-sm'}`}>
                          {time}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 lg:mt-4 w-full h-10 bg-slate-900 dark:bg-slate-800 rounded-xl flex items-center justify-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse" />
                      <div className="text-[10px] lg:text-xs font-black text-white uppercase tracking-widest">Xác nhận lịch</div>
                    </div>
                  </div>
                  <h4 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mb-3">Đặt lịch 24/7</h4>
                  <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-auto">Chọn khung giờ phù hợp và đặt lịch ngay lập tức. Hệ thống tự động xác nhận không cần chờ đợi.</p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 lg:p-8 rounded-[40px] shadow-xl hover:shadow-2xl hover:shadow-rose-500/10 hover:border-rose-500/50 transition-all duration-500 overflow-hidden flex flex-col h-full"
              >
                <div className="absolute -top-8 -right-8 text-[180px] font-black text-slate-50 dark:text-slate-800/30 leading-none select-none z-0 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6">3</div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="inline-flex items-center justify-center bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 text-xs font-black px-4 py-2 rounded-full mb-6 w-fit uppercase tracking-widest shadow-sm">
                    Bước 3
                  </div>

                  <div className="w-full h-36 lg:h-40 bg-slate-50 dark:bg-slate-950/50 rounded-3xl mb-6 lg:mb-8 p-4 lg:p-5 border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center group-hover:bg-rose-50 dark:group-hover:bg-rose-900/10 transition-colors duration-500">
                    <div className="flex gap-1 mb-4">
                      {[1,2,3,4,5].map((s, idx) => (
                        <Star key={s} size={20} className="fill-rose-400 text-rose-400 drop-shadow-sm transition-transform duration-300 hover:scale-125 hover:-rotate-12 cursor-pointer" style={{ animationDelay: `${idx * 100}ms` }} />
                      ))}
                    </div>
                    <div className="w-full bg-white dark:bg-slate-800 p-3 lg:p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3 mb-2 lg:mb-3">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <div className="h-2 w-16 lg:w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </div>
                      <div className="h-1 lg:h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full mb-1.5 lg:mb-2" />
                      <div className="h-1 lg:h-1.5 w-2/3 bg-slate-100 dark:bg-slate-700 rounded-full" />
                    </div>
                  </div>
                  <h4 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white mb-3">Trải nghiệm & Review</h4>
                  <p className="text-sm lg:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-auto">Tận hưởng dịch vụ chăm sóc chuyên nghiệp tại cơ sở và để lại đánh giá nhằm giúp cộng đồng có thêm nhiều sự lựa chọn uy tín.</p>
                </div>
              </motion.div>
            </div>

            {/* CTA Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 lg:mt-16 flex justify-center"
            >
              <button 
                onClick={() => navigate(user ? '/search' : '/login')}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 lg:px-10 lg:py-5 font-black text-white bg-primary rounded-full overflow-hidden shadow-2xl shadow-primary/30 hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center gap-2 text-sm lg:text-base">
                  {user ? 'ĐẶT LỊCH NGAY' : 'ĐĂNG NHẬP & TRẢI NGHIỆM NGAY'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials (Horizontal Split) ───────────────────────────── */}
      <section className="py-16 md:py-24 2xl:py-32 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column (Text & Stats) */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl xl:text-6xl font-black text-blue-950 dark:text-white leading-[1.1] mb-2">
                  Phản hồi từ <br />
                  người dùng <br />
                  <span className="text-gradient text-5xl md:text-6xl xl:text-7xl mt-2 inline-block font-black">PetEye</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-medium mt-6 leading-relaxed max-w-sm">
                  Kết nối yêu thương, chăm sóc tận tâm. Khám phá lý do hàng ngàn khách hàng luôn tin tưởng và lựa chọn PetEye.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  <img src="https://i.pravatar.cc/150?img=1" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 object-cover" alt="User" />
                  <img src="https://i.pravatar.cc/150?img=5" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 object-cover" alt="User" />
                  <img src="https://i.pravatar.cc/150?img=11" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 object-cover" alt="User" />
                  <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-primary text-white flex items-center justify-center text-xs font-bold">+</div>
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span className="text-primary font-black text-base dark: text-white">1000+</span> Lượt đặt lịch thành công.
                </div>
              </div>
            </div>

            {/* Right Column (Horizontal Marquees) */}
            <div className="lg:col-span-7 relative flex flex-col gap-6 overflow-hidden py-4 -mx-6 px-6 lg:mx-0 lg:px-0">
              {/* Overlay Gradients to hide edges smoothly */}
              <div className="absolute top-0 left-0 bottom-0 w-12 lg:w-24 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />
              <div className="absolute top-0 right-0 bottom-0 w-12 lg:w-24 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" />

              {/* Row 1 - Scrolling Left */}
              <motion.div 
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                className="flex gap-6 w-max"
              >
                {[1, 2].map((loopIdx) => (
                  <React.Fragment key={loopIdx}>
                    {/* Card 1 */}
                    <div className="w-72 shrink-0 bg-white dark:bg-slate-900 p-6 rounded-[20px] shadow-sm hover:shadow-md dark:shadow-none border border-slate-100 dark:border-slate-800 transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center"><Heart size={12} /></div>
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Tin cậy 100%</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-5 leading-relaxed line-clamp-3">
                        "Từ ngày có PetEye, việc đặt lịch tắm cho bé cún dễ dàng hơn hẳn. Mình đặc biệt thích tính năng xem camera."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3">
                          <img src="https://i.pravatar.cc/150?img=1" className="w-8 h-8 rounded-full object-cover" alt="Thu Trang" />
                          <div>
                            <h4 className="font-black text-xs text-slate-900 dark:text-white">Thu Trang</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mẹ bé Corgi</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>
                    
                    {/* Card 2 */}
                    <div className="w-72 shrink-0 bg-white dark:bg-slate-900 p-6 rounded-[20px] shadow-sm hover:shadow-md dark:shadow-none border border-slate-100 dark:border-slate-800 transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center"><Navigation size={12} /></div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Tiện Lợi</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-5 leading-relaxed line-clamp-3">
                        "Hệ thống lọc cơ sở rất thông minh. Mình tìm được một phòng khám ngay sát nhà có bác sĩ chuyên môn cao."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3">
                          <img src="https://i.pravatar.cc/150?img=11" className="w-8 h-8 rounded-full object-cover" alt="Minh Tuấn" />
                          <div>
                            <h4 className="font-black text-xs text-slate-900 dark:text-white">Minh Tuấn</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Chủ bé Mèo Anh</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="w-72 shrink-0 bg-white dark:bg-slate-900 p-6 rounded-[20px] shadow-sm hover:shadow-md dark:shadow-none border border-slate-100 dark:border-slate-800 transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center"><Shield size={12} /></div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">An Tâm</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-5 leading-relaxed line-clamp-3">
                        "Trải nghiệm tuyệt vời! Cảm giác rất an tâm khi có thể mở app lên và xem bé đang làm gì. Các phòng khám nhiệt tình."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3">
                          <img src="https://i.pravatar.cc/150?img=9" className="w-8 h-8 rounded-full object-cover" alt="Hoàng Oanh" />
                          <div>
                            <h4 className="font-black text-xs text-slate-900 dark:text-white">Hoàng Oanh</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mẹ bé Husky</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </motion.div>

              {/* Row 2 - Scrolling Right */}
              <motion.div 
                animate={{ x: ["-50%", "0%"] }}
                transition={{ duration: 35, ease: "linear", repeat: Infinity }}
                className="flex gap-6 w-max -ml-12"
              >
                {[1, 2].map((loopIdx) => (
                  <React.Fragment key={loopIdx}>
                    {/* Card 4 */}
                    <div className="w-72 shrink-0 bg-white dark:bg-slate-900 p-6 rounded-[20px] shadow-sm hover:shadow-md dark:shadow-none border border-slate-100 dark:border-slate-800 transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center"><Star size={12} /></div>
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Chất lượng 5 sao</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-5 leading-relaxed line-clamp-3">
                        "Các đánh giá trên nền tảng rất chân thực. Voucher giảm giá cũng nhiều. Chắc chắn sẽ sử dụng PetEye lâu dài!"
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3">
                          <img src="https://i.pravatar.cc/150?img=5" className="w-8 h-8 rounded-full object-cover" alt="Ngọc Lan" />
                          <div>
                            <h4 className="font-black text-xs text-slate-900 dark:text-white">Ngọc Lan</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mẹ 2 bé Poodle</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>

                    {/* Card 5 */}
                    <div className="w-72 shrink-0 bg-white dark:bg-slate-900 p-6 rounded-[20px] shadow-sm hover:shadow-md dark:shadow-none border border-slate-100 dark:border-slate-800 transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center"><CheckCircle2 size={12} /></div>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Minh bạch</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-5 leading-relaxed line-clamp-3">
                        "Giá cả minh bạch, đặt lịch nhanh gọn. Không cần phải gọi điện thoại hỏi từng phòng khám xem có rảnh không nữa."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3">
                          <img src="https://i.pravatar.cc/150?img=12" className="w-8 h-8 rounded-full object-cover" alt="Quốc Hưng" />
                          <div>
                            <h4 className="font-black text-xs text-slate-900 dark:text-white">Quốc Hưng</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Chủ 3 bé Mèo</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>

                    {/* Card 6 */}
                    <div className="w-72 shrink-0 bg-white dark:bg-slate-900 p-6 rounded-[20px] shadow-sm hover:shadow-md dark:shadow-none border border-slate-100 dark:border-slate-800 transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500 flex items-center justify-center"><Heart size={12} /></div>
                        <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Tuyệt Vời</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mb-5 leading-relaxed line-clamp-3">
                        "Ứng dụng thiết kế rất thân thiện. Mình có thể dễ dàng quản lý sổ tiêm chủng của bé ngay trên điện thoại."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-3">
                          <img src="https://i.pravatar.cc/150?img=20" className="w-8 h-8 rounded-full object-cover" alt="Thanh Thảo" />
                          <div>
                            <h4 className="font-black text-xs text-slate-900 dark:text-white">Thanh Thảo</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Mẹ bé Samoyed</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </motion.div>
            </div>
            
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ───────────────────────────────────────────────── */}
      <section className="pt-12 md:pt-16 xl:pt-24 pb-32 md:pb-48 px-6 bg-slate-50 dark:bg-slate-950 relative">
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-8 xl:mb-16">
            <h2 className="text-3xl xl:text-4xl font-black text-slate-900 dark:text-white mb-4"><span className="text-gradient">Câu hỏi thường gặp</span></h2>
            <p className="text-slate-500">Mọi thắc mắc của bạn đều được giải đáp.</p>
          </div>
          <div className="space-y-4">
            {[
              { q: "Đặt lịch trên PetEye có mất phí không?", a: "Hoàn toàn miễn phí. Bạn chỉ thanh toán đúng số tiền dịch vụ cho cơ sở thú y mà không phải chịu thêm bất kỳ khoản phí nền tảng nào." },
              { q: "Làm sao để biết cơ sở trên PetEye đáng tin cậy?", a: "Các đối tác tham gia PetEye đều trải qua quy trình xác thực thông tin trước khi được hiển thị trên nền tảng. Người dùng có thể tham khảo hồ sơ cơ sở, hình ảnh thực tế, đánh giá từ khách hàng trước đó và các thông tin liên quan để đưa ra quyết định phù hợp. Ngoài ra, một số cơ sở còn cung cấp tính năng theo dõi camera trực tuyến giúp tăng tính minh bạch trong quá trình chăm sóc thú cưng." },
              { q: "Nếu thú cưng gặp sự cố trong thời gian sử dụng dịch vụ thì sao?", a: "PetEye không trực tiếp cung cấp dịch vụ chăm sóc thú cưng mà đóng vai trò là nền tảng kết nối. Trong trường hợp phát sinh sự cố, PetEye sẽ hỗ trợ tiếp nhận thông tin, phối hợp với đối tác liên quan và xem xét các bằng chứng như hình ảnh, video hoặc dữ liệu camera (nếu có) để hỗ trợ giải quyết khiếu nại một cách minh bạch và công bằng." },
              { q: "Tôi có thể hủy hoặc thay đổi lịch hẹn sau khi đặt không?", a: "Có. Bạn có thể hủy hoặc thay đổi lịch hẹn thông qua tài khoản PetEye trước thời gian sử dụng dịch vụ. Chính sách hoàn tiền và hủy lịch có thể khác nhau tùy theo từng cơ sở. Thông tin chi tiết sẽ được hiển thị trước khi bạn xác nhận đặt lịch để đảm bảo minh bạch ngay từ đầu." },
              { q: "Tôi có thể xem thú cưng của mình khi đang gửi lưu trú không?", a: "Có. Đối với các cơ sở tham gia chương trình Camera Monitoring của PetEye, chủ nuôi có thể truy cập camera trực tuyến trong thời gian thú cưng đang sử dụng dịch vụ. Quyền truy cập chỉ được cấp cho khách hàng có đơn đặt lịch hợp lệ nhằm đảm bảo tính riêng tư và an toàn thông tin." }
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                <button 
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-black text-slate-900 dark:text-white pr-4">{faq.q}</span>
                  <ChevronDown className={`shrink-0 text-slate-400 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-6 pb-5 text-slate-500 font-medium leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── News & Community CTA ─────────────────────────────────────────── */}
      <section className="px-6 -mt-24 md:-mt-32 relative z-10 pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto relative">
          {/* Decorative Glowing Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-400/20 dark:bg-indigo-500/10 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-b from-indigo-50/50 to-blue-100/50 dark:from-slate-900 dark:to-indigo-950/30 rounded-[3rem] p-10 md:p-16 text-center border border-white dark:border-slate-800 shadow-2xl shadow-indigo-500/5 relative overflow-hidden"
          >
            <div className="inline-flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <span className="material-symbols-outlined text-sm">article</span>
              Tin tức & Cộng đồng
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
              Cập nhật tin tức <span className="text-blue-600 dark:text-blue-400">mới nhất</span>
            </h2>
            
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto mb-10 leading-relaxed text-sm md:text-base">
              Khám phá những kiến thức chăm sóc thú cưng bổ ích và các sự kiện hấp dẫn từ hệ sinh thái PetEye.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => window.open('https://web.facebook.com/profile.php?id=61590306674838', '_blank')} className="w-full sm:w-auto bg-[#0B132B] hover:bg-[#15234b] text-white px-8 py-3.5 rounded-full font-black text-sm shadow-xl shadow-slate-900/10 hover:-translate-y-0.5 transition-all active:scale-95">
                Tham gia Facebook
              </button>
              <button onClick={() => window.open('https://tiktok.com', '_blank')} className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 px-8 py-3.5 rounded-full font-black text-sm shadow-lg shadow-slate-200/50 dark:shadow-none hover:-translate-y-0.5 transition-all active:scale-95">
                Theo dõi TikTok
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Sticky Mobile CTA ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50 md:hidden flex justify-center pb-safe">
        <button 
          onClick={() => navigate('/search')} 
          className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Search size={18} /> TÌM CƠ SỞ NGAY
        </button>
      </div>
    </main>
  );
}
