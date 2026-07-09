// FilterBar — Giai đoạn, Hệ đào tạo, Ngành học, Khóa học
import { CalendarDays, Layers, BookOpen, Users, RotateCcw } from 'lucide-react';
import { MultiSelect, Chip, Button } from './ui';
import { ALL_MONTHS, MONTH_LABELS, QUARTER_MAP, type FilterState, type Major, type MonthKey, type TrainingSystem, type CohortKey } from '../types';

const SYSTEMS: TrainingSystem[] = ['Cao đẳng', 'Trung cấp'];
const MAJORS: Major[] = [
  'Quản trị doanh nghiệp vừa và nhỏ (VMS)', 'Digital Marketing (DMK)', 'Quản trị khách sạn (VMH)',
  'Chăm sóc sắc đẹp (BTF)', 'Công nghệ ô tô (VIT)', 'Thiết kế đồ hoạ (VIG)', 'Ứng dụng phần mềm (VIS)',
  'Tiếng Trung Quốc (TTQ)', 'Phiên dịch tiếng Anh thương mại (VLB)', 'Tiếng Hàn Quốc (VLK)', 'Tiếng Nhật (TN)',
];
const COHORTS: CohortKey[] = ['K23', 'K24', 'K25'];

export function FilterBar({ filter, onChange }: { filter: FilterState; onChange: (next: FilterState) => void }) {
  const monthOptions = [
    { value: 'q:Q3/2025', label: 'Quý 3/2025 (T7–T9/2025)' },
    { value: 'q:Q4/2025', label: 'Quý 4/2025 (T10–T12/2025)' },
    { value: 'q:Q1/2026', label: 'Quý 1/2026 (T1–T3/2026)' },
    { value: 'q:Q2/2026', label: 'Quý 2/2026 (T4–T6/2026)' },
    ...ALL_MONTHS.map((m) => ({ value: `m:${m}`, label: MONTH_LABELS[m] })),
  ];
  const selectedMonthValues = filter.months.map((m) => `m:${m}`);

  function handleMonthsChange(next: string[]) {
    const months = new Set<MonthKey>();
    for (const v of next) {
      if (v.startsWith('m:')) months.add(v.slice(2) as MonthKey);
      else if (v.startsWith('q:')) for (const m of QUARTER_MAP[v.slice(2)] ?? []) months.add(m);
    }
    onChange({ ...filter, months: ALL_MONTHS.filter((m) => months.has(m)) });
  }

  function reset() { onChange({ months: [...ALL_MONTHS], systems: [], majors: [], cohorts: [] }); }

  const activeChips: Array<{ label: string; onRemove?: () => void }> = [];
  filter.cohorts.forEach((c) => activeChips.push({ label: c, onRemove: () => onChange({ ...filter, cohorts: filter.cohorts.filter((x) => x !== c) }) }));
  filter.systems.forEach((s) => activeChips.push({ label: s, onRemove: () => onChange({ ...filter, systems: filter.systems.filter((x) => x !== s) }) }));
  filter.majors.forEach((m) => activeChips.push({ label: m, onRemove: () => onChange({ ...filter, majors: filter.majors.filter((x) => x !== m) }) }));
  const hasActiveFilter = filter.cohorts.length || filter.systems.length || filter.majors.length || filter.months.length !== ALL_MONTHS.length;

  return (
    <div className="border-b border-ink-700/60 bg-ink-900/60 backdrop-blur-sm">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-8 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <MultiSelect label="Giai đoạn" options={monthOptions} selected={selectedMonthValues} onChange={handleMonthsChange} placeholder="Toàn kỳ (T7/2025–T6/2026)" width="w-64" />
          </div>
          <div className="flex flex-col">
            <MultiSelect label="Hệ đào tạo" options={SYSTEMS.map((s) => ({ value: s, label: s }))} selected={filter.systems} onChange={(n) => onChange({ ...filter, systems: n as TrainingSystem[] })} placeholder="Tất cả hệ" width="w-44" />
          </div>
          <div className="flex flex-col">
            <MultiSelect label="Ngành học" options={MAJORS.map((m) => ({ value: m, label: m }))} selected={filter.majors} onChange={(n) => onChange({ ...filter, majors: n as Major[] })} placeholder="Tất cả ngành" width="w-60" />
          </div>
          <div className="flex flex-col">
            <MultiSelect label="Khóa học" options={COHORTS.map((c) => ({ value: c, label: c }))} selected={filter.cohorts} onChange={(n) => onChange({ ...filter, cohorts: n as CohortKey[] })} placeholder="Tất cả khóa" width="w-40" />
          </div>
          <div className="ml-auto flex items-end gap-2">
            {hasActiveFilter && <Button onClick={reset} variant="outline" size="md"><RotateCcw className="h-3.5 w-3.5" />Đặt lại bộ lọc</Button>}
          </div>
        </div>
        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Đang lọc:</span>
            {activeChips.map((chip, i) => <Chip key={i} label={chip.label} onRemove={chip.onRemove} />)}
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-4 text-[11px] text-slate-600">
          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Giai đoạn</span>
          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> Hệ đào tạo</span>
          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Ngành học</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Khóa học</span>
        </div>
      </div>
    </div>
  );
}
