import React, { useState } from 'react';
import {
  Search, CheckCircle, Clock, ChevronRight, Users,
  Store, Eye, X, Phone, Mail, MapPin, Shield, XCircle, FileText, Ban
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, AdminShopResponse, AdminStaffResponse } from '../../services/admin.service';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

type ShopStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_FILTER = ['Tất cả', 'Đã duyệt', 'Chờ duyệt', 'Từ chối'];

function getShopStatus(s: AdminShopResponse): ShopStatus {
  if (s.status) return s.status;
  return s.isVerified ? 'APPROVED' : 'PENDING';
}

function StatusBadge({ status, isDark }: { status: ShopStatus; isDark: boolean }) {
  const styles: Record<string, string> = isDark ? {
    APPROVED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    REJECTED: 'bg-red-500/10 text-red-400 border border-red-500/20',
    PENDING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  } : {
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
  };
  const labels: Record<string, { icon: React.ReactNode; text: string }> = {
    APPROVED: { icon: <CheckCircle size={11} />, text: 'Đã duyệt' },
    REJECTED: { icon: <Ban size={11} />, text: 'Từ chối' },
    PENDING: { icon: <Clock size={11} />, text: 'Chờ duyệt' },
  };
  const { icon, text } = labels[status] ?? labels.PENDING;
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status]}`}>
      {icon} {text}
    </span>
  );
}

export default function AdminShops() {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [expandedShop, setExpandedShop] = useState<number | null>(null);
  const [detailShop, setDetailShop] = useState<AdminShopResponse | null>(null);
  const [staffMap, setStaffMap] = useState<Record<number, AdminStaffResponse[]>>({});
  const [loadingStaff, setLoadingStaff] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const { data: pagedData, isLoading } = useQuery({
    queryKey: ['admin-shops', page],
    queryFn: () => adminService.getShopsPaged(page),
    staleTime: 0,
  });

  const shops = pagedData?.content ?? [];
  const totalPages = pagedData?.totalPages ?? 1;

  const approveMutation = useMutation({
    mutationFn: adminService.approveShop,
    onSuccess: () => {
      toast.success('Đã phê duyệt shop');
      qc.invalidateQueries({ queryKey: ['admin-shops'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: () => toast.error('Phê duyệt thất bại'),
  });

  const rejectMutation = useMutation({
    mutationFn: adminService.rejectShop,
    onSuccess: () => {
      toast.success('Đã từ chối shop');
      qc.invalidateQueries({ queryKey: ['admin-shops'] });
    },
    onError: () => toast.error('Từ chối thất bại'),
  });

  const filtered = shops.filter(s => {
    const matchSearch = s.shopName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const st = getShopStatus(s);
    const matchStatus = statusFilter === 'Tất cả' ? true
      : statusFilter === 'Đã duyệt' ? st === 'APPROVED'
      : statusFilter === 'Từ chối' ? st === 'REJECTED'
      : st === 'PENDING';
    return matchSearch && matchStatus;
  });

  const toggleExpand = async (shopId: number) => {
    if (expandedShop === shopId) { setExpandedShop(null); return; }
    setExpandedShop(shopId);
    if (!staffMap[shopId]) {
      setLoadingStaff(shopId);
      try {
        const staff = await adminService.getShopStaff(shopId);
        setStaffMap(prev => ({ ...prev, [shopId]: staff }));
      } catch {
        setStaffMap(prev => ({ ...prev, [shopId]: [] }));
      } finally {
        setLoadingStaff(null);
      }
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Quản lý Shop</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Xem, duyệt và quản lý tất cả cửa hàng</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm theo tên, email..."
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all ${isDark ? 'admin-glass-input' : 'border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'}`} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTER.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === f
                  ? (isDark ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 glow-blue' : 'bg-blue-600 text-white shadow-sm')
                  : (isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tổng shop', value: shops.length },
          { label: 'Đã duyệt', value: shops.filter(s => getShopStatus(s) === 'APPROVED').length },
          { label: 'Chờ duyệt', value: shops.filter(s => getShopStatus(s) === 'PENDING').length },
          { label: 'Từ chối', value: shops.filter(s => getShopStatus(s) === 'REJECTED').length },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 text-center ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm'}`}>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
            <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm'}`}>
        {isLoading ? (
          <div className={`flex items-center justify-center py-16 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className={`flex items-center justify-center py-16 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Không có shop nào</div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-50'}`}>
            {filtered.map(shop => {
              const status = getShopStatus(shop);
              return (
                <div key={shop.id}>
                  <div className={`flex items-center gap-4 px-6 py-4 transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDark ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
                      <Store size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{shop.shopName}</p>
                        <StatusBadge status={status} isDark={isDark} />
                      </div>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{shop.shopType} • {shop.city}</p>
                    </div>
                    <div className={`hidden md:block text-xs min-w-[140px] truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{shop.email}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      {status === 'PENDING' && (
                        <>
                          <button onClick={() => approveMutation.mutate(shop.id)} disabled={approveMutation.isPending}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-1 glow-emerald">
                            <CheckCircle size={12} /> Duyệt
                          </button>
                          <button onClick={() => rejectMutation.mutate(shop.id)} disabled={rejectMutation.isPending}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-1 glow-rose">
                            <XCircle size={12} /> Từ chối
                          </button>
                        </>
                      )}
                      <button onClick={() => setDetailShop(shop)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                        <Eye size={15} />
                      </button>
                      <button onClick={() => toggleExpand(shop.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                        <Users size={13} />
                        <span className="hidden sm:inline">Nhân viên</span>
                        <ChevronRight size={13} className={`transition-transform ${expandedShop === shop.id ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Staff expand */}
                  {expandedShop === shop.id && (
                    <div className={`px-6 py-4 border-t ${isDark ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Nhân viên của {shop.shopName}</p>
                      {loadingStaff === shop.id ? (
                        <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Đang tải...</p>
                      ) : (staffMap[shop.id] ?? []).length === 0 ? (
                        <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Chưa có nhân viên nào</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(staffMap[shop.id] ?? []).map(st => (
                            <div key={st.id} className={`rounded-xl p-3 flex items-center gap-3 ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                {st.fullName.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{st.fullName}</p>
                                <p className={`text-[11px] truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{st.role || st.specialization || 'Nhân viên'}</p>
                                {st.email && <p className={`text-[11px] truncate ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{st.email}</p>}
                              </div>
                              <span className={`shrink-0 w-2 h-2 rounded-full ${st.isActive ? 'bg-emerald-400' : (isDark ? 'bg-slate-600' : 'bg-slate-300')}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              ← Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i).filter(i => Math.abs(i - page) <= 2).map(i => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all ${
                  i === page
                    ? (isDark ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-blue-600 text-white')
                    : (isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Sau →
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${isDark ? 'admin-glass-card bg-slate-900/95' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                {detailShop.logoUrl ? (
                  <img src={detailShop.logoUrl} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
                    <Store size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                  </div>
                )}
                <div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{detailShop.shopName}</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ID: {detailShop.id}</p>
                </div>
              </div>
              <button onClick={() => setDetailShop(null)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/5 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5 admin-scrollbar">
              {/* Status + Type + Rating */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={getShopStatus(detailShop)} isDark={isDark} />
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-100 text-blue-700'}`}>{detailShop.shopType}</span>
                {detailShop.ratingAvg > 0 && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-yellow-100 text-yellow-700'}`}>⭐ {detailShop.ratingAvg.toFixed(1)}</span>
                )}
              </div>

              {/* Contact info */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Thông tin liên hệ</p>
                <div className={`rounded-xl p-4 space-y-2.5 ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-slate-50'}`}>
                  {[
                    { icon: Mail, label: 'Email', value: detailShop.email },
                    { icon: Phone, label: 'Điện thoại', value: detailShop.phone },
                    { icon: MapPin, label: 'Địa chỉ', value: `${detailShop.address}, ${detailShop.city}` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 text-sm">
                      <Icon size={14} className={`shrink-0 mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}: </span>
                        <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{value || '—'}</span>
                      </div>
                    </div>
                  ))}
                  {(detailShop.openTime || detailShop.closeTime) && (
                    <div className="flex items-start gap-3 text-sm">
                      <Clock size={14} className={`shrink-0 mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                      <div>
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Giờ mở cửa: </span>
                        <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {detailShop.openTime} - {detailShop.closeTime}
                          {detailShop.workingDays ? ` (${detailShop.workingDays})` : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Registration info */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Thông tin đăng ký</p>
                <div className={`rounded-xl p-4 space-y-2.5 ${isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-slate-50'}`}>
                  <div className="flex items-start gap-3 text-sm">
                    <FileText size={14} className={`shrink-0 mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <div>
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Số giấy phép: </span>
                      <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{detailShop.licenseNumber || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <Shield size={14} className={`shrink-0 mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <div>
                      <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>ID chủ sở hữu: </span>
                      <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{detailShop.ownerId}</span>
                    </div>
                  </div>
                  {detailShop.assignmentMode && (
                    <div className="flex items-start gap-3 text-sm">
                      <Users size={14} className={`shrink-0 mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                      <div>
                        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Chế độ phân công: </span>
                        <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{detailShop.assignmentMode}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {detailShop.description && (
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Mô tả</p>
                  <p className={`text-sm rounded-xl p-4 leading-relaxed ${isDark ? 'text-slate-400 bg-white/[0.02] border border-white/5' : 'text-slate-600 bg-slate-50'}`}>{detailShop.description}</p>
                </div>
              )}

              {/* License image */}
              {detailShop.licenseImageUrl && (
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ảnh giấy phép kinh doanh</p>
                  <a href={detailShop.licenseImageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={detailShop.licenseImageUrl} alt="Giấy phép" className="w-full rounded-xl object-cover max-h-56 hover:opacity-90 transition-opacity cursor-zoom-in" />
                  </a>
                </div>
              )}

              {/* Banner */}
              {detailShop.bannerUrl && (
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ảnh bìa</p>
                  <img src={detailShop.bannerUrl} alt="Banner" className="w-full rounded-xl object-cover max-h-40" />
                </div>
              )}
            </div>

            {/* Actions */}
            {getShopStatus(detailShop) === 'PENDING' && (
              <div className={`flex gap-3 px-6 py-4 border-t shrink-0 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                <button onClick={() => { approveMutation.mutate(detailShop.id); setDetailShop(null); }}
                  className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 text-sm glow-emerald">
                  <Shield size={15} /> Phê duyệt
                </button>
                <button onClick={() => { rejectMutation.mutate(detailShop.id); setDetailShop(null); }}
                  className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-500 transition-colors flex items-center justify-center gap-2 text-sm glow-rose">
                  <XCircle size={15} /> Từ chối
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
