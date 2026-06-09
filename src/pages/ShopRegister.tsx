import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Mail, Phone, Lock, MapPin, FileText, CheckCircle, Loader2, AlertCircle, Upload, X, ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { shopService } from '../services/shop.service';
import { petService } from '../services/pet.service'; // Reuse upload service

export default function ShopRegister() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    shopName: '',
    shopType: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    description: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    licenseImageUrl: '',
    agreed: false
  });
  const [loading, setLoading] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const shopTypes = [
    { value: 'CLINIC', label: 'Phòng khám thú y' },
    { value: 'SPA', label: 'Spa & Grooming' },
    { value: 'HOTEL', label: 'Khách sạn thú cưng' },
    { value: 'MIXED', label: 'Dịch vụ tổng hợp' }
  ];

  const cities = [
    'TP. Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
    'Cần Thơ',
    'Hải Phòng',
    'Khác'
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      // Using petService.uploadAvatar as it points to the generic /files/upload endpoint
      const url = await petService.uploadAvatar(file);
      setFormData(prev => ({ ...prev, licenseImageUrl: url }));
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      const phoneRegex = /^(84|0[3|5|7|8|9])+([0-9]{8})$/;
      if (!phoneRegex.test(formData.phone)) {
        setError('Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng số VN (VD: 0912345678).');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.');
        return;
      }
    }

    if (step === 2) {
      if (formData.description.length < 10) {
        setError('Mô tả cửa hàng phải có ít nhất 10 ký tự.');
        return;
      }
    }

    if (step === 3) {
      if (formData.password.length < 8) {
        setError('Mật khẩu quá ngắn. Vui lòng nhập tối thiểu 8 ký tự.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Mật khẩu không khớp!');
        return;
      }
      if (!formData.agreed) {
        setError('Vui lòng đồng ý với điều khoản dịch vụ.');
        return;
      }
    }

    if (step < 3) {
      setError('');
      setStep(step + 1);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const request = {
        shopName: formData.shopName,
        shopType: formData.shopType,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        description: formData.description,
        password: formData.password,
        licenseNumber: formData.licenseNumber,
        licenseImageUrl: formData.licenseImageUrl
      };

      await shopService.register(request);
      
      // Redirect to email verification — same flow as user registration
      navigate('/verify-email', { state: { email: formData.email, password: formData.password, isShop: true } });
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) {
      return formData.shopName && formData.shopType && formData.email && formData.phone;
    }
    if (step === 2) {
      return formData.address && formData.city && formData.description;
    }
    if (step === 3) {
      const licenseValid = formData.licenseNumber.length === 10 || formData.licenseNumber.length === 13;
      return formData.password && formData.confirmPassword && licenseValid && formData.licenseImageUrl && formData.agreed;
    }
    return false;
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="size-16 bg-[#1a2b4c] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-2">Đăng ký làm đối tác</h1>
          <p className="text-slate-600">Tham gia Peteye để tiếp cận hàng ngàn khách hàng</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Thông tin cơ bản' },
              { num: 2, label: 'Địa chỉ & Mô tả' },
              { num: 3, label: 'Xác thực' }
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div className={`size-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    step >= s.num
                      ? 'bg-[#1a2b4c] text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    {step > s.num ? <CheckCircle size={24} /> : s.num}
                  </div>
                  <span className={`text-xs mt-2 font-medium text-center ${
                    step >= s.num ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-1 mx-4 rounded transition-all ${
                    step > s.num ? 'bg-[#1a2b4c]' : 'bg-slate-200'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2"
          >
            <AlertCircle size={20} />
            {error}
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-sm">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Tên cửa hàng/Phòng khám *
                </label>
                <input
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  placeholder="Ví dụ: PetCare Sài Gòn"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none"
                  required
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền tên cửa hàng')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Loại hình kinh doanh *
                </label>
                <select
                  value={formData.shopType}
                  onChange={(e) => setFormData({ ...formData, shopType: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none"
                  required
                  onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Vui lòng chọn loại hình kinh doanh')}
                  onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                >
                  <option value="">Chọn loại hình</option>
                  {shopTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="shop@example.com"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none"
                      required
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.valueMissing) target.setCustomValidity('Vui lòng điền email');
                        else if (target.validity.typeMismatch) target.setCustomValidity('Vui lòng nhập email hợp lệ');
                        else target.setCustomValidity('');
                      }}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Số điện thoại *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0901234567"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none"
                      required
                      onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền số điện thoại')}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address & Description */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Địa chỉ *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-400" size={20} />
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
                    rows={3}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none resize-none"
                    required
                    onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('Vui lòng điền địa chỉ')}
                    onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Thành phố *
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none"
                  required
                  onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Vui lòng chọn thành phố')}
                  onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                >
                  <option value="">Chọn thành phố</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Mô tả về cửa hàng *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Giới thiệu về cửa hàng, dịch vụ, đội ngũ..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none resize-none"
                  required
                  onInvalid={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('Vui lòng điền mô tả cửa hàng')}
                  onInput={(e) => (e.target as HTMLTextAreaElement).setCustomValidity('')}
                />
                <p className="text-xs text-slate-500 mt-2">Tối thiểu 10 ký tự ({formData.description.length}/10)</p>
              </div>
            </div>
          )}

          {/* Step 3: Verification */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Mật khẩu *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none"
                      required
                      onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền mật khẩu')}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Xác nhận mật khẩu *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#1a2b4c] outline-none"
                      required
                      onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền xác nhận mật khẩu')}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Mã số doanh nghiệp / Giấy phép kinh doanh *
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => {
                      // Chỉ cho nhập số, tối đa 13 ký tự
                      const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                      setFormData({ ...formData, licenseNumber: val });
                    }}
                    placeholder="10 hoặc 13 chữ số"
                    maxLength={13}
                    className={`w-full pl-12 pr-16 py-3 rounded-xl border-2 outline-none transition-colors ${
                      formData.licenseNumber.length > 0 && formData.licenseNumber.length !== 10 && formData.licenseNumber.length !== 13
                        ? 'border-red-300 focus:border-red-400'
                        : formData.licenseNumber.length === 10 || formData.licenseNumber.length === 13
                        ? 'border-green-400 focus:border-green-500'
                        : 'border-slate-200 focus:border-[#1a2b4c]'
                    }`}
                    required
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền mã số doanh nghiệp/giấy phép kinh doanh')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold ${
                    formData.licenseNumber.length === 10 || formData.licenseNumber.length === 13
                      ? 'text-green-500'
                      : 'text-slate-400'
                  }`}>
                    {formData.licenseNumber.length}/10-13
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Mã số doanh nghiệp Việt Nam gồm <span className="font-semibold">10 chữ số</span> (doanh nghiệp) hoặc <span className="font-semibold">13 chữ số</span> (chi nhánh)
                </p>
                {formData.licenseNumber.length > 0 && formData.licenseNumber.length !== 10 && formData.licenseNumber.length !== 13 && (
                  <p className="text-xs text-red-500 mt-1">Mã số phải có đúng 10 hoặc 13 chữ số</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Ảnh chụp giấy phép kinh doanh *
                </label>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*"
                />
                
                {formData.licenseImageUrl ? (
                  <div className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 aspect-video bg-slate-50">
                    <img 
                      src={formData.licenseImageUrl} 
                      alt="Business License" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform"
                      >
                        <Upload size={20} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, licenseImageUrl: '' }))}
                        className="p-3 bg-white rounded-full text-red-500 hover:scale-110 transition-transform"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#1a2b4c] hover:bg-slate-50 transition-all group"
                  >
                    <div className="size-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-[#1a2b4c]/10 transition-colors">
                      {isUploading ? (
                        <Loader2 size={24} className="text-[#1a2b4c] animate-spin" />
                      ) : (
                        <ImageIcon size={24} className="text-slate-400 group-hover:text-[#1a2b4c]" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">
                        {isUploading ? 'Đang tải ảnh lên...' : 'Tải ảnh giấy phép lên'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hỗ trợ: JPG, PNG, WEBP (Tối đa 5MB)
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle className="text-blue-500" size={18} />
                  Quy trình phê duyệt
                </h4>
                <ul className="text-xs text-slate-700 space-y-1 ml-6">
                  <li>1. Gửi đơn đăng ký</li>
                  <li>2. Admin xem xét hồ sơ (1-2 ngày làm việc)</li>
                  <li>3. Nhận email thông báo kết quả</li>
                  <li>4. Đăng nhập và bắt đầu sử dụng</li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.agreed}
                  onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                  className="mt-1 rounded border-slate-300 text-[#1a2b4c] focus:ring-[#1a2b4c]"
                />
                <label htmlFor="terms" className="text-xs text-slate-600">
                  Tôi đồng ý với <a href="#" className="font-bold text-[#1a2b4c] hover:underline">Điều khoản dịch vụ</a> và{' '}
                  <a href="#" className="font-bold text-[#1a2b4c] hover:underline">Chính sách bảo mật</a> của Peteye.
                  Tôi cam kết cung cấp thông tin chính xác và tuân thủ các quy định của nền tảng.
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Quay lại
              </button>
            )}
            <button
              type="submit"
              disabled={!isStepValid() || loading}
              className={`flex-1 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                isStepValid() && !loading
                  ? 'bg-[#1a2b4c] hover:bg-[#1a2b4c]/90'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {step === 3 ? 'Gửi đơn đăng ký' : 'Tiếp tục'}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-slate-500 text-sm">
            Đã có tài khoản? <Link to="/shop/login" className="text-[#1a2b4c] font-bold hover:underline">Đăng nhập tại đây</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

