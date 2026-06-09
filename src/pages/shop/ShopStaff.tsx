import React, { useState, useEffect } from 'react';
import {
    Users, UserPlus, Search, Shield, CheckCircle, XCircle,
    Settings, Save, Info, Briefcase, Loader2, X, Eye, EyeOff,
    Award, FileText, Trash2, ExternalLink, Mail, Phone, UserCircle,
    Zap, Star, ShieldCheck, GraduationCap, LayoutDashboard, ChevronDown
} from 'lucide-react';
import { staffService, type StaffResponse, type StaffCreationRequest } from '../../services/staff.service';
import { shopService } from '../../services/shop.service';
import { userService } from '../../services/user.service';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

const SPECIALTIES = ['Grooming', 'Vet / Clinic', 'Boarding', 'General'];
const ROLES = [
    { label: 'Kỹ thuật viên Grooming', value: 'Groomer', spec: 'Grooming' },
    { label: 'Bác sĩ thú y', value: 'Vet', spec: 'Vet / Clinic' },
    { label: 'Chuyên viên chăm sóc', value: 'Care', spec: 'Boarding' },
    { label: 'Quản lý vận hành', value: 'Manager', spec: 'General' }
];

export default function ShopStaff() {
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
    const [staffList, setStaffList] = useState<StaffResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [assignMode, setAssignMode] = useState<'MANUAL' | 'OPEN_POOL' | 'AUTO'>('MANUAL');
    const [savingMode, setSavingMode] = useState(false);
    const [viewingCerts, setViewingCerts] = useState<StaffResponse | null>(null);
    
    const [form, setForm] = useState<StaffCreationRequest>({
        fullName: '', email: '', password: '', phone: '', role: '', specialization: '', certificates: []
    });

    useEffect(() => {
        fetchStaff();
        fetchShopMode();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const data = await staffService.getMyShopStaff();
            setStaffList(data);
        } catch { 
            toast.error('Không thể tải danh sách nhân viên'); 
        } finally { 
            setLoading(false); 
        }
    };

    const fetchShopMode = async () => {
        try {
            const shop = await shopService.getMyShop();
            if ((shop as any).assignmentMode) setAssignMode((shop as any).assignmentMode);
        } catch { /* silent */ }
    };

    const handleOpenCreate = () => {
        setEditingStaff(null);
        setForm({ fullName: '', email: '', password: '', phone: '', role: '', specialization: '', certificates: [] });
        setShowForm(true);
    };

    const handleOpenEdit = (staff: StaffResponse) => {
        setEditingStaff(staff);
        setForm({
            fullName: staff.fullName,
            email: staff.email || '',
            password: '', 
            phone: staff.phone || '',
            role: staff.role || '',
            specialization: staff.specialization || '',
            certificates: []
        });
        setShowForm(true);
    };

    const toggleRole = (roleValue: string, specSuggest: string) => {
        setForm(p => {
            const currentRoles = p.role ? p.role.split(',').map(r => r.trim()).filter(r => r) : [];
            let newRoles: string[];
            
            if (currentRoles.includes(roleValue)) {
                newRoles = currentRoles.filter(r => r !== roleValue);
            } else {
                newRoles = [...currentRoles, roleValue];
            }

            const newRoleStr = newRoles.join(', ');
            
            // Auto-suggest specialization if current is empty or generic
            let newSpec = p.specialization;
            if (!p.specialization || p.specialization === 'General') {
                newSpec = specSuggest;
            }

            return { ...p, role: newRoleStr, specialization: newSpec };
        });
    };



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingStaff) {
                const final = await staffService.updateStaff(editingStaff.id, form);
                setStaffList(prev => prev.map(s => s.id === editingStaff.id ? final : s));
                toast.success(`Cập nhật thông tin ${final.fullName} thành công!`);
            } else {
                const created = await staffService.createStaff(form);
                setStaffList(prev => [created, ...prev]);
                toast.success(`Tạo tài khoản cho ${created.fullName} thành công!`);
            }
            setShowForm(false);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Thao tác thất bại');
        } finally { 
            setSubmitting(false); 
        }
    };

    const handleToggle = async (id: number, name: string) => {
        try {
            const updated = await staffService.toggleStatus(id);
            setStaffList(prev => prev.map(s => s.id === id ? updated : s));
            toast.success(`${name}: ${updated.isActive ? 'Đã kích hoạt' : 'Đã vô hiệu hóa'}`);
        } catch { 
            toast.error('Không thể thay đổi trạng thái'); 
        }
    };

    const handleVerifyCert = async (certId: number, status: 'VERIFIED' | 'REJECTED') => {
        try {
            const updatedStaff = await staffService.verifyCertificate(certId, status);
            setStaffList(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
            if (viewingCerts?.id === updatedStaff.id) setViewingCerts(updatedStaff);
            toast.success(status === 'VERIFIED' ? 'Đã xác thực chứng chỉ' : 'Đã từ chối chứng chỉ');
        } catch {
            toast.error('Thao tác thất bại');
        }
    };



    const handleSaveMode = async () => {
        setSavingMode(true);
        try {
            await shopService.updateMyShop({ assignmentMode: assignMode } as any);
            toast.success('Đã lưu cài đặt phân công!');
        } catch { 
            toast.error('Lưu thất bại'); 
        } finally { 
            setSavingMode(false); 
        }
    };

    const filtered = staffList.filter(s =>
        s.fullName.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <Users className={`w-8 h-8 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`} />
                            Quản lý nhân sự
                        </h1>
                        <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Đội ngũ nhân viên & cơ chế hoạt động của cửa hàng
                        </p>
                    </div>
                    
                    <div className={`flex p-1.5 rounded-[2rem] shadow-xl border ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
                        {(['list', 'settings'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-8 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${activeTab === tab ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-[#1a2b4c] text-white shadow-lg shadow-indigo-900/20') : (isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}>
                                {tab === 'list' ? <LayoutDashboard size={18} /> : <Settings size={18} />}
                                {tab === 'list' ? 'Danh sách' : 'Thiết lập'}
                            </button>
                        ))}
                    </div>
                </header>

                {activeTab === 'list' ? (
                    <div className="space-y-8">
                        {/* Search & Add */}
                        <div className="flex flex-col md:flex-row gap-5">
                            <div className="flex-1 relative group">
                                <Search className={`absolute left-6 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'}`} size={20} />
                                <input type="text" placeholder="Tìm kiếm theo tên hoặc email..." value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className={`w-full pl-16 pr-6 py-4 border rounded-[2rem] shadow-sm focus:ring-4 outline-none transition-all font-medium ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-100 focus:ring-primary/5 focus:border-primary placeholder-slate-400 text-slate-900'}`} />
                            </div>
                            <button onClick={handleOpenCreate}
                                className={`px-10 py-4 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-95 transition-all ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-primary shadow-primary/20'}`}>
                                <UserPlus size={20} /> Thêm nhân viên
                            </button>
                        </div>

                        <AnimatePresence>
                            {showForm && (
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 sm:p-6 overflow-hidden">
                                    <motion.div 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        onClick={() => setShowForm(false)}
                                        className="fixed inset-0 bg-transparent" 
                                    />
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                        className={`relative w-full max-w-2xl max-h-full rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border z-10 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-transparent'}`}
                                    >
                                        {/* Compact Premium Modal Header */}
                                        <div className="bg-primary p-6 relative overflow-hidden shrink-0">
                                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                            <div className="relative z-10 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                                                        {editingStaff ? <Settings className="text-white" size={24} /> : <UserPlus className="text-white" size={24} />}
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-black text-white">
                                                            {editingStaff ? 'Cập nhật tài khoản' : 'Tạo mới nhân viên'}
                                                        </h2>
                                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                                            {editingStaff ? `ID: STAFF_${editingStaff.id}` : 'Điền thông tin để bắt đầu'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setShowForm(false)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                            <form onSubmit={handleSubmit} className="space-y-6">
                                                {/* Section 1: Thông tin cơ bản */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <UserCircle className={isDark ? 'text-indigo-400' : 'text-primary'} size={18} />
                                                        <h3 className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>Thông tin cá nhân</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên *</label>
                                                            <div className="relative">
                                                                <input required value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                                                                    className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 outline-none font-bold text-sm transition-all ${isDark ? 'bg-slate-800 text-white focus:ring-indigo-500/50' : 'bg-slate-50 text-slate-700 focus:ring-primary'}`} placeholder="Nhập họ tên..." />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email liên hệ *</label>
                                                            <div className="relative">
                                                                <input required type="email" value={form.email} disabled={!!editingStaff} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                                                    className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 outline-none font-bold text-sm transition-all disabled:opacity-50 ${isDark ? 'bg-slate-800 text-white focus:ring-indigo-500/50' : 'bg-slate-50 text-slate-700 focus:ring-primary'}`} placeholder="email@vi-du.com" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                                                            <div className="relative">
                                                                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                                                    className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 outline-none font-bold text-sm transition-all ${isDark ? 'bg-slate-800 text-white focus:ring-indigo-500/50' : 'bg-slate-50 text-slate-700 focus:ring-primary'}`} placeholder="090 000 0000" />
                                                                <Phone className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                            </div>
                                                        </div>
                                                        {!editingStaff && (
                                                            <div className="space-y-1.5">
                                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu khởi tạo *</label>
                                                                <div className="relative">
                                                                    <input required type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                                                        className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 outline-none font-bold text-sm transition-all ${isDark ? 'bg-slate-800 text-white focus:ring-indigo-500/50' : 'bg-slate-50 text-slate-700 focus:ring-primary'}`} placeholder="Tối thiểu 6 ký tự..." />
                                                                    <button type="button" onClick={() => setShowPass(p => !p)} className={`absolute right-5 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-400 hover:text-primary'}`}>
                                                                        {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Section 2: Phân quyền & Chuyên môn */}
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <ShieldCheck className={isDark ? 'text-indigo-400' : 'text-primary'} size={18} />
                                                        <h3 className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>Năng lực chuyên môn</h3>
                                                    </div>
                                                    <div className={`p-5 rounded-3xl border space-y-5 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-primary/5 border-primary/10'}`}>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vai trò trong hệ thống (Chọn một hoặc nhiều)</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {ROLES.map(r => {
                                                                    const isSelected = form.role?.split(', ').includes(r.value);
                                                                    return (
                                                                        <button
                                                                            key={r.value}
                                                                            type="button"
                                                                            onClick={() => toggleRole(r.value, r.spec)}
                                                                            className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                                                                                isSelected 
                                                                                    ? (isDark ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-primary text-white border-primary shadow-md shadow-primary/20') 
                                                                                    : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700 hover:border-indigo-500/40' : 'bg-white text-slate-500 border-slate-100 hover:border-primary/40')
                                                                            }`}
                                                                        >
                                                                            {r.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Lĩnh vực chuyên môn chính</label>
                                                            <div className="relative">
                                                                <select value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))}
                                                                    className={`w-full px-5 py-3 border-none rounded-xl focus:ring-2 outline-none font-bold text-sm transition-all appearance-none cursor-pointer ${isDark ? 'bg-slate-800 text-white focus:ring-indigo-500/50' : 'bg-white text-slate-700 focus:ring-primary'}`}>
                                                                    <option value="">Chọn lĩnh vực...</option>
                                                                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Section 3: Chứng chỉ */}
                                                <div className={`p-4 rounded-2xl border text-center ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                                    <GraduationCap className={`mx-auto mb-2 ${isDark ? 'text-indigo-400/40' : 'text-primary/40'}`} size={24} />
                                                    <h3 className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>Hồ sơ chuyên môn</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">
                                                        Nhân viên sẽ tự cập nhật chứng chỉ trong tài khoản cá nhân.
                                                    </p>
                                                </div>
                                            </form>
                                        </div>

                                        {/* Compact Footer */}
                                        <div className={`p-6 border-t flex gap-3 shrink-0 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                            <button type="button" onClick={() => setShowForm(false)} 
                                                className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm transition-all border ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-100'}`}>
                                                Hủy bỏ
                                            </button>
                                            <button type="button" onClick={handleSubmit} disabled={submitting}
                                                className={`flex-[2] py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 disabled:opacity-60 transition-all ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-primary shadow-primary/20'}`}>
                                                {submitting ? <Loader2 size={18} className="animate-spin" /> : (editingStaff ? <Save size={18} /> : <Zap size={18} />)}
                                                {submitting ? 'Đang lưu...' : (editingStaff ? 'Cập nhật ngay' : 'Kích hoạt')}
                                            </button>
                                        </div>
                                    </motion.div>
                                </div>
                        )}
                    </AnimatePresence>

                        {/* Certificate View Modal (Redesigned) */}
                        <AnimatePresence>
                            {viewingCerts && (
                                <div className="fixed inset-0 z-[110] flex justify-center p-4 overflow-y-auto pt-10 md:pt-20">
                                    <motion.div 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        onClick={() => setViewingCerts(null)}
                                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
                                    />
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={`relative w-full max-w-3xl rounded-[4rem] shadow-2xl overflow-hidden border z-10 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-transparent'}`}
                                    >
                                        <div className={`p-10 flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                            <div className="flex items-center gap-5">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-indigo-600 ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50'}`}>
                                                    <Award size={28} />
                                                </div>
                                                <div>
                                                    <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Bằng cấp: {viewingCerts.fullName}</h2>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Xác thực chứng chỉ chuyên môn</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setViewingCerts(null)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                            {viewingCerts.certificates?.map((cert) => (
                                                <div key={cert.id} className={`group relative rounded-[2.5rem] border overflow-hidden ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex flex-col md:flex-row gap-8 p-8">
                                                        <div className={`w-full md:w-56 h-40 rounded-3xl overflow-hidden relative shrink-0 shadow-inner ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
                                                            <img src={cert.imageUrl} alt={cert.certificateName} className="w-full h-full object-cover" />
                                                            <a href={cert.imageUrl} target="_blank" rel="noreferrer" 
                                                               className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                                                                <ExternalLink className="text-white" size={24} />
                                                            </a>
                                                        </div>

                                                        <div className="flex-1 flex flex-col justify-between">
                                                            <div className="space-y-4">
                                                                <div className="flex items-start justify-between">
                                                                    <h4 className={`text-lg font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{cert.certificateName}</h4>
                                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] shadow-sm ${
                                                                        cert.status === 'VERIFIED' ? 'bg-emerald-500 text-white' : 
                                                                        cert.status === 'REJECTED' ? 'bg-rose-500 text-white' : 
                                                                        'bg-amber-400 text-white'
                                                                    }`}>
                                                                        {cert.status === 'VERIFIED' ? 'Đã xác thực' : 
                                                                         cert.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex gap-6">
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày cấp</p>
                                                                        <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{cert.issueDate || '—'}</p>
                                                                    </div>
                                                                    <div className={`w-px h-8 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
                                                                    <div>
                                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hết hạn</p>
                                                                        <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{cert.expiryDate || '—'}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3 mt-6">
                                                                {cert.status !== 'VERIFIED' && (
                                                                    <button onClick={() => handleVerifyCert(cert.id, 'VERIFIED')}
                                                                        className="flex-1 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                                                                        <CheckCircle size={16} /> Xác thực
                                                                    </button>
                                                                )}
                                                                {cert.status !== 'REJECTED' && (
                                                                    <button onClick={() => handleVerifyCert(cert.id, 'REJECTED')}
                                                                        className="flex-1 py-3 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20">
                                                                        <XCircle size={16} /> Từ chối
                                                                    </button>
                                                                )}

                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!viewingCerts.certificates || viewingCerts.certificates.length === 0) && (
                                                <div className={`text-center py-24 rounded-[3rem] border-2 border-dashed ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                                    <FileText size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                                                    <p className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Không có dữ liệu chứng chỉ</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Staff Table Section */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className={`rounded-[3rem] shadow-xl overflow-hidden border ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}
                        >
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-32 gap-4 text-slate-400">
                                    <Loader2 size={40} className={`animate-spin ${isDark ? 'text-indigo-400' : 'text-primary'}`} />
                                    <p className="text-xs font-black uppercase tracking-widest">Đang đồng bộ dữ liệu...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-32">
                                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                        <Users size={48} className={isDark ? 'text-slate-600' : 'text-slate-200'} />
                                    </div>
                                    <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Chưa có nhân sự nào</h3>
                                    <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hãy bắt đầu xây dựng đội ngũ chuyên nghiệp của bạn.</p>
                                    <button onClick={handleOpenCreate} className={`px-8 py-3 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-primary shadow-primary/20'}`}>Thêm ngay</button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[1000px]">
                                        <thead>
                                            <tr className={`border-b ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
                                                {['Nhân sự', 'Vị trí & Năng lực', 'Chứng chỉ', 'Hoạt động', 'Tùy chọn'].map(h => (
                                                    <th key={h} className="px-10 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-50'}`}>
                                            {filtered.map(s => {
                                                const verifiedCount = s.certificates?.filter(c => c.status === 'VERIFIED').length || 0;
                                                const totalCount = s.certificates?.length || 0;
                                                
                                                return (
                                                    <tr key={s.id} className={`group transition-colors ${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50'}`}>
                                                        <td className="px-10 py-8">
                                                            <div className="flex items-center gap-5">
                                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border ${isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-gradient-to-br from-primary/10 to-primary/5 text-primary border-primary/10'}`}>
                                                                    {s.fullName.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className={`font-black text-base whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.fullName}</p>
                                                                    <p className="text-xs text-slate-500 font-medium whitespace-nowrap">{s.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-primary'}`} />
                                                                    <span className={`text-sm font-black whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                                                        {s.role ? s.role.split(', ').map(rv => ROLES.find(r => r.value === rv)?.label || rv).join(', ') : 'Chưa thiết lập'}
                                                                    </span>
                                                                </div>
                                                                <span className={`inline-block px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border whitespace-nowrap ${isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-primary/5 text-primary border-primary/5'}`}>
                                                                    {s.specialization || 'Đa năng'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <button onClick={() => setViewingCerts(s)}
                                                                className="flex items-center gap-3 group/certs">
                                                                <div className="flex -space-x-3">
                                                                    {[0, 1, 2].map(i => (
                                                                        <div key={i} className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all group-hover/certs:-translate-y-1 shadow-sm ${i > 0 ? 'hidden md:flex' : 'flex'} ${isDark ? 'border-slate-800 bg-slate-900' : 'border-white bg-slate-100'}`}>
                                                                            {s.certificates?.[i] ? (
                                                                                <img src={s.certificates[i].imageUrl} className="w-full h-full rounded-xl object-cover" alt="" />
                                                                            ) : <Award size={14} className={isDark ? 'text-slate-600' : 'text-slate-300'} />}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="text-left">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hồ sơ</p>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`text-sm font-black ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{verifiedCount}/{totalCount}</span>
                                                                        <CheckCircle size={12} className={verifiedCount > 0 ? 'text-emerald-500' : 'text-slate-300'} />
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${s.isActive ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600') : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-400')}`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                                    {s.isActive ? 'Hoạt động' : 'Đã nghỉ'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-8">
                                                            <div className="flex items-center gap-3">
                                                                <button onClick={() => handleOpenEdit(s)}
                                                                    className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center shadow-sm ${isDark ? 'bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700' : 'bg-slate-50 text-slate-400 hover:text-primary'}`} title="Cài đặt">
                                                                    <Settings size={18} />
                                                                </button>
                                                                <button onClick={() => handleToggle(s.id, s.fullName)}
                                                                    className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${s.isActive ? (isDark ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white') : (isDark ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white')}`}>
                                                                    {s.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    </div>
                ) : (
                    /* Settings Tab (Redesigned) */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-8">
                            <div className={`p-6 lg:p-8 2xl:p-10 rounded-3xl lg:rounded-[3rem] shadow-xl border ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center gap-5 mb-8">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-primary/10 text-primary'}`}>
                                        <Zap size={28} />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl lg:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Cơ chế vận hành</h3>
                                        <p className="text-slate-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-1">Lựa chọn cách thức phân bổ công việc</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {[
                                        { id: 'MANUAL', title: 'Chỉ định thủ công', desc: 'Chủ shop trực tiếp gán đơn cho nhân viên phù hợp.', icon: Shield, color: 'indigo' },
                                        { id: 'OPEN_POOL', title: 'Nhân viên tự nhận', desc: 'Đơn vào kho chung, nhân viên rảnh sẽ tự nhận nhiệm vụ.', icon: Users, color: 'primary' },
                                        { id: 'AUTO', title: 'Tự động gán (AI)', desc: 'Hệ thống tự phân bổ dựa trên chuyên môn & hiệu suất.', icon: Star, color: 'amber' },
                                    ].map(mode => (
                                        <button key={mode.id} onClick={() => setAssignMode(mode.id as any)}
                                            className={`group flex items-start gap-4 lg:gap-6 p-5 lg:p-6 rounded-2xl lg:rounded-[2rem] border-2 transition-all text-left relative overflow-hidden ${assignMode === mode.id ? (isDark ? 'border-indigo-500 bg-indigo-500/5' : 'border-primary bg-primary/[0.02]') : (isDark ? 'border-slate-800 bg-slate-800/30 hover:border-indigo-500/20' : 'border-slate-50 bg-slate-50/50 hover:border-primary/20')}`}>
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-all ${assignMode === mode.id ? (isDark ? 'bg-indigo-600 text-white scale-110' : 'bg-primary text-white scale-110') : (isDark ? 'bg-slate-800 text-slate-400 group-hover:text-indigo-400' : 'bg-white text-slate-400 group-hover:text-primary')}`}>
                                                <mode.icon size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className={`text-base lg:text-lg font-black mb-1 transition-colors ${assignMode === mode.id ? (isDark ? 'text-indigo-400' : 'text-primary') : (isDark ? 'text-white' : 'text-slate-900')}`}>{mode.title}</h4>
                                                <p className="text-[10px] lg:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{mode.desc}</p>
                                            </div>
                                            <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 flex items-center justify-center transition-all ${assignMode === mode.id ? (isDark ? 'border-indigo-500 bg-indigo-500 scale-110' : 'border-primary bg-primary scale-110') : 'border-slate-300'}`}>
                                                {assignMode === mode.id && <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 bg-white rounded-full shadow-inner" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button onClick={handleSaveMode} disabled={savingMode}
                                        className={`px-8 lg:px-10 py-4 text-white rounded-2xl font-black uppercase text-[10px] lg:text-xs tracking-[0.15em] lg:tracking-[0.2em] shadow-xl flex items-center gap-3 hover:scale-105 active:scale-95 disabled:opacity-60 transition-all ${isDark ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-primary shadow-primary/30'}`}>
                                        {savingMode ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {savingMode ? 'Đang cập nhật...' : 'Lưu cấu hình vận hành'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <div className={`p-6 lg:p-8 2xl:p-10 rounded-3xl lg:rounded-[3rem] shadow-2xl text-white relative overflow-hidden lg:sticky lg:top-8 ${isDark ? 'admin-glass-card bg-slate-900/60 border border-white/10' : 'bg-gradient-to-br from-slate-900 to-primary'}`}>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                <div className="relative z-10">
                                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                                        <Info size={24} className="text-white/80" />
                                    </div>
                                    <h3 className="text-xl lg:text-2xl font-black mb-5 tracking-tight">Cẩm nang vận hành</h3>
                                    
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/15 transition-colors">
                                            <h4 className="text-xs lg:text-sm font-black mb-1 flex items-center gap-2 text-indigo-300">
                                                <Shield size={14} /> 1. Chỉ định thủ công
                                            </h4>
                                            <p className="text-[10px] lg:text-xs text-white/70 leading-relaxed font-medium">
                                                Phù hợp mô hình nhỏ. Chủ shop kiểm soát 100% việc giao đơn cho từng nhân sự.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/15 transition-colors">
                                            <h4 className="text-xs lg:text-sm font-black mb-1 flex items-center gap-2 text-sky-300">
                                                <Users size={14} /> 2. Nhân viên tự nhận
                                            </h4>
                                            <p className="text-[10px] lg:text-xs text-white/70 leading-relaxed font-medium">
                                                Phù hợp văn hóa chủ động. Đơn rơi vào kho chung, ai rảnh sẽ bấm nhận, giảm tải cho quản lý.
                                            </p>
                                        </div>

                                        <div className="p-4 bg-white/10 rounded-2xl border border-amber-500/30 backdrop-blur-sm hover:bg-white/15 transition-colors relative overflow-hidden">
                                            <div className="absolute -right-4 -top-4 w-12 h-12 bg-amber-500/20 blur-xl rounded-full" />
                                            <h4 className="text-xs lg:text-sm font-black mb-1 flex items-center gap-2 text-amber-400">
                                                <Star size={14} /> 3. Tự động gán (AI)
                                            </h4>
                                            <p className="text-[10px] lg:text-xs text-white/70 leading-relaxed font-medium relative z-10">
                                                Tối ưu cho shop bận rộn. AI phân tích lịch trống & chuyên môn để chia đơn đều tay và chuẩn xác nhất.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
        </div>
    );
}
