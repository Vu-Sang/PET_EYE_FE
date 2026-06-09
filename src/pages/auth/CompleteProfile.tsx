import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/auth.service';
import { Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CompleteProfile() {
  const { user, setUserSession } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!user || !user.requiresEmailUpdate) {
    // Redirect if not needed
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phone) {
        toast.error('Vui lòng nhập đầy đủ email và số điện thoại');
        return;
    }

    setLoading(true);
    try {
      const updatedUser = await authService.updateEmail(email, phone);
      setUserSession(updatedUser);
      toast.success('Cập nhật thông tin thành công!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Hoàn tất hồ sơ</h2>
          <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left">
            <p className="text-amber-800 text-xs leading-relaxed font-medium">
              <span className="font-black">📌 Lưu ý quan trọng:</span> Vì chính sách bảo mật của Zalo, chúng tôi không thể tự động lấy Email và Số điện thoại của bạn. 
              <br/><br/>
              Rất mong bạn thông cảm cung cấp thông tin này để Peteye có thể xác thực tài khoản và gửi các thông báo quan trọng về lịch hẹn của bạn.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Địa chỉ Email mới</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Số điện thoại liên hệ</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 flex items-center justify-center font-bold">
                📱
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx xxx xxx"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Hoàn tất & Tiếp tục
              </>
            )}
          </button>
        </form>

        <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-8">
          Môi trường bảo mật & an toàn 100%
        </p>
      </div>
    </div>
  );
}
