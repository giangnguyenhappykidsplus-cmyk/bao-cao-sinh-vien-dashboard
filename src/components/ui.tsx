// Shared UI primitives — dark dashboard theme
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export function Card({ children, className = '', glow = false }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`rounded-2xl border border-ink-700/70 bg-ink-850/80 backdrop-blur-sm shadow-card ${glow ? 'shadow-glow' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-700/60 text-accent-soft">{icon}</div>}
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

type BadgeTone = 'neutral' | 'good' | 'warn' | 'danger' | 'risk' | 'accent' | 'violet';
const toneMap: Record<BadgeTone, string> = {
  neutral: 'bg-ink-700/60 text-slate-300 ring-1 ring-ink-600/50',
  good: 'bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30',
  warn: 'bg-amber-500/12 text-amber-300 ring-1 ring-amber-500/30',
  danger: 'bg-red-500/12 text-red-300 ring-1 ring-red-500/30',
  risk: 'bg-orange-500/12 text-orange-300 ring-1 ring-orange-500/30',
  accent: 'bg-blue-500/12 text-blue-300 ring-1 ring-blue-500/30',
  violet: 'bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/30',
};

export function Badge({ children, tone = 'neutral', className = '', pulse = false }: { children: ReactNode; tone?: BadgeTone; className?: string; pulse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneMap[tone]} ${className}`}>
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulseDot" />}
      {children}
    </span>
  );
}

export function Button({ children, onClick, variant = 'ghost', size = 'md', className = '', title }: { children: ReactNode; onClick?: () => void; variant?: 'ghost' | 'solid' | 'outline'; size?: 'sm' | 'md'; className?: string; title?: string }) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm' };
  const variants = {
    ghost: 'text-slate-300 hover:bg-ink-700/60 hover:text-white',
    solid: 'bg-accent text-white hover:bg-blue-500 shadow-glow',
    outline: 'border border-ink-600/70 text-slate-200 hover:bg-ink-700/50 hover:border-ink-500',
  };
  return <button title={title} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}

export interface MultiSelectOption { value: string; label: string }

export function MultiSelect({ label, options, selected, onChange, placeholder = 'Tất cả', width = 'w-56' }: { label: string; options: MultiSelectOption[]; selected: string[]; onChange: (next: string[]) => void; placeholder?: string; width?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const display = selected.length === 0 ? placeholder : selected.length <= 2 ? options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ') : `${selected.length} mục đã chọn`;

  function toggle(v: string) { onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]); }

  return (
    <div ref={ref} className="relative">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <button onClick={() => setOpen((o) => !o)} className={`flex h-9 w-full items-center justify-between gap-2 rounded-lg border px-3 text-sm transition-colors ${open ? 'border-accent bg-ink-800 text-white' : 'border-ink-700/70 bg-ink-800/60 text-slate-300 hover:border-ink-600'} ${width}`}>
        <span className="truncate">{display}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 w-full min-w-full rounded-xl border border-ink-700 bg-ink-850 p-1.5 shadow-card animate-scaleIn origin-top">
          {options.length > 6 && (
            <div className="mb-1.5 flex items-center gap-2 rounded-md bg-ink-800 px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-500" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm kiếm..." className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none" />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto pr-0.5">
            {filtered.length === 0 && <div className="px-2.5 py-3 text-center text-xs text-slate-500">Không tìm thấy mục nào</div>}
            {filtered.map((o) => {
              const active = selected.includes(o.value);
              return (
                <button key={o.value} onClick={() => toggle(o.value)} className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${active ? 'bg-accent/15 text-blue-200' : 'text-slate-300 hover:bg-ink-700/60'}`}>
                  <span className="truncate">{o.label}</span>
                  {active && <Check className="h-4 w-4 text-blue-400" />}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-1 flex items-center justify-between border-t border-ink-700/60 px-2 pt-1.5">
              <button onClick={() => onChange([])} className="text-xs text-slate-400 hover:text-slate-200">Bỏ chọn tất cả</button>
              <button onClick={() => setOpen(false)} className="text-xs font-medium text-accent-soft hover:text-blue-300">Xong</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-700/60 px-2 py-1 text-xs text-slate-300 ring-1 ring-ink-600/50">
      {label}
      {onRemove && <button onClick={onRemove} className="text-slate-500 transition-colors hover:text-slate-200"><X className="h-3 w-3" /></button>}
    </span>
  );
}

export function DrillNumber({ value, onClick, className = '', suffix }: { value: number | string; onClick?: () => void; className?: string; suffix?: string }) {
  const content = <>{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}{suffix && <span className="ml-0.5 text-xs text-slate-500">{suffix}</span>}</>;
  if (!onClick) return <span className={className}>{content}</span>;
  return <button onClick={onClick} className={`cursor-pointer rounded px-0.5 py-0.5 font-semibold transition-colors hover:bg-accent/15 hover:text-blue-300 ${className}`} title="Xem danh sách sinh viên chi tiết">{content}</button>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="flex h-32 items-center justify-center text-sm text-slate-500">{message}</div>;
}
