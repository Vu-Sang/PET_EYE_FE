import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Ticket, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminService } from '../../services/admin.service';
import { useTheme } from '../../contexts/ThemeContext';

export default function AdminVouchers() {
  const { isDark } = useTheme();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<any>(null);
  
  // Feature toggle state
  const [isVoucherServiceEnabled, setIsVoucherServiceEnabled] = useState(true);

  const loadConfig = async () => {
    try {
      const enabled = await adminService.getVoucherServiceConfig();
      setIsVoucherServiceEnabled(enabled);
    } catch (error) {
      console.error('Failed to load voucher config', error);
    }
  };

  const toggleVoucherService = async () => {
    const newState = !isVoucherServiceEnabled;
    try {
      await adminService.setVoucherServiceConfig(newState);
      setIsVoucherServiceEnabled(newState);
      toast.success(newState ? 'Đã bật dịch vụ Voucher' : 'Đã tắt dịch vụ Voucher');
    } catch (error) {
      toast.error('Lỗi khi cập nhật trạng thái dịch vụ');
    }
  };

  const [formData, setFormData] = useState({
    code: '',
    targetTierName: 'Vàng',
    requiredSpending: 1000000,
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderValue: 0,
    issueQuantity: 1,
    validDays: 30
  });

  const loadVouchers = async () => {
    try {
      const data = await adminService.getAllVouchers();
      setVouchers(data);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách voucher');
    }
  };

  useEffect(() => { 
    loadVouchers(); 
    loadConfig();
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc muốn xóa cấu hình này?')) {
      try {
        await adminService.deleteVoucher(id);
        toast.success('Đã xóa');
        loadVouchers();
      } catch (error) {
        toast.error('Xóa thất bại');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code) { toast.error('Vui lòng nhập mã voucher'); return; }
    try {
      if (editingVoucher) {
        await adminService.updateVoucher(editingVoucher.id, formData);
        toast.success('Đã cập nhật cấu hình');
      } else {
        await adminService.createVoucher(formData);
        toast.success('Đã tạo cấu hình mới');
      }
      setIsModalOpen(false);
      setEditingVoucher(null);
      loadVouchers();
    } catch (error) {
      toast.error(editingVoucher ? 'Cập nhật thất bại' : 'Tạo thất bại');
    }
  };

  const openEditModal = (voucher: any = null) => {
    setEditingVoucher(voucher);
    if (voucher) {
      setFormData({
        code: voucher.code,
        targetTierName: voucher.targetTier?.name || 'Vàng',
        requiredSpending: voucher.targetTier?.requiredSpending || 1000000,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minOrderValue: voucher.minOrderValue || 0,
        issueQuantity: voucher.issueQuantity || 1,
        validDays: voucher.validDays || 30
      });
    } else {
      setFormData({ code: '', targetTierName: 'Vàng', requiredSpending: 1000000, discountType: 'PERCENTAGE', discountValue: 10, minOrderValue: 0, issueQuantity: 1, validDays: 30 });
    }
    setIsModalOpen(true);
  };

  const tierBadge = (name: string) => {
    const styles: Record<string, string> = isDark ? {
      'Vàng': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Kim Cương': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    } : {
      'Vàng': 'bg-amber-100 text-amber-700',
      'Kim Cương': 'bg-sky-100 text-sky-700',
    };
    return styles[name] ?? (isDark ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-slate-100 text-slate-700');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Ticket className={`w-7 h-7 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            Cấu Hình Voucher & Hạng
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Quản lý mức chi tiêu cần đạt để lên hạng và phần thưởng voucher tương ứng.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <span className={`text-sm font-bold ${isVoucherServiceEnabled ? 'text-green-600' : 'text-slate-400'}`}>
              Dịch vụ Voucher
            </span>
            <button
              onClick={toggleVoucherService}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isVoucherServiceEnabled ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isVoucherServiceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <button onClick={() => openEditModal()}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl font-semibold flex items-center gap-2 transition glow-blue">
            <Plus className="w-5 h-5" /> Tạo Cấu Hình Mới
          </button>
        </div>
      </div>

      {/* Voucher Service Status Banner */}
      {!isVoucherServiceEnabled && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl flex items-center gap-3">
          <span className="material-symbols-outlined">warning</span>
          <p className="text-sm font-semibold">Dịch vụ Voucher đang TẮT. Người dùng sẽ không thấy Hạng và Voucher.</p>
        </div>
      )}

      {/* Filter Bar */}

      <div className={`flex flex-col sm:flex-row gap-4 p-4 rounded-2xl ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input type="text" placeholder="Tìm theo mã voucher..."
            className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm font-medium transition-all ${isDark ? 'admin-glass-input' : 'bg-slate-50 border-none focus:ring-2 focus:ring-blue-500/20'}`}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button className={`px-5 py-3 rounded-xl font-semibold flex items-center gap-2 transition ${isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
          <Filter className="w-4 h-4" /> Lọc
        </button>
      </div>

      {/* Voucher Table */}
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-200/60 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/50 border-slate-200/60'}`}>
                <th className={`px-6 py-4 text-[11px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Hạng & Mốc Đạt</th>
                <th className={`px-6 py-4 text-[11px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Mã Voucher</th>
                <th className={`px-6 py-4 text-[11px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Giảm Giá</th>
                <th className={`px-6 py-4 text-[11px] uppercase tracking-widest font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Số Lượng</th>
                <th className={`px-6 py-4 text-[11px] uppercase tracking-widest font-bold text-right ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Thao Tác</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {vouchers.filter(v => v.code.toLowerCase().includes(searchTerm.toLowerCase())).map((v) => (
                <tr key={v.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/50'}`}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${tierBadge(v.targetTier?.name)}`}>
                        Hạng {v.targetTier?.name}
                      </span>
                      <span className={`text-sm font-semibold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Cần {v.targetTier?.requiredSpending?.toLocaleString() || 0}đ
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}>{v.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : `${v.discountValue.toLocaleString()}đ`}
                    </span>
                    {v.minOrderValue > 0 && <span className={`block text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Đơn tối thiểu: {v.minOrderValue.toLocaleString()}đ</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{v.issueQuantity} bản sao</span>
                    <span className={`block text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Hạn {v.validDays} ngày</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(v)} className={`p-2 rounded-xl transition ${isDark ? 'text-slate-500 hover:text-blue-400 hover:bg-blue-500/10' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(v.id)} className={`p-2 rounded-xl transition ${isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-6 py-10 text-center ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Chưa có cấu hình nào. Hãy tạo mới.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cấu Hình */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className={`rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden ${isDark ? 'admin-glass-card bg-slate-900/95' : 'bg-white border border-slate-100'}`}>
            <div className={`px-8 py-6 border-b flex justify-between items-center ${isDark ? 'border-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {editingVoucher ? 'Chỉnh Sửa Cấu Hình' : 'Tạo Cấu Hình Mới'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className={`p-2 rounded-full transition ${isDark ? 'text-slate-500 hover:bg-white/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className={`p-4 rounded-2xl ${isDark ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-blue-50/50 border border-blue-100'}`}>
                <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>1. Cấu hình Hạng (Tiêu chí đạt)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Hạng Áp Dụng</label>
                    <select value={formData.targetTierName} onChange={e => setFormData({...formData, targetTierName: e.target.value})}
                      className={`w-full rounded-xl px-4 py-3 font-semibold transition outline-none ${isDark ? 'admin-glass-input' : 'bg-white border border-slate-200 text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`}>
                      <option>Bạc</option><option>Vàng</option><option>Kim Cương</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Mức Chi Tiêu Cần Đạt (VND) *</label>
                    <input required type="number" min="0" value={formData.requiredSpending} onChange={e => setFormData({...formData, requiredSpending: Number(e.target.value)})}
                      className={`w-full rounded-xl px-4 py-3 font-semibold transition outline-none ${isDark ? 'admin-glass-input' : 'bg-white border border-slate-200 text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} placeholder="VD: 1000000" />
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl ${isDark ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-emerald-50/50 border border-emerald-100'}`}>
                <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>2. Phần thưởng Voucher</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Mã Voucher *</label>
                    <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className={`w-full rounded-xl px-4 py-3 font-bold uppercase transition outline-none ${isDark ? 'admin-glass-input' : 'bg-white border border-slate-200 text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'}`} placeholder="VD: GOLD2026" />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Loại Giảm Giá</label>
                    <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})}
                      className={`w-full rounded-xl px-4 py-3 font-semibold transition outline-none ${isDark ? 'admin-glass-input' : 'bg-slate-50 border border-slate-200 text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`}>
                      <option value="PERCENTAGE">Phần trăm (%)</option><option value="FIXED">Số tiền (VND)</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Giá Trị Giảm</label>
                    <input required type="number" min="1" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: Number(e.target.value)})}
                      className={`w-full rounded-xl px-4 py-3 font-semibold transition outline-none ${isDark ? 'admin-glass-input' : 'bg-slate-50 border border-slate-200 text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Đơn Tối Thiểu (VND)</label>
                    <input type="number" min="0" value={formData.minOrderValue} onChange={e => setFormData({...formData, minOrderValue: Number(e.target.value)})}
                      className={`w-full rounded-xl px-4 py-3 font-semibold transition outline-none ${isDark ? 'admin-glass-input' : 'bg-slate-50 border border-slate-200 text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Thời Hạn Sử Dụng (Ngày)</label>
                    <input required type="number" min="1" value={formData.validDays} onChange={e => setFormData({...formData, validDays: Number(e.target.value)})}
                      className={`w-full rounded-xl px-4 py-3 font-semibold transition outline-none ${isDark ? 'admin-glass-input' : 'bg-slate-50 border border-slate-200 text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} />
                  </div>
                  <div className="col-span-2">
                    <label className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      Số Lượng Cấp Phát
                    </label>
                    <p className={`text-sm mb-3 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Số lượng bản sao voucher sẽ tự động phát cho User vào thời điểm họ vừa đạt hạng này.</p>
                    <input required type="number" min="1" value={formData.issueQuantity} onChange={e => setFormData({...formData, issueQuantity: Number(e.target.value)})}
                      className={`w-full rounded-xl px-4 py-3 font-semibold transition outline-none ${isDark ? 'admin-glass-input' : 'bg-slate-50 border border-slate-200 text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'}`} />
                  </div>
                </div>
              </div>

              <div className={`pt-6 border-t flex justify-end gap-3 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className={`px-6 py-3 rounded-2xl font-semibold transition ${isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}>Hủy</button>
                <button type="submit" className="px-8 py-3 rounded-2xl text-white font-semibold bg-blue-600 hover:bg-blue-500 transition glow-blue">
                  {editingVoucher ? 'Lưu Thay Đổi' : 'Tạo Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
