import React, { useState, useEffect } from 'react';
import { 
    Award, Save, Loader2, User, Phone, Mail, Briefcase, 
    Calendar, ShieldCheck, XCircle, ExternalLink, Plus, Clock, X
} from 'lucide-react';
import { staffService, type StaffResponse, type StaffCertificateRequest } from '../../services/staff.service';
import { userService } from '../../services/user.service';
import toast from 'react-hot-toast';

export default function StaffProfile() {
    const [profile, setProfile] = useState<StaffResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showAddCert, setShowAddCert] = useState(false);
    const [newCert, setNewCert] = useState<StaffCertificateRequest>({
        certificateName: '', imageUrl: '', issueDate: '', expiryDate: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const data = await staffService.getMyProfile();
            setProfile(data);
        } catch {
            toast.error('Không thể tải thông tin cá nhân');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (file: File) => {
        setUploading(true);
        try {
            const url = await userService.uploadAvatar(file);
            setNewCert(p => ({ ...p, imageUrl: url }));
            toast.success('Đã tải lên ảnh chứng chỉ');
        } catch {
            toast.error('Tải ảnh thất bại');
        } finally {
            setUploading(false);
        }
    };

    const handleAddCert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        if (!newCert.imageUrl) return toast.error('Vui lòng tải lên ảnh chứng chỉ');

        setUploading(true);
        try {
            const updated = await staffService.addCertificate(profile.id, newCert);
            setProfile(updated);
            setShowAddCert(false);
            setNewCert({ certificateName: '', imageUrl: '', issueDate: '', expiryDate: '' });
            toast.success('Đã gửi chứng chỉ! Vui lòng chờ chủ shop xác nhận.');
        } catch {
            toast.error('Gửi chứng chỉ thất bại');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Hồ sơ chuyên môn</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Info Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-[2rem] mx-auto flex items-center justify-center text-indigo-600 text-3xl font-black mb-4 shadow-inner">
                                {profile?.fullName.charAt(0)}
                            </div>
                            <h2 className="text-xl font-black text-slate-900">{profile?.fullName}</h2>
                            <p className="text-indigo-600 font-bold text-sm mt-1">{profile?.role || 'Nhân viên'}</p>
                            
                            <div className="mt-8 space-y-4 text-left">
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <Mail size={16} /> {profile?.email}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <Phone size={16} /> {profile?.phone || 'Chưa cập nhật'}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <Briefcase size={16} /> {profile?.specialization || 'Chưa rõ'}
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <ShieldCheck size={32} className="mb-4 opacity-80" />
                                <h3 className="text-lg font-black mb-2">Chứng chỉ đã duyệt</h3>
                                <p className="text-4xl font-black">{profile?.certificates?.filter(c => c.status === 'VERIFIED').length || 0}</p>
                                <p className="text-xs opacity-60 mt-2 italic">Chủ shop sẽ xác nhận chứng chỉ của bạn để tăng độ uy tín với khách hàng.</p>
                            </div>
                            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                        </div>
                    </div>

                    {/* Certificates List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <Award className="text-indigo-500" /> Bằng cấp & Chứng chỉ
                            </h3>
                            <button onClick={() => setShowAddCert(true)}
                                className="px-4 py-2 bg-[#1a2b4c] text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:scale-105 transition-transform">
                                <Plus size={16} /> Thêm mới
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {profile?.certificates?.map((cert) => (
                                <div key={cert.id} className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all group">
                                    <div className="w-full md:w-32 h-24 bg-slate-100 rounded-2xl overflow-hidden shrink-0 relative">
                                        <img src={cert.imageUrl} className="w-full h-full object-cover" alt="" />
                                        <a href={cert.imageUrl} target="_blank" rel="noreferrer" 
                                           className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ExternalLink className="text-white" size={16} />
                                        </a>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-slate-900">{cert.certificateName}</h4>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                cert.status === 'VERIFIED' ? 'bg-green-100 text-green-600' : 
                                                cert.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 
                                                'bg-amber-100 text-amber-600'
                                            }`}>
                                                {cert.status === 'VERIFIED' ? 'Đã duyệt' : 
                                                 cert.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-6 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5"><Calendar size={14} /> Cấp: {cert.issueDate || '—'}</div>
                                            {cert.expiryDate && <div className="flex items-center gap-1.5 text-amber-600"><Clock size={14} /> Hết hạn: {cert.expiryDate}</div>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!profile?.certificates || profile.certificates.length === 0) && (
                                <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
                                    <Award size={40} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-bold text-slate-500">Chưa có chứng chỉ nào</p>
                                    <p className="text-sm mt-1">Hãy tải lên bằng cấp để tăng độ tin cậy của bạn!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {showAddCert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-slate-900">Thêm chứng chỉ mới</h2>
                            <button onClick={() => setShowAddCert(false)} className="p-2 rounded-xl hover:bg-slate-100"><XCircle size={20} /></button>
                        </div>
                        <form onSubmit={handleAddCert} className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tên chứng chỉ *</label>
                                <input required value={newCert.certificateName} onChange={e => setNewCert(p => ({ ...p, certificateName: e.target.value }))}
                                    className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1a2b4c]" placeholder="Ví dụ: Bác sĩ thú y chuyên sâu" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày cấp</label>
                                    <input type="date" value={newCert.issueDate} onChange={e => setNewCert(p => ({ ...p, issueDate: e.target.value }))}
                                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-2xl outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày hết hạn</label>
                                    <input type="date" value={newCert.expiryDate} onChange={e => setNewCert(p => ({ ...p, expiryDate: e.target.value }))}
                                        className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-2xl outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Ảnh chứng chỉ *</label>
                                <div className={`relative h-40 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden ${newCert.imageUrl ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'}`}>
                                    {newCert.imageUrl ? (
                                        <img src={newCert.imageUrl} className="w-full h-full object-contain" alt="" />
                                    ) : (
                                        <>
                                            <Award size={32} className="text-slate-300" />
                                            <span className="text-xs font-bold text-slate-400">Tải lên ảnh hoặc bằng scan</span>
                                        </>
                                    )}
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*"
                                        onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                            <Loader2 className="animate-spin text-indigo-600" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddCert(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-slate-50">Hủy</button>
                                <button type="submit" disabled={uploading || !newCert.imageUrl}
                                    className="flex-1 py-4 bg-[#1a2b4c] text-white rounded-2xl font-black shadow-xl shadow-indigo-900/20 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    Gửi phê duyệt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
