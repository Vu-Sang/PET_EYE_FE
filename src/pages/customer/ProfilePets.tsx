import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, Dog, Cat, Calendar, Weight, ClipboardList, Info, AlertCircle, CheckCircle2, Camera, Loader2, ChevronRight, Utensils, Heart, Trash2, Activity, ShieldCheck, Sparkles, User, ArrowRight, HeartPulse } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { petService } from '../../services/pet.service';
import { useAuth } from '../../contexts/AuthContext';
import { Pet } from '../../types';
import toast from 'react-hot-toast';

export default function ProfilePets() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    species: 'Chó',
    breed: '',
    gender: 'Đực',
    color: '',
    sterilized: false,
    weight: '',
    dob: '',
    healthNote: '',
    favoriteFood: '',
    allergies: '',
    hobbies: '',
    walkTime: '',
    avatar: '',
    nutritionPlan: [
      { mealName: 'Sáng', foodType: '', amount: '' },
      { mealName: 'Trưa', foodType: '', amount: '' },
      { mealName: 'Tối', foodType: '', amount: '' }
    ],
    medicalRecords: [] as any[],
    vaccinations: [] as any[],
    reminders: [] as any[]
  });
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPetForDelete, setSelectedPetForDelete] = useState<Pet | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    const userId = Number(user?.id);
    if (user && !isNaN(userId) && userId > 0) {
      fetchPets();
    }
  }, [user?.id]);

  const fetchPets = async () => {
    const userId = Number(user?.id);
    if (isNaN(userId)) return;
    try {
      setLoading(true);
      const data = await petService.getByOwner(userId);
      setPets(data);
    } catch (error) {
      console.error('Failed to fetch pets:', error);
      toast.error('Không thể tải danh sách thú cưng');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 'Chưa rõ';
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months += 12;
    }
    if (years > 0) return `${years} tuổi`;
    return `${months <= 0 ? 1 : months} tháng`;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const url = await petService.uploadAvatar(file);
      setFormData(prev => ({ ...prev, avatar: url }));
      toast.success('Đã cập nhật ảnh đại diện');
    } catch (error) {
      toast.error('Lỗi khi tải ảnh lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPet = async () => {
    try {
      setSubmitting(true);
      
      // Normalize data for Backend
      const payload = {
        ...formData,
        weight: Number(formData.weight) || 0,
        ownerId: Number(user?.id),
        dob: formData.dob, // Already YYYY-MM-DD from input type="date"
        avatar: formData.avatar || (formData.species === 'Mèo' ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=2069&auto=format&fit=crop'),
        // Format dates to LocalDateTime (YYYY-MM-DDTHH:mm:ss)
        medicalRecords: formData.medicalRecords.map(r => ({
          ...r,
          visitDate: r.visitDate ? new Date(r.visitDate).toISOString().split('.')[0] : new Date().toISOString().split('.')[0]
        })),
        vaccinations: formData.vaccinations.map(v => ({
          ...v,
          date: v.date ? new Date(v.date).toISOString().split('.')[0] : new Date().toISOString().split('.')[0]
        })),
        reminders: formData.reminders.map(r => ({
          ...r,
          date: r.date ? new Date(r.date).toISOString().split('.')[0] : new Date().toISOString().split('.')[0]
        })),
        initialDocuments: [],
        album: []
      };

      await petService.create(payload);
      toast.success(`Đã thêm bé ${formData.name} thành công!`);
      setShowAddModal(false);
      resetForm();
      fetchPets();
    } catch (error: any) {
      toast.error(error.message || 'Lỗi khi thêm thú cưng');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '', species: 'Chó', breed: '', gender: 'Đực', color: '', sterilized: false,
      weight: '', dob: '', healthNote: '', favoriteFood: '', allergies: '',
      hobbies: '', walkTime: '', avatar: '',
      nutritionPlan: [
        { mealName: 'Sáng', foodType: '', amount: '' },
        { mealName: 'Trưa', foodType: '', amount: '' },
        { mealName: 'Tối', foodType: '', amount: '' }
      ],
      medicalRecords: [], vaccinations: [], reminders: []
    });
  };

  const handleDeletePet = async () => {
    if (!selectedPetForDelete || !deleteReason) return;
    try {
      setSubmitting(true);
      await petService.delete(selectedPetForDelete.id, deleteReason);
      toast.success('Đã xóa hồ sơ thú cưng');
      setShowDeleteModal(false);
      setDeleteReason('');
      setSelectedPetForDelete(null);
      fetchPets();
    } catch (error) {
      toast.error('Lỗi khi xóa hồ sơ');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(pets.length / pageSize);
  const paginatedPets = pets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <main className="flex-1 flex flex-col gap-8 p-4 md:p-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Thú cưng của tôi
            <Sparkles className="text-amber-400 size-6" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium max-w-md">
            Nơi lưu giữ những khoảnh khắc và chăm sóc sức khỏe toàn diện cho các bé yêu.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#1a2b4c] to-[#2d4a82] text-white font-bold rounded-[2rem] transition-all shadow-xl shadow-blue-900/10 hover:shadow-2xl hover:shadow-blue-900/20 group"
        >
          <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
          Thêm thành viên mới
        </motion.button>
      </div>

      {/* Pet Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-[2.5rem] animate-pulse border border-slate-100 dark:border-slate-800" />
          ))
        ) : pets.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="size-24 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300 shadow-inner">
              <Dog size={48} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Chưa có "người bạn" nào?</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-10 font-medium">
              Hãy để chúng tôi đồng hành cùng bạn trong hành trình chăm sóc các bé.
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-8 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all shadow-sm"
            >
              Thêm thú cưng ngay
            </button>
          </div>
        ) : (
          paginatedPets.map((pet, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={pet.id} 
              className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-500"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 size-48 bg-gradient-to-bl from-blue-50/50 to-transparent dark:from-blue-900/5 pointer-events-none" />
              
              <div className="p-8">
                <div className="flex gap-6">
                  <div className="relative shrink-0">
                    <div className="size-32 rounded-[2rem] overflow-hidden ring-8 ring-slate-50 dark:ring-slate-800/50 group-hover:ring-[#1a2b4c]/5 transition-all duration-500">
                      <img
                        src={pet.avatar || (pet.species === 'Mèo' ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=2069&auto=format&fit=crop')}
                        alt={pet.name}
                        className="size-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 size-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center border border-slate-50 dark:border-slate-700 text-xl">
                      {pet.species === 'Mèo' ? '🐱' : '🐶'}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-2xl group-hover:text-slate-900 dark:group-hover:text-blue-400 transition-colors tracking-tight">
                          {pet.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">{pet.breed || 'Linh vật'}</span>
                          <span className="size-1 bg-slate-200 rounded-full" />
                          <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">{pet.gender}</span>
                        </div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${
                        pet.active 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {pet.active ? '● Khỏe mạnh' : '○ Tạm ngưng'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                        <div className="size-8 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                          <Weight size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 ">Cân nặng</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{pet.weight} kg</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 p-2.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                        <div className="size-8 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center text-amber-500 shadow-sm">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 ">Tuổi đời</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{calculateAge(pet.dob)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {pet.healthNote && (
                  <div className="mt-6 p-4 bg-blue-50/30 dark:bg-blue-500/5 rounded-3xl text-xs text-blue-600 dark:text-blue-400 border border-blue-100/30 dark:border-blue-500/10 flex gap-3 italic font-medium">
                    <HeartPulse size={16} className="shrink-0 text-blue-400" />
                    <span className="line-clamp-2 leading-relaxed">"{pet.healthNote}"</span>
                  </div>
                )}
              </div>
              
              <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/20 flex gap-4 border-t border-slate-100/50 dark:border-slate-800/50">
                <Link
                  to={`/search`}
                  className="flex-1 py-3.5 text-center bg-[#1a2b4c] hover:bg-[#2d4a82] text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-900/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Calendar size={14} />
                  Đặt lịch ngay
                </Link>
                <Link
                  to={`/pet/${pet.id}`}
                  className="flex-1 py-3.5 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ClipboardList size={14} />
                  Hồ sơ y tế
                </Link>
                <button
                  onClick={() => { setSelectedPetForDelete(pet); setShowDeleteModal(true); }}
                  className="size-12 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                  title="Xóa thú cưng"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="size-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="rotate-180" size={18} />
          </button>
          
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-sm">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`size-8 rounded-lg text-sm font-bold transition-all ${
                  currentPage === i + 1
                    ? 'bg-[#1a2b4c] text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="size-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Add Pet Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-[#1a2b4c]/40 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[700px]"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 z-20 p-2.5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl text-slate-500 hover:text-red-500 rounded-full transition-all shadow-sm border border-slate-100 dark:border-slate-700"
              >
                <X size={20} />
              </button>

              {/* Modal Sidebar */}
              <div className="md:w-[280px] bg-slate-50 dark:bg-slate-800/40 p-10 flex flex-col border-r border-slate-100 dark:border-slate-800">
                <div className="size-16 bg-gradient-to-br from-[#1a2b4c] to-blue-600 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-900/20">
                  <Dog size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 leading-tight tracking-tight">Thêm thành viên mới</h2>
                
                <div className="space-y-8 relative flex-1">
                  <div className="absolute top-5 left-5 w-0.5 h-[calc(100%-40px)] bg-slate-200 dark:bg-slate-700 z-0" />
                  <motion.div 
                    className="absolute top-5 left-5 w-0.5 bg-blue-600 z-0" 
                    animate={{ height: `${(step - 1) * 33.33}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />

                  {[
                    { s: 1, label: 'Cơ bản', desc: 'Tên, loài, giống...', icon: <Dog size={16} /> },
                    { s: 2, label: 'Dinh dưỡng', desc: 'Chế độ ăn uống', icon: <Utensils size={16} /> },
                    { s: 3, label: 'Sức khỏe', desc: 'Y tế & tiêm chủng', icon: <HeartPulse size={16} /> },
                    { s: 4, label: 'Xác nhận', desc: 'Kiểm tra hồ sơ', icon: <CheckCircle2 size={16} /> }
                  ].map((item) => (
                    <div key={item.s} className="relative z-10 flex items-start gap-5">
                      <div className={`size-10 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 ${
                        step >= item.s 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-110' 
                          : 'bg-white dark:bg-slate-900 text-slate-400 border-2 border-slate-100 dark:border-slate-800'
                      }`}>
                        {step > item.s ? <CheckCircle2 size={18} /> : item.icon}
                      </div>
                      <div className="pt-1">
                        <h3 className={`text-sm font-bold transition-all duration-500 ${
                          step >= item.s ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                        }`}>
                          {item.label}
                        </h3>
                        <p className={`text-xs font-bold transition-all duration-500 ${
                          step >= item.s ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300'
                        }`}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-8"
                    >
                      {step === 1 && (
                        <>
                          <div className="flex flex-col items-center gap-4 py-2">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                              <div className="size-36 rounded-[2.5rem] overflow-hidden ring-8 ring-slate-50 dark:ring-slate-800 transition-all shadow-2xl group-hover:ring-blue-100 dark:group-hover:ring-blue-900/20">
                                <img 
                                  src={formData.avatar || (formData.species === 'Mèo' ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=2069&auto=format&fit=crop')} 
                                  className={`size-full object-cover ${isUploading ? 'opacity-50' : ''}`}
                                  alt="Avatar Preview"
                                />
                              </div>
                              {isUploading ? (
                                <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                              ) : (
                                <div className="absolute inset-0 bg-[#1a2b4c]/40 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Camera className="text-white" size={28} />
                                </div>
                              )}
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            <p className="text-xs font-bold text-slate-400 ">
                              {isUploading ? 'Đang tải ảnh...' : 'Nhấp để chọn ảnh đại diện'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Tên bé cưng *</label>
                              <input
                                required
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 focus:bg-white dark:focus:bg-slate-900 rounded-2xl text-slate-900 dark:text-white outline-none transition-all font-bold shadow-sm"
                                placeholder="Vd: Bông, Milu..."
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Loài</label>
                              <select
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none transition-all font-bold appearance-none cursor-pointer"
                                value={formData.species}
                                onChange={e => setFormData({...formData, species: e.target.value})}
                              >
                                <option value="Chó">🐶 Chó</option>
                                <option value="Mèo">🐱 Mèo</option>
                                <option value="Thỏ">🐰 Thỏ</option>
                                <option value="Khác">✨ Khác</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Giống *</label>
                              <input
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none transition-all font-bold"
                                placeholder="Vd: Poodle, Golden..."
                                value={formData.breed}
                                onChange={e => setFormData({...formData, breed: e.target.value})}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Ngày sinh *</label>
                              <input
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none transition-all font-bold"
                                value={formData.dob}
                                onChange={e => setFormData({...formData, dob: e.target.value})}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Cân nặng (kg) *</label>
                              <input
                                type="number" step="0.1"
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none transition-all font-bold"
                                placeholder="0.0"
                                value={formData.weight}
                                onChange={e => setFormData({...formData, weight: e.target.value})}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Giới tính</label>
                              <select
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none transition-all font-bold appearance-none cursor-pointer"
                                value={formData.gender}
                                onChange={e => setFormData({...formData, gender: e.target.value})}
                              >
                                <option value="Đực">Đực</option>
                                <option value="Cái">Cái</option>
                                <option value="Chưa rõ">Chưa rõ</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Màu lông</label>
                              <input
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none transition-all font-bold"
                                placeholder="Vd: Vàng, Đen..."
                                value={formData.color}
                                onChange={e => setFormData({...formData, color: e.target.value})}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {step === 2 && (
                        <>
                          <div className="flex items-center justify-between pr-8">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dinh dưỡng hàng ngày</h3>
                            <button 
                              onClick={() => setFormData({...formData, nutritionPlan: [...formData.nutritionPlan, { mealName: 'Bữa mới', foodType: '', amount: '' }]})}
                              className="text-xs font-bold text-blue-600 flex items-center gap-1.5 hover:underline"
                            >
                              <Plus size={16} /> THÊM BỮA ĂN
                            </button>
                          </div>

                          <div className="space-y-4">
                            {formData.nutritionPlan.map((meal, idx) => (
                              <motion.div 
                                layout
                                key={idx} 
                                className="grid grid-cols-12 gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800"
                              >
                                <div className="col-span-3">
                                  <input className="w-full bg-transparent text-xs font-bold text-blue-600 uppercase outline-none" value={meal.mealName} onChange={e => {
                                    const copy = [...formData.nutritionPlan]; copy[idx].mealName = e.target.value; setFormData({...formData, nutritionPlan: copy});
                                  }} />
                                </div>
                                <div className="col-span-5">
                                  <input className="w-full bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none" placeholder="Loại thức ăn..." value={meal.foodType} onChange={e => {
                                    const copy = [...formData.nutritionPlan]; copy[idx].foodType = e.target.value; setFormData({...formData, nutritionPlan: copy});
                                  }} />
                                </div>
                                <div className="col-span-3">
                                  <input className="w-full bg-transparent text-sm font-bold text-slate-400 outline-none" placeholder="Định lượng..." value={meal.amount} onChange={e => {
                                    const copy = [...formData.nutritionPlan]; copy[idx].amount = e.target.value; setFormData({...formData, nutritionPlan: copy});
                                  }} />
                                </div>
                                <div className="col-span-1 text-right">
                                  <button onClick={() => setFormData({...formData, nutritionPlan: formData.nutritionPlan.filter((_, i) => i !== idx)})} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Thức ăn ưa thích</label>
                              <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none font-bold" placeholder="Pate, cá hồi..." value={formData.favoriteFood} onChange={e => setFormData({...formData, favoriteFood: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Dị ứng</label>
                              <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-600/30 rounded-2xl text-slate-900 dark:text-white outline-none font-bold" placeholder="Sữa, gà..." value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 mt-6">
                            <div className="col-span-2 sm:col-span-1">
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Tình trạng sinh sản</label>
                              <select
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none font-bold appearance-none cursor-pointer"
                                value={formData.sterilized ? 'true' : 'false'}
                                onChange={e => setFormData({...formData, sterilized: e.target.value === 'true'})}
                              >
                                <option value="false">Chưa triệt sản</option>
                                <option value="true">Đã triệt sản</option>
                              </select>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Ghi chú sức khỏe chung</label>
                              <input 
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600/30 rounded-2xl text-slate-900 dark:text-white outline-none font-bold" 
                                placeholder="Vd: Yếu đường ruột..." 
                                value={formData.healthNote} 
                                onChange={e => setFormData({...formData, healthNote: e.target.value})} 
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {step === 3 && (
                        <>
                          <div className="space-y-8">

                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-800/50">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                                  <HeartPulse size={16} /> Hồ sơ y tế
                                </h3>
                                <button onClick={() => setFormData({...formData, medicalRecords: [...formData.medicalRecords, { diagnosis: '', treatment: '', prescription: '', visitDate: new Date().toISOString(), veterinarianNote: '' }]})} className="text-xs font-bold text-blue-600 hover:underline">THÊM MỚI</button>
                              </div>
                              <div className="space-y-4">
                                {formData.medicalRecords.map((m, i) => (
                                  <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm space-y-3 relative">
                                    <button onClick={() => setFormData({...formData, medicalRecords: formData.medicalRecords.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><X size={16} /></button>
                                    <input className="w-full bg-transparent text-sm font-bold outline-none border-b border-slate-100 dark:border-slate-700 pb-2 pr-6" placeholder="Chẩn đoán bệnh..." value={m.diagnosis} onChange={e => {
                                      const copy = [...formData.medicalRecords]; copy[i].diagnosis = e.target.value; setFormData({...formData, medicalRecords: copy});
                                    }} />
                                    <div className="grid grid-cols-2 gap-4">
                                      <input className="w-full bg-transparent text-xs text-slate-500 outline-none" placeholder="Phương pháp điều trị..." value={m.treatment} onChange={e => {
                                        const copy = [...formData.medicalRecords]; copy[i].treatment = e.target.value; setFormData({...formData, medicalRecords: copy});
                                      }} />
                                      <input className="w-full bg-transparent text-xs text-slate-500 outline-none" placeholder="Đơn thuốc..." value={m.prescription} onChange={e => {
                                        const copy = [...formData.medicalRecords]; copy[i].prescription = e.target.value; setFormData({...formData, medicalRecords: copy});
                                      }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <input type="date" className="w-full bg-transparent text-xs text-slate-500 outline-none" value={m.visitDate?.split('T')[0] || ''} onChange={e => {
                                        const copy = [...formData.medicalRecords]; copy[i].visitDate = e.target.value; setFormData({...formData, medicalRecords: copy});
                                      }} />
                                      <input className="w-full bg-transparent text-xs text-slate-500 outline-none" placeholder="Ghi chú của bác sĩ..." value={m.veterinarianNote} onChange={e => {
                                        const copy = [...formData.medicalRecords]; copy[i].veterinarianNote = e.target.value; setFormData({...formData, medicalRecords: copy});
                                      }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-800/50">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                                  <ShieldCheck size={16} /> Tiêm chủng
                                </h3>
                                <button onClick={() => setFormData({...formData, vaccinations: [...formData.vaccinations, { name: '', drug: '', clinic: '', date: new Date().toISOString(), status: 'done' }]})} className="text-xs font-bold text-amber-600 hover:underline">THÊM MŨI TIÊM</button>
                              </div>
                              <div className="space-y-4">
                                {formData.vaccinations.map((v, i) => (
                                  <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm space-y-3 relative">
                                    <button onClick={() => setFormData({...formData, vaccinations: formData.vaccinations.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><X size={16} /></button>
                                    <input className="w-full bg-transparent text-sm font-bold outline-none border-b border-slate-100 dark:border-slate-700 pb-2 pr-6" placeholder="Tên loại bệnh phòng ngừa (Vd: Dại, 4 bệnh...)" value={v.name} onChange={e => {
                                      const copy = [...formData.vaccinations]; copy[i].name = e.target.value; setFormData({...formData, vaccinations: copy});
                                    }} />
                                    <div className="grid grid-cols-2 gap-4">
                                      <input className="w-full bg-transparent text-xs text-slate-500 outline-none" placeholder="Tên thuốc/vaccine..." value={v.drug} onChange={e => {
                                        const copy = [...formData.vaccinations]; copy[i].drug = e.target.value; setFormData({...formData, vaccinations: copy});
                                      }} />
                                      <input className="w-full bg-transparent text-xs text-slate-500 outline-none" placeholder="Phòng khám..." value={v.clinic} onChange={e => {
                                        const copy = [...formData.vaccinations]; copy[i].clinic = e.target.value; setFormData({...formData, vaccinations: copy});
                                      }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <input type="date" className="w-full text-xs font-bold text-slate-400 bg-transparent outline-none" value={v.date?.split('T')[0] || ''} onChange={e => {
                                        const copy = [...formData.vaccinations]; copy[i].date = e.target.value; setFormData({...formData, vaccinations: copy});
                                      }} />
                                      <select className="w-full text-xs font-bold text-slate-400 bg-transparent outline-none" value={v.status} onChange={e => {
                                        const copy = [...formData.vaccinations]; copy[i].status = e.target.value; setFormData({...formData, vaccinations: copy});
                                      }}>
                                        <option value="done">Đã tiêm</option>
                                        <option value="upcoming">Sắp tới</option>
                                        <option value="missed">Bỏ lỡ</option>
                                      </select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-purple-50/50 dark:bg-purple-900/10 p-6 rounded-[2rem] border border-purple-100 dark:border-purple-800/50">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2">
                                  <Calendar size={16} /> Lịch nhắc chăm sóc
                                </h3>
                                <button onClick={() => setFormData({...formData, reminders: [...(formData.reminders || []), { title: '', description: '', date: new Date().toISOString(), type: 'general', status: 'pending' }]})} className="text-xs font-bold text-purple-600 hover:underline">TẠO LỜI NHẮC</button>
                              </div>
                              <div className="space-y-4">
                                {(formData.reminders || []).map((r, i) => (
                                  <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm space-y-3 relative">
                                    <button onClick={() => setFormData({...formData, reminders: formData.reminders.filter((_, idx) => idx !== i)})} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><X size={16} /></button>
                                    <input className="w-full bg-transparent text-sm font-bold outline-none border-b border-slate-100 dark:border-slate-700 pb-2 pr-6" placeholder="Tiêu đề nhắc nhở (Vd: Tẩy giun)..." value={r.title} onChange={e => {
                                      const copy = [...formData.reminders]; copy[i].title = e.target.value; setFormData({...formData, reminders: copy});
                                    }} />
                                    <input className="w-full bg-transparent text-xs text-slate-500 outline-none" placeholder="Mô tả chi tiết..." value={r.description} onChange={e => {
                                      const copy = [...formData.reminders]; copy[i].description = e.target.value; setFormData({...formData, reminders: copy});
                                    }} />
                                    <div className="grid grid-cols-2 gap-4">
                                      <input type="datetime-local" className="w-full text-xs font-bold text-slate-400 bg-transparent outline-none" value={r.date?.slice(0,16) || ''} onChange={e => {
                                        const copy = [...formData.reminders]; copy[i].date = e.target.value ? new Date(e.target.value).toISOString() : ''; setFormData({...formData, reminders: copy});
                                      }} />
                                      <select className="w-full text-xs font-bold text-slate-400 bg-transparent outline-none" value={r.type} onChange={e => {
                                        const copy = [...formData.reminders]; copy[i].type = e.target.value; setFormData({...formData, reminders: copy});
                                      }}>
                                        <option value="vaccination">Tiêm phòng</option>
                                        <option value="deworming">Tẩy giun</option>
                                        <option value="checkup">Khám sức khỏe</option>
                                        <option value="grooming">Spa & Grooming</option>
                                        <option value="general">Khác</option>
                                      </select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {step === 4 && (
                        <div className="space-y-8 py-4">
                          <div className="text-center">
                            <div className="size-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                              <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Kiểm tra thông tin</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Một bước cuối cùng để đảm bảo mọi thứ hoàn hảo.</p>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 flex gap-8 items-center">
                            <div className="size-32 rounded-[2rem] overflow-hidden ring-8 ring-white dark:ring-slate-900 shadow-xl shrink-0">
                              <img 
                                src={formData.avatar || (formData.species === 'Mèo' ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=2069&auto=format&fit=crop')} 
                                className="size-full object-cover"
                                alt="Preview"
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">{formData.name}</h4>
                              <p className="text-blue-600 dark:text-blue-400 font-bold uppercase text-xs tracking-widest mt-1">
                                {formData.species} • {formData.breed || 'Linh vật'}
                              </p>
                              <div className="flex gap-4 mt-6">
                                <div className="text-center px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Cân nặng</p>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formData.weight} kg</p>
                                </div>
                                <div className="text-center px-4 py-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Ngày sinh</p>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{formData.dob ? new Date(formData.dob).toLocaleDateString('vi-VN') : '---'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                              <p className="text-xs font-bold text-blue-600 mb-2">Chế độ ăn</p>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                {formData.nutritionPlan.filter(m => m.foodType).length} bữa ăn đã được thiết lập.
                              </p>
                            </div>
                            <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-800/50">
                              <p className="text-xs font-bold text-amber-600 mb-2">Y tế</p>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                {formData.vaccinations.length} mũi tiêm và {formData.medicalRecords.length} bệnh án.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Modal Footer */}
                <div className="p-8 md:p-10 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                      Quay lại
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      if (step === 1 && (!formData.name || !formData.breed || !formData.dob || !formData.weight)) {
                        toast.error('Vui lòng nhập đủ các trường bắt buộc!');
                        return;
                      }
                      if (step < 4) setStep(step + 1);
                      else handleAddPet();
                    }}
                    className="flex-1 py-4 bg-[#1a2b4c] text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 hover:bg-[#2d4a82] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        {step === 4 ? 'Xác nhận & Hoàn thành' : 'Tiếp theo'}
                        {step < 4 && <ArrowRight size={18} />}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Pet Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden p-10"
            >
              <div className="text-center mb-8">
                <div className="size-20 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
                  <Trash2 size={36} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Xác nhận xóa hồ sơ?</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Hồ sơ của bé <span className="font-bold text-slate-900 dark:text-white">{selectedPetForDelete?.name}</span> sẽ được chuyển sang trạng thái tạm ngưng.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-400 mb-2 block">Lý do thay đổi *</label>
                  <textarea
                    required rows={3}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-red-500 rounded-2xl text-slate-900 dark:text-white outline-none transition-all font-medium resize-none text-sm"
                    placeholder="Ví dụ: Bé đã tìm được chủ mới hoặc đã qua đời..."
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={!deleteReason || submitting}
                    onClick={handleDeletePet}
                    className="flex-[2] py-4 bg-red-500 text-white font-bold rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={18} />}
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </main>
  );
}
