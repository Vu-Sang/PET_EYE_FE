import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { petService } from '../../services/pet.service';
import { useAuth } from '../../contexts/AuthContext';
import { Pet } from '../../types';
import {
  Camera, Edit2, Save, X, ChevronRight, Download, Plus,
  Calendar, Clock, MapPin, Syringe, FileText, Heart,
  Activity, Utensils, Droplets, Check, AlertCircle,
  ShieldCheck, Star, Image, Upload, Trash2, Video, ClipboardList,
  Loader2, Scissors, Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────── */
export interface PetData extends Pet {}

const springTransition = {
  type: "spring",
  stiffness: 100,
  damping: 15
};

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { ...springTransition }
};


/* ────────────────────────────────────────────────────────────
   EDIT MODAL
──────────────────────────────────────────────────────────── */
function EditModal({ pet, onSave, onClose }: { pet: PetData; onSave: (p: PetData) => void; onClose: () => void }) {
  const [form, setForm] = useState(pet);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const set = (key: keyof PetData, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await petService.uploadAvatar(file);
      set('avatar', url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-t-[40px] px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <Edit2 className="w-5 h-5 text-secondary" /> Chỉnh sửa hồ sơ
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Avatar change hint */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
            <div className="relative">
              <img src={form.avatar} className={`w-16 h-16 rounded-2xl object-cover ${isUploading ? 'opacity-50' : ''}`} alt="pet" />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-spin text-secondary" size={20} />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-white">Ảnh đại diện</p>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <button 
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-secondary font-bold mt-1 flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" /> {isUploading ? 'Đang tải...' : 'Tải ảnh từ máy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Giới tính</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50">
                <option value="Cái">Cái</option>
                <option value="Đực">Đực</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Ngày sinh</label>
              <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Cân nặng (kg)</label>
              <input type="number" step="0.1" value={form.weight} onChange={e => set('weight', +e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Màu lông</label>
              <input value={form.color} onChange={e => set('color', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" />
            </div>
            <div className="col-span-2 flex items-center gap-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-3">
              <button
                type="button"
                onClick={() => set('sterilized', !form.sterilized)}
                className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${form.sterilized ? 'bg-secondary border-secondary' : 'border-slate-300 dark:border-slate-500'}`}
              >
                {form.sterilized && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className="text-sm font-bold text-slate-700 dark:text-white">Đã triệt sản</span>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Ghi chú sức khỏe</label>
              <textarea value={form.healthNote} onChange={e => set('healthNote', e.target.value)}
                rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none" />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-3xl px-6 pt-4 pb-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Hủy
          </button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-[#1a2b4c] text-white font-bold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#1a2b4c]/20">
            <Save className="w-4 h-4" /> Lưu thay đổi
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function NutritionModal({ pet, onSave, onClose }: { pet: PetData; onSave: (p: PetData) => void; onClose: () => void }) {
  const [form, setForm] = useState<PetData>({
    ...pet,
    nutritionPlan: (pet.nutritionPlan && pet.nutritionPlan.length > 0) ? pet.nutritionPlan : [
      { mealName: 'Sáng', foodType: '', amount: '' },
      { mealName: 'Trưa', foodType: '', amount: '' },
      { mealName: 'Tối', foodType: '', amount: '' }
    ]
  });
  const set = (key: keyof PetData, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-t-[40px] px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <Utensils className="w-5 h-5 text-orange-500" /> Cập nhật dinh dưỡng
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Chế độ dinh dưỡng</h3>
              <button 
                type="button"
                onClick={() => {
                  const meals = [...(form.nutritionPlan || [])];
                  meals.push({ mealName: 'Bữa phụ', foodType: '', amount: '' });
                  set('nutritionPlan', meals);
                }}
                className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm bữa
              </button>
            </div>
            
            <div className="space-y-3">
                {form.nutritionPlan?.map((meal, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="col-span-3">
                      <input 
                        value={meal.mealName} 
                        onChange={e => {
                          const meals = [...(form.nutritionPlan || [])];
                          meals[idx] = { ...meals[idx], mealName: e.target.value };
                          set('nutritionPlan', meals);
                        }}
                        className="w-full bg-transparent text-xs font-black text-secondary uppercase outline-none"
                      />
                    </div>
                    <div className="col-span-5">
                      <input 
                        placeholder="Thức ăn..."
                        value={meal.foodType} 
                        onChange={e => {
                          const meals = [...(form.nutritionPlan || [])];
                          meals[idx] = { ...meals[idx], foodType: e.target.value };
                          set('nutritionPlan', meals);
                        }}
                        className="w-full bg-transparent text-xs text-slate-700 dark:text-white font-bold outline-none border-b border-transparent focus:border-slate-300"
                      />
                    </div>
                    <div className="col-span-3">
                      <input 
                        placeholder="Lượng..."
                        value={meal.amount} 
                        onChange={e => {
                          const meals = [...(form.nutritionPlan || [])];
                          meals[idx] = { ...meals[idx], amount: e.target.value };
                          set('nutritionPlan', meals);
                        }}
                        className="w-full bg-transparent text-xs text-slate-500 outline-none border-b border-transparent focus:border-slate-300"
                      />
                    </div>
                  <div className="col-span-1 text-right">
                    <button 
                      type="button"
                      onClick={() => {
                        const meals = [...(form.nutritionPlan || [])].filter((_, i) => i !== idx);
                        set('nutritionPlan', meals);
                      }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Thông tin bổ sung</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Thức ăn ưa thích</label>
                <input 
                  placeholder="Vd: Hạt cá hồi, Pate..."
                  value={form.favoriteFood || ''} 
                  onChange={e => set('favoriteFood', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Dị ứng / Tránh</label>
                <input 
                  placeholder="Vd: Thịt gà, Hải sản..."
                  value={form.allergies || ''} 
                  onChange={e => set('allergies', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Sở thích</label>
                <input 
                  placeholder="Vd: Nhai xương, Tắm nắng..."
                  value={form.hobbies || ''} 
                  onChange={e => set('hobbies', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Thời gian đi dạo (phút)</label>
                <input 
                  type="number"
                  placeholder="Vd: 30"
                  value={form.walkTime || ''} 
                  onChange={e => set('walkTime', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-3xl px-6 pt-4 pb-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Hủy
          </button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-[#1a2b4c] text-white font-bold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#1a2b4c]/20">
            <Save className="w-4 h-4" /> Lưu cập nhật
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MedicalModal({ pet, onSave, onClose }: { pet: PetData; onSave: (p: PetData) => void; onClose: () => void }) {
  const [form, setForm] = useState<PetData>({
    ...pet,
    medicalRecords: pet.medicalRecords || []
  });
  const set = (key: keyof PetData, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-t-[40px] px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <ClipboardList className="w-5 h-5 text-cyan-500" /> Hồ sơ y tế
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Bệnh án</h3>
              <button 
                type="button"
                onClick={() => {
                  const records = [...(form.medicalRecords || [])];
                  records.push({ diagnosis: '', treatment: '', prescription: '', veterinarianNote: '', visitDate: new Date().toISOString() });
                  set('medicalRecords', records);
                }}
                className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm bệnh án
              </button>
            </div>
            
            <div className="space-y-4">
              {form.medicalRecords?.map((record, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative">
                  <button 
                    type="button"
                    onClick={() => {
                      const records = form.medicalRecords?.filter((_, i) => i !== idx);
                      set('medicalRecords', records);
                    }}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Chẩn đoán</label>
                      <input 
                        value={record.diagnosis} 
                        onChange={e => {
                          const records = [...(form.medicalRecords || [])];
                          records[idx] = { ...records[idx], diagnosis: e.target.value };
                          set('medicalRecords', records);
                        }}
                        placeholder="Vd: Viêm phổi, Nhiễm trùng..."
                        className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-white outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Điều trị</label>
                        <input 
                          value={record.treatment} 
                          onChange={e => {
                            const records = [...(form.medicalRecords || [])];
                            records[idx] = { ...records[idx], treatment: e.target.value };
                            set('medicalRecords', records);
                          }}
                          placeholder="..."
                          className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Đơn thuốc</label>
                        <input 
                          value={record.prescription} 
                          onChange={e => {
                            const records = [...(form.medicalRecords || [])];
                            records[idx] = { ...records[idx], prescription: e.target.value };
                            set('medicalRecords', records);
                          }}
                          placeholder="..."
                          className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ghi chú bác sĩ</label>
                      <textarea 
                        value={record.veterinarianNote} 
                        onChange={e => {
                          const records = [...(form.medicalRecords || [])];
                          records[idx] = { ...records[idx], veterinarianNote: e.target.value };
                          set('medicalRecords', records);
                        }}
                        rows={2}
                        className="w-full bg-transparent text-xs text-slate-600 dark:text-slate-400 outline-none border border-slate-200 dark:border-slate-600 rounded-lg p-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {(!form.medicalRecords || form.medicalRecords.length === 0) && (
                <p className="text-center py-8 text-xs text-slate-400 italic">Chưa có thông tin bệnh án</p>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-3xl px-6 pt-4 pb-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Hủy
          </button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-[#1a2b4c] text-white font-bold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#1a2b4c]/20">
            <Save className="w-4 h-4" /> Lưu hồ sơ
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function VaccinationModal({ pet, onSave, onClose }: { pet: PetData; onSave: (p: PetData) => void; onClose: () => void }) {
  const [form, setForm] = useState(pet);
  const set = (key: keyof PetData, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-t-[40px] px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <Syringe className="w-5 h-5 text-secondary" /> Lịch sử tiêm chủng
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Tiêm chủng</h3>
              <button 
                type="button"
                onClick={() => {
                  const vaccinations = [...(form.vaccinations || [])];
                  vaccinations.push({ name: '', drug: '', clinic: '', date: new Date().toISOString(), status: 'upcoming' });
                  set('vaccinations', vaccinations);
                }}
                className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm mũi tiêm
              </button>
            </div>
            
            <div className="space-y-4">
              {form.vaccinations?.map((v, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative">
                  <button 
                    type="button"
                    onClick={() => {
                      const vaccinations = form.vaccinations?.filter((_, i) => i !== idx);
                      set('vaccinations', vaccinations);
                    }}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tên loại bệnh phòng ngừa</label>
                      <input 
                        value={v.name} 
                        onChange={e => {
                          const list = [...(form.vaccinations || [])];
                          list[idx] = { ...list[idx], name: e.target.value };
                          set('vaccinations', list);
                        }}
                        placeholder="Vd: Dại, 4 bệnh..."
                        className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-white outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tên thuốc/Vaccine</label>
                        <input 
                          value={v.drug} 
                          onChange={e => {
                            const list = [...(form.vaccinations || [])];
                            list[idx] = { ...list[idx], drug: e.target.value };
                            set('vaccinations', list);
                          }}
                          placeholder="..."
                          className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Phòng khám</label>
                        <input 
                          value={v.clinic} 
                          onChange={e => {
                            const list = [...(form.vaccinations || [])];
                            list[idx] = { ...list[idx], clinic: e.target.value };
                            set('vaccinations', list);
                          }}
                          placeholder="..."
                          className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ngày tiêm</label>
                        <input 
                          type="date"
                          value={v.date ? v.date.split('T')[0] : ''} 
                          onChange={e => {
                            const list = [...(form.vaccinations || [])];
                            list[idx] = { ...list[idx], date: e.target.value };
                            set('vaccinations', list);
                          }}
                          className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Trạng thái</label>
                        <select
                          value={v.status}
                          onChange={e => {
                            const list = [...(form.vaccinations || [])];
                            list[idx] = { ...list[idx], status: e.target.value as any };
                            set('vaccinations', list);
                          }}
                          className="w-full bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                        >
                          <option value="done">Đã hoàn thành</option>
                          <option value="upcoming">Sắp tới</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!form.vaccinations || form.vaccinations.length === 0) && (
                <p className="text-center py-8 text-xs text-slate-400 italic">Chưa có thông tin tiêm chủng</p>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-3xl px-6 pt-4 pb-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Hủy
          </button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-[#1a2b4c] text-white font-bold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#1a2b4c]/20">
            <Save className="w-4 h-4" /> Lưu thông tin
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ReminderModal({ pet, onSave, onClose }: { pet: PetData; onSave: (p: PetData) => void; onClose: () => void }) {
  const [form, setForm] = useState(pet);
  const set = (key: keyof PetData, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-t-[40px] px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <Clock className="w-5 h-5 text-secondary" /> Quản lý lịch nhắc
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Lịch nhắc</h3>
              <button 
                type="button"
                onClick={() => {
                  const reminders = [...(form.reminders || [])];
                  reminders.push({ title: '', description: '', type: 'medicine', date: new Date().toISOString(), status: 'active' });
                  set('reminders', reminders);
                }}
                className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm lịch nhắc
              </button>
            </div>
            
            <div className="space-y-4">
              {form.reminders?.map((r, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700 relative">
                  <button 
                    type="button"
                    onClick={() => {
                      const list = form.reminders?.filter((_, i) => i !== idx);
                      set('reminders', list);
                    }}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tiêu đề lịch nhắc</label>
                      <input 
                        value={r.title} 
                        onChange={e => {
                          const list = [...(form.reminders || [])];
                          list[idx] = { ...list[idx], title: e.target.value };
                          set('reminders', list);
                        }}
                        placeholder="Vd: Uống thuốc giun, Spa..."
                        className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-white outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mô tả chi tiết</label>
                      <input 
                        value={r.description} 
                        onChange={e => {
                          const list = [...(form.reminders || [])];
                          list[idx] = { ...list[idx], description: e.target.value };
                          set('reminders', list);
                        }}
                        placeholder="..."
                        className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Loại</label>
                        <select
                          value={r.type}
                          onChange={e => {
                            const list = [...(form.reminders || [])];
                            list[idx] = { ...list[idx], type: e.target.value as any };
                            set('reminders', list);
                          }}
                          className="w-full bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                        >
                          <option value="medicine">Thuốc</option>
                          <option value="spa">Spa</option>
                          <option value="checkup">Khám bệnh</option>
                          <option value="other">Khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ngày thực hiện</label>
                        <input 
                          type="date"
                          value={r.date ? r.date.split('T')[0] : ''} 
                          onChange={e => {
                            const list = [...(form.reminders || [])];
                            list[idx] = { ...list[idx], date: e.target.value };
                            set('reminders', list);
                          }}
                          className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none border-b border-slate-200 dark:border-slate-600 focus:border-secondary pb-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!form.reminders || form.reminders.length === 0) && (
                <p className="text-center py-8 text-xs text-slate-400 italic">Chưa có lịch nhắc</p>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-3xl px-6 pt-4 pb-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Hủy
          </button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-[#1a2b4c] text-white font-bold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#1a2b4c]/20">
            <Save className="w-4 h-4" /> Lưu lịch nhắc
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AlbumModal({ pet, onSave, onClose }: { pet: PetData; onSave: (p: PetData) => void; onClose: () => void }) {
  const [form, setForm] = useState(pet);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = (key: keyof PetData, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const url = await petService.uploadAvatar(file);
      const album = [...(form.album || [])];
      album.push({ imageUrl: url, uploadDate: new Date().toISOString() });
      set('album', album);
    } catch (err) {
      alert('Lỗi khi tải ảnh lên');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-t-[40px] px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white">
            <Image className="w-5 h-5 text-purple-500" /> Quản lý Album ảnh
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {form.album?.map((img, idx) => (
              <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 relative group">
                <img src={img.imageUrl} className="w-full h-full object-cover" alt="" />
                <button 
                  onClick={() => {
                    const album = form.album?.filter((_, i) => i !== idx);
                    set('album', album);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            <button 
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 hover:border-secondary hover:bg-secondary/5 transition-all group"
            >
              {uploading ? (
                <Loader2 className="animate-spin text-secondary" size={24} />
              ) : (
                <>
                  <Upload className="text-slate-300 group-hover:text-secondary transition-colors" size={24} />
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-secondary transition-colors uppercase">Tải ảnh mới</span>
                </>
              )}
            </button>
          </div>
          <input type="file" hidden ref={fileRef} accept="image/*" onChange={handleUpload} />
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-3xl px-6 pt-4 pb-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Đóng
          </button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-[#1a2b4c] text-white font-bold text-sm hover:opacity-90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#1a2b4c]/20">
            <Save className="w-4 h-4" /> Lưu Album
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────────────────────── */
export default function PetProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pet, setPet] = useState<PetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [showVaccinationModal, setShowVaccinationModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'vaccines' | 'docs' | 'reminders'>('vaccines');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPetDetails();
    }
  }, [id]);

  const fetchPetDetails = async () => {
    try {
      setLoading(true);
      const data = await petService.getById(Number(id));
      setPet(data as PetData);
    } catch (error) {
      console.error('Failed to fetch pet details:', error);
      navigate('/profile/pets');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updatedPet: PetData) => {
    try {
      const saved = await petService.update(pet!.id, updatedPet);
      setPet(saved as PetData);
    } catch (error) {
      console.error('Failed to update pet:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin.');
    }
  };

  const handleDeletePet = async () => {
    if (!pet || !deleteReason) return;
    try {
      setSubmitting(true);
      await petService.delete(pet.id, deleteReason);
      setShowDeleteModal(false);
      setDeleteReason('');
      fetchPetDetails();
    } catch (error) {
      console.error('Failed to delete pet:', error);
      alert('Có lỗi xảy ra khi xóa thú cưng.');
    } finally {
      setSubmitting(false);
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
    
    if (years > 0) {
      return `${years} năm tuổi`;
    } else {
      const displayMonths = months <= 0 ? 1 : months;
      return `${displayMonths} tháng tuổi`;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-slate-400 font-bold animate-pulse">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  if (!pet) return null;

  const age = calculateAge(pet.dob);

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-12 font-display"
    >
      <AnimatePresence>
        {showEditModal && <EditModal pet={pet} onClose={() => setShowEditModal(false)} onSave={handleUpdate} />}
        {showNutritionModal && <NutritionModal pet={pet} onClose={() => setShowNutritionModal(false)} onSave={handleUpdate} />}
        {showMedicalModal && <MedicalModal pet={pet} onClose={() => setShowMedicalModal(false)} onSave={handleUpdate} />}
        {showVaccinationModal && <VaccinationModal pet={pet} onClose={() => setShowVaccinationModal(false)} onSave={handleUpdate} />}
        {showReminderModal && <ReminderModal pet={pet} onClose={() => setShowReminderModal(false)} onSave={handleUpdate} />}
        {showAlbumModal && <AlbumModal pet={pet} onClose={() => setShowAlbumModal(false)} onSave={handleUpdate} />}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out" 
            onClick={() => setLightbox(null)}
          >
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={lightbox} 
              className="max-w-5xl w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl" 
              alt="Photo" 
            />
            <button className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeIn} className="mb-10">
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
          <Link to="/user/dashboard" className="hover:text-primary transition-colors">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/profile/pets" className="hover:text-primary transition-colors">Thú cưng</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900 dark:text-white">Hồ sơ sức khỏe</span>
        </nav>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Hồ sơ <span className="text-gradient">Sức khỏe</span></h2>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* ── LEFT COLUMN: Identity ────────────────────────── */}
        <motion.aside variants={fadeIn} className="lg:col-span-4 xl:col-span-3 flex flex-col gap-8">
          <div className="glass dark:glass-dark rounded-[40px] overflow-hidden shadow-2xl relative">
            <div className="h-32 bg-mesh opacity-40" />
            
            <div className="px-8 pb-10 -mt-16 flex flex-col items-center text-center relative z-10">
              {/* Avatar */}
              <div className="relative mb-6 group">
                <div className="relative">
                  <img
                    src={pet.avatar || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=400&auto=format&fit=crop'}
                    alt={pet.name}
                    className={`w-32 h-32 rounded-[32px] object-cover border-8 border-white dark:border-slate-800 shadow-2xl transition-all duration-500 group-hover:scale-105 ${isUploading ? 'opacity-50' : ''}`}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setIsUploading(true);
                      const url = await petService.uploadAvatar(file);
                      const saved = await petService.update(pet.id, { ...pet, avatar: url });
                      setPet(saved as PetData);
                    } catch (error) {
                      alert('Lỗi khi tải ảnh.');
                    } finally {
                      setIsUploading(false);
                    }
                  }} 
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{pet.name}</h1>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                    {pet.species}
                  </span>
                  <span className="text-[10px] font-black text-secondary bg-secondary/10 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                    {pet.breed}
                  </span>
                </div>
              </div>

              {/* Core Stats */}
              <div className="w-full grid grid-cols-2 gap-4 text-left">
                {[
                  { label: 'Tuổi', value: age },
                  { label: 'Giới tính', value: pet.gender },
                  { label: 'Cân nặng', value: `${pet.weight} kg` },
                  { label: 'Màu lông', value: pet.color },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">{item.label}</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="w-full mt-6 space-y-4">
                 <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-2">Trạng thái hồ sơ</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${pet.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-xs font-bold text-slate-700 dark:text-white">
                        {pet.active ? 'Hồ sơ đang hoạt động' : 'Hồ sơ đã tạm ngưng'}
                      </span>
                    </div>
                    {pet.sterilized ? (
                      <div className="flex items-center gap-2 mt-2 text-indigo-500">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Đã triệt sản</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2 text-slate-400">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Chưa triệt sản</span>
                      </div>
                    )}
                 </div>

                <button
                  onClick={() => setShowEditModal(true)}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Chỉnh sửa
                </button>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 gap-4">
            <Link to="/camera" className="glass p-5 rounded-3xl flex flex-col items-center gap-3 hover:shadow-2xl transition-all group">
              <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <Video size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Live Cam</span>
            </Link>
            <button 
              onClick={() => setShowAlbumModal(true)}
              className="glass p-5 rounded-3xl flex flex-col items-center gap-3 hover:shadow-2xl transition-all group"
            >
              <div className="w-12 h-12 bg-purple-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                <Image size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Album</span>
            </button>
          </div>

          {!pet.active && (
            <div className="glass bg-red-500/5 border-red-500/20 p-6 rounded-[32px]">
               <div className="flex items-center gap-3 text-red-500 mb-3">
                 <AlertCircle size={20} />
                 <h3 className="font-black text-sm uppercase tracking-widest">Lý do ngưng</h3>
               </div>
               <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">
                 "{pet.unactiveReason || 'Không có lý do cụ thể'}"
               </p>
            </div>
          )}

          {pet.active && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-4 rounded-2xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest border border-red-100 dark:border-red-900/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Đóng hồ sơ tạm thời
            </button>
          )}
        </motion.aside>

        {/* ── RIGHT COLUMN: Content ────────────────────────── */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-10">
          
          {/* Nutrition Section */}
          <motion.section variants={fadeIn} className="glass dark:glass-dark rounded-[40px] p-8 md:p-10 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Utensils size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Dinh dưỡng</h2>
                  <p className="text-xs text-slate-400 font-medium">Chế độ ăn uống &amp; Sinh hoạt hàng ngày</p>
                </div>
              </div>
              <button 
                onClick={() => setShowNutritionModal(true)}
                className="w-10 h-10 rounded-full glass flex items-center justify-center text-slate-400 hover:text-primary transition-all"
              >
                <Edit2 size={18} />
              </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 mb-10">
              {(() => {
                const activeMeals = (pet.nutritionPlan || []).filter(n => n.foodType || n.amount);
                if (activeMeals.length === 0) {
                  return (
                    <div className="col-span-3 flex flex-col items-center justify-center py-12 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                       <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Chưa thiết lập thực đơn</p>
                    </div>
                  );
                }
                return activeMeals.map((n, i) => (
                  <div key={i} className="glass-light dark:glass-dark p-6 rounded-[32px] border border-white/40 dark:border-slate-800">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2">Bữa {n.mealName}</p>
                    <p className="font-black text-base text-slate-900 dark:text-white mb-1">{n.foodType || '—'}</p>
                    <p className="text-xs text-slate-500 font-medium">Lượng: <span className="text-slate-900 dark:text-white font-bold">{n.amount || '—'}</span></p>
                  </div>
                ));
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: <Utensils className="w-4 h-4" />, color: 'bg-emerald-500', label: 'Yêu thích', value: pet.favoriteFood },
                { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-red-500', label: 'Dị ứng', value: pet.allergies },
                { icon: <Heart className="w-4 h-4" />, color: 'bg-pink-500', label: 'Sở thích', value: pet.hobbies },
                { icon: <Activity className="w-4 h-4" />, color: 'bg-blue-500', label: 'Vận động', value: pet.walkTime ? `${pet.walkTime} phút` : null },
              ].filter(item => item.value).map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-slate-800">
                  <div className={`w-8 h-8 shrink-0 rounded-xl ${item.color} text-white flex items-center justify-center shadow-lg shadow-${item.color.split('-')[1]}-500/20`}>{item.icon}</div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Health Dashboard Tabbed */}
          <motion.section variants={fadeIn} className="glass dark:glass-dark rounded-[40px] shadow-xl overflow-hidden">
            <div className="flex flex-wrap border-b border-white/20 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30">
              {([
                { key: 'vaccines', label: 'Tiêm chủng', icon: <Syringe size={18} /> },
                { key: 'docs', label: 'Y tế', icon: <FileText size={18} /> },
                { key: 'reminders', label: 'Nhắc lịch', icon: <Clock size={18} /> },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center justify-center gap-3 flex-1 px-8 py-6 text-xs font-black uppercase tracking-widest transition-all relative ${
                    tab === t.key 
                      ? 'text-primary' 
                      : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {tab === t.key && (
                    <motion.div 
                      layoutId="active-tab"
                      className="absolute bottom-0 left-1/4 right-1/4 h-1 bg-primary rounded-full" 
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="p-8 md:p-10">
              <AnimatePresence mode="wait">
                {tab === 'vaccines' && (
                  <motion.div 
                    key="vaccines"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Lịch sử tiêm ngừa</h3>
                        <p className="text-xs text-slate-400 font-medium">Đã hoàn thành {(pet.vaccinations || []).filter(v => v.status === 'done').length}/{(pet.vaccinations || []).length} mũi</p>
                      </div>
                      <button 
                        onClick={() => setShowVaccinationModal(true)}
                        className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline"
                      >
                        <Plus className="w-4 h-4" /> Thêm hồ sơ
                      </button>
                    </div>

                    <div className="space-y-4">
                      {pet.vaccinations && pet.vaccinations.length > 0 ? (
                        pet.vaccinations.map((v, i) => (
                          <div key={i} className="flex gap-6 group">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center z-10 shadow-lg ${
                                v.status === 'done' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-primary border-2 border-primary'
                              }`}>
                                {v.status === 'done' ? <Check size={20} /> : <Syringe size={20} />}
                              </div>
                              <div className="w-0.5 grow bg-slate-100 dark:bg-slate-800 my-2 group-last:hidden" />
                            </div>
                            <div className={`flex-1 p-6 rounded-[32px] border transition-all ${
                              v.status === 'upcoming' 
                                ? 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5' 
                                : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{v.date ? new Date(v.date).toLocaleDateString('vi-VN') : 'Sắp tới'}</p>
                                  <h4 className="font-black text-base text-slate-900 dark:text-white">{v.name}</h4>
                                  <p className="text-xs text-slate-500 font-medium mt-1">Sử dụng: <span className="font-bold">{v.drug}</span> tại {v.clinic}</p>
                                </div>
                                {v.status === 'upcoming' && (
                                  <Link to="/search" className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
                                    Đặt lịch tiêm →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
                          <Syringe className="mx-auto text-slate-300 mb-4" size={40} />
                          <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Chưa có dữ liệu tiêm chủng</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {tab === 'docs' && (
                  <motion.div 
                    key="docs"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Bệnh án chi tiết</h3>
                        <p className="text-xs text-slate-400 font-medium">Tổng số {(pet.medicalRecords || []).length} lượt khám</p>
                      </div>
                      <button 
                        onClick={() => setShowMedicalModal(true)}
                        className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline"
                      >
                        <Plus className="w-4 h-4" /> Thêm lượt khám
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {pet.medicalRecords && pet.medicalRecords.length > 0 ? (
                        pet.medicalRecords.map((record, i) => (
                          <div key={i} className="p-8 rounded-[40px] bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-1 transition-all group">
                            <div className="flex justify-between items-center mb-6">
                              <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">{record.visitDate ? new Date(record.visitDate).toLocaleDateString('vi-VN') : '—'}</span>
                              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
                                <ClipboardList size={16} />
                              </div>
                            </div>
                            <h4 className="font-black text-lg text-slate-900 dark:text-white mb-4 leading-tight">{record.diagnosis}</h4>
                            <div className="space-y-3 mb-6">
                              <div className="flex items-start gap-2">
                                <Check size={14} className="text-emerald-500 mt-0.5" />
                                <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold text-slate-900 dark:text-white">Điều trị:</span> {record.treatment || '—'}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Syringe size={14} className="text-indigo-500 mt-0.5" />
                                <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold text-slate-900 dark:text-white">Đơn thuốc:</span> {record.prescription || '—'}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <Stethoscope size={14} className="text-blue-500 mt-0.5" />
                                <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold text-slate-900 dark:text-white">Phụ trách:</span> {record.staffName || 'Không rõ'}</p>
                              </div>
                            </div>
                            {record.veterinarianNote && (
                              <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <p className="text-[11px] text-slate-500 italic leading-relaxed">"{record.veterinarianNote}"</p>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-16 bg-slate-50/50 dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
                          <ClipboardList className="mx-auto text-slate-300 mb-4" size={40} />
                          <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Chưa có hồ sơ bệnh án</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {tab === 'reminders' && (
                  <motion.div 
                    key="reminders"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Lịch nhắc chăm sóc</h3>
                        <p className="text-xs text-slate-400 font-medium">Hiện có {(pet.reminders || []).filter(r => r.status === 'active').length} việc cần làm</p>
                      </div>
                      <button 
                        onClick={() => setShowReminderModal(true)}
                        className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest hover:underline"
                      >
                        <Plus className="w-4 h-4" /> Tạo lời nhắc
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      {pet.reminders && pet.reminders.length > 0 ? (
                        pet.reminders.map((r, i) => (
                          <div key={i} className="glass p-6 rounded-[32px] flex items-center gap-5 group hover:shadow-2xl transition-all">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                              r.type === 'medicine' ? 'bg-orange-500 text-white shadow-orange-500/20' : 
                              r.type === 'spa' ? 'bg-blue-500 text-white shadow-blue-500/20' : 
                              r.type === 'checkup' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                              'bg-slate-500 text-white shadow-slate-500/20'
                            }`}>
                              {r.type === 'medicine' ? <ShieldCheck size={24} /> : 
                               r.type === 'spa' ? <Scissors size={24} /> : 
                               r.type === 'checkup' ? <Stethoscope size={24} /> : 
                               <Clock size={24} />}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{r.date ? new Date(r.date).toLocaleDateString('vi-VN') : '—'}</p>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.status === 'active' ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 bg-slate-100'}`}>
                                  {r.status === 'active' ? 'Sắp tới' : 'Xong'}
                                </span>
                              </div>
                              <h4 className="font-black text-base text-slate-900 dark:text-white">{r.title}</h4>
                              <p className="text-xs text-slate-500 line-clamp-1">{r.description}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-16 bg-slate-50/50 dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
                          <Clock className="mx-auto text-slate-300 mb-4" size={40} />
                          <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Không có lời nhắc nào</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Photo Gallery with Stagger */}
          <motion.section variants={fadeIn} className="glass dark:glass-dark rounded-[40px] p-8 md:p-10 shadow-xl">
             <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <Image className="text-purple-500" /> Khoảnh khắc
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">Lưu giữ những kỷ niệm đẹp nhất</p>
                </div>
                <button 
                  onClick={() => setShowAlbumModal(true)}
                  className="bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                >
                  <Plus size={14} /> Thêm ảnh
                </button>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
               {pet.album && pet.album.length > 0 ? (
                 pet.album.map((img, i) => (
                   <motion.div
                     key={i}
                     whileHover={{ scale: 1.05, rotate: i % 2 === 0 ? 2 : -2 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={() => setLightbox(img.imageUrl)}
                     className="aspect-square rounded-[24px] overflow-hidden border-4 border-white dark:border-slate-800 cursor-zoom-in relative group shadow-lg"
                   >
                     <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={`Moment ${i + 1}`} />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                       <span className="text-white text-[8px] font-black uppercase tracking-widest">Phóng to</span>
                     </div>
                   </motion.div>
                 ))
               ) : (
                 <div className="col-span-full py-20 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800">
                   <Image className="mx-auto text-slate-300 mb-4" size={40} />
                   <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Album ảnh còn trống</p>
                 </div>
               )}
               
               <button 
                 onClick={() => setShowAlbumModal(true)}
                 className="aspect-square rounded-[24px] border-4 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
               >
                 <Upload className="text-slate-300 group-hover:text-primary transition-colors" size={24} />
                 <span className="text-[8px] font-black text-slate-400 group-hover:text-primary transition-colors uppercase tracking-widest">Thêm ảnh</span>
               </button>
             </div>
          </motion.section>
        </main>
      </div>

      {/* Delete Pet Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md glass dark:glass-dark rounded-[48px] shadow-3xl overflow-hidden p-10"
            >
              <div className="text-center mb-8">
                <div className="size-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Ngưng hoạt động?</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed px-4">
                  Bạn đang chuẩn bị tạm đóng hồ sơ của <span className="font-bold text-slate-900 dark:text-white">{pet.name}</span>. Bạn có thể kích hoạt lại sau này.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Lý do (Bắt buộc) *</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full px-5 py-4 bg-white/50 dark:bg-slate-800/50 border-2 border-transparent focus:border-red-500 rounded-3xl text-slate-900 dark:text-white outline-none transition-all font-bold resize-none text-xs"
                    placeholder="Vd: Bé đã qua đời, đã cho người khác nuôi..."
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={!deleteReason || submitting}
                    onClick={handleDeletePet}
                    className="flex-[2] py-4 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                    Xác nhận đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
