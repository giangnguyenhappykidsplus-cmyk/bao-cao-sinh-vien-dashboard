// KpiCards — 6 metric cards, click to open AI analysis panel
import { Users, GraduationCap, UserMinus, ShieldAlert, AlertTriangle, HeartPulse, TrendingUp, Sparkles, Eye } from 'lucide-react';
import type { KpiSnapshot, KpiDrillKey } from '../types';
import { fmtPct } from '../calc';

const DRILL_LABELS: Record<KpiDrillKey, string> = {
  dang_hoc: 'Quy mô & Đang học',
  thoi_hoc: 'Tình hình thôi học',
  bao_luu: 'Tình hình bảo lưu',
  nghi_hoc_dai_ngay: 'Nghỉ học dài ngày',
  nhom_nguy_co: 'Tỷ lệ nhóm nguy cơ',
  quay_lai: 'Sinh viên quay lại học',
};

function KpiCard({ icon, label, tone, children, caption, active, onClick, onViewStudents }: {
  icon: React.ReactNode; label: string; tone: 'accent' | 'good' | 'danger' | 'warn' | 'risk' | 'violet';
  children: React.ReactNode; caption?: string; active: boolean; onClick: () => void; onViewStudents: () => void;
}) {
  const toneRing = {
    accent: 'ring-blue-500/20 text-blue-300', good: 'ring-emerald-500/20 text-emerald-300',
    danger: 'ring-red-500/20 text-red-300', warn: 'ring-amber-500/20 text-amber-300',
    risk: 'ring-orange-500/20 text-orange-300', violet: 'ring-violet-500/20 text-violet-300',
  }[tone];
  return (
    <button onClick={onClick} className={`group relative flex w-full flex-col rounded-2xl border p-4 text-left shadow-card transition-all animate-slideUp ${active ? 'border-accent bg-ink-800/90 shadow-glow ring-1 ring-accent/40' : 'border-ink-700/70 bg-ink-850/80 hover:border-ink-600/80 hover:bg-ink-800/80'}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg bg-ink-800/80 ring-1 ${toneRing}`}>{icon}</span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">{children}</div>
      {caption && <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{caption}</p>}
      <span onClick={(e) => { e.stopPropagation(); onViewStudents(); }} className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 transition-colors hover:text-blue-300">
        <Eye className="h-3 w-3" /> Danh sách SV
      </span>
      {active && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-blue-200 ring-1 ring-accent/40">
          <Sparkles className="h-3 w-3" /> Đang phân tích
        </span>
      )}
    </button>
  );
}

function BadgePct({ value, tone }: { value: number; tone: 'good' | 'danger' | 'risk' | 'violet' }) {
  const cls = {
    good: 'bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/30',
    danger: 'bg-red-500/12 text-red-300 ring-1 ring-red-500/30',
    risk: 'bg-orange-500/12 text-orange-300 ring-1 ring-orange-500/30',
    violet: 'bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/30',
  }[tone];
  return <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}><TrendingUp className={`h-3 w-3 ${tone !== 'good' ? 'rotate-180' : ''}`} />{fmtPct(value)}</span>;
}

export function KpiCards({ kpi, quyMoDauKy, dangHocHienTai, activeDrill, onDrill, onViewStudents }: {
  kpi: KpiSnapshot; quyMoDauKy: number; dangHocHienTai: number;
  activeDrill: KpiDrillKey | null; onDrill: (key: KpiDrillKey) => void; onViewStudents: (key: KpiDrillKey) => void;
}) {
  // Thẻ 1 (Quy mô & Đang học) dùng nguồn riêng "Đầu vào các khóa.xlsx" lũy kế — KHÔNG dùng
  // kpi.tong_sinh_vien_dau_ky / kpi.dang_hoc, để không ảnh hưởng mẫu số Thẻ 3 (Bảo lưu) bên dưới.
  const dangHocPctC1 = quyMoDauKy > 0 ? (dangHocHienTai / quyMoDauKy) * 100 : 0;
  const num = (v: number, suffix: string) => (
    <span className="text-2xl font-semibold text-white transition-colors group-hover:text-blue-300">{v.toLocaleString('vi-VN')}<span className="ml-1 text-xs font-normal text-slate-500">{suffix}</span></span>
  );

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {/* Card 1: Quy mô & Đang học (số dư tại tháng B) */}
      <KpiCard icon={<GraduationCap className="h-4 w-4" />} label="Quy mô & Đang học" tone="good"
        caption={`Quy mô đầu kỳ: ${quyMoDauKy.toLocaleString('vi-VN')} SV`}
        active={activeDrill === 'dang_hoc'} onClick={() => onDrill('dang_hoc')} onViewStudents={() => onViewStudents('dang_hoc')}>
        {num(dangHocHienTai, 'SV')}
        <BadgePct value={dangHocPctC1} tone="good" />
      </KpiCard>

      {/* Card 2: Thôi học (cộng dồn phát sinh) */}
      <KpiCard icon={<UserMinus className="h-4 w-4" />} label="Thôi học" tone="danger"
        caption="Cộng dồn phát sinh từ tháng A đến tháng B"
        active={activeDrill === 'thoi_hoc'} onClick={() => onDrill('thoi_hoc')} onViewStudents={() => onViewStudents('thoi_hoc')}>
        {num(kpi.thoi_hoc, 'SV')}
        <BadgePct value={kpi.thoi_hoc_pct} tone="danger" />
      </KpiCard>

      {/* Card 3: Bảo lưu (cộng dồn phát sinh) */}
      <KpiCard icon={<ShieldAlert className="h-4 w-4" />} label="Bảo lưu" tone="violet"
        caption="Cộng dồn phát sinh từ tháng A đến tháng B"
        active={activeDrill === 'bao_luu'} onClick={() => onDrill('bao_luu')} onViewStudents={() => onViewStudents('bao_luu')}>
        {num(kpi.bao_luu, 'SV')}
        <BadgePct value={kpi.bao_luu > 0 && kpi.tong_sinh_vien_dau_ky > 0 ? (kpi.bao_luu / kpi.tong_sinh_vien_dau_ky) * 100 : 0} tone="violet" />
      </KpiCard>

      {/* Card 4: Nghỉ học dài ngày (lũy kế tại tháng B) */}
      <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Nghỉ học dài ngày" tone="warn"
        caption="Số dư/lũy kế tại tháng B — không cộng dồn"
        active={activeDrill === 'nghi_hoc_dai_ngay'} onClick={() => onDrill('nghi_hoc_dai_ngay')} onViewStudents={() => onViewStudents('nghi_hoc_dai_ngay')}>
        {num(kpi.nghi_hoc_dai_ngay, 'SV')}
      </KpiCard>

      {/* Card 5: Nhóm nguy cơ */}
      <KpiCard icon={<ShieldAlert className="h-4 w-4" />} label="Tỷ lệ nhóm nguy cơ" tone="risk"
        caption="Thôi học + NHDN + Bảo lưu"
        active={activeDrill === 'nhom_nguy_co'} onClick={() => onDrill('nhom_nguy_co')} onViewStudents={() => onViewStudents('nhom_nguy_co')}>
        {num(kpi.nhom_nguy_co, 'SV')}
        <BadgePct value={kpi.nhom_nguy_co_pct} tone="risk" />
      </KpiCard>

      {/* Card 6: Quay lại học (cộng dồn phát sinh) */}
      <KpiCard icon={<HeartPulse className="h-4 w-4" />} label="Quay lại học" tone="accent"
        caption="Cộng dồn phục hồi từ tháng A đến tháng B"
        active={activeDrill === 'quay_lai'} onClick={() => onDrill('quay_lai')} onViewStudents={() => onViewStudents('quay_lai')}>
        {num(kpi.quay_lai, 'SV')}
      </KpiCard>
    </div>
  );
}

export { DRILL_LABELS };
// keep Users import used
void Users;
