import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Camera, X, Clock, DollarSign, Tag, ToggleLeft, ToggleRight, Loader2, Package, LayoutGrid, List as ListIcon, Scissors, Stethoscope, Home } from 'lucide-react';
import { serviceService } from '../../services/service.service';
import type { ServiceResponse, ServiceCreationRequest, ServiceUpdateRequest } from '../../types/api';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Camera tier options (defaults — shop can override label & price) ─────────

const CAMERA_TIERS = [
  { id: 'BASIC',     label: 'Cơ bản (720p)',     desc: 'Giám sát tiêu chuẩn, đã bao gồm trong gói', icon: '👁️',  defaultPrice: 0      },
  { id: 'HD',        label: 'Sắc nét (1080p HD)', desc: 'Hình ảnh sắc nét, màu sắc trung thực',       icon: '📺',  defaultPrice: 50000  },
  { id: 'PANORAMIC', label: 'Toàn cảnh (360°)',   desc: 'Xoay 360 độ, không góc chết',                icon: '🔄',  defaultPrice: 100000 },
  { id: 'AI',        label: 'AI Giám sát',         desc: 'Cảnh báo tự động hành vi bất thường',        icon: '🤖',  defaultPrice: 150000 },
];

// ─── Category helpers ────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  GROOMING: 'Chăm sóc',
  CLINIC: 'Khám bệnh',
  BOARDING: 'Lưu trú',
};

const ALL_CATEGORIES = ['Tất cả', 'GROOMING', 'CLINIC', 'BOARDING'];

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

// ─── Form state type ──────────────────────────────────────────────────────────

interface ServiceForm {
  serviceName: string;
  price: number;
  durationMinutes: number;   // for BOARDING: stored as days in UI, converted to minutes on save
  durationDays: number;      // UI-only field for BOARDING
  description: string;
  imageUrl: string;
  category: string;
  active: boolean;
  // BOARDING-only
  cameraEnabled: boolean;
  cameraTiers: string[];
  cameraTierPrices: Record<string, number>;   // custom price per tier
  cameraTierLabels: Record<string, string>;   // custom label per tier
  cameraDescription: string;
  cageSize: string;
  roomType: string;
}

const EMPTY_FORM: ServiceForm = {
  serviceName: '',
  price: 0,
  durationMinutes: 1440,  // 1 day default for BOARDING
  durationDays: 1,
  description: '',
  imageUrl: '',
  category: 'GROOMING',
  active: true,
  cameraEnabled: false,
  cameraTiers: [],
  cameraTierPrices: {},
  cameraTierLabels: {},
  cameraDescription: '',
  cageSize: '',
  roomType: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShopServices() {
  const { isDark } = useTheme();
  const [services, setServices] = useState<ServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [deletingService, setDeletingService] = useState<ServiceResponse | null>(null);

  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load services on mount ──────────────────────────────────────────────────

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    try {
      setLoading(true);
      setError(null);
      const data = await serviceService.getMyShopServices();
      setServices(data);
    } catch {
      setError('Không thể tải danh sách dịch vụ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  // ── Toast helpers ───────────────────────────────────────────────────────────

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }

  // ── Filtering ───────────────────────────────────────────────────────────────

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === 'Tất cả' || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // ── Modal helpers ───────────────────────────────────────────────────────────

  function openAddModal() {
    setModalMode('add');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImagePreview('');
    setShowModal(true);
  }

  function openEditModal(service: ServiceResponse) {
    setModalMode('edit');
    setEditingId(service.id);
    const durationDays = service.category === 'BOARDING'
      ? Math.round(service.durationMinutes / 1440) || 1
      : 1;
    setForm({
      serviceName: service.serviceName,
      price: service.price,
      durationMinutes: service.durationMinutes,
      durationDays,
      description: service.description ?? '',
      imageUrl: service.imageUrl ?? '',
      category: service.category,
      active: service.active,
      cameraEnabled: service.cameraEnabled ?? false,
      cameraTiers: service.cameraTiers ?? [],
      cameraTierPrices: service.cameraTierPrices ?? {},
      cameraTierLabels: service.cameraTierLabels ?? {},
      cameraDescription: service.cameraDescription ?? '',
      cageSize: service.cageSize?.join(', ') ?? '',
      roomType: service.roomType?.join(', ') ?? '',
    });
    setImagePreview(service.imageUrl ?? '');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setImagePreview('');
    setEditingId(null);
  }

  // ── Image upload ────────────────────────────────────────────────────────────

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    try {
      setUploadingImage(true);
      const uploadedUrl = await serviceService.uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      setImagePreview(uploadedUrl);
    } catch {
      showError('Tải ảnh lên thất bại. Vui lòng thử lại.');
      setImagePreview('');
      setForm((prev) => ({ ...prev, imageUrl: '' }));
    } finally {
      setUploadingImage(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Save (create / update) ──────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving || uploadingImage) return;

    try {
      setSaving(true);

      // For BOARDING: convert days → minutes
      const durationMinutes = form.category === 'BOARDING'
        ? form.durationDays * 1440
        : form.durationMinutes;

      if (modalMode === 'add') {
        const payload: ServiceCreationRequest = {
          serviceName: form.serviceName,
          category: form.category,
          price: form.price,
          durationMinutes,
          description: form.description,
          imageUrl: form.imageUrl || undefined,
          ...(form.category === 'BOARDING' && {
            cameraEnabled: form.cameraEnabled,
            cameraTiers: form.cameraEnabled ? form.cameraTiers : [],
            cameraTierPrices: form.cameraEnabled ? form.cameraTierPrices : {},
            cameraTierLabels: form.cameraEnabled ? form.cameraTierLabels : {},
            cameraDescription: form.cameraEnabled ? form.cameraDescription : undefined,
            cageSize: form.cageSize ? form.cageSize.split(',').map(s=>s.trim()).filter(Boolean) : undefined,
            roomType: form.roomType ? form.roomType.split(',').map(s=>s.trim()).filter(Boolean) : undefined,
          }),
        };
        const created = await serviceService.createService(payload);
        setServices((prev) => [...prev, created]);
        showSuccess('Dịch vụ đã được thêm thành công!');
      } else {
        if (editingId === null) return;
        const payload: ServiceUpdateRequest = {
          serviceName: form.serviceName,
          category: form.category,
          price: form.price,
          durationMinutes,
          description: form.description,
          imageUrl: form.imageUrl || undefined,
          active: form.active,
          ...(form.category === 'BOARDING' && {
            cameraEnabled: form.cameraEnabled,
            cameraTiers: form.cameraEnabled ? form.cameraTiers : [],
            cameraTierPrices: form.cameraEnabled ? form.cameraTierPrices : {},
            cameraTierLabels: form.cameraEnabled ? form.cameraTierLabels : {},
            cameraDescription: form.cameraEnabled ? form.cameraDescription : undefined,
            cageSize: form.cageSize ? form.cageSize.split(',').map(s=>s.trim()).filter(Boolean) : undefined,
            roomType: form.roomType ? form.roomType.split(',').map(s=>s.trim()).filter(Boolean) : undefined,
          }),
        };
        const updated = await serviceService.updateService(editingId, payload);
        setServices((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        showSuccess('Dịch vụ đã được cập nhật thành công!');
      }

      closeModal();
    } catch {
      showError('Lưu dịch vụ thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deletingService) return;

    try {
      await serviceService.deleteService(deletingService.id);
      setServices((prev) => prev.filter((s) => s.id !== deletingService.id));
      showSuccess('Dịch vụ đã được xóa.');
    } catch {
      showError('Xóa dịch vụ thất bại. Vui lòng thử lại.');
    } finally {
      setDeletingService(null);
    }
  }

  // ── Toggle active status ────────────────────────────────────────────────────

  async function toggleServiceStatus(service: ServiceResponse) {
    try {
      const updated = await serviceService.updateService(service.id, { active: !service.active });
      setServices((prev) => prev.map((s) => (s.id === service.id ? updated : s)));
    } catch {
      showError('Cập nhật trạng thái thất bại. Vui lòng thử lại.');
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  const totalServices = services.length;
  const groomingCount = services.filter(s => s.category === 'GROOMING').length;
  const clinicCount = services.filter(s => s.category === 'CLINIC').length;
  const boardingCount = services.filter(s => s.category === 'BOARDING').length;

  const kpis = [
    { label: 'Tổng số dịch vụ', value: totalServices, icon: Package, color: 'bg-blue-500', shadow: 'shadow-blue-500/30', glow: 'glow-blue' },
    { label: 'Chăm sóc (Grooming)', value: groomingCount, icon: Scissors, color: 'bg-pink-500', shadow: 'shadow-pink-500/30', glow: 'glow-pink' },
    { label: 'Khám bệnh (Clinic)', value: clinicCount, icon: Stethoscope, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/30', glow: 'glow-emerald' },
    { label: 'Lưu trú (Boarding)', value: boardingCount, icon: Home, color: 'bg-indigo-500', shadow: 'shadow-indigo-500/30', glow: 'glow-indigo' },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full px-6 md:px-10 py-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Package className={`w-8 h-8 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`} />
            Quản lý dịch vụ
          </h1>
          <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Thêm, chỉnh sửa và quản lý các dịch vụ của cửa hàng</p>
        </div>
        <button
          onClick={openAddModal}
          className={`flex items-center gap-2 px-5 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg ${isDark ? 'bg-indigo-600 shadow-indigo-500/20 hover:shadow-indigo-500/40' : 'bg-[#1a2b4c]'}`}
        >
          <Plus size={20} />
          Thêm dịch vụ
        </button>
      </div>

      {/* Toast messages */}
      {successMsg && (
        <div className={`border rounded-xl p-4 flex items-center gap-3 mb-6 ${isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className={`border rounded-xl p-4 flex items-center gap-3 mb-6 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((s) => (
          <div 
            key={s.label} 
            className={`p-6 rounded-[2rem] transition-all duration-300 group block border ${isDark ? 'admin-glass-card bg-slate-900/40 hover:bg-slate-900/60 border-white/5' : 'bg-white shadow-sm border-slate-100 hover:shadow-xl'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${s.color} shadow-lg ${s.shadow} ${isDark ? s.glow : ''} group-hover:scale-110 transition-transform`}>
                <s.icon size={22} />
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
            <h3 className={`text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {s.value} <span className={`text-xs font-medium ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>dịch vụ</span>
            </h3>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className={`rounded-xl p-4 shadow-sm mb-6 border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm dịch vụ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap items-center">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                    activeCategory === cat
                      ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-[#1a2b4c] text-white')
                      : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                  }`}
                >
                  {cat === 'Tất cả' ? 'Tất cả' : categoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* View Toggle */}
          <div className={`flex items-center p-1.5 rounded-2xl transition-all shrink-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-indigo-700 shadow-md') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              <ListIcon size={16} />
              Danh sách
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'grid' ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white text-indigo-700 shadow-md') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              <LayoutGrid size={16} />
              Dạng thẻ
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className={`animate-spin ${isDark ? 'text-indigo-400' : 'text-[#1a2b4c]'}`} />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className={`rounded-xl p-12 shadow-sm text-center border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
          <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <Tag size={28} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-700'}`}>Chưa có dịch vụ nào</h3>
          <p className={`mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Thêm dịch vụ đầu tiên để bắt đầu nhận đặt lịch</p>
          <button
            onClick={openAddModal}
            className={`inline-flex items-center gap-2 px-5 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all ${isDark ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-[#1a2b4c]'}`}
          >
            <Plus size={18} />
            Thêm dịch vụ
          </button>
        </div>
      )}

      {/* Service Grid/List */}
      {!loading && filtered.length > 0 && (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
          {filtered.map((service) => (
            viewMode === 'grid' ? (
              <div key={service.id} className={`rounded-xl overflow-hidden hover:-translate-y-1 transition duration-300 flex flex-col group border ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/5 hover:border-indigo-500/30' : 'bg-white shadow-sm hover:shadow-md border-slate-100'}`}>
                {/* Image */}
                <div className={`relative h-48 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {service.imageUrl ? (
                    <img
                      src={service.imageUrl}
                      alt={service.serviceName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center transition-colors ${isDark ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-100/80 group-hover:bg-slate-200/50'}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm mb-2 ${isDark ? 'bg-slate-700 text-slate-500' : 'bg-white text-slate-300'}`}>
                        <Camera size={24} />
                      </div>
                      <span className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Chưa có ảnh</span>
                    </div>
                  )}
                  {/* Active badge */}
                  <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                    service.active 
                      ? (isDark ? 'bg-slate-900/80 text-green-400 border border-green-500/20' : 'bg-white/90 text-green-600') 
                      : (isDark ? 'bg-slate-900/80 text-slate-400 border border-white/10' : 'bg-white/90 text-slate-500')
                  }`}>
                    {service.active ? 'Đang hoạt động' : 'Tạm dừng'}
                  </div>
                  {/* Category badge */}
                  <div className={`absolute top-3 right-3 px-2.5 py-1 text-white rounded-full text-xs font-bold shadow-sm
                    ${service.category === 'GROOMING' ? 'bg-pink-500' : service.category === 'CLINIC' ? 'bg-emerald-500' : 'bg-indigo-500'}
                  `}>
                    {categoryLabel(service.category)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className={`font-bold text-lg mb-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{service.serviceName}</h3>
                  <p className={`text-sm mb-4 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{service.description || 'Chưa có mô tả cho dịch vụ này.'}</p>

                  <div className="flex flex-wrap items-center gap-3 mb-5 mt-auto">
                    <div className="flex items-center text-sm">
                      <span className={`font-extrabold px-2.5 py-1 rounded-lg ${isDark ? 'text-indigo-300 bg-indigo-500/10' : 'text-[#1a2b4c] bg-[#1a2b4c]/5'}`}>
                        {service.price.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-lg ${isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      <Clock size={14} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                      <span>{service.durationMinutes} phút</span>
                    </div>
                    {service.category === 'BOARDING' && service.cameraEnabled && (
                      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isDark ? 'text-indigo-300 bg-indigo-500/10' : 'text-indigo-600 bg-indigo-50'}`}>
                        📷 {service.cameraTiers?.length ?? 0} loại camera
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    {/* Toggle status */}
                    <button
                      onClick={() => toggleServiceStatus(service)}
                      className={`flex items-center gap-1 text-sm font-semibold transition-colors ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-[#1a2b4c]'}`}
                      title={service.active ? 'Tạm dừng dịch vụ' : 'Kích hoạt dịch vụ'}
                    >
                      {service.active
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft size={22} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
                      }
                      {service.active ? 'Đang bật' : 'Đang tắt'}
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(service)}
                        className={`p-2 rounded-lg transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white' : 'bg-slate-100 hover:bg-[#1a2b4c] hover:text-white'}`}
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingService(service)}
                        className={`p-2 rounded-lg transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-red-500 hover:text-white' : 'bg-slate-100 hover:bg-red-500 hover:text-white'}`}
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key={service.id} className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-5 border transition hover:-translate-y-0.5 hover:shadow-md ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/5 hover:border-indigo-500/30' : 'bg-white shadow-sm hover:shadow-lg border-slate-100 hover:border-slate-300'}`}>
                {/* Thumbnail */}
                <div className={`shrink-0 w-full h-32 sm:w-20 sm:h-20 rounded-xl overflow-hidden relative ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {service.imageUrl ? (
                    <img src={service.imageUrl} alt={service.serviceName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={20} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
                    </div>
                  )}
                  {/* Category mini badge */}
                  <div className={`absolute bottom-0 left-0 right-0 text-center py-0.5 text-[8px] font-black uppercase text-white shadow-sm ${service.category === 'GROOMING' ? 'bg-pink-500' : service.category === 'CLINIC' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                    {categoryLabel(service.category)}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{service.serviceName}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${service.active ? (isDark ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-100 text-green-700') : (isDark ? 'bg-slate-800 text-slate-400 border border-white/10' : 'bg-slate-100 text-slate-500')}`}>
                      {service.active ? 'Hoạt động' : 'Tạm dừng'}
                    </span>
                  </div>
                  <p className={`text-xs line-clamp-1 mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{service.description || 'Chưa có mô tả cho dịch vụ này.'}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${isDark ? 'text-indigo-300 bg-indigo-500/10' : 'text-[#1a2b4c] bg-[#1a2b4c]/5'}`}>
                      {service.price.toLocaleString('vi-VN')}đ
                    </span>
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg ${isDark ? 'bg-slate-800/50 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                      <Clock size={12} /> {service.durationMinutes} phút
                    </span>
                    {service.category === 'BOARDING' && service.cameraEnabled && (
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg ${isDark ? 'text-indigo-300 bg-indigo-500/10' : 'text-indigo-600 bg-indigo-50'}`}>
                        📷 {service.cameraTiers?.length ?? 0} loại camera
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className={`flex items-center justify-between sm:justify-end gap-3 sm:pl-5 sm:border-l shrink-0 mt-4 sm:mt-0 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleServiceStatus(service)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-semibold transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-[#1a2b4c]'}`}
                    title={service.active ? 'Tạm dừng dịch vụ' : 'Kích hoạt dịch vụ'}
                  >
                    {service.active
                      ? <ToggleRight size={24} className="text-green-500" />
                      : <ToggleLeft size={24} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
                    }
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(service)}
                      className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-[#1a2b4c] hover:text-white'}`}
                      title="Chỉnh sửa"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeletingService(service)}
                      className={`p-2.5 rounded-xl transition-all ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-red-500 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white'}`}
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}
      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={`rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border ${isDark ? 'bg-[#0f172a] border-white/5' : 'bg-white border-slate-100'}`}>
            {/* Modal header */}
            <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {modalMode === 'add' ? 'Thêm dịch vụ mới' : 'Chỉnh sửa dịch vụ'}
              </h2>
              <button
                onClick={closeModal}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="p-6 space-y-5">

              {/* Image upload */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Hình ảnh dịch vụ</label>
                <div className={`relative w-full h-40 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed ${isDark ? 'bg-[#0b1121] border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={36} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={28} className="animate-spin text-white" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`absolute bottom-3 right-3 size-9 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-[#1a2b4c]'}`}
                    disabled={uploadingImage}
                  >
                    <Camera size={16} />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Service name */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Tên dịch vụ *</label>
                <input
                  type="text"
                  value={form.serviceName}
                  onChange={(e) => setForm((prev) => ({ ...prev, serviceName: e.target.value }))}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền tên dịch vụ.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  placeholder="Ví dụ: Tắm & sấy lông"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Danh mục *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Vui lòng chọn danh mục.')}
                  onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                >
                  <option value="GROOMING" className={isDark ? 'bg-slate-800 text-white' : ''}>Chăm sóc (Grooming)</option>
                  <option value="CLINIC" className={isDark ? 'bg-slate-800 text-white' : ''}>Khám bệnh (Clinic)</option>
                  <option value="BOARDING" className={isDark ? 'bg-slate-800 text-white' : ''}>Lưu trú (Boarding)</option>
                </select>
              </div>

              {/* Price & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Giá (đ) * <span className="font-normal text-slate-500">{form.category === 'BOARDING' ? '/ngày' : '/lần'}</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={form.price === 0 ? '' : form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền giá dịch vụ.')}
                    onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400'}`}
                    placeholder="150000"
                    required
                  />
                </div>
                <div>
                  {form.category === 'BOARDING' ? (
                    <>
                      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Số ngày tối thiểu *
                        <span className="ml-1 text-xs font-normal text-slate-500">(tự lưu thành phút)</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={form.durationDays === 0 ? '' : form.durationDays}
                        onChange={(e) => setForm((prev) => ({ ...prev, durationDays: Number(e.target.value) }))}
                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền số ngày tối thiểu.')}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400'}`}
                        placeholder="1"
                        required
                      />
                    </>
                  ) : (
                    <>
                      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Thời gian (phút) *</label>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={form.durationMinutes === 0 ? '' : form.durationMinutes}
                        onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền thời gian thực hiện.')}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400'}`}
                        placeholder="60"
                        required
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Mô tả ( Tối thiểu 30 từ )</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none resize-none transition-all ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400'}`}
                  placeholder="Mô tả chi tiết về dịch vụ..."
                />
              </div>

              {/* ── BOARDING: Room config ─────────────────────────────────── */}
              {form.category === 'BOARDING' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Kích thước chuồng <span className="font-normal text-xs text-slate-500">(ngăn cách bởi dấu phẩy nếu có nhiều lựa chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={form.cageSize}
                      onChange={(e) => setForm((prev) => ({ ...prev, cageSize: e.target.value }))}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400'}`}
                      placeholder="VD: Nhỏ, Vừa, Lớn"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Loại phòng <span className="font-normal text-xs text-slate-500">(ngăn cách bởi dấu phẩy nếu có nhiều lựa chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={form.roomType}
                      onChange={(e) => setForm((prev) => ({ ...prev, roomType: e.target.value }))}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400'}`}
                      placeholder="VD: Tiêu chuẩn, VIP"
                    />
                  </div>
                </div>
              )}

              {/* ── BOARDING: Camera config ─────────────────────────────────── */}
              {form.category === 'BOARDING' && (
                <div className={`border rounded-2xl overflow-hidden ${isDark ? 'border-indigo-500/30' : 'border-indigo-200'}`}>
                  {/* Header toggle */}
                  <div className={`flex items-center justify-between px-5 py-4 ${isDark ? 'bg-indigo-900/20' : 'bg-indigo-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                        <span className="text-xl">📷</span>
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>Camera giám sát</p>
                        <p className={`text-xs ${isDark ? 'text-indigo-400/80' : 'text-indigo-500'}`}>Chọn các loại camera shop hỗ trợ — User sẽ chọn 1 khi đặt lịch</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        cameraEnabled: !prev.cameraEnabled,
                        cameraTiers: !prev.cameraEnabled ? [] : prev.cameraTiers,
                      }))}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                        form.cameraEnabled 
                          ? (isDark ? 'bg-indigo-500' : 'bg-indigo-600') 
                          : (isDark ? 'bg-slate-700' : 'bg-slate-300')
                      }`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                        form.cameraEnabled ? 'left-7' : 'left-1'
                      }`} />
                    </button>
                  </div>

                  {/* Camera tier multi-select — only when enabled */}
                  {form.cameraEnabled && (
                    <div className={`p-5 space-y-4 ${isDark ? 'bg-slate-800/30' : 'bg-white'}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                        Chọn loại camera shop hỗ trợ <span className={`font-normal ${isDark ? 'text-indigo-500/80' : 'text-indigo-400'}`}>(có thể chọn nhiều)</span>
                      </p>

                      <div className="flex flex-col gap-3">
                        {CAMERA_TIERS.map((tier) => {
                          const isChecked = form.cameraTiers.includes(tier.id);
                          const customLabel = form.cameraTierLabels[tier.id] ?? '';
                          const customPrice = form.cameraTierPrices[tier.id] ?? tier.defaultPrice;
                          return (
                            <div key={tier.id} className={`rounded-xl border-2 overflow-hidden transition-all ${
                              isChecked 
                                ? (isDark ? 'border-indigo-500' : 'border-indigo-500') 
                                : (isDark ? 'border-slate-700' : 'border-slate-200')
                            }`}>
                              {/* Tier header — click to toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    cameraTiers: isChecked
                                      ? prev.cameraTiers.filter(t => t !== tier.id)
                                      : [...prev.cameraTiers, tier.id],
                                  }));
                                }}
                                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                                  isChecked 
                                    ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50') 
                                    : (isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-white hover:bg-slate-50')
                                }`}
                              >
                                {/* Checkbox */}
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                  isChecked 
                                    ? (isDark ? 'bg-indigo-500 border-indigo-500' : 'bg-indigo-500 border-indigo-500') 
                                    : (isDark ? 'border-slate-600' : 'border-slate-300')
                                }`}>
                                  {isChecked && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                                  isChecked 
                                    ? (isDark ? 'bg-indigo-500 text-white' : 'bg-indigo-500 text-white') 
                                    : (isDark ? 'bg-slate-700' : 'bg-slate-100')
                                }`}>
                                  {tier.icon}
                                </div>
                                {/* Default info */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold ${isChecked ? (isDark ? 'text-indigo-300' : 'text-indigo-900') : (isDark ? 'text-slate-300' : 'text-slate-700')}`}>
                                    {tier.label}
                                  </p>
                                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{tier.desc}</p>
                                </div>
                                {/* Default price hint */}
                                <span className={`text-xs shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  mặc định: {tier.defaultPrice === 0 ? 'Miễn phí' : `+${tier.defaultPrice.toLocaleString('vi-VN')}đ`}
                                </span>
                              </button>

                              {/* Custom label & price inputs — only when tier is selected */}
                              {isChecked && (
                                <div className={`px-4 pb-4 pt-2 border-t grid grid-cols-2 gap-3 ${isDark ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-indigo-50/60 border-indigo-100'}`}>
                                  <div>
                                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                      Tên hiển thị <span className={`font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>(tuỳ chọn)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={customLabel}
                                      onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        cameraTierLabels: { ...prev.cameraTierLabels, [tier.id]: e.target.value },
                                      }))}
                                      placeholder={tier.label}
                                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 outline-none ${isDark ? 'bg-[#0b1121] border-indigo-500/30 text-white focus:ring-indigo-500 placeholder-slate-500' : 'bg-white border-indigo-200 focus:ring-indigo-400'}`}
                                    />
                                  </div>
                                  <div>
                                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                      Giá thêm (đ/ngày)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      step={1000}
                                      value={customPrice}
                                      onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        cameraTierPrices: { ...prev.cameraTierPrices, [tier.id]: Number(e.target.value) },
                                      }))}
                                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 outline-none ${isDark ? 'bg-[#0b1121] border-indigo-500/30 text-white focus:ring-indigo-500' : 'bg-white border-indigo-200 focus:ring-indigo-400'}`}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Validation hint */}
                      {form.cameraTiers.length === 0 && (
                        <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                          <span>⚠️</span> Vui lòng chọn ít nhất 1 loại camera
                        </p>
                      )}

                      {/* Camera description */}
                      <div>
                        <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Mô tả camera <span className={`font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>(hiển thị riêng trong phần camera, không phải mô tả chung)</span>
                        </label>
                        <textarea
                          value={form.cameraDescription}
                          onChange={(e) => setForm((prev) => ({ ...prev, cameraDescription: e.target.value }))}
                          rows={3}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none text-sm resize-none ${isDark ? 'bg-[#0b1121] border-white/10 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 focus:ring-indigo-400 focus:border-indigo-400 placeholder-slate-400'}`}
                          placeholder="Ví dụ: Camera góc rộng, xem được toàn bộ phòng, lưu trữ 24h..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active toggle (edit mode only) */}
              {modalMode === 'edit' && (
                <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Trạng thái dịch vụ</p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {form.active ? 'Dịch vụ đang hoạt động' : 'Dịch vụ đang tạm dừng'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                    className="transition-colors"
                  >
                    {form.active
                      ? <ToggleRight size={36} className="text-green-500" />
                      : <ToggleLeft size={36} className={isDark ? 'text-slate-600' : 'text-slate-400'} />
                    }
                  </button>
                </div>
              )}

              {/* Footer buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`flex-1 px-4 py-3 border rounded-xl font-semibold transition-all ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-60 ${isDark ? 'bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-[#1a2b4c]'}`}
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {modalMode === 'add' ? 'Thêm dịch vụ' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className={`rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center border ${isDark ? 'admin-glass-card bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-500'}`}>
              <Trash2 size={32} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Xóa dịch vụ</h3>
            <p className={`mb-6 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Bạn có chắc chắn muốn xóa dịch vụ <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>"{deletingService.serviceName}"</span> không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingService(null)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className={`flex-1 py-3 text-white rounded-xl font-semibold transition-colors ${isDark ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20' : 'bg-red-500 hover:bg-red-600'}`}
              >
                Xóa dịch vụ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
