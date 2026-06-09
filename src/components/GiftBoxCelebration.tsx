import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/user.service';

const TIER_PERKS_BASE: Record<string, { title: string, colorClass: string, perks: { title: string, desc: string, icon: string }[] }> = {
  'Đồng': {
    title: 'Hạng Đồng',
    colorClass: 'text-slate-400',
    perks: [
      { title: 'Tích lũy chi tiêu', desc: 'Hệ thống tự động cộng dồn', icon: 'savings' },
      { title: 'Ưu đãi cơ bản', desc: 'Áp dụng cho mọi dịch vụ', icon: 'card_membership' }
    ]
  },
  'Bạc': {
    title: 'Hạng Bạc',
    colorClass: 'text-slate-300',
    perks: [
      { title: 'Ưu tiên hỗ trợ', desc: 'Phản hồi nhanh chóng', icon: 'support_agent' }
    ]
  },
  'Vàng': {
    title: 'Hạng Vàng',
    colorClass: 'text-yellow-500',
    perks: [
      { title: 'Ưu tiên đặt chỗ', desc: 'Xác nhận lịch hẹn nhanh x3', icon: 'bolt' },
      { title: 'Tích điểm x2', desc: 'Quy đổi Voucher dễ dàng', icon: 'military_tech' },
      { title: 'Hỗ trợ VIP', desc: 'Kênh CSKH riêng biệt 24/7', icon: 'headset_mic' },
    ]
  },
  'Kim Cương': {
    title: 'Hạng Kim Cương',
    colorClass: 'text-cyan-400',
    perks: [
      { title: 'Dịch vụ miễn phí', desc: '1 lần spa/tháng', icon: 'spa' },
      { title: 'Hotline VIP', desc: 'Hỗ trợ ngay lập tức 24/7', icon: 'phone_in_talk' },
      { title: 'Quà sinh nhật', desc: 'Voucher đặc biệt', icon: 'cake' },
    ]
  }
};

export default function GiftBoxCelebration() {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [step, setStep] = useState<'gift' | 'opening' | 'rewards'>('gift');
  const [perksData, setPerksData] = useState<{ title: string, colorClass: string, perks: { title: string, desc: string, icon: string }[] } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const checkUpgrade = async () => {
      try {
        const [userData, publicVouchers] = await Promise.all([
          userService.getById(Number(user.id)),
          userService.getPublicVouchers()
        ]);

        if (cancelled) return;

        if (userData.justUpgraded) {
          const tierName = userData.currentTier?.name || 'Đồng';
          const base = TIER_PERKS_BASE[tierName] || TIER_PERKS_BASE['Đồng'];
          const tierVouchers = publicVouchers.filter((v: any) => v.targetTier?.name === tierName);
          const voucherPerks = tierVouchers.map((v: any) => ({
            title: `Voucher Giảm ${v.discountValue}${v.discountType === 'PERCENTAGE' ? '%' : 'đ'} (x${v.issueQuantity})`,
            desc: `Mã ${v.code} - HSD: ${v.validDays} ngày`,
            icon: 'local_activity'
          }));

          setPerksData({
            ...base,
            perks: [...voucherPerks, ...base.perks]
          });
          setShowPopup(true);
          userService.acknowledgeTierUpgrade().catch(console.error);
        }
      } catch (err) {
        console.error('GiftBox check upgrade error:', err);
      }
    };

    checkUpgrade();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!showPopup || !perksData) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-[60] flex items-center justify-center p-4">
      
      {/* Confetti particles */}
      {(step === 'opening' || step === 'rewards') && (
        <div className="fixed inset-0 pointer-events-none z-[61] overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => {
            const colors = ['#facc15', '#f97316', '#ef4444', '#22d3ee', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];
            const color = colors[i % colors.length];
            const left = 30 + Math.random() * 40;
            const delay = Math.random() * 0.5;
            const duration = 1.5 + Math.random() * 1.5;
            const xEnd = (Math.random() - 0.5) * 400;
            const yEnd = -200 - Math.random() * 300;
            const rotation = Math.random() * 720 - 360;
            const size = 6 + Math.random() * 8;
            const shape = i % 3 === 0 ? 'rounded-full' : i % 3 === 1 ? 'rounded-sm' : '';
            return (
              <div
                key={i}
                className={shape}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: '50%',
                  width: size,
                  height: size * (i % 3 === 2 ? 0.4 : 1),
                  backgroundColor: color,
                }}
                ref={(el) => {
                  if (el) {
                    el.animate([
                      { transform: 'translate(0, 0) rotate(0deg) scale(0)', opacity: 1 },
                      { transform: `scale(1)`, opacity: 1, offset: 0.15 },
                      { transform: `translate(${xEnd}px, ${yEnd}px) rotate(${rotation}deg) scale(0.5)`, opacity: 0 }
                    ], {
                      duration: duration * 1000,
                      delay: delay * 1000,
                      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                      fill: 'forwards'
                    });
                  }
                }}
              />
            );
          })}
        </div>
      )}

      <div className="relative z-[62] w-full max-w-md">
        
        {/* Phase 1: Gift Box */}
        {step === 'gift' && (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
            {/* Sparkles */}
            <div className="absolute top-4 left-[15%] animate-sparkle" style={{ animationDelay: '0s' }}>
              <span className="material-symbols-outlined text-yellow-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <div className="absolute top-12 right-[12%] animate-sparkle" style={{ animationDelay: '0.7s' }}>
              <span className="material-symbols-outlined text-amber-300 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <div className="absolute top-28 left-[8%] animate-sparkle" style={{ animationDelay: '1.4s' }}>
              <span className="material-symbols-outlined text-yellow-300 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div className="absolute top-20 right-[20%] animate-sparkle" style={{ animationDelay: '0.3s' }}>
              <span className="material-symbols-outlined text-orange-300 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            
            {/* Title */}
            <h2 className="text-3xl font-black text-white mb-2 mt-4 tracking-tight">
              Chúc mừng thăng hạng! 🎉
            </h2>
            <p className="text-slate-400 text-sm mb-10 leading-relaxed px-4 max-w-xs">
              Bạn đã đạt <strong className={perksData.colorClass}>{perksData.title}</strong>!
              <br />Ấn vào hộp quà để nhận phần thưởng
            </p>

            {/* Gift Box */}
            <button
              onClick={() => {
                setStep('opening');
                setTimeout(() => setStep('rewards'), 1200);
              }}
              className="relative group cursor-pointer bg-transparent border-0 mb-12 focus:outline-none"
              aria-label="Mở hộp quà"
            >
              {/* Glow */}
              <div className="absolute inset-0 bg-yellow-500/25 blur-3xl rounded-full scale-150 animate-glow-pulse" />
              
              <div className="relative animate-gift-wiggle">
                {/* Lid */}
                <div className="relative z-10 w-36 h-12 mx-auto mb-0" style={{ perspective: '400px' }}>
                  <div className="w-40 h-12 bg-gradient-to-b from-red-500 to-red-600 rounded-t-xl -ml-2 shadow-lg border-2 border-red-700 relative">
                    <div className="absolute inset-x-0 top-0 h-full flex items-center justify-center">
                      <div className="w-6 h-full bg-yellow-400 shadow-inner" />
                    </div>
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-end gap-0">
                      <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-500 -mr-1 transform -rotate-12" />
                      <div className="w-4 h-5 bg-yellow-500 rounded-full relative z-10" />
                      <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-500 -ml-1 transform rotate-12" />
                    </div>
                  </div>
                </div>
                
                {/* Body */}
                <div className="relative z-0 w-36 h-28 mx-auto -mt-1">
                  <div className="w-full h-full bg-gradient-to-b from-red-600 to-red-700 rounded-b-xl shadow-2xl border-2 border-t-0 border-red-800 relative overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-yellow-400 shadow-inner" />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-6 bg-yellow-400 shadow-inner" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-500 rounded-full border-2 border-yellow-600 z-10" />
                  </div>
                </div>

                {/* Tap hint */}
                <div className="mt-6 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/20 group-hover:scale-110 transition-all">
                    <span className="material-symbols-outlined text-white text-2xl">touch_app</span>
                  </div>
                  <span className="text-white/60 text-xs font-medium">Chạm để mở</span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Phase 2: Opening Animation */}
        {step === 'opening' && (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative">
              {/* Lid flies away */}
              <div className="relative z-10 w-36 h-12 mx-auto mb-0 animate-lid-open" style={{ perspective: '400px', transformOrigin: 'center bottom' }}>
                <div className="w-40 h-12 bg-gradient-to-b from-red-500 to-red-600 rounded-t-xl -ml-2 shadow-lg border-2 border-red-700 relative">
                  <div className="absolute inset-x-0 top-0 h-full flex items-center justify-center">
                    <div className="w-6 h-full bg-yellow-400 shadow-inner" />
                  </div>
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-end gap-0">
                    <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-500 -mr-1 transform -rotate-12" />
                    <div className="w-4 h-5 bg-yellow-500 rounded-full relative z-10" />
                    <div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-500 -ml-1 transform rotate-12" />
                  </div>
                </div>
              </div>
              
              {/* Body shrinks */}
              <div className="relative z-0 w-36 h-28 mx-auto -mt-1 animate-body-burst">
                <div className="w-full h-full bg-gradient-to-b from-red-600 to-red-700 rounded-b-xl shadow-2xl border-2 border-t-0 border-red-800 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-6 bg-yellow-400 shadow-inner" />
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-6 bg-yellow-400 shadow-inner" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-500 rounded-full border-2 border-yellow-600 z-10" />
                </div>
              </div>

              {/* Light burst */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 bg-yellow-400/40 rounded-full blur-3xl animate-ping" />
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Rewards Reveal */}
        {step === 'rewards' && (
          <div className="bg-[#0f172a] w-full rounded-[2rem] shadow-2xl overflow-hidden border border-slate-800 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="relative h-36 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 animate-celebrate-bg flex flex-col items-center justify-center text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -ml-16 -mb-16" />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl mb-3 border border-white/30">
                  <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>featured_seasonal_and_gifts</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight">Quà tặng đã mở! 🎁</h2>
                <p className="text-white/70 text-xs font-medium mt-1">
                  Đặc quyền <span className={perksData.colorClass}>{perksData.title}</span> đã được kích hoạt
                </p>
              </div>
            </div>

            {/* Rewards List */}
            <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto scrollbar-hide">
              {perksData.perks.map((p, idx) => (
                <div 
                  key={idx} 
                  className="animate-reward-reveal bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl flex items-center gap-4 hover:bg-slate-800/80 transition-colors"
                  style={{ animationDelay: `${idx * 150 + 200}ms` }}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center text-teal-400 shrink-0 border border-teal-500/30">
                    <span className="material-symbols-outlined text-2xl">{p.icon}</span>
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white mb-0.5">{p.title}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{p.desc}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <button 
                onClick={() => {
                  setShowPopup(false);
                  setStep('gift');
                }}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-teal-500/25 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">celebration</span>
                Tuyệt vời, bắt đầu sử dụng!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
