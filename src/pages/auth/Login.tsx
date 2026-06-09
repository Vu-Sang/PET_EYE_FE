import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Store, User, ArrowRight, ArrowLeft, Shield, Star, Sparkles, Video, AlertCircle, PawPrint, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { authService } from '../../services/auth.service';
import Logo from '../../components/Logo';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setUserSession } = useAuth();

  // Define floating icons configuration for background (increased density to 25 elements)
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

    // Additional items to increase density
    { Icon: PawPrint, size: 20, left: '8%', delay: 14, duration: 27 },
    { Icon: Heart, size: 22, left: '24%', delay: 11, duration: 23 },
    { Icon: Sparkles, size: 16, left: '40%', delay: 15, duration: 29 },
    { Icon: PawPrint, size: 24, left: '56%', delay: 13, duration: 31 },
    { Icon: Heart, size: 18, left: '72%', delay: 16, duration: 25 },
    { Icon: Sparkles, size: 20, left: '88%', delay: 12, duration: 28 },

    { Icon: PawPrint, size: 26, left: '16%', delay: 5, duration: 30 },
    { Icon: Heart, size: 16, left: '32%', delay: 9, duration: 24 },
    { Icon: Sparkles, size: 18, left: '48%', delay: 3, duration: 26 },
    { Icon: PawPrint, size: 22, left: '64%', delay: 7, duration: 29 },
    { Icon: Heart, size: 20, left: '80%', delay: 13, duration: 27 },
    { Icon: Sparkles, size: 14, left: '96%', delay: 11, duration: 22 },
    { Icon: PawPrint, size: 28, left: '50%', delay: 17, duration: 34 },
  ];

  // Determine initial active role from path, route state, or search param
  const [activeRole, setActiveRole] = React.useState<'customer' | 'shop'>(() => {
    if (location.pathname.includes('/shop/login')) return 'shop';
    if (location.state?.role === 'shop') return 'shop';
    const params = new URLSearchParams(location.search);
    if (params.get('role') === 'shop') return 'shop';
    return 'customer';
  });

  // Separate states for Customer Form
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [customerPassword, setCustomerPassword] = React.useState('');
  const [showCustomerPassword, setShowCustomerPassword] = React.useState(false);

  // Separate states for Shop Form
  const [shopEmail, setShopEmail] = React.useState('');
  const [shopPassword, setShopPassword] = React.useState('');
  const [showShopPassword, setShowShopPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [targetUrl, setTargetUrl] = React.useState('');

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  const navigateToTarget = (url: string) => {
    setTargetUrl(url);
    setIsSuccess(true);
  };

  const handleAnimationComplete = () => {
    if (isSuccess && targetUrl) {
      navigate(targetUrl);
    }
  };

  const handleSocialSuccess = (userData: any) => {
    // Social login chỉ dành cho trang customer
    if (userData.role === 'SHOP_OWNER' || userData.role === 'STAFF') {
      setErrorMessage('Tài khoản cửa hàng/nhân viên không thể đăng nhập ở đây. Vui lòng dùng trang đăng nhập dành cho cửa hàng.');
      setLoading(false);
      return;
    }
    setUserSession(userData);
    if (userData.role === 'ADMIN') navigateToTarget('/admin/dashboard');
    else navigateToTarget('/');
  };

  const loginGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const userData = await authService.loginWithGoogle(tokenResponse.access_token);
        handleSocialSuccess(userData);
      } catch {
        setErrorMessage('Đăng nhập Google thất bại');
        setLoading(false);
      }
    },
    onError: () => setErrorMessage('Lỗi xác thực Google'),
  });

  const handleFacebookLogin = () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
    const redirectUri = import.meta.env.VITE_FACEBOOK_REDIRECT_URI || `${window.location.origin}/login/facebook/callback`;
    if (!appId) { setErrorMessage('Chưa cấu hình Facebook Login'); return; }
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile%20email`;
  };

  const handleZaloLogin = () => {
    const appId = import.meta.env.VITE_ZALO_APP_ID;
    const redirectUri = import.meta.env.VITE_ZALO_REDIRECT_URI || `${window.location.origin}/login/zalo/callback`;
    if (!appId) { setErrorMessage('Chưa cấu hình Zalo Login'); return; }
    const state = Math.random().toString(36).substring(7);
    window.location.href = `https://oauth.zaloapp.com/v4/permission?${new URLSearchParams({ app_id: appId, redirect_uri: redirectUri, state })}`;
  };

  const handleSubmit = async (e: React.FormEvent, roleType: 'customer' | 'shop') => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    const email = roleType === 'customer' ? customerEmail : shopEmail;
    const password = roleType === 'customer' ? customerPassword : shopPassword;

    try {
      const userData = await login(email, password);

      if (roleType === 'customer') {
        // Trang customer: chỉ cho phép USER và ADMIN
        if (userData.role === 'SHOP_OWNER') {
          setErrorMessage('Tài khoản này dành cho cửa hàng. Vui lòng đăng nhập tại trang dành cho cửa hàng.');
          setLoading(false);
          return;
        }
        if (userData.role === 'STAFF') {
          setErrorMessage('Tài khoản nhân viên không thể đăng nhập tại đây. Vui lòng đăng nhập tại trang dành cho cửa hàng.');
          setLoading(false);
          return;
        }
        // USER hoặc ADMIN
        if (userData.role === 'ADMIN') navigateToTarget('/admin/dashboard');
        else navigateToTarget('/');

      } else {
        // Trang shop: chỉ cho phép SHOP_OWNER, STAFF và ADMIN
        if (userData.role === 'USER') {
          setErrorMessage('Tài khoản khách hàng không thể đăng nhập tại đây. Vui lòng đăng nhập tại trang dành cho khách hàng.');
          setLoading(false);
          return;
        }
        // SHOP_OWNER, STAFF hoặc ADMIN
        if (userData.role === 'ADMIN') navigateToTarget('/admin/dashboard');
        else if (userData.role === 'SHOP_OWNER') navigateToTarget('/shop/dashboard');
        else navigateToTarget('/staff/dashboard');
      }
    } catch (error: any) {
      const code = Number(error.response?.data?.code);
      const msgs: Record<number, string> = {
        10010: roleType === 'shop' 
          ? 'Tài khoản cửa hàng không tồn tại trong hệ thống.' 
          : 'Email không tồn tại trong hệ thống.',
        1012: 'Mật khẩu không chính xác. Vui lòng thử lại.',
        1013: 'Tài khoản đang chờ phê duyệt từ quản trị viên.',
        1003: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.',
      };
      setErrorMessage(msgs[code] || error.response?.data?.message || 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex bg-white dark:bg-slate-950 overflow-hidden relative">
      {/* ─── LEFT PANEL (Full Screen Image) ─── */}
      <motion.div
        className="hidden md:flex w-1/2 h-full relative"
        initial={{ x: 0 }}
        animate={{ x: isSuccess ? '-100%' : '0%' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1964&auto=format&fit=crop"
          alt="Premium Pet Care"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a2b4c]/90 via-[#1a2b4c]/40 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 p-12 flex flex-col justify-between z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 scale-90 origin-left">
            <Link to="/"> <Logo forceWhite={true} /></Link>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white/90 text-[9px] font-black uppercase tracking-widest border border-white/20 -ml-1 mt-1">Partner</span>
          </div>

          {/* Bottom texts */}
          <div className="space-y-4 max-w-lg">
            <h3 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
              Nơi thú cưng được chăm sóc như gia đình.
            </h3>
            <p className="text-white/80 text-lg font-medium leading-relaxed">
              Khám phá giải pháp công nghệ toàn diện giúp bạn quản lý và chăm sóc thú cưng dễ dàng hơn bao giờ hết.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-white/60 pt-2">
              <span className="flex items-center gap-1.5"><Shield size={16} className="text-indigo-300" /> 200+ Đối tác</span>
              <span className="flex items-center gap-1.5"><Star size={16} className="text-yellow-400" /> 4.9★ Đánh giá</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── RIGHT PANEL (Form) ─── */}
      <motion.div
        className="w-full md:w-1/2 h-full relative flex flex-col justify-center px-6 md:px-12 lg:px-20 bg-slate-50 dark:bg-slate-950 overflow-hidden"
        initial={{ x: 0, opacity: 1 }}
        animate={{
          x: isSuccess ? (isDesktop ? '100%' : '0%') : '0%',
          opacity: isSuccess ? (isDesktop ? 1 : 0) : 1
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={handleAnimationComplete}
      >
        {/* Floating Icons Background (dimmed) */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-[0.03]">
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

        {/* Form Content */}
        <div className="relative z-10 w-full max-w-md mx-auto space-y-6">
           {/* Header Action: Back to Home */}
           <div className="flex items-center justify-between mb-2">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-400 hover:text-[#1a2b4c] dark:hover:text-white transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-slate-355 dark:group-hover:border-slate-700 group-hover:bg-white dark:group-hover:bg-slate-800 transition-all">
                <ArrowLeft size={14} />
              </div>
              <span className="text-xs font-black">Quay lại trang chủ</span>
            </Link>
            <div className="flex md:hidden items-center gap-2 scale-75 origin-right">
              <Logo />
            </div>
          </div>

          {/* Form Elevated Card */}
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800/80 shadow-[0_24px_64px_-16px_rgba(18,33,67,0.06)] dark:shadow-none space-y-6">
            {/* Role Toggle Switch */}
            <div className="relative flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl gap-1 border border-slate-200/20 dark:border-slate-700/20">
              <motion.div
                layoutId="roleIndicator"
                className="absolute top-1 bottom-1 bg-white dark:bg-slate-700 rounded-xl shadow-sm"
                style={{ width: 'calc(50% - 4px)', left: activeRole === 'customer' ? '4px' : 'calc(50% + 0px)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
              {[
                { key: 'customer', label: 'Khách hàng', icon: <User size={15} /> },
                { key: 'shop', label: 'Cửa hàng', icon: <Store size={15} /> },
              ].map((role) => (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => {
                    setActiveRole(role.key as any);
                    setErrorMessage('');
                  }}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-colors duration-200 ${
                    activeRole === role.key
                      ? 'text-primary dark:text-white'
                      : 'text-slate-450 hover:text-slate-650 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  {role.icon}
                  {role.label}
                </button>
              ))}
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center gap-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  {errorMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slide Transited Forms */}
            <div className="relative overflow-hidden min-h-[360px]">
              <AnimatePresence mode="wait">
                {activeRole === 'customer' ? (
                  <motion.div
                    key="customer-form"
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5">
                        Chào mừng trở lại 👋
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">
                        Đăng nhập bằng tài khoản Khách hàng
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={(e) => handleSubmit(e, 'customer')}>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Địa chỉ Email</label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                          <input
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary dark:focus:border-primary-light outline-none transition-all text-sm font-medium"
                            placeholder="customer@example.com"
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mật khẩu</label>
                          <Link to="/forgot-password" className="text-xs font-bold text-primary dark:text-secondary hover:text-primary-dark dark:hover:text-secondary-light hover:underline relative z-50">
                            Quên mật khẩu?
                          </Link>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                          <input
                            className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary dark:focus:border-primary-light outline-none transition-all text-sm font-medium"
                            placeholder="••••••••"
                            type={showCustomerPassword ? 'text' : 'password'}
                            value={customerPassword}
                            onChange={(e) => setCustomerPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCustomerPassword(!showCustomerPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 transition-colors"
                          >
                            {showCustomerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

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
                            Đăng nhập ngay
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="flex items-center gap-4 py-1">
                      <div className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800" />
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Hoặc đăng nhập bằng</span>
                      <div className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => loginGoogle()}
                        type="button"
                        className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-350 dark:hover:border-slate-700 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-none transition-all rounded-2xl"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 hidden sm:inline">Google</span>
                      </button>

                      <button
                        onClick={handleFacebookLogin}
                        type="button"
                        className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-[#1877F2]/30 dark:hover:border-[#1877F2]/30 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-none transition-all rounded-2xl"
                      >
                        <svg className="w-4 h-4 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 hidden sm:inline">Facebook</span>
                      </button>

                      <button
                        onClick={handleZaloLogin}
                        type="button"
                        className="flex items-center justify-center gap-2 py-3 px-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-[#0068FF]/30 dark:hover:border-[#0068FF]/30 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-none transition-all rounded-2xl"
                      >
                        <span className="font-black text-[#0068FF] text-[13px] leading-none shrink-0">Z</span>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 hidden sm:inline">Zalo</span>
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="shop-form"
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="space-y-5"
                  >
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1.5">
                        Đối tác Peteye 🏪
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">
                        Đăng nhập dành cho Cửa hàng / Chuyên gia
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={(e) => handleSubmit(e, 'shop')}>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Email cửa hàng</label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                          <input
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary dark:focus:border-primary-light outline-none transition-all text-sm font-medium"
                            placeholder="shop@example.com"
                            type="email"
                            value={shopEmail}
                            onChange={(e) => setShopEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Mật khẩu</label>
                          <Link to="/forgot-password" className="text-xs font-bold text-primary dark:text-secondary hover:text-primary-dark dark:hover:text-secondary-light hover:underline relative z-50">
                            Quên mật khẩu?
                          </Link>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                          <input
                            className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary dark:focus:border-primary-light outline-none transition-all text-sm font-medium"
                            placeholder="••••••••"
                            type={showShopPassword ? 'text' : 'password'}
                            value={shopPassword}
                            onChange={(e) => setShopPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowShopPassword(!showShopPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors"
                          >
                            {showShopPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

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
                            Đăng nhập cửa hàng
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-start gap-3 mt-4">
                      <AlertCircle className="text-primary dark:text-blue-400 shrink-0 mt-0.5" size={16} />
                      <div className="flex-1 text-[10px] text-slate-500 leading-relaxed font-bold">
                        Bạn đang đăng nhập bằng hệ thống đối tác. Vui lòng đảm bảo thông tin chính xác. Liên hệ hỗ trợ nếu tài khoản của bạn chưa được phê duyệt.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Register Link Footer */}
          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400 font-bold">
            {activeRole === 'customer' ? (
              <>
                Chưa có tài khoản?{' '}
                <Link to="/register" className="text-primary dark:text-secondary font-black hover:underline ml-1">
                  Đăng ký miễn phí →
                </Link>
              </>
            ) : (
              <>
                Muốn hợp tác kinh doanh?{' '}
                <Link to="/shop/register" className="text-primary dark:text-secondary font-black hover:underline ml-1">
                  Đăng ký làm đối tác →
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
