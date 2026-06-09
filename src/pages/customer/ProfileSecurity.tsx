import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { userService } from '../../services/user.service';

export default function ProfileSecurity() {
    const { user } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailReminder, setEmailReminder] = useState(true);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!user?.id) return;
        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp!');
            return;
        }

        setLoading(true);
        try {
            await userService.changePassword(Number(user.id), {
                oldPassword,
                newPassword
            });
            setSaved(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            console.error('Change password failed:', err);
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Cài đặt bảo mật & Thông báo</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Quản lý mật khẩu và tùy chọn nhận thông báo hệ thống.</p>
            </div>

            {saved && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 text-green-700 dark:text-green-300">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <span className="font-semibold text-sm">Cập nhật mật khẩu thành công!</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-700 dark:text-red-300">
                    <span className="material-symbols-outlined">error</span>
                    <span className="font-semibold text-sm">{error}</span>
                </div>
            )}

            {/* Change Password */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400">lock</span>
                        Đổi mật khẩu
                    </h2>
                </div>
                <form className="p-6 space-y-5" onSubmit={handleSave}>
                    <div key="old">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">Mật khẩu hiện tại</label>
                        <div className="relative">
                            <input
                                type={showOld ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#1a2b4c]"
                            />
                            <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-lg">{showOld ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                    </div>
                    <div key="new">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">Mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#1a2b4c]"
                            />
                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-lg">{showNew ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                    </div>
                    <div key="confirm">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">Xác nhận mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-[#1a2b4c]"
                            />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined text-lg">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-300">
                        <p className="font-bold mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">info</span>
                            Yêu cầu mật khẩu:
                        </p>
                        <ul className="space-y-1">
                            {['Ít nhất 8 ký tự', 'Có chữ hoa và chữ thường', 'Có ít nhất 1 số', 'Có ký tự đặc biệt (!@#$...)'].map(r => (
                                <li key={r} className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs text-blue-400">circle</span>
                                    {r}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors">Hủy</button>
                        <button type="submit" disabled={loading} className="px-8 py-2.5 bg-[#1a2b4c] text-white font-bold rounded-xl shadow-lg shadow-[#1a2b4c]/20 hover:opacity-90 transition-opacity text-sm disabled:opacity-50">
                            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Notification Preferences */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400">notifications_active</span>
                        Tùy chọn thông báo
                    </h2>
                </div>
                <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Nhắc lịch hẹn qua Email</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Hệ thống sẽ tự động gửi email nhắc nhở cho bạn trước 24 giờ so với thời gian bắt đầu dịch vụ.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={emailReminder}
                                onChange={(e) => {
                                    setEmailReminder(e.target.checked);
                                    toast.success(e.target.checked ? 'Đã bật nhắc lịch hẹn qua email' : 'Đã tắt nhắc lịch hẹn qua email');
                                    // TODO: Integrate with backend to update user preferences
                                }}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#1a2b4c]"></div>
                        </label>
                    </div>
                </div>
            </div>
        </main>
    );
}
