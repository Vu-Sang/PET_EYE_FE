import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, MapPin, ArrowRight, ArrowLeft, Shield, Star, Sparkles, PawPrint, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { userService } from '../../services/user.service';
import Logo from '../../components/Logo';

export default function Register() {
  const navigate = useNavigate();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const floatingIcons = [
    { Icon: PawPrint, size: 24, left: '4%', delay: 0, duration: 25 },
    { Icon: Heart, size: 16, left: '12%', delay: 4, duration: 28 },
    { Icon: Sparkles, size: 18, left: '20%', delay: 8, duration: 22 },
    { Icon: PawPrint, size: 28, left: '28%', delay: 2, duration: 32 },
    { Icon: Heart, size: 20, left: '36%', delay: 10, duration: 26 },
    { Icon: Sparkles, size: 14, left: '44%', delay: 6, duration: 24 },
    { Icon: PawPrint, size: 22, left: '52%', delay: 12, duration: 30 },
    { Icon: Heart, size: 24, left: '60%', delay: 7, duration: 27 },
    { Icon: Sparkles, size: 20, left: '68%', delay: 3, duration: 23 },
    { Icon: PawPrint, size: 26, left: '76%', delay: 9, duration: 29 },
    { Icon: Heart, size: 18, left: '84%', delay: 1, duration: 25 },
    { Icon: Sparkles, size: 22, left: '92%', delay: 5, duration: 31 },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneRegex = /^(84|0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(phone)) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng số VN (VD: 0912345678).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu quá ngắn. Vui lòng nhập tối thiểu 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) { 
      setError('Mật khẩu nhập lại không khớp'); 
      return; 
    }
    
    setLoading(true);
    setError('');
    try {
      await userService.register({ email, password, fullName, phone, address });
      navigate('/verify-email', { state: { email, password } });
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 1002) setError('Email đã được sử dụng');
      else setError('Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex bg-white dark:bg-slate-950 overflow-hidden relative">
      {/* ─── LEFT PANEL (Full Screen Image) ─── */}
      <motion.div
        className="hidden md:flex w-1/2 h-full relative"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop"
          alt="Premium Pet Care - Cat"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a2b4c]/90 via-[#1a2b4c]/40 to-[#1a2b4c]/10" />
        
        {/* Content */}
        <div className="absolute inset-0 p-12 flex flex-col justify-between z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 scale-90 origin-left">
            <Link to ="/"><Logo forceWhite={true} /> </Link>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white/90 text-[9px] font-black uppercase tracking-widest border border-white/20 -ml-1 mt-1">Community</span>
          </div>

          {/* Bottom texts */}
          <div className="space-y-4 max-w-lg">
            <h3 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Yêu thương từ những điều nhỏ nhất.
            </h3>
            <p className="text-white/80 text-lg font-medium leading-relaxed">
              Trở thành thành viên của cộng đồng yêu thú cưng lớn nhất, nhận ngay đặc quyền đặt lịch, tích điểm và theo dõi camera 24/7.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-white/60 pt-2">
              <span className="flex items-center gap-1.5"><Shield size={16} className="text-emerald-300" /> Uy tín tuyệt đối</span>
              <span className="flex items-center gap-1.5"><Star size={16} className="text-yellow-400" /> +10,000 Thành viên</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── RIGHT PANEL (Form) ─── */}
      <motion.div
        className="w-full md:w-1/2 h-full relative flex flex-col justify-center bg-slate-50 dark:bg-slate-950 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      >
        {/* Floating Icons Background (dimmed) */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-[0.03] overflow-hidden">
          {floatingIcons.map((item, index) => {
            const Icon = item.Icon;
            return (
              <motion.div
                key={index}
                className="absolute bottom-[-60px] text-slate-400 dark:text-slate-300 pointer-events-none"
                style={{ left: item.left }}
                animate={{
                  y: ['0vh', '-120vh'],
                  x: [0, 20, -20, 15, 0],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: item.duration,
                  repeat: Infinity,
                  delay: item.delay,
                  ease: 'linear',
                }}
              >
                <Icon size={item.size} />
              </motion.div>
            );
          })}
        </div>

        {/* Form Content Wrapper with Padding for scrollability */}
        <div className="w-full py-8 px-6 md:px-12 lg:px-20 min-h-max flex flex-col justify-center relative z-10">
          
          <div className="w-full max-w-md mx-auto space-y-4">
            {/* Header Action: Back to Home */}
            <div className="flex items-center justify-between mb-0">
              <Link
                to="/"
                className="flex items-center gap-2 text-slate-400 hover:text-primary dark:hover:text-white transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-primary/20 dark:group-hover:border-slate-700 group-hover:bg-white dark:group-hover:bg-slate-800 transition-all">
                  <ArrowLeft size={14} />
                </div>
                <span className="text-xs font-black">Quay lại trang chủ</span>
              </Link>
              <div className="flex md:hidden items-center gap-2 scale-75 origin-right">
                <Logo />
              </div>
            </div>

            {/* Form Elevated Card */}
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-6 lg:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_24px_64px_-16px_rgba(18,33,67,0.06)] dark:shadow-none space-y-5">
              
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
                  Đăng ký thành viên ✨
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                  Khởi đầu hành trình chăm sóc thú cưng chuyên nghiệp
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  {error}
                </motion.div>
              )}

              <form className="space-y-3" onSubmit={handleSubmit}>
                {/* Row 1: Name and Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Họ và tên</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                        placeholder="Nguyễn Văn A" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền họ và tên')}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Số ĐT</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                        placeholder="0901234567" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền số điện thoại')}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} />
                    </div>
                  </div>
                </div>

                {/* Row 2: Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Địa chỉ Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                      placeholder="customer@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.valueMissing) target.setCustomValidity('Vui lòng điền email');
                        else if (target.validity.typeMismatch) target.setCustomValidity('Vui lòng nhập email hợp lệ');
                        else target.setCustomValidity('');
                      }}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} />
                  </div>
                </div>

                {/* Row 3: Address */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Địa chỉ</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                    <input
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                      placeholder="Số 1 Võ Văn Ngân, Thủ Đức" type="text" value={address} onChange={e => setAddress(e.target.value)} required
                      onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền địa chỉ')}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} />
                  </div>
                </div>

                {/* Row 4: Passwords */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mật khẩu</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                        placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                        onInvalid={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.validity.valueMissing) target.setCustomValidity('Vui lòng điền mật khẩu');
                          else if (target.validity.tooShort) target.setCustomValidity('Mật khẩu phải có ít nhất 8 ký tự');
                          else target.setCustomValidity('');
                        }}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Nhập lại</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm font-medium"
                        placeholder="••••••••" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng nhập lại mật khẩu')}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} />
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 py-2">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 transition-colors" id="terms" required
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Bạn phải đồng ý với điều khoản dịch vụ')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')} />
                  <label htmlFor="terms" className="text-[11px] font-bold text-slate-500 leading-relaxed">
                    Tôi đồng ý với các{' '}
                    <a href="#" className="text-primary hover:text-primary-dark transition-colors">Điều khoản dịch vụ</a>{' '}
                    và{' '}
                    <a href="#" className="text-primary hover:text-primary-dark transition-colors">Chính sách bảo mật</a>.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm uppercase tracking-wider"
                >
                  {loading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      Đăng ký thành viên
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Links Footer */}
            <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400 font-bold space-y-1">
              <p>
                Bạn đã có tài khoản?{' '}
                <Link to="/login" className="text-primary font-black hover:underline ml-1">
                  Đăng nhập tại đây →
                </Link>
              </p>
              <p className="text-xs font-medium">
                Muốn hợp tác kinh doanh?{' '}
                <Link to="/shop/register" className="text-slate-700 dark:text-slate-300 font-bold hover:text-primary transition-colors">
                  Đăng ký làm đối tác
                </Link>
              </p>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
