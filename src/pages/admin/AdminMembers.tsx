import React, { useState } from 'react';
import { Search, User, Mail, Phone, Shield, Eye, X, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, AdminUserResponse } from '../../services/admin.service';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

const ROLE_LABEL: Record<string, string> = {
  USER: 'Khách hàng', SHOP_OWNER: 'Chủ shop', STAFF: 'Nhân viên', ADMIN: 'Admin',
};

export default function AdminMembers() {
  const { isDark } = useTheme();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Tất cả');
  const [detail, setDetail] = useState<AdminUserResponse | null>(null);
  const [page, setPage] = useState(0);

  const { data: pagedData, isLoading } = useQuery({
    queryKey: ['admin-members', page],
    queryFn: () => adminService.getUsersPaged(page),
    staleTime: 0,
  });

  const members = pagedData?.content ?? [];
  const totalPages = pagedData?.totalPages ?? 1;
  const totalElements = pagedData?.totalElements ?? 0;

  const deactivateMutation = useMutation({
    mutationFn: adminService.deactivateUser,
    onSuccess: (_, userId) => {
      toast.success('Đã khóa tài khoản');
      qc.invalidateQueries({ queryKey: ['admin-members'] });
    },
    onError: () => toast.error('Khóa thất bại'),
  });

  const activateMutation = useMutation({
    mutationFn: adminService.activateUser,
    onSuccess: (_, userId) => {
      toast.success('Đã mở khóa tài khoản');
      qc.invalidateQueries({ queryKey: ['admin-members'] });
    },
    onError: () => toast.error('Mở khóa thất bại'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => { toast.success('Đã xóa tài khoản'); qc.invalidateQueries({ queryKey: ['admin-members'] }); setDetail(null); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const filtered = members.filter(m => {
    const matchSearch = m.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const role = m.roles?.[0]?.name ?? 'USER';
    const matchRole = roleFilter === 'Tất cả' ? true : role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = isDark ? {
      USER: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
      SHOP_OWNER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      STAFF: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      ADMIN: 'bg-red-500/10 text-red-400 border-red-500/20',
    } : {
      USER: 'bg-slate-100 text-slate-600',
      SHOP_OWNER: 'bg-blue-100 text-blue-700',
      STAFF: 'bg-indigo-100 text-indigo-700',
      ADMIN: 'bg-red-100 text-red-700',
    };
    return colors[role] ?? colors.USER;
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Quản lý Member</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Danh sách tất cả người dùng</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Tìm theo tên, email..."
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all ${isDark ? 'admin-glass-input' : 'border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'}`} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Tất cả', 'USER', 'SHOP_OWNER', 'STAFF', 'ADMIN'].map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(0); }}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === r
                  ? (isDark ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 glow-blue' : 'bg-blue-600 text-white shadow-sm')
                  : (isDark ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')
              }`}>
              {r === 'Tất cả' ? 'Tất cả' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        <div className={`rounded-xl px-4 py-2.5 text-sm font-semibold shrink-0 ${isDark ? 'admin-glass-card text-slate-300' : 'bg-white border border-slate-100 text-slate-600 shadow-sm'}`}>
          {totalElements} thành viên
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl overflow-hidden ${isDark ? 'admin-glass-card' : 'bg-white border border-slate-100 shadow-sm'}`}>
        {isLoading ? (
          <div className={`flex items-center justify-center py-16 text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <User size={40} className={`mb-3 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
            <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Không tìm thấy thành viên nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'bg-white/[0.02] text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                  <th className="px-6 py-3 text-left">Thành viên</th>
                  <th className="px-6 py-3 text-left hidden md:table-cell">Email</th>
                  <th className="px-6 py-3 text-left hidden lg:table-cell">Số điện thoại</th>
                  <th className="px-6 py-3 text-left">Vai trò</th>
                  <th className="px-6 py-3 text-left">Hạng</th>
                  <th className="px-6 py-3 text-left">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-50'}`}>
                {filtered.map(m => {
                  const role = m.roles?.[0]?.name ?? 'USER';
                  const isActive = m.isActive !== false;
                  return (
                    <tr key={m.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {m.avatar ? (
                            <img src={m.avatar} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                              {(m.fullName || m.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{m.fullName || '—'}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 hidden md:table-cell ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{m.email}</td>
                      <td className={`px-6 py-4 hidden lg:table-cell ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{m.phone || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${roleBadge(role)}`}>
                          {ROLE_LABEL[role] ?? role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {m.currentTier ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-100 text-purple-700'}`}>
                            {m.currentTier.name}
                          </span>
                        ) : (
                          <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          isActive
                            ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-green-100 text-green-700')
                            : (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-100 text-red-700')
                        }`}>
                          {isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isActive ? (
                            <button onClick={() => deactivateMutation.mutate(m.id)} disabled={deactivateMutation.isPending}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-red-500/10 text-red-400/60 hover:text-red-400' : 'hover:bg-red-50 text-red-400 hover:text-red-600'}`}>
                              <Ban size={15} />
                            </button>
                          ) : (
                            <button onClick={() => activateMutation.mutate(m.id)} disabled={activateMutation.isPending}
                              className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'hover:bg-emerald-500/10 text-emerald-400/60 hover:text-emerald-400' : 'hover:bg-green-50 text-green-400 hover:text-green-600'}`}>
                              <CheckCircle size={15} />
                            </button>
                          )}
                          <button onClick={() => setDetail(m)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-slate-500 hover:text-slate-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                            <Eye size={15} />
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
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className={`rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ${isDark ? 'admin-glass-card bg-slate-900/95' : 'bg-white'}`}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Chi tiết thành viên</h3>
              <button onClick={() => setDetail(null)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/5 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                {detail.avatar ? (
                  <img src={detail.avatar} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                    {(detail.fullName || detail.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{detail.fullName || '—'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${roleBadge(detail.roles?.[0]?.name ?? 'USER')}`}>
                      {ROLE_LABEL[detail.roles?.[0]?.name ?? 'USER']}
                    </span>
                    {detail.currentTier && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-100 text-purple-700'}`}>
                        Hạng {detail.currentTier.name}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      detail.isActive !== false
                        ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-green-100 text-green-700')
                        : (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-100 text-red-700')
                    }`}>
                      {detail.isActive !== false ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </div>
                </div>
              </div>
              {[
                { icon: Mail, label: detail.email },
                { icon: Phone, label: detail.phone || 'Chưa cập nhật' },
                { icon: Shield, label: `ID: ${detail.id}` },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className={`flex items-center gap-3 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Icon size={15} className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                  <span>{label}</span>
                </div>
              ))}
              {detail.address && (
                <p className={`text-sm rounded-xl p-3 ${isDark ? 'text-slate-400 bg-white/5' : 'text-slate-500 bg-slate-50'}`}>{detail.address}</p>
              )}
              <div className="flex gap-3 pt-2">
                {detail.isActive !== false ? (
                  <button onClick={() => {
                    deactivateMutation.mutate(detail.id);
                    setDetail(prev => prev ? { ...prev, isActive: false } : null);
                  }}
                    className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-500 transition-colors flex items-center justify-center gap-2 text-sm glow-rose">
                    <Ban size={15} /> Khóa tài khoản
                  </button>
                ) : (
                  <button onClick={() => {
                    activateMutation.mutate(detail.id);
                    setDetail(prev => prev ? { ...prev, isActive: true } : null);
                  }}
                    className="flex-1 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 text-sm glow-emerald">
                    <CheckCircle size={15} /> Mở khóa
                  </button>
                )}
                <button onClick={() => { if (confirm('Xóa vĩnh viễn tài khoản này?')) deleteMutation.mutate(detail.id); }}
                  className={`flex-1 py-3 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-600 text-white hover:bg-slate-700'}`}>
                  <Trash2 size={15} /> Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
