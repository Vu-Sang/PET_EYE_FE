import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown, ChevronUp, Sparkles, TrendingUp, Store, Users,
  Bell, MessageCircle, AlertTriangle, BarChart2, RefreshCw, Trash2,
  Shield, Clock
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { useAIChat } from '../../hooks/useAIChat';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderInline(text: string, isDark: boolean): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i} className="italic">{p.slice(1, -1)}</em>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className={`px-1.5 py-0.5 rounded text-xs font-mono border ${isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{p.slice(1, -1)}</code>;
    return p;
  });
}

function RichText({ text, isDark }: { text: string; isDark: boolean }) {
  const lines = text.split('\n');
  return (
    <div className={`space-y-1.5 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        if (line.startsWith('### ')) return <p key={i} className={`font-bold text-sm mt-3 mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{line.slice(4)}</p>;
        if (line.startsWith('## ')) return (
          <div key={i} className={`flex items-center gap-2 mt-4 mb-2 pb-2 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <div className={`w-1 h-5 rounded-full ${isDark ? 'bg-blue-400' : 'bg-blue-500'}`} />
            <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{line.slice(3)}</p>
          </div>
        );
        if (line.startsWith('# ')) return <p key={i} className={`font-bold text-lg mt-4 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{line.slice(2)}</p>;
        if (line.match(/^[-•*] /)) return (
          <div key={i} className="flex items-start gap-2.5 py-0.5">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isDark ? 'bg-blue-400' : 'bg-blue-400'}`} />
            <span className="flex-1">{renderInline(line.slice(2), isDark)}</span>
          </div>
        );
        if (line.match(/^\d+\. /)) return (
          <div key={i} className="flex items-start gap-2.5 py-0.5">
            <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{line.match(/^\d+/)?.[0]}</span>
            <span className="flex-1">{renderInline(line.replace(/^\d+\. /, ''), isDark)}</span>
          </div>
        );
        if (line.startsWith('> ')) return (
          <div key={i} className={`border-l-4 pl-3 py-1.5 rounded-r-xl text-xs italic my-1 ${isDark ? 'border-amber-500/50 bg-amber-500/10 text-amber-300' : 'border-amber-400 bg-amber-50 text-amber-800'}`}>{line.slice(2)}</div>
        );
        if (line.startsWith('---')) return <hr key={i} className={`my-2 ${isDark ? 'border-white/10' : 'border-slate-100'}`} />;
        return <p key={i} className="leading-relaxed">{renderInline(line, isDark)}</p>;
      })}
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────
const getQuickActions = (isDark: boolean) => [
  { icon: '📊', label: 'Tổng quan hệ thống', color: isDark ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', prompt: 'Phân tích tổng quan hệ thống PetEye: doanh thu, người dùng, shop, booking. Nhận xét xu hướng và đề xuất cải thiện.' },
  { icon: '🏪', label: 'Phân tích Shop', color: isDark ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', prompt: 'Phân tích tình trạng các shop: tổng số, đã duyệt, chờ duyệt, shop nào cần chú ý. Đề xuất chính sách quản lý shop.' },
  { icon: '⏳', label: 'Shop chờ duyệt', color: isDark ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', prompt: 'Liệt kê và phân tích các shop đang chờ duyệt. Tiêu chí nào cần kiểm tra? Đề xuất quy trình duyệt nhanh hơn.' },
  { icon: '👥', label: 'Phân tích Member', color: isDark ? 'bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', prompt: 'Phân tích người dùng: tổng số, phân loại theo role, tăng trưởng. Đề xuất chiến lược giữ chân và thu hút user mới.' },
  { icon: '💬', label: 'Tình trạng tin nhắn', color: isDark ? 'bg-teal-500/10 text-teal-300 border-teal-500/20 hover:bg-teal-500/20' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100', prompt: 'Phân tích tin nhắn chưa đọc và tình trạng hỗ trợ khách hàng. Đề xuất cải thiện thời gian phản hồi.' },
  { icon: '⚠️', label: 'Rủi ro & cảnh báo', color: isDark ? 'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', prompt: 'Có rủi ro gì trong hệ thống? Shop vi phạm, user bất thường, doanh thu giảm, tin nhắn tồn đọng? Đề xuất xử lý ngay.' },
  { icon: '📋', label: 'Chính sách đề xuất', color: isDark ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', prompt: 'Dựa trên dữ liệu thực tế, đề xuất các chính sách mới cho nền tảng PetEye: chính sách shop, user, thanh toán, chất lượng dịch vụ.' },
  { icon: '📈', label: 'Chiến lược tăng trưởng', color: isDark ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100', prompt: 'Đề xuất 3-5 chiến lược cụ thể để tăng trưởng nền tảng PetEye trong quý tới: thu hút shop mới, tăng user, tăng booking.' },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, isDark }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string; isDark: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border flex items-start gap-3 ${color}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 truncate">{label}</p>
        <p className="text-xl font-bold leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] opacity-60 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const WELCOME_MSG = `# Xin chào! Tôi là PetEye Admin AI 🛡️\n\nTôi phân tích dữ liệu **toàn hệ thống** để hỗ trợ quản trị:\n• **Dashboard** — tổng quan doanh thu, booking, tăng trưởng\n• **Shop** — phân tích, duyệt, chính sách quản lý\n• **Member** — thống kê user, phân loại, xu hướng\n• **Thông báo** — hiệu quả, tỷ lệ đọc, đề xuất nội dung\n• **Tin nhắn** — tình trạng hỗ trợ, thời gian phản hồi\n• **Rủi ro & Chính sách** — cảnh báo và đề xuất hành động\n\nChọn gợi ý bên dưới hoặc hỏi trực tiếp!`;

export default function AdminAIAssistant() {
  const { isDark } = useTheme();
  const { messages, isLoading, sendMessage, clearHistory } = useAIChat({
    agentType: 'ADMIN_ASSISTANT',
    welcomeMessage: WELCOME_MSG,
  });

  const [input, setInput] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Stats for display
  const { data: stats, refetch: refetchStats } = useQuery({ queryKey: ['admin-dashboard-ai'], queryFn: () => adminService.getDashboard() });
  const { data: shops = [], refetch: refetchShops } = useQuery({ queryKey: ['admin-shops-ai'], queryFn: adminService.getAllShops });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users-ai'], queryFn: adminService.getAllUsers });
  const { data: notifications } = useQuery({ queryKey: ['admin-notifs-ai'], queryFn: () => adminService.getNotifications(0) });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const pendingCount = shops.filter(s => !s.isVerified).length;
  const quickActions = getQuickActions(isDark);

  return (
    <div className={`flex flex-col h-[calc(100vh-80px)] rounded-3xl m-4 overflow-hidden shadow-xl border ${isDark ? 'admin-glass-card border-white/5' : 'bg-[#f8fafc] border-slate-100'}`}>
      {/* Header */}
      <div className={`px-6 py-4 flex items-center justify-between shrink-0 border-b ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-100'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg glow-blue">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className={`text-lg font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>Admin AI Assistant</h1>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Phân tích & quản trị hệ thống PetEye</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!stats && (
            <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
              <Clock size={11} /> Đang tải dữ liệu...
            </span>
          )}
          <button onClick={() => { refetchStats(); refetchShops(); }} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-blue-400' : 'hover:bg-slate-100 text-slate-500 hover:text-blue-600'}`} title="Làm mới dữ liệu">
            <RefreshCw size={16} />
          </button>
          <button onClick={clearHistory} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-500 hover:text-red-500'}`} title="Xóa lịch sử">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className={`px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0 border-b ${isDark ? 'bg-slate-900/30 border-white/5' : 'bg-white border-slate-100'}`}>
        <StatCard isDark={isDark} icon={<TrendingUp size={16} className={isDark ? 'text-blue-400' : 'text-blue-600'} />} label="Doanh thu" value={stats ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact', maximumFractionDigits: 1 }).format(stats.totalRevenue) : '—'} sub="tổng tích lũy" color={isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-900'} />
        <StatCard isDark={isDark} icon={<Users size={16} className={isDark ? 'text-purple-400' : 'text-purple-600'} />} label="Người dùng" value={stats?.totalUsers?.toLocaleString() ?? '—'} sub={`${users.filter(u => u.roles?.[0]?.name === 'USER').length} khách hàng`} color={isDark ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-purple-50 border-purple-100 text-purple-900'} />
        <StatCard isDark={isDark} icon={<Store size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />} label="Shop" value={stats?.totalShops?.toString() ?? '—'} sub={`${pendingCount} chờ duyệt`} color={isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-900'} />
        <StatCard isDark={isDark} icon={<BarChart2 size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />} label="Booking" value={stats?.totalBookings?.toLocaleString() ?? '—'} sub="tổng đặt lịch" color={isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-100 text-emerald-900'} />
        <StatCard isDark={isDark} icon={<Bell size={16} className={isDark ? 'text-amber-400' : 'text-amber-600'} />} label="Thông báo" value={(notifications?.content?.length ?? 0).toString()} sub={`${notifications?.totalElements ?? 0} tổng`} color={isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-100 text-amber-900'} />
        <StatCard isDark={isDark} icon={<MessageCircle size={16} className={isDark ? 'text-red-400' : 'text-red-500'} />} label="Tin nhắn" value={stats?.unreadMessages?.toString() ?? '—'} sub="chưa đọc" color={(stats?.unreadMessages ?? 0) > 0 ? (isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-900') : (isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-700')} />
      </div>

      {/* Quick actions */}
      <div className={`px-6 pt-3 pb-2 shrink-0 border-b ${isDark ? 'bg-slate-900/30 border-white/5' : 'bg-white border-slate-100'}`}>
        <button onClick={() => setShowQuickActions(v => !v)} className={`flex items-center gap-1.5 text-xs font-bold transition-colors mb-2 ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}>
          {showQuickActions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Gợi ý nhanh
        </button>
        {showQuickActions && (
          <div className="flex flex-wrap gap-2 pb-1">
            {quickActions.map(a => (
              <button key={a.label} onClick={() => handleSend(a.prompt)} disabled={isLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 ${a.color}`}>
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 admin-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Shield size={14} className="text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm glow-blue' : (isDark ? 'bg-slate-800/80 border border-white/10 rounded-tl-sm' : 'bg-white border border-slate-100 rounded-tl-sm')}`}>
              {msg.isLoading ? (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Đang phân tích...</span>
                </div>
              ) : msg.role === 'user' ? (
                <p className="text-sm leading-relaxed text-white">{msg.content}</p>
              ) : (
                <RichText text={msg.content} isDark={isDark} />
              )}
              <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-blue-200 text-right' : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {msg.role === 'user' && (
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <Shield size={14} className={isDark ? 'text-slate-400' : 'text-slate-600'} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`px-6 py-4 border-t shrink-0 ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-100'}`}>
        {pendingCount > 0 && (
          <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <AlertTriangle size={13} className="shrink-0" />
            <span><strong>{pendingCount} shop</strong> đang chờ duyệt.</span>
            <Link to="/admin/shops" className={`ml-auto font-bold underline ${isDark ? 'hover:text-amber-300' : 'hover:text-amber-900'}`}>Xem ngay →</Link>
          </div>
        )}
        <div className="flex gap-3 items-end">
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Hỏi về hệ thống, shop, member, thông báo, tin nhắn..."
            rows={1} disabled={isLoading}
            className={`flex-1 resize-none rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-60 max-h-32 admin-scrollbar ${isDark ? 'admin-glass-input' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400'}`}
            style={{ minHeight: '44px' }}
            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 128) + 'px'; }} />
          <button onClick={() => handleSend()} disabled={isLoading || !input.trim()}
            className={`w-11 h-11 rounded-2xl text-white flex items-center justify-center transition-all shadow-sm shrink-0 ${isLoading || !input.trim() ? (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400') : 'bg-blue-600 hover:bg-blue-500 glow-blue'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className={`text-[10px] mt-2 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Enter để gửi · Shift+Enter xuống dòng</p>
      </div>
    </div>
  );
}
