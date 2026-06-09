import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingService } from '../services/booking.service';
import { userService } from '../services/user.service';
import { useAIChat } from '../hooks/useAIChat';

// ── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2); }
function formatPrice(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }
function formatDatetime(iso: string) {
  try { return new Date(iso).toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

/** Extract a user-friendly Vietnamese error message from an Axios or plain Error */
function extractError(err: unknown): string {
  if (err && typeof err === 'object') {
    // Axios error with response body
    const axiosErr = err as { response?: { data?: { message?: string; result?: string } } };
    const backendMsg = axiosErr.response?.data?.message || axiosErr.response?.data?.result;
    if (backendMsg) {
      // Map common English backend messages to Vietnamese
      const msgMap: Record<string, string> = {
        'No staff available for the selected time slot. Please choose a different time.': 'Không còn nhân viên rảnh cho khung giờ này. Vui lòng chọn giờ khác.',
        'This pet already has an active booking at the requested time': 'Thú cưng của bạn đã có lịch hẹn vào giờ này rồi.',
        'This staff member is already booked at the requested time': 'Nhân viên này đã có lịch vào giờ đó. Vui lòng chọn giờ khác.',
        'Shop is not verified yet': 'Shop chưa được xác minh.',
        'Service does not belong to your shop': 'Dịch vụ không thuộc shop này.',
        'Pet does not belong to you': 'Thú cưng không thuộc tài khoản của bạn.',
        'Appointment must be in the future': 'Thời gian hẹn phải ở tương lai. Vui lòng chọn lại.',
        'Payment gateway error': 'Lỗi cổng thanh toán (PayOS). Vui lòng thử lại sau.',
      };
      return msgMap[backendMsg] ?? backendMsg;
    }
    // Plain Error
    if ('message' in err && typeof (err as Error).message === 'string') {
      return (err as Error).message;
    }
  }
  return 'Đặt lịch thất bại. Vui lòng thử lại.';
}

// ── Types (matching backend ToolResult JSON structure) ───────────────────────
type PayMethod = 'CASH' | 'PAYOS';

interface ShopInfo {
  id: number; shopName: string; address: string; city: string;
  ratingAvg: number; isVerified: boolean; licenseImageUrl?: string;
}
interface ServiceInfo { id: number; serviceName: string; price: number; }
interface ShopWithServices { shop: ShopInfo; services: ServiceInfo[]; }
interface PetSummary {
  id: number; name: string; species: string; breed: string; gender: string;
  weight: number; age: string; avatar?: string; healthNote?: string;
  allergies?: string; sterilized: boolean;
}
interface PetDetail extends PetSummary {
  color?: string; dob?: string; favoriteFood?: string; hobbies?: string; walkTime?: string;
  vaccinations?: { name: string; date: string; status: string }[];
  upcomingReminders?: { title: string; date: string; type: string }[];
}
interface BookingPickerData {
  shopId: number; shopName: string; serviceId: number; serviceName: string;
  servicePrice: number; petId: number; petName: string;
}
interface BookingSuccessData {
  bookingId: number; shopName: string; serviceName: string; datetime: string;
}

type ToolResultData =
  | { type: 'shop_list'; data: ShopWithServices[] }
  | { type: 'shop_detail'; data: { shop: ShopInfo; services: ServiceInfo[] } }
  | { type: 'pet_list'; data: PetSummary[] }
  | { type: 'pet_detail'; data: PetDetail }
  | { type: 'booking_picker'; data: BookingPickerData }
  | { type: 'booking_success'; data: BookingSuccessData }
  | { type: 'tier_info'; data: TierInfoData }
  | { type: 'error'; data: { message: string } };

interface TierInfoData {
  currentTierName: string;
  totalSpending: number;
  nextTierName: string;
  nextThreshold: number;
  progressPercent: number;
  vouchers: { code: string; discountValue: number; discountType: string; issueQuantity: number; validDays: number }[];
  perks: { title: string; desc: string; icon: string }[];
}

// ── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={"material-symbols-outlined text-xs " + (s <= Math.round(rating) ? 'text-amber-400' : 'text-slate-300')} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
      ))}
      <span className="text-xs font-bold text-slate-700 ml-0.5">{rating?.toFixed(1) ?? '-'}</span>
    </span>
  );
}

// ── Markdown renderer ────────────────────────────────────────────────────────
function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <p key={i} className="font-bold text-sm text-slate-900">{line.slice(3)}</p>;
        if (line.startsWith('# ')) return <p key={i} className="font-black text-sm text-slate-900">{line.slice(2)}</p>;
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <div key={i} className="flex items-start gap-1.5">
            <span className="text-indigo-500 mt-0.5 shrink-0">*</span>
            <span className="text-sm leading-relaxed">{line.slice(2)}</span>
          </div>
        );
        if (line === '') return <div key={i} className="h-1" />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-sm leading-relaxed">
            {parts.map((p, j) => p.startsWith('**') && p.endsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p)}
          </p>
        );
      })}
    </div>
  );
}

// ── Pet Cards ────────────────────────────────────────────────────────────────
function PetListCard({ pets }: { pets: PetSummary[] }) {
  const navigate = useNavigate();
  if (!pets.length) return <p className="text-xs text-slate-400 italic">Ban chua co thu cung nao.</p>;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {pets.map(pet => (
        <div key={pet.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 shrink-0 overflow-hidden border-2 border-amber-200">
              {pet.avatar ? <img src={pet.avatar} className="w-full h-full object-cover" alt={pet.name} /> : <div className="w-full h-full flex items-center justify-center text-xl">{pet.species?.toLowerCase().includes('meo') ? '🐱' : '🐶'}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900 text-sm">{pet.name}</p>
                {pet.sterilized && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-full">Da triet san</span>}
              </div>
              <p className="text-xs text-slate-500">{pet.species} · {pet.breed} · {pet.gender}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-slate-400">⚖️ {pet.weight}kg</span>
                <span className="text-[10px] text-slate-400">🎂 {pet.age}</span>
              </div>
            </div>
          </div>
          {(pet.healthNote || pet.allergies) && (
            <div className="px-3 pb-2 flex flex-col gap-1">
              {pet.healthNote && <div className="flex items-start gap-1.5 text-[10px] text-slate-600 bg-slate-50 rounded-lg px-2 py-1"><span>💊</span><span className="line-clamp-1">{pet.healthNote}</span></div>}
              {pet.allergies && <div className="flex items-start gap-1.5 text-[10px] text-red-600 bg-red-50 rounded-lg px-2 py-1"><span>⚠️</span><span className="line-clamp-1">Di ung: {pet.allergies}</span></div>}
            </div>
          )}
          <div className="px-3 pb-3">
            <button onClick={() => navigate('/pet/' + pet.id)} className="w-full py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">Xem ho so day du</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PetDetailCard({ pet }: { pet: PetDetail }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-2">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex items-center gap-3 border-b border-amber-100">
        <div className="w-16 h-16 rounded-full bg-white shrink-0 overflow-hidden border-2 border-amber-200 shadow-sm">
          {pet.avatar ? <img src={pet.avatar} className="w-full h-full object-cover" alt={pet.name} /> : <div className="w-full h-full flex items-center justify-center text-3xl">{pet.species?.toLowerCase().includes('meo') ? '🐱' : '🐶'}</div>}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-black text-slate-900 text-base">{pet.name}</p>
            {pet.sterilized && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">Da triet san</span>}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">{pet.species} · {pet.breed} · {pet.gender}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">⚖️ {pet.weight}kg</span>
            <span className="text-xs text-slate-500">🎂 {pet.age}</span>
            {pet.color && <span className="text-xs text-slate-500">🎨 {pet.color}</span>}
          </div>
        </div>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {pet.favoriteFood && <div className="bg-green-50 rounded-xl p-2"><p className="text-[9px] font-bold text-green-600 uppercase mb-0.5">Thuc an yeu thich</p><p className="text-xs text-slate-700">{pet.favoriteFood}</p></div>}
        {pet.hobbies && <div className="bg-purple-50 rounded-xl p-2"><p className="text-[9px] font-bold text-purple-600 uppercase mb-0.5">So thich</p><p className="text-xs text-slate-700">{pet.hobbies}</p></div>}
        {pet.walkTime && <div className="bg-blue-50 rounded-xl p-2"><p className="text-[9px] font-bold text-blue-600 uppercase mb-0.5">Gio di dao</p><p className="text-xs text-slate-700">{pet.walkTime}</p></div>}
        {pet.allergies && <div className="bg-red-50 rounded-xl p-2"><p className="text-[9px] font-bold text-red-600 uppercase mb-0.5">⚠️ Di ung</p><p className="text-xs text-red-700">{pet.allergies}</p></div>}
      </div>
      {pet.healthNote && <div className="mx-3 mb-3 bg-amber-50 rounded-xl p-2 border border-amber-100"><p className="text-[9px] font-bold text-amber-700 uppercase mb-0.5">💊 Ghi chu suc khoe</p><p className="text-xs text-slate-700">{pet.healthNote}</p></div>}
      {pet.vaccinations && pet.vaccinations.length > 0 && (
        <div className="mx-3 mb-3">
          <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">💉 Lich tiem phong</p>
          <div className="flex flex-col gap-1">
            {pet.vaccinations.slice(0, 3).map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-700">{v.name}</span>
                <span className={"px-1.5 py-0.5 rounded-full text-[9px] font-bold " + (v.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>{v.status === 'done' ? 'Da tiem' : 'Sap toi'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="px-3 pb-3">
        <button onClick={() => navigate('/pet/' + pet.id)} className="w-full py-2 bg-[#1a2b4c] text-white text-xs font-bold rounded-xl hover:bg-[#243d6b] transition-colors">Xem ho so day du</button>
      </div>
    </div>
  );
}

// ── Shop Cards ───────────────────────────────────────────────────────────────
function ShopListCard({ shops }: { shops: ShopWithServices[] }) {
  const navigate = useNavigate();
  if (!shops.length) return <p className="text-xs text-slate-400 italic">Khong tim thay shop nao phu hop.</p>;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {shops.map(({ shop, services }, index) => (
        <div key={shop.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 p-3">
            <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 " + (index === 0 ? 'bg-amber-400 text-white' : index === 1 ? 'bg-slate-400 text-white' : index === 2 ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-500')}>{index + 1}</div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
              {shop.licenseImageUrl ? <img src={shop.licenseImageUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-slate-300 text-xl">storefront</span></div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{shop.shopName}</p>
              <p className="text-xs text-slate-500 truncate">{shop.address}{shop.city ? ', ' + shop.city : ''}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Stars rating={shop.ratingAvg} />
                {shop.isVerified && <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600"><span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>Xac minh</span>}
              </div>
            </div>
          </div>
          {services.length > 0 && (
            <div className="px-3 pb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dich vu phu hop</p>
              <div className="flex flex-wrap gap-1">
                {services.slice(0, 4).map(svc => <span key={svc.id} className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-semibold rounded-full">{svc.serviceName} · {formatPrice(svc.price)}</span>)}
                {services.length > 4 && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full">+{services.length - 4}</span>}
              </div>
            </div>
          )}
          <div className="px-3 pb-3">
            <button onClick={() => navigate('/clinic/' + shop.id)} className="w-full py-2 bg-[#1a2b4c] text-white text-xs font-bold rounded-xl hover:bg-[#243d6b] transition-colors">Xem chi tiet & Dat lich</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShopDetailCard({ shop, services }: { shop: ShopInfo; services: ServiceInfo[] }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-2">
      <div className="flex items-center gap-3 p-3 border-b border-slate-100">
        <div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
          {shop.licenseImageUrl ? <img src={shop.licenseImageUrl} className="w-full h-full object-cover" alt={shop.shopName} /> : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-slate-300 text-2xl">storefront</span></div>}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">{shop.shopName}</p>
          <Stars rating={shop.ratingAvg} />
          <p className="text-xs text-slate-500 mt-0.5">{shop.address}{shop.city ? ', ' + shop.city : ''}</p>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dich vu</p>
        <div className="flex flex-col gap-1.5">
          {services.map(svc => <div key={svc.id} className="flex items-center justify-between"><span className="text-xs text-slate-700">{svc.serviceName}</span><span className="text-xs font-bold text-slate-900">{formatPrice(svc.price)}</span></div>)}
        </div>
      </div>
      <div className="px-3 pb-3">
        <button onClick={() => navigate('/clinic/' + shop.id)} className="w-full py-2 bg-[#1a2b4c] text-white text-xs font-bold rounded-xl hover:bg-[#243d6b] transition-colors">Dat lich ngay</button>
      </div>
    </div>
  );
}

// ── Booking Picker ───────────────────────────────────────────────────────────
const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function BookingPickerCard({ data, onConfirm }: {
  data: BookingPickerData;
  onConfirm: (datetime: string, payMethod: PayMethod, onError: (msg: string) => void) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('CASH');
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const canConfirm = !!date && !!time && !confirming;

  // Dynamically filter time slots to avoid picking past times today
  const availableTimeSlots = TIME_SLOTS.filter(t => {
    if (date !== today) return true;
    const now = new Date();
    const [h, m] = t.split(':').map(Number);
    // Allow if the slot is at least 30 minutes in the future
    return (h * 60 + m) > (now.getHours() * 60 + now.getMinutes() + 30);
  });

  const handleConfirm = () => {
    if (!canConfirm) return;
    setConfirming(true);
    setErrorMsg('');
    onConfirm(date + 'T' + time + ':00', payMethod, (msg: string) => {
      setErrorMsg(msg);
      setConfirming(false);
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden mt-2">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-indigo-100">
        <p className="font-bold text-indigo-900 text-sm">📅 Dat lich hen</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-indigo-700 font-semibold">{data.shopName}</p>
          <span className="text-xs font-black text-indigo-900">{formatPrice(data.servicePrice)}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">✂️ {data.serviceName} · 🐾 {data.petName}</p>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">📆 Ngay hen</label>
          <input type="date" min={today} value={date} onChange={e => { setDate(e.target.value); setTime(''); }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">⏰ Khung giờ</label>
          {availableTimeSlots.length === 0 ? (
            <p className="text-xs text-red-500 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100">Hôm nay đã hết khung giờ khả dụng. Vui lòng chọn ngày khác.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {availableTimeSlots.map(t => (
                <button key={t} onClick={() => setTime(t)}
                  className={"py-1.5 text-xs font-semibold rounded-lg border transition-all " + (time === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600')}
                >{t}</button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">💳 Phuong thuc thanh toan</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPayMethod('CASH')} className={"flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all " + (payMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
              <span className="text-lg">💵</span>
              <span className={"text-[11px] font-bold " + (payMethod === 'CASH' ? 'text-emerald-700' : 'text-slate-600')}>Tien mat</span>
              <span className={"text-[9px] " + (payMethod === 'CASH' ? 'text-emerald-500' : 'text-slate-400')}>Thanh toan tai quay</span>
            </button>
            <button onClick={() => setPayMethod('PAYOS')} className={"flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all " + (payMethod === 'PAYOS' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300')}>
              <span className="text-lg">📱</span>
              <span className={"text-[11px] font-bold " + (payMethod === 'PAYOS' ? 'text-blue-700' : 'text-slate-600')}>PayOS</span>
              <span className={"text-[9px] " + (payMethod === 'PAYOS' ? 'text-blue-500' : 'text-slate-400')}>QR chuyen khoan</span>
            </button>
          </div>
        </div>
        {date && time && (
          <div className="bg-slate-50 rounded-xl px-3 py-2 space-y-1 border border-slate-100">
            <div className="flex justify-between text-xs text-slate-600">
              <span>📅 Ngày giờ</span>
              <span className="font-semibold">{new Date(date + 'T' + time + ':00').toLocaleString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>💳 Thanh toán</span>
              <span className="font-semibold">{payMethod === 'CASH' ? 'Tiền mặt tại quầy' : 'PayOS (QR)'}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-slate-200 pt-1 mt-1">
              <span className="font-bold text-slate-800">Tổng cộng</span>
              <span className="font-black text-indigo-700">{formatPrice(data.servicePrice)}</span>
            </div>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 flex items-start gap-1.5">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        <button onClick={handleConfirm} disabled={!canConfirm}
          className={"w-full py-2.5 text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 " + (payMethod === 'PAYOS' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700')}>
          {confirming
            ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang xử lý...</>
            : payMethod === 'PAYOS' ? '📱 Thanh toán qua PayOS' : '✅ Xác nhận đặt lịch (Tiền mặt)'}
        </button>
      </div>
    </div>
  );
}

function BookingSuccessCard({ data }: { data: BookingSuccessData }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-green-600 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <span className="font-bold text-green-800 text-sm">Dat lich thanh cong!</span>
      </div>
      <div className="space-y-1 text-xs text-green-700">
        <p>🏪 <strong>{data.shopName}</strong></p>
        <p>✂️ {data.serviceName}</p>
        <p>📅 {formatDatetime(data.datetime)}</p>
        <p>🎫 Ma dat lich: <strong>#{data.bookingId}</strong></p>
      </div>
      <Link to="/profile/bookings" className="mt-2 block text-center py-1.5 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-colors">Xem lich cua toi</Link>
    </div>
  );
}

// ── Tier Info Card ───────────────────────────────────────────────────────────
const TIER_META: Record<string, { icon: string; color: string; bg: string; border: string; gradient: string }> = {
  'Đồng':      { icon: 'military_tech',    color: 'text-slate-400', bg: 'bg-slate-50',  border: 'border-slate-200', gradient: 'from-slate-400 to-slate-500' },
  'Bạc':       { icon: 'workspace_premium', color: 'text-slate-300', bg: 'bg-slate-50',  border: 'border-slate-200', gradient: 'from-slate-300 to-slate-400' },
  'Vàng':      { icon: 'stars',             color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', gradient: 'from-yellow-400 to-amber-500' },
  'Kim Cương': { icon: 'diamond',           color: 'text-cyan-400',  bg: 'bg-cyan-50',   border: 'border-cyan-200',  gradient: 'from-cyan-400 to-teal-500' },
};

function TierInfoCard({ data }: { data: TierInfoData }) {
  const meta = TIER_META[data.currentTierName] || TIER_META['Đồng'];
  const isMax = data.nextTierName === 'Tối đa';
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-2">
      {/* Header */}
      <div className={`bg-gradient-to-r ${meta.gradient} p-4 flex items-center gap-3`}>
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
        </div>
        <div className="flex-1">
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Cấp bậc hiện tại</p>
          <p className="text-white text-lg font-black">Hạng {data.currentTierName}</p>
        </div>
        <Link to="/profile" className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold rounded-xl transition-colors border border-white/20">
          Xem profile
        </Link>
      </div>

      {/* Progress */}
      {!isMax && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiến đến hạng {data.nextTierName}</p>
            <p className="text-[10px] font-black text-slate-700">{Math.floor(data.progressPercent)}%</p>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${meta.gradient} rounded-full transition-all`}
              style={{ width: `${Math.min(data.progressPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-slate-400">{data.totalSpending.toLocaleString('vi-VN')}đ đã chi tiêu</span>
            <span className="text-[10px] text-slate-400">Cần {data.nextThreshold.toLocaleString('vi-VN')}đ</span>
          </div>
        </div>
      )}
      {isMax && (
        <div className="px-4 py-3 border-b border-slate-100 text-center">
          <span className="text-xs font-bold text-cyan-600">🏆 Bạn đã đạt cấp bậc cao nhất!</span>
        </div>
      )}

      {/* Vouchers */}
      {data.vouchers.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">🎟️ Voucher cấp bậc</p>
          <div className="flex flex-col gap-1.5">
            {data.vouchers.map((v, i) => (
              <div key={i} className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                <div>
                  <p className="text-xs font-black text-teal-800">GIẢM {v.discountValue}{v.discountType === 'PERCENTAGE' ? '%' : 'đ'} (x{v.issueQuantity})</p>
                  <p className="text-[10px] text-teal-600">Mã: <strong>{v.code}</strong> · HSD: {v.validDays} ngày</p>
                </div>
                <span className="material-symbols-outlined text-teal-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_activity</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Perks */}
      {data.perks.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">✨ Đặc quyền đang có</p>
          <div className="grid grid-cols-1 gap-1.5">
            {data.perks.map((p, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-slate-50 rounded-xl px-3 py-2">
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-indigo-500 text-base">{p.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-slate-800">{p.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tool Result Renderer ─────────────────────────────────────────────────────
function ToolResultRenderer({ result, onBookingConfirm }: {
  result: ToolResultData;
  onBookingConfirm?: (datetime: string, payMethod: PayMethod, data: BookingPickerData, onError: (msg: string) => void) => void;
}) {
  if (result.type === 'shop_list') return <ShopListCard shops={result.data as ShopWithServices[]} />;
  if (result.type === 'shop_detail') {
    const d = result.data as { shop: ShopInfo; services: ServiceInfo[] };
    return <ShopDetailCard shop={d.shop} services={d.services} />;
  }
  if (result.type === 'pet_list') return <PetListCard pets={result.data as PetSummary[]} />;
  if (result.type === 'pet_detail') return <PetDetailCard pet={result.data as PetDetail} />;
  if (result.type === 'booking_picker') {
    const d = result.data as BookingPickerData;
    return <BookingPickerCard data={d} onConfirm={(dt, pm, onError) => onBookingConfirm?.(dt, pm, d, onError)} />;
  }
  if (result.type === 'booking_success') return <BookingSuccessCard data={result.data as BookingSuccessData} />;
  if (result.type === 'tier_info') return <TierInfoCard data={result.data as TierInfoData} />;
  if (result.type === 'error') {
    const d = result.data as { message: string };
    return <div className="bg-red-50 border border-red-200 rounded-xl p-2 mt-1 text-xs text-red-700">⚠️ {d.message}</div>;
  }
  return null;
}

const QUICK_SUGGESTIONS = [
  { icon: '🏅', text: 'Cấp bậc tài khoản của tôi' },
  { icon: '⭐', text: 'Shop đánh giá cao nhất' },
  { icon: '✂️', text: 'Tìm dịch vụ grooming' },
  { icon: '🐾', text: 'Thú cưng của tôi' },
  { icon: '🏨', text: 'Dịch vụ lưu trú' },
  { icon: '💉', text: 'Tiêm phòng cho thú cưng' },
  { icon: '🏥', text: 'Phòng khám thú y' },
  { icon: '🎟️', text: 'Voucher của tôi' },
];

// Trigger phrases for client-side tier card auto-fetch
const TIER_TRIGGER_PHRASES = [
  'cấp bậc', 'cap bac', 'hạng thành viên', 'hang thanh vien',
  'membership', 'tier', 'thăng hạng', 'nâng cấp',
  'voucher', 'đặc quyền', 'dac quyen', 'ưu đãi thành viên',
  'tổng chi tiêu', 'tich luy', 'tích lũy',
];

// ── Main Chatbot Component ───────────────────────────────────────────────────
const WELCOME_MSG_FN = (name?: string) =>
  'Xin chào' + (name ? ' **' + name + '**' : '') + '! 👋 Tôi là **PetEye Assistant**.\n\nTôi có thể giúp bạn:\n• 🔍 Tìm shop chăm sóc thú cưng phù hợp\n• 🐾 Xem thông tin thú cưng của bạn\n• 📅 Đặt lịch hẹn trực tiếp\n• 🏅 Kiểm tra **cấp bậc thành viên** & voucher\n• 🎁 Xem đặc quyền theo hạng (Đồng → Bạc → Vàng → Kim Cương)\n\nBạn cần tìm gì hôm nay?';

const generateId = () => Math.random().toString(36).slice(2);

// ── Tier Perks (outside component to avoid re-creation) ─────────────────────
const TIER_PERKS_BASE: Record<string, { perks: { title: string; desc: string; icon: string }[] }> = {
  'Đồng':      { perks: [{ title: 'Tích lũy chi tiêu', desc: 'Hệ thống tự động cộng dồn', icon: 'savings' }, { title: 'Ưu đãi cơ bản', desc: 'Áp dụng cho mọi dịch vụ', icon: 'card_membership' }] },
  'Bạc':       { perks: [{ title: 'Ưu tiên hỗ trợ', desc: 'Phản hồi nhanh chóng', icon: 'support_agent' }] },
  'Vàng':      { perks: [{ title: 'Ưu tiên đặt chỗ', desc: 'Xác nhận lịch hẹn nhanh x3', icon: 'bolt' }, { title: 'Tích điểm x2', desc: 'Quy đổi Voucher dễ dàng', icon: 'military_tech' }, { title: 'Hỗ trợ VIP', desc: 'Kênh CSKH riêng biệt 24/7', icon: 'headset_mic' }] },
  'Kim Cương': { perks: [{ title: 'Dịch vụ miễn phí', desc: '1 lần spa/tháng', icon: 'spa' }, { title: 'Hotline VIP', desc: 'Hỗ trợ ngay lập tức 24/7', icon: 'phone_in_talk' }, { title: 'Quà sinh nhật', desc: 'Voucher đặc biệt', icon: 'cake' }] },
};

export default function Chatbot() {
  const { user } = useAuth();
  const location = useLocation();

  // Hide chatbot on messaging pages to prevent overlapping the send button
  if (location.pathname.includes('/messages')) {
    return null;
  }

  const welcomeMsg = WELCOME_MSG_FN(user?.name);
  const { messages, setMessages, isLoading: aiLoading, sendMessage, clearHistory } = useAIChat({
    agentType: 'USER_CHAT',
    welcomeMessage: welcomeMsg,
  });

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isProcessing = aiLoading || loading;

  // ── Tier info fetch ──────────────────────────────────────────────────────

  const fetchAndShowTierCard = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [userData, publicVouchers] = await Promise.all([
        userService.getById(Number(user.id)),
        userService.getPublicVouchers(),
      ]);
      const tierName = userData.currentTier?.name || 'Đồng';
      const totalSpending = userData.totalSpending || 0;
      const thresholds: Record<string, { next: string; val: number }> = {
        'Đồng': { next: 'Bạc', val: 500000 },
        'Bạc':  { next: 'Vàng', val: 1000000 },
        'Vàng': { next: 'Kim Cương', val: 5000000 },
        'Kim Cương': { next: 'Tối đa', val: 5000000 },
      };
      const th = thresholds[tierName] || thresholds['Đồng'];
      const progress = Math.min((totalSpending / th.val) * 100, 100);
      const tierVouchers = publicVouchers.filter((v: any) => v.targetTier?.name === tierName);
      const basePerks = TIER_PERKS_BASE[tierName]?.perks || [];
      const voucherPerks = tierVouchers.map((v: any) => ({
        title: `Voucher Giảm ${v.discountValue}${v.discountType === 'PERCENTAGE' ? '%' : 'đ'} (x${v.issueQuantity})`,
        desc: `Mã ${v.code} · HSD: ${v.validDays} ngày`,
        icon: 'local_activity',
      }));
      const cardData: TierInfoData = {
        currentTierName: tierName,
        totalSpending,
        nextTierName: th.next,
        nextThreshold: th.val,
        progressPercent: progress,
        vouchers: tierVouchers.map((v: any) => ({
          code: v.code, discountValue: v.discountValue,
          discountType: v.discountType, issueQuantity: v.issueQuantity, validDays: v.validDays,
        })),
        perks: [...voucherPerks, ...basePerks],
      };
      
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: 'Đây là thông tin cấp bậc & đặc quyền hiện tại của bạn:',
        timestamp: new Date(),
        toolResult: { type: 'tier_info', data: cardData }
      }]);
    } catch (e) {
      console.error('Tier card fetch error', e);
    }
  }, [user?.id, setMessages]);

  const isTierQuery = useCallback((text: string) => {
    const lower = text.toLowerCase();
    return TIER_TRIGGER_PHRASES.some(p => lower.includes(p));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (open) { setTimeout(() => inputRef.current?.focus(), 100); setHasUnread(false); } }, [open]);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isProcessing) return;
    setInput('');
    if (!open) setHasUnread(true);
    // If the message is about tiers, proactively show the tier card too
    if (isTierQuery(content) && user?.id) {
      fetchAndShowTierCard();
    }
    await sendMessage(content);
  }, [input, isProcessing, open, sendMessage, isTierQuery, fetchAndShowTierCard, user?.id]);

  // Booking confirm — still handled on FE since it needs PayOS redirect
  const handleBookingConfirm = useCallback(async (
    datetime: string,
    payMethod: PayMethod,
    pickerData: BookingPickerData,
    onError: (msg: string) => void
  ) => {
    setLoading(true);
    try {
      if (payMethod === 'PAYOS') {
        const result = await bookingService.initiatePayment({
          shopId: pickerData.shopId,
          serviceId: pickerData.serviceId,
          petId: pickerData.petId,
          appointmentDatetime: datetime,
        });
        if (result.checkoutUrl) {
          await sendMessage(`Đang chuyển đến trang thanh toán PayOS cho ${pickerData.petName}...`);
          setTimeout(() => { window.location.href = result.checkoutUrl; }, 1500);
        } else {
          onError('Không lấy được link thanh toán. Vui lòng thử lại.');
        }
      } else {
        const result = await bookingService.initiateCashDeposit({
          shopId: pickerData.shopId,
          serviceId: pickerData.serviceId,
          petId: pickerData.petId,
          appointmentDatetime: datetime,
          paymentMethod: 'CASH',
        });
        if (result.checkoutUrl) {
          localStorage.setItem('pendingCashDeposit', result.orderCode.toString());
          await sendMessage(
            `✅ Đặt lịch thành công! Để giữ lịch, bạn cần đặt cọc **${result.amount.toLocaleString('vi-VN')}đ** qua PayOS. Đang chuyển đến trang thanh toán...`
          );
          setTimeout(() => { window.location.href = result.checkoutUrl; }, 1800);
        } else {
          onError('Không lấy được link thanh toán cọc. Vui lòng thử lại.');
        }
      }
    } catch (err) {
      // Show error inline on the picker card — do NOT call sendMessage to avoid triggering AI
      onError(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [sendMessage]);

  const handleClearHistory = useCallback(async () => {
    if (!window.confirm('Xóa toàn bộ lịch sử chat?')) return;
    await clearHistory();
    setShowHistory(false);
  }, [clearHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const realMessages = messages.filter(m => m.id !== 'welcome');

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(v => !v)} className="fixed bottom-5 right-5 z-50 group" aria-label="Mo chatbot">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-indigo-500 blur-lg opacity-40 group-hover:opacity-70 transition duration-300"></div>
          {/* NOTE: Bạn có thể đổi w-16 h-16 thành w-14 h-14 (nhỏ hơn) hoặc w-20 h-20 (lớn hơn) ở class bên dưới để tùy chỉnh kích thước */}
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#1a2b4c] via-indigo-600 to-purple-600 text-white shadow-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110">
            {open ? (
              <span className="material-symbols-outlined text-2xl">close</span>
            ) : (
              <>
                <div className="absolute inset-0 rounded-full border border-white/20 animate-ping"></div>
                {/* Tùy chỉnh kích thước icon bên trong ở text-[...] */}
                <span className="material-symbols-outlined text-[36px] drop-shadow-lg">support_agent</span>
                {hasUnread && (
                  <span className="absolute top-0.5 right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white"></span>
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[370px] max-w-[calc(100vw-24px)] flex flex-col rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden border border-slate-200 bg-white" style={{ height: 'min(640px, calc(100vh - 120px))' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#1a2b4c] to-indigo-600 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-sm">PetEye Assistant</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-indigo-200 text-xs">Luôn sẵn sàng hỗ trợ</span>
              </div>
            </div>
            <button onClick={() => setShowHistory(v => !v)} className={"w-8 h-8 rounded-full flex items-center justify-center transition-colors " + (showHistory ? 'bg-white/30' : 'hover:bg-white/20')} title="Lich su">
              <span className="material-symbols-outlined text-white text-lg">history</span>
            </button>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-white text-lg">close</span>
            </button>
          </div>

          {showHistory ? (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                <p className="font-bold text-slate-800 text-sm">Lịch sử ({realMessages.length} tin nhắn)</p>
                <button onClick={handleClearHistory} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold">
                  <span className="material-symbols-outlined text-sm">delete</span>Xóa tất cả
                </button>
              </div>
              {realMessages.length === 0
                ? <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Chưa có lịch sử chat</div>
                : <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                  {realMessages.map(msg => (
                    <div key={msg.id} className={"flex gap-2 " + (msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                      <div className={"max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed " + (msg.role === 'user' ? 'bg-[#1a2b4c] text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm')}>
                        <p className="line-clamp-3">{msg.content}</p>
                        <p className={"text-[10px] mt-1 " + (msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400')}>{msg.timestamp.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              }
              <div className="p-3 border-t border-slate-200 bg-white">
                <button onClick={() => setShowHistory(false)} className="w-full py-2 bg-[#1a2b4c] text-white text-xs font-bold rounded-xl hover:bg-[#243d6b] transition-colors">Quay lại chat</button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3 bg-slate-50/80">
                {messages.map(msg => (
                  <div key={msg.id} className={"flex gap-2 " + (msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a2b4c] to-indigo-500 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <span className="text-white text-xs font-black">P</span>
                      </div>
                    )}
                    <div className={"max-w-[85%] flex flex-col gap-1 " + (msg.role === 'user' ? 'items-end' : 'items-start')}>
                      <div className={"px-3 py-2.5 rounded-2xl leading-relaxed " + (msg.role === 'user' ? 'bg-[#1a2b4c] text-white rounded-tr-sm text-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm')}>
                        {msg.isLoading ? (
                          <div className="flex gap-1 items-center py-1">
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : msg.role === 'user' ? (
                          <span className="text-sm">{msg.content}</span>
                        ) : (
                          <RichText text={msg.content} />
                        )}
                      </div>
                      {msg.toolResult && (
                        <ToolResultRenderer
                          result={msg.toolResult as ToolResultData}
                          onBookingConfirm={handleBookingConfirm}
                        />
                      )}
                      <span className="text-[10px] text-slate-400">{msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a2b4c] to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white text-xs font-black">P</span>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick suggestions */}
              <div className="px-3 py-2 bg-white border-t border-slate-100 shrink-0">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {QUICK_SUGGESTIONS.map(s => (
                    <button key={s.text} onClick={() => handleSend(s.text)} disabled={isProcessing}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-full text-[11px] font-semibold text-slate-600 transition-colors whitespace-nowrap disabled:opacity-40">
                      <span>{s.icon}</span>{s.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="px-3 py-3 bg-white border-t border-slate-100 shrink-0">
                {!user && (
                  <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">info</span>
                  <span><Link to="/login" className="font-bold underline">Đăng nhập</Link> để lưu lịch sử & đặt lịch</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Nhập câu hỏi..." disabled={isProcessing}
                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none" />
                  <button onClick={() => handleSend()} disabled={!input.trim() || isProcessing}
                    className="w-8 h-8 rounded-xl bg-[#1a2b4c] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#243d6b] transition-colors shrink-0">
                    <span className="material-symbols-outlined text-base">send</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
