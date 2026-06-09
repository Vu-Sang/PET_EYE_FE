import React, { useState, useRef, useEffect } from 'react';
import type { StaffResponse } from '../services/staff.service';

interface Props {
  bookingId: number;
  status?: string;
  currentStaffId?: number | null;
  staffList: StaffResponse[];
  updatingId?: number | null;
  onAssign: (bookingId: number, staffId: number | 'unassign') => void;
  selectClassName?: string;
}

export default function StaffAssignmentSelect({ bookingId, status, currentStaffId, staffList = [], updatingId, onAssign, selectClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => { if (!open) setHighlight(null); }, [open]);

  const handleSelect = (value: string) => {
    setOpen(false);
    if (value === 'unassign') return onAssign(bookingId, 'unassign');
    if (value === 'none') return;
    return onAssign(bookingId, Number(value));
  };

  const label = staffList.find(s => s.id === currentStaffId)?.fullName || 'Chọn nhân viên';

  return (
    <div ref={ref} className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHighlight(0); }
          if (e.key === 'Escape') setOpen(false);
        }}
        disabled={updatingId === bookingId}
        className={selectClassName || "w-full text-left pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"}
      >
        {label}
      </button>

      {open && (
        <ul role="listbox" tabIndex={-1} className="absolute z-50 right-0 left-0 mt-2 max-h-60 overflow-auto rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
          {!currentStaffId && (
            <li role="option" onClick={() => handleSelect('none')} className={`px-3 py-2 text-sm cursor-pointer ${highlight === 0 ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
              Chọn nhân viên
            </li>
          )}
          {staffList.map((s, idx) => (
            <li key={s.id} role="option" onClick={() => handleSelect(String(s.id))} className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 ${highlight === idx + 1 ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
              {s.fullName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
