import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, RefreshCw, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/auth.service';
import toast from 'react-hot-toast';

type Step = 'email' | 'otp' | 'newPassword';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      toast.success('Đã gửi OTP về email của bạn');
      setStep('otp');
      setCountdown(60);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 10010) setError('Email không tồn tại trong hệ thống.');
      else setError('Gửi OTP thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input helpers ─────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError('');
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    if (otp.join('').length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số OTP');
      return;
    }
    setError('');
    setStep('newPassword');
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Đã gửi lại OTP về email của bạn');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      setError('');
      inputs.current[0]?.focus();
    } catch {
      toast.error('Gửi lại OTP thất bại. Vui lòng thử lại.');
    } finally {
      setResending(false);
    }
  };

  // ── Step 3: Reset password ────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(email, otp.join(''), newPassword);
      toast.success('Đặt lại mật khẩu thành công!');
      navigate('/login', { replace: true });
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 6004) setError('OTP không đúng hoặc đã hết hạn. Vui lòng quay lại và thử lại.');
      else if (code === 6005) setError('OTP này đã được sử dụng. Vui lòng yêu cầu OTP mới.');
      else setError('Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 md:p-10"
      >
        {/* Back button */}
        <button
          onClick={() => step === 'email' ? navigate('/login') : setStep(step === 'newPassword' ? 'otp' : 'email')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>

        <AnimatePresence mode="wait">
          {/* ── Step 1: Email ── */}
          {step === 'email' && (
            <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail size={32} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Quên mật khẩu</h2>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                  Nhập email đăng ký để nhận mã OTP đặt lại mật khẩu
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="example@gmail.com"
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Nhớ mật khẩu rồi?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">Đăng nhập</Link>
              </p>
            </motion.div>
          )}

          {/* ── Step 2: OTP ── */}
          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Mail size={32} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Nhập mã OTP</h2>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                  Mã OTP đã được gửi đến
                  <br />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>
                </p>
              </div>

              <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { inputs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                      ${error ? 'border-red-400 bg-red-50' : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'}
                      focus:border-primary focus:ring-2 focus:ring-primary/20
                      text-slate-900 dark:text-white`}
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] mb-4"
              >
                Tiếp tục
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
              <p className="text-xs text-slate-400 text-center mt-4">OTP có hiệu lực trong 15 phút</p>
            </motion.div>
          )}

          {/* ── Step 3: New Password ── */}
          {step === 'newPassword' && (
            <motion.div key="newPassword" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Lock size={32} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Mật khẩu mới</h2>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                  Nhập mật khẩu mới cho tài khoản của bạn
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mật khẩu mới</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="Tối thiểu 8 ký tự"
                      className="w-full pl-12 pr-12 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nhập lại mật khẩu</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
