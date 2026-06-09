import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, RefreshCw } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  // email + password passed from Register page
  const email: string = location.state?.email ?? '';
  const password: string = location.state?.password ?? '';
  const isShop: boolean = location.state?.isShop ?? false;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if no email in state
  useEffect(() => {
    if (!email) navigate(isShop ? '/shop/register' : '/register', { replace: true });
  }, [email, navigate, isShop]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    setError('');
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.verifyEmail(email, otp);
      toast.success('Xác thực email thành công!');
      if (isShop) {
        // Shop cần admin duyệt — không auto login, redirect sang success page
        navigate('/shop/register/success', { replace: true });
      } else if (password) {
        await login(email, password);
        navigate('/user/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 6002) setError('OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.');
      else if (code === 6003) {
        toast.success('Email đã được xác thực.');
        if (isShop) {
          navigate('/shop/register/success', { replace: true });
        } else if (password) {
          await login(email, password);
          navigate('/user/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } else setError('Xác thực thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.resendVerification(email);
      toast.success('Đã gửi lại OTP về email của bạn');
      setCountdown(60);
      setOtp('');
      setError('');
      inputRef.current?.focus();
    } catch {
      toast.error('Gửi lại OTP thất bại. Vui lòng thử lại.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 md:p-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail size={32} className="text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Xác thực email</h2>
          <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
            Chúng tôi đã gửi mã OTP 6 chữ số đến
            <br />
            <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>
          </p>
        </div>

        {/* OTP input */}
        <div className="mb-6" onClick={() => inputRef.current?.focus()}>
          {/* Hiển thị 6 ô giả, thực ra chỉ có 1 input ẩn */}
          <div className="flex gap-3 justify-center relative cursor-text">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all
                  ${error ? 'border-red-400 bg-red-50 text-red-600'
                    : otp.length === i ? 'border-primary ring-2 ring-primary/20 bg-white'
                    : otp[i] ? 'border-slate-300 bg-white text-slate-900 dark:text-white dark:bg-slate-800'
                    : 'border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-600'}`}>
                {otp[i] ?? ''}
                {otp.length === i && (
                  <span className="animate-pulse text-primary text-2xl leading-none">|</span>
                )}
              </div>
            ))}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={handleOtpChange}
              className="absolute inset-0 opacity-0 cursor-text"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 mb-4"
        >
          {loading ? 'Đang xác thực...' : 'Xác thực'}
        </button>

        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-sm text-slate-500">
              Gửi lại OTP sau <span className="font-semibold text-primary">{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="flex items-center gap-2 mx-auto text-sm font-semibold text-primary hover:underline disabled:opacity-50"
            >
              <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
              {resending ? 'Đang gửi...' : 'Gửi lại OTP'}
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          OTP có hiệu lực trong 10 phút
        </p>
      </motion.div>
    </div>
  );
}
