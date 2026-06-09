import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown, ChevronUp, Sparkles, TrendingUp, Calendar,
  Users, Scissors, AlertTriangle, BarChart2, RefreshCw, Trash2
} from 'lucide-react';
import { shopService } from '../../services/shop.service';
import { bookingService } from '../../services/booking.service';
import { staffService } from '../../services/staff.service';
import { serviceService } from '../../services/service.service';
import { useAIChat } from '../../hooks/useAIChat';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderInline(text: string, isDark?: boolean): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i} className={`italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{p.slice(1, -1)}</em>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className={`px-1.5 py-0.5 rounded text-xs font-mono border ${isDark ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>{p.slice(1, -1)}</code>;
    return p;
  });
}

function RichText({ text, isDark }: { text: string; isDark?: boolean }) {
  const lines = text.split('\n');
  return (
    <div className={`space-y-1.5 text-sm leading-relaxed ${isDark ? 'text-slate-50' : 'text-slate-700'}`}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;
        if (line.startsWith('### ')) return <p key={i} className={`font-bold text-sm mt-3 mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{line.slice(4)}</p>;
        if (line.startsWith('## ')) return (
          <div key={i} className={`flex items-center gap-2 mt-4 mb-2 pb-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="w-1 h-5 bg-indigo-400 rounded-full" />
            <p className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{line.slice(3)}</p>
          </div>
        );
        if (line.startsWith('# ')) return <p key={i} className={`font-black text-lg mt-4 ${isDark ? 'text-indigo-300' : 'text-[#1a2b4c]'}`}>{line.slice(2)}</p>;
        if (line.match(/^[-•*] /)) return (
          <div key={i} className="flex items-start gap-2.5 py-0.5">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isDark ? 'bg-indigo-300' : 'bg-indigo-400'}`} />
            <span className="flex-1">{renderInline(line.slice(2), isDark)}</span>
          </div>
        );
        if (line.match(/^\d+\. /)) return (
          <div key={i} className="flex items-start gap-2.5 py-0.5">
            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>{line.match(/^\d+/)?.[0]}</span>
            <span className="flex-1">{renderInline(line.replace(/^\d+\. /, ''), isDark)}</span>
          </div>
        );
        if (line.startsWith('> ')) return (
          <div key={i} className={`border-l-4 pl-3 py-1.5 rounded-r-xl text-xs italic my-1 ${isDark ? 'border-amber-400 bg-amber-900/20 text-amber-300' : 'border-amber-400 bg-amber-50 text-amber-800'}`}>{line.slice(2)}</div>
        );
        if (line.startsWith('---')) return <hr key={i} className={`my-2 ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />;
        return <p key={i} className="leading-relaxed">{renderInline(line, isDark)}</p>;
      })}
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: '📊', label: 'Phân tích doanh thu', colorDark: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30', colorLight: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', prompt: 'Phân tích chi tiết doanh thu: tổng quan, xu hướng 7 ngày, dịch vụ đóng góp nhiều nhất. Đề xuất cải thiện cụ thể.' },
  { icon: '👑', label: 'Khách đặt nhiều nhất', colorDark: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30', colorLight: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', prompt: 'Ai là khách hàng đặt lịch nhiều nhất? Liệt kê tên khách, số lần đặt, dịch vụ hay dùng. Đề xuất chương trình khách hàng thân thiết.' },
  { icon: '📅', label: 'Tổng quan lịch hẹn', colorDark: 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30', colorLight: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', prompt: 'Tổng hợp lịch hẹn theo trạng thái (chờ/xác nhận/hoàn thành/hủy). Có lịch tồn đọng không? Đề xuất tối ưu.' },
  { icon: '✂️', label: 'Dịch vụ hot & kém', colorDark: 'bg-teal-500/20 text-teal-300 border-teal-500/30 hover:bg-teal-500/30', colorLight: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100', prompt: 'Dịch vụ nào được đặt nhiều nhất? Dịch vụ nào chưa ai đặt hoặc ít được chọn? Đề xuất chiến lược cải thiện.' },
  { icon: '👥', label: 'Thống kê nhân viên', colorDark: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30', colorLight: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', prompt: 'Thống kê nhân viên: số lượng, trạng thái, chuyên môn, phân bổ công việc. Đề xuất tối ưu nhân sự.' },
  { icon: '⚠️', label: 'Cảnh báo & rủi ro', colorDark: 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30', colorLight: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', prompt: 'Có vấn đề gì cần chú ý? Lịch tồn đọng, dịch vụ kém, nhân viên thiếu, doanh thu giảm? Đề xuất xử lý ngay.' },
  { icon: '🎯', label: 'Chiến lược tăng trưởng', colorDark: 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30', colorLight: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', prompt: 'Dựa trên dữ liệu thực, đề xuất 3-5 chiến lược cụ thể để tăng doanh thu và khách hàng trong tháng tới.' },
  { icon: '📈', label: 'So sánh tháng này vs trước', colorDark: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30', colorLight: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100', prompt: 'So sánh hiệu suất tháng này với tháng trước: doanh thu, lịch hẹn, khách hàng mới. Nhận xét xu hướng.' },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, colorDark, colorLight }: { icon: React.ReactNode; label: string; value: string; sub?: string; colorDark: string; colorLight: string }) {
  const { isDark } = useTheme();
  return (
    <div className={`rounded-xl p-2.5 border flex items-center gap-2 ${isDark ? colorDark : colorLight}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${isDark ? 'bg-white/10' : 'bg-white/60'}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[8px] font-bold uppercase tracking-wider opacity-70 truncate">{label}</p>
        <p className="text-sm font-black leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const WELCOME_MSG = `# Xin chào! Tôi là PetEye Business AI 🤖\n\nTôi phân tích dữ liệu **thực tế** của shop để giúp bạn:\n• **Doanh thu** — xu hướng, dự báo, tối ưu\n• **Lịch hẹn** — tổng quan, tồn đọng, hiệu suất\n• **Dịch vụ** — hot nhất, kém nhất, cần cải thiện\n• **Khách hàng** — ai đặt nhiều nhất, chăm sóc VIP\n• **Nhân viên** — thống kê, phân bổ, tối ưu\n• **Chiến lược** — đề xuất hành động cụ thể\n\nChọn gợi ý bên dưới hoặc hỏi trực tiếp!`;

export default function ShopAIAssistant() {
  const { isDark } = useTheme();
  const { messages, isLoading, sendMessage, clearHistory } = useAIChat({
    agentType: 'SHOP_ASSISTANT',
    welcomeMessage: WELCOME_MSG,
  });

  const [input, setInput] = useState('');
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Stats still fetched on FE for the stat bar display
  const { data: dashboard, refetch: refetchDash } = useQuery({ queryKey: ['shopDashboard'], queryFn: () => shopService.getDashboard() });
  const { data: bookings = [], refetch: refetchBook } = useQuery({ queryKey: ['shopBookings-ai'], queryFn: () => bookingService.getShopBookings() });
  const { data: staff = [] } = useQuery({ queryKey: ['shopStaff-ai'], queryFn: () => staffService.getMyShopStaff() });
  const { data: services = [] } = useQuery({ queryKey: ['shopServices-ai'], queryFn: () => serviceService.getMyShopServices() });
  const { data: shopInfo } = useQuery({ queryKey: ['myShop-ai'], queryFn: () => shopService.getMyShop() });

  useEffect(() => { 
    if (bottomRef.current?.parentElement) {
      bottomRef.current.parentElement.scrollTop = bottomRef.current.parentElement.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const dataReady = !!(dashboard && shopInfo);

  const topCustomer = (() => {
    if (!bookings.length) return null;
    const freq = bookings.reduce((acc: Record<string, number>, b) => {
      const k = b.petName || `User#${b.userId}`; acc[k] = (acc[k] || 0) + 1; return acc;
    }, {});
    const [name, count] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0] ?? [];
    return name ? { name, count } : null;
  })();

  const topService = dashboard?.topServices?.[0];

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20' : 'bg-gradient-to-br from-slate-50 via-white to-indigo-50/30'}`}>

      {/* Header */}
      <div className={`backdrop-blur-xl border-b px-6 py-3 sticky top-0 z-10 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a2b4c] to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>PetEye Business AI</h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Trợ lý phân tích kinh doanh · Dữ liệu thực tế</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { refetchDash(); refetchBook(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
              <RefreshCw className="w-3.5 h-3.5" />Làm mới
            </button>
            <button onClick={clearHistory}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${isDark ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}>
              <Trash2 className="w-3.5 h-3.5" />Xoá lịch sử
            </button>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${dataReady ? (isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200') : (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200')}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dataReady ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
              {dataReady ? 'Dữ liệu sẵn sàng' : 'Đang tải...'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 flex flex-col gap-4 min-h-0">

        {/* Stats row */}
        {dataReady && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
            <StatCard icon={<TrendingUp className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />} label="Doanh thu tháng"
              value={`${(dashboard!.periodRevenue / 1000000).toFixed(1)}M`} sub="đồng"
              colorDark="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              colorLight="bg-emerald-50 border-emerald-100 text-emerald-900" />
            <StatCard icon={<Calendar className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />} label="Tổng lịch hẹn"
              value={`${dashboard!.totalBookings}`} sub={`${dashboard!.pendingBookings} đang chờ`}
              colorDark="bg-blue-500/10 border-blue-500/20 text-blue-400"
              colorLight="bg-blue-50 border-blue-100 text-blue-900" />
            <StatCard icon={<Users className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />} label="Khách hàng"
              value={`${dashboard!.totalCustomers}`} sub={`${dashboard!.totalPets} thú cưng`}
              colorDark="bg-purple-500/10 border-purple-500/20 text-purple-400"
              colorLight="bg-purple-50 border-purple-100 text-purple-900" />
            <StatCard icon={<span className="text-sm">👑</span>} label="Khách VIP"
              value={topCustomer?.name?.slice(0, 10) ?? '—'} sub={topCustomer ? `${topCustomer.count} lần đặt` : 'Chưa có'}
              colorDark="bg-amber-500/10 border-amber-500/20 text-amber-400"
              colorLight="bg-amber-50 border-amber-100 text-amber-900" />
            <StatCard icon={<Scissors className={`w-4 h-4 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />} label="Dịch vụ hot"
              value={topService?.name?.slice(0, 10) ?? '—'} sub={topService ? `${topService.count} lần` : 'Chưa có'}
              colorDark="bg-teal-500/10 border-teal-500/20 text-teal-400"
              colorLight="bg-teal-50 border-teal-100 text-teal-900" />
            <StatCard icon={<Users className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />} label="Nhân viên"
              value={`${staff.filter(s => s.isActive).length}/${staff.length}`} sub="đang hoạt động"
              colorDark="bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
              colorLight="bg-indigo-50 border-indigo-100 text-indigo-900" />
          </div>
        )}

        {/* 2-col layout: chat + sidebar */}
        <div className="flex gap-5 flex-1 min-h-0">

          {/* Chat area */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">

            {/* Messages */}
            <div
              className={`flex-1 rounded-3xl overflow-hidden flex flex-col min-h-0 ${
                isDark
                  ? 'border border-[#2d3f5a] shadow-2xl'
                  : 'border border-slate-100 shadow-sm bg-white'
              }`}
              style={isDark ? { background: 'linear-gradient(145deg, #1a2d46 0%, #162338 100%)' } : undefined}
            >
              <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#1a2b4c] to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                        <Sparkles className="text-white w-4 h-4" />
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                        <span className="text-white text-xs font-black">Bạn</span>
                      </div>
                    )}
                    <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-3.5 shadow-lg ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-none shadow-indigo-900/40'
                            : isDark
                              ? 'rounded-tl-none border border-[#2d4060] shadow-black/30'
                              : 'bg-white border border-slate-200 rounded-tl-none shadow-slate-200/80'
                        }`}
                        style={isDark && msg.role !== 'user' ? { background: 'linear-gradient(135deg, #1e3352 0%, #1a2d46 100%)' } : undefined}
                      >
                        {msg.isLoading ? (
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex gap-1">
                              {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                            </div>
                            <span className="text-xs text-slate-400 italic">Đang phân tích dữ liệu shop...</span>
                          </div>
                        ) : msg.role === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          <RichText text={msg.content} isDark={isDark} />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 px-1">
                        {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input */}
            <div
              className={`rounded-2xl border shadow-sm focus-within:ring-2 transition-all ${
                isDark
                  ? 'border-[#2d4060] focus-within:border-indigo-500 focus-within:ring-indigo-500/20'
                  : 'bg-white border-slate-200 focus-within:border-indigo-400 focus-within:ring-indigo-100'
              }`}
              style={isDark ? { background: 'linear-gradient(135deg, #1e3352 0%, #1a2d46 100%)' } : undefined}
            >
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Hỏi bất kỳ điều gì về shop... (Enter gửi, Shift+Enter xuống dòng)"
                disabled={isLoading} rows={2}
                className={`w-full px-4 pt-3 pb-1 text-sm bg-transparent outline-none resize-none ${isDark ? 'placeholder-slate-500 text-white' : 'placeholder-slate-400 text-slate-800'}`} />
              <div className="flex items-center justify-between px-4 pb-3">
                <p className="text-[10px] text-slate-400">Enter gửi · Shift+Enter xuống dòng</p>
                <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1a2b4c] to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                  {isLoading
                    ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang phân tích...</>
                    : <><span className="material-symbols-outlined text-sm">send</span>Gửi</>}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar: Quick actions */}
          <div className="w-[260px] shrink-0 flex flex-col gap-3 overflow-y-auto pb-4 custom-scrollbar">
            <div className={`shrink-0 rounded-3xl border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-100'}`}>
              <button onClick={() => setShowQuickActions(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-3 transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                    <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Phân tích nhanh</span>
                </div>
                {showQuickActions ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>
              {showQuickActions && (
                <div className="px-3 pb-3 flex flex-col gap-1.5">
                  {(showAllActions ? QUICK_ACTIONS : QUICK_ACTIONS.slice(0, 4)).map(action => (
                    <button key={action.label} onClick={() => handleSend(action.prompt)}
                      disabled={isLoading}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? action.colorDark : action.colorLight}`}>
                      <span className="text-base shrink-0">{action.icon}</span>
                      <span className="leading-snug">{action.label}</span>
                    </button>
                  ))}
                  {QUICK_ACTIONS.length > 4 && (
                    <button onClick={() => setShowAllActions(!showAllActions)}
                      className={`mt-1 text-[11px] font-bold py-1.5 text-center rounded-lg transition-colors ${isDark ? 'text-indigo-300 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'}`}>
                      {showAllActions ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Data summary card */}
            {dataReady && (
              <div className="shrink-0 bg-gradient-to-br from-[#1a2b4c] to-indigo-700 rounded-3xl p-4 text-white shadow-lg shadow-indigo-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className="w-4 h-4 text-indigo-300" />
                  <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Tóm tắt nhanh</p>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Tổng doanh thu', value: `${(dashboard!.totalRevenue / 1000000).toFixed(1)}M đ` },
                    { label: 'Lịch hẹn chờ', value: `${dashboard!.pendingBookings} lịch` },
                    { label: 'Dịch vụ active', value: `${services.filter(s => s.active).length} dịch vụ` },
                    { label: 'Nhân viên active', value: `${staff.filter(s => s.isActive).length} người` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-[11px] text-indigo-200">{item.label}</span>
                      <span className="text-xs font-bold text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <Link to="/shop/dashboard" className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-indigo-200 hover:text-white transition-colors">
                    <BarChart2 className="w-3 h-3" />Xem Dashboard đầy đủ
                  </Link>
                </div>
              </div>
            )}

            {/* Tip */}
            <div className={`shrink-0 border rounded-2xl p-3 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <div>
                  <p className={`text-[11px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Lưu ý</p>
                  <p className={`text-[10px] mt-0.5 leading-relaxed ${isDark ? 'text-amber-200/70' : 'text-amber-700'}`}>
                    AI phân tích dựa trên dữ liệu thực. Kết quả mang tính tham khảo, cần kết hợp với kinh nghiệm thực tế.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
