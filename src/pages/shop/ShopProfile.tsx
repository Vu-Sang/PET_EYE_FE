import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, Mail, Clock, Camera, Save, Loader2, ShieldCheck, Image as ImageIcon, CalendarX, Plus, X, Calendar } from 'lucide-react';
import { shopService } from '../../services/shop.service';
import { fileService } from '../../services/file.service';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

export default function ShopProfile() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [shopInfo, setShopInfo] = useState({
    name: '',
    type: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    description: '',
    openTime: '08:00',
    closeTime: '20:00',
    workingDays: [] as string[],
    offDays: [] as string[],
    logoUrl: '',
    bannerUrl: '',
    galleryUrls: '',
    isVerified: false,
    lateGracePeriod: 15,
  });

  const VIETNAM_CITIES = [
    'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 
    'Bình Dương', 'Đồng Nai', 'Khánh Hòa', 'Lâm Đồng', 'Quảng Ninh'
  ];

  useEffect(() => {
    fetchShopProfile();
  }, []);

  const fetchShopProfile = async () => {
    try {
      setLoading(true);
      const data = await shopService.getMyShop();
      console.log('API getMyShop returned:', data);
      setShopInfo(prev => ({
        ...prev,
        name: data.shopName || prev.name,
        type: data.shopType || prev.type,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        address: data.address || prev.address,
        city: data.city || prev.city,
        description: data.description || prev.description,
        openTime: data.openTime || prev.openTime,
        closeTime: data.closeTime || prev.closeTime,
        workingDays: data.workingDays ? data.workingDays.split(',') : prev.workingDays,
        offDays: data.offDays ? data.offDays.split(',') : prev.offDays,
        logoUrl: data.logoUrl || prev.logoUrl,
        bannerUrl: data.bannerUrl || prev.bannerUrl,
        galleryUrls: data.galleryUrls || prev.galleryUrls,
        isVerified: data.isVerified,
        lateGracePeriod: data.lateGracePeriod ?? prev.lateGracePeriod,
      }));
    } catch (err) {
      console.error('Failed to fetch shop profile:', err);
      toast.error('Không thể tải thông tin cửa hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted. Current shopInfo:', shopInfo);
    try {
      setSaving(true);
      setError(null);
      const updateData = {
        shopName: shopInfo.name,
        shopType: shopInfo.type,
        email: shopInfo.email,
        phone: shopInfo.phone,
        address: shopInfo.address,
        city: shopInfo.city,
        description: shopInfo.description,
        openTime: shopInfo.openTime,
        closeTime: shopInfo.closeTime,
        workingDays: shopInfo.workingDays.join(','),
        offDays: shopInfo.offDays.join(','),
        logoUrl: shopInfo.logoUrl,
        bannerUrl: shopInfo.bannerUrl,
        galleryUrls: shopInfo.galleryUrls,
        lateGracePeriod: shopInfo.lateGracePeriod,
      };
      console.log('Sending update request with data:', updateData);
      const data = await shopService.updateMyShop(updateData);
      
      // Update state safely using prev state
      setShopInfo(prev => ({
        ...prev,
        name: data.shopName || prev.name,
        type: data.shopType || prev.type,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        address: data.address || prev.address,
        city: data.city || prev.city,
        description: data.description || prev.description,
        openTime: data.openTime || prev.openTime,
        closeTime: data.closeTime || prev.closeTime,
        workingDays: data.workingDays ? data.workingDays.split(',') : prev.workingDays,
        offDays: data.offDays ? data.offDays.split(',') : prev.offDays,
        logoUrl: data.logoUrl || prev.logoUrl,
        bannerUrl: data.bannerUrl || prev.bannerUrl,
        galleryUrls: data.galleryUrls || prev.galleryUrls,
        isVerified: data.isVerified,
        lateGracePeriod: data.lateGracePeriod ?? prev.lateGracePeriod,
      }));
      
      toast.success('Đã cập nhật thông tin cửa hàng!');
    } catch (err) {
      console.error('Failed to update shop profile:', err);
      toast.error('Cập nhật thông tin thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (e.g., 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      if (type === 'gallery') {
        const currentImages = shopInfo.galleryUrls ? shopInfo.galleryUrls.split(',').filter(Boolean) : [];
        if (currentImages.length >= 10) {
          toast.error('Đã đạt giới hạn 10 ảnh tối đa.');
          return;
        }
        setUploadingGallery(true);
      } else if (type === 'logo') {
        setUploadingLogo(true);
      } else {
        setUploadingBanner(true);
      }

      const url = await fileService.upload(file);
      
      if (type === 'gallery') {
        setShopInfo(prev => ({
          ...prev,
          galleryUrls: prev.galleryUrls ? `${prev.galleryUrls},${url}` : url
        }));
      } else {
        setShopInfo(prev => ({
          ...prev,
          [type === 'logo' ? 'logoUrl' : 'bannerUrl']: url
        }));
      }
      
      toast.success(`Đã tải ${type === 'logo' ? 'logo' : type === 'banner' ? 'ảnh bìa' : 'ảnh thư viện'} lên thành công!`);
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Tải ảnh lên thất bại');
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else if (type === 'banner') setUploadingBanner(false);
      else setUploadingGallery(false);
    }
  };

  const removeGalleryImage = (urlToRemove: string) => {
    const currentUrls = shopInfo.galleryUrls.split(',').filter(Boolean);
    const updatedUrls = currentUrls.filter(url => url !== urlToRemove).join(',');
    setShopInfo({ ...shopInfo, galleryUrls: updatedUrls });
  };

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  const toggleWorkingDay = (day: string) => {
    setShopInfo({
      ...shopInfo,
      workingDays: shopInfo.workingDays.includes(day)
        ? shopInfo.workingDays.filter(d => d !== day)
        : [...shopInfo.workingDays, day],
    });
  };

  const [newOffStartDate, setNewOffStartDate] = useState('');
  const [newOffEndDate, setNewOffEndDate] = useState('');

  const addOffDateRange = () => {
    if (!newOffStartDate) return;
    
    let datesToAdd: string[] = [];
    const start = new Date(newOffStartDate);
    
    if (newOffEndDate) {
      const end = new Date(newOffEndDate);
      if (end < start) {
        toast.error('Ngày kết thúc không được nhỏ hơn ngày bắt đầu!');
        return;
      }
      let current = new Date(start);
      while (current <= end) {
        // Handle timezone issues to get correct YYYY-MM-DD
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        datesToAdd.push(`${year}-${month}-${day}`);
        current.setDate(current.getDate() + 1);
      }
    } else {
      datesToAdd.push(newOffStartDate);
    }
    
    const currentOffDays = [...shopInfo.offDays];
    let addedCount = 0;
    
    datesToAdd.forEach(date => {
      if (!currentOffDays.includes(date)) {
        currentOffDays.push(date);
        addedCount++;
      }
    });
    
    if (addedCount === 0) {
      toast.error('Các ngày đã chọn đều đã có trong danh sách nghỉ!');
      return;
    }
    
    setShopInfo({ ...shopInfo, offDays: currentOffDays.sort() });
    setNewOffStartDate('');
    setNewOffEndDate('');
    if (datesToAdd.length > 1) {
      toast.success(`Đã thêm ${addedCount} ngày nghỉ vào danh sách!`);
    }
  };

  const removeOffDate = (dateToRemove: string) => {
    setShopInfo({ ...shopInfo, offDays: shopInfo.offDays.filter(d => d !== dateToRemove) });
  };

  console.log('Rendering ShopProfile with logo:', shopInfo.logoUrl);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-transparent' : 'bg-slate-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-8 animate-in fade-in duration-500">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Store className={`w-8 h-8 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`} />
              Thông tin cửa hàng
            </h1>
            <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Quản lý thông tin và cài đặt cửa hàng của bạn
            </p>
          </div>
        </header>

        {error && (
          <div className={`border rounded-xl p-4 flex items-center gap-3 mb-6 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl shadow-sm ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white'}`}>
            <Loader2 size={40} className={`animate-spin mb-4 ${isDark ? 'text-indigo-400' : 'text-[#1a2b4c]'}`} />
            <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Đang tải thông tin cửa hàng...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Shop Media */}
            <div className={`rounded-2xl p-8 shadow-sm border relative overflow-hidden transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
              <div className="absolute top-0 right-0 p-4">
                {shopInfo.isVerified && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    <ShieldCheck size={14} />
                    Đã xác minh
                  </div>
                )}
              </div>
              
              <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Store size={20} className={isDark ? 'text-indigo-400' : 'text-primary'} />
                Hình ảnh cửa hàng
              </h3>
              
              <div className="space-y-8">
                {/* Banner Section */}
                <div className="relative group">
                  <div className={`w-full h-48 rounded-2xl overflow-hidden border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                    {uploadingBanner ? (
                      <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <Loader2 className={`animate-spin ${isDark ? 'text-indigo-400' : 'text-primary'}`} size={32} />
                      </div>
                    ) : shopInfo.bannerUrl ? (
                      <img src={shopInfo.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <ImageIcon size={40} className="mb-2" />
                        <p className="text-xs font-medium">Chưa có ảnh bìa</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={bannerInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'banner')}
                  />
                  <button 
                    type="button" 
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className={`absolute bottom-4 right-4 p-2 backdrop-blur shadow-lg rounded-xl transition-all flex items-center gap-2 text-xs font-bold border disabled:opacity-50 ${isDark ? 'bg-slate-800/90 text-white border-white/10 hover:bg-slate-800' : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white'}`}
                  >
                    <Camera size={14} />
                    {uploadingBanner ? 'Đang tải...' : 'Thay ảnh bìa'}
                  </button>
                </div>

                {/* Logo & Info */}
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="relative">
                    <div className={`size-32 rounded-3xl p-1 shadow-xl border -mt-16 md:-mt-20 ml-4 relative z-10 overflow-hidden ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-100'}`}>
                      <div className={`w-full h-full rounded-[1.25rem] overflow-hidden flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                        {uploadingLogo ? (
                          <Loader2 className={`animate-spin ${isDark ? 'text-indigo-400' : 'text-primary'}`} size={24} />
                        ) : shopInfo.logoUrl ? (
                          <img src={shopInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Store size={40} className={isDark ? 'text-slate-700' : 'text-slate-200'} />
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={logoInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'logo')}
                      />
                      <button 
                        type="button" 
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className={`absolute bottom-2 right-2 p-1.5 text-white rounded-lg shadow-lg hover:scale-110 transition-transform disabled:opacity-50 ${isDark ? 'bg-indigo-600' : 'bg-primary'}`}
                      >
                        <Camera size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 pt-2">
                    <h2 className={`text-2xl font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {shopInfo.name || 'Tên cửa hàng'}
                    </h2>
                    <p className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {shopInfo.type || 'Chưa cập nhật loại hình'} • {shopInfo.city || 'Chưa cập nhật địa chỉ'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Gallery */}
            <div className={`rounded-2xl p-8 shadow-sm border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
              <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <ImageIcon size={20} className={isDark ? 'text-indigo-400' : 'text-primary'} />
                Thư viện ảnh
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {shopInfo.galleryUrls.split(',').filter(Boolean).map((url, index) => (
                  <div key={index} className={`relative group aspect-square rounded-xl overflow-hidden border ${isDark ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                    <img src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(url)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
                
                {/* Upload Button */}
                {shopInfo.galleryUrls.split(',').filter(Boolean).length < 10 ? (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingGallery}
                    className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-50 ${isDark ? 'border-slate-700 text-slate-500 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 text-slate-400 hover:border-primary hover:text-primary'}`}
                  >
                    {uploadingGallery ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <>
                        <div className={`size-10 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800/50 group-hover:bg-indigo-500/20' : 'bg-slate-50 group-hover:bg-primary/10'}`}>
                          <span className="material-symbols-outlined">add_photo_alternate</span>
                        </div>
                        <span className="text-xs font-bold">Thêm ảnh</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 opacity-70 ${isDark ? 'border-slate-700 text-slate-500 bg-slate-800/30' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                     <span className="material-symbols-outlined text-red-400">block</span>
                     <span className="text-[10px] font-bold text-center px-2">Đã đạt tối đa 10 ảnh</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={galleryInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'gallery')}
              />
              <div className={`mt-6 border rounded-xl p-4 ${isDark ? 'bg-indigo-900/20 border-indigo-500/20' : 'bg-blue-50/50 border-blue-100'}`}>
                <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-blue-900'}`}>
                  <span className={`material-symbols-outlined text-lg ${isDark ? 'text-indigo-400' : 'text-blue-600'}`}>info</span>
                  Hướng dẫn hiển thị thư viện ảnh
                </h4>
                <p className={`text-xs mb-3 leading-relaxed ${isDark ? 'text-indigo-200/70' : 'text-blue-800/80'}`}>
                  Bố cục ảnh trên trang chi tiết cửa hàng sẽ tự động điều chỉnh dựa trên số lượng ảnh bạn tải lên:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                  {/* 1 Image */}
                  <div className="flex flex-col gap-2 items-center">
                    <div className="w-full aspect-[4/3] bg-blue-100/50 rounded-lg border border-blue-200"></div>
                    <span className="text-[10px] font-bold text-blue-900">1 ảnh</span>
                  </div>
                  {/* 2 Images */}
                  <div className="flex flex-col gap-2 items-center">
                    <div className="w-full aspect-[4/3] grid grid-cols-2 gap-1">
                      <div className="bg-blue-100/50 rounded-l-lg border border-blue-200"></div>
                      <div className="bg-blue-100/50 rounded-r-lg border border-blue-200"></div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-900">2 ảnh</span>
                  </div>
                  {/* 3 Images */}
                  <div className="flex flex-col gap-2 items-center">
                    <div className="w-full aspect-[4/3] grid grid-cols-3 gap-1">
                      <div className="col-span-2 bg-blue-100/50 rounded-l-lg border border-blue-200"></div>
                      <div className="col-span-1 grid grid-rows-2 gap-1">
                        <div className="bg-blue-100/50 rounded-tr-lg border border-blue-200"></div>
                        <div className="bg-blue-100/50 rounded-br-lg border border-blue-200"></div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-900">3 ảnh</span>
                  </div>
                  {/* 4 Images */}
                  <div className="flex flex-col gap-2 items-center">
                    <div className="w-full aspect-[4/3] grid grid-cols-3 grid-rows-2 gap-1">
                      <div className="col-span-2 row-span-2 bg-blue-100/50 rounded-l-lg border border-blue-200"></div>
                      <div className="col-span-1 row-span-1 bg-blue-100/50 rounded-tr-lg border border-blue-200"></div>
                      <div className="col-span-1 row-span-1 bg-blue-100/50 rounded-br-lg border border-blue-200"></div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-900">4 ảnh</span>
                  </div>
                  {/* 5+ Images */}
                  <div className="flex flex-col gap-2 items-center relative">
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10">
                      Nên dùng
                    </div>
                    <div className="w-full aspect-[4/3] grid grid-cols-4 grid-rows-2 gap-1">
                      <div className="col-span-2 row-span-2 bg-blue-500/20 rounded-l-lg border border-blue-300"></div>
                      <div className="col-span-1 row-span-1 bg-blue-500/20 border border-blue-300"></div>
                      <div className="col-span-1 row-span-1 bg-blue-500/20 rounded-tr-lg border border-blue-300"></div>
                      <div className="col-span-1 row-span-1 bg-blue-500/20 border border-blue-300"></div>
                      <div className="col-span-1 row-span-1 bg-blue-500/20 rounded-br-lg border border-blue-300 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-blue-700 opacity-60">+</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-900">5+ ảnh</span>
                  </div>
                </div>
              </div>
            </div>

          {/* Basic Info */}
          {/* Basic Info */}
          <div className={`rounded-xl p-6 shadow-sm border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
            <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Thông tin cơ bản</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Tên cửa hàng *
                </label>
                <input
                  type="text"
                  value={shopInfo.name}
                  onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền tên cửa hàng.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Loại hình *
                </label>
                <select
                  value={shopInfo.type}
                  onChange={(e) => setShopInfo({ ...shopInfo, type: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                >
                  <option value="CLINIC" className={isDark ? 'bg-slate-800 text-white' : ''}>Phòng khám thú y</option>
                  <option value="SPA" className={isDark ? 'bg-slate-800 text-white' : ''}>Spa & Grooming</option>
                  <option value="HOTEL" className={isDark ? 'bg-slate-800 text-white' : ''}>Khách sạn thú cưng</option>
                  <option value="MIXED" className={isDark ? 'bg-slate-800 text-white' : ''}>Dịch vụ tổng hợp</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email *
                </label>
                <input
                  type="email"
                  value={shopInfo.email}
                  onChange={(e) => setShopInfo({ ...shopInfo, email: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền địa chỉ email.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={shopInfo.phone}
                  onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền số điện thoại.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400'}`}
                  placeholder="Ví dụ: 0912345678"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Thành phố/Tỉnh *
                </label>
                <select
                  value={shopInfo.city}
                  onChange={(e) => setShopInfo({ ...shopInfo, city: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Vui lòng chọn thành phố.')}
                  onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                >
                  <option value="" className={isDark ? 'bg-slate-800 text-white' : ''}>Chọn thành phố</option>
                  {VIETNAM_CITIES.map(city => (
                    <option key={city} value={city} className={isDark ? 'bg-slate-800 text-white' : ''}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Địa chỉ *
                </label>
                <input
                  type="text"
                  value={shopInfo.address}
                  onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền địa chỉ.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mô tả
                </label>
                <textarea
                  value={shopInfo.description}
                  onChange={(e) => setShopInfo({ ...shopInfo, description: e.target.value })}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none resize-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                />
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className={`rounded-xl p-6 shadow-sm border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
            <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Giờ làm việc</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Giờ mở cửa
                  </label>
                  <input
                    type="time"
                    value={shopInfo.openTime}
                    onChange={(e) => setShopInfo({ ...shopInfo, openTime: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Giờ đóng cửa
                  </label>
                  <input
                    type="time"
                    value={shopInfo.closeTime}
                    onChange={(e) => setShopInfo({ ...shopInfo, closeTime: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Ngày làm việc
                </label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWorkingDay(day)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        shopInfo.workingDays.includes(day)
                          ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-[#1a2b4c] text-white')
                          : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Thời gian chờ tối đa (Grace Period)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={shopInfo.lateGracePeriod}
                    onChange={(e) => setShopInfo({ ...shopInfo, lateGracePeriod: parseInt(e.target.value) || 15 })}
                    className={`w-32 px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  />
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>phút (Từ 5 đến 30 phút)</span>
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Nếu khách hàng đến trễ quá thời gian này, nhân viên sẽ có quyền hủy lịch hẹn và cửa hàng sẽ giữ lại tiền cọc (No-Show).
                </p>
              </div>

              {/* Shop Off Days */}
              <div className={`mt-8 pt-8 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left config side */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h4 className={`font-black text-lg flex items-center gap-2 mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                          <CalendarX size={16} />
                        </div>
                        Cấu hình ngày nghỉ
                      </h4>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Khách hàng sẽ không thể đặt lịch vào các ngày này. Chọn 1 ngày hoặc chọn khoảng thời gian.
                      </p>
                    </div>

                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Từ ngày</label>
                          <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="date"
                              value={newOffStartDate}
                              onChange={(e) => setNewOffStartDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]} 
                              className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/30' : 'bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#1a2b4c]/10'}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Đến ngày (Tùy chọn)</label>
                          <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="date"
                              value={newOffEndDate}
                              onChange={(e) => setNewOffEndDate(e.target.value)}
                              min={newOffStartDate || new Date().toISOString().split('T')[0]}
                              className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/30' : 'bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#1a2b4c]/10'}`}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addOffDateRange}
                        disabled={!newOffStartDate}
                        className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}
                      >
                        <Plus size={14} /> Thêm ngày nghỉ
                      </button>
                    </div>
                  </div>

                  {/* Right display side */}
                  <div className="flex-1">
                    <div className={`h-full rounded-2xl border p-5 flex flex-col ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <h5 className={`text-sm font-black mb-4 flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Danh sách ngày nghỉ
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{shopInfo.offDays.length} ngày</span>
                      </h5>
                      <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar pr-2">
                        {shopInfo.offDays.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-8">
                            <CalendarX size={32} className="mb-2" />
                            <p className="text-xs font-bold">Chưa có ngày nghỉ nào được thiết lập.</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {shopInfo.offDays.map((date) => (
                              <div key={date} className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-rose-500/50' : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300'}`}>
                                <Calendar size={12} className="opacity-50" />
                                {date.split('-').reverse().join('/')}
                                <button
                                  type="button"
                                  onClick={() => removeOffDate(date)}
                                  className={`p-0.5 rounded-md transition-colors ${isDark ? 'text-slate-500 hover:bg-rose-500/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-100 hover:text-rose-600'}`}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                className={`px-6 py-3 border rounded-xl font-semibold transition-all ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg disabled:opacity-70 ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-[#1a2b4c]'}`}
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
