// Tab2MajorDetail — Báo cáo chi tiết từng ngành
import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { FileBarChart, FlaskConical, Lightbulb, ChevronRight, GitCompare } from 'lucide-react';
import type { FilterState, MonthlyStat, BaselineIntake, StudentRecord, Major, DauVaoStatusRow } from '../types';
import { MONTH_LABELS, fmtPct, fmtNum } from '../calc';
import { nhdnByMajor, systemMajorCompare, aiMajorCrossAnalysis, byMajorRetentionLifetime, type MajorAiContext } from '../calc';
import { QUALITATIVE_TEMPLATES, DOC_REPORTS } from '../data';
import { AIInsightBox } from './AIInsightBox';
import { Card, CardHeader } from './ui';

const axisStyle = { fontSize: 11, fill: '#94a3b8' };
const COLORS = { good: '#10b981', danger: '#ef4444', accent: '#3b82f6', warn: '#f59e0b', violet: '#8b5cf6' };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-semibold text-slate-200">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} /><span>{p.name}:</span><span className="font-semibold text-white">{fmtNum(p.value)}</span></div>
      ))}
    </div>
  );
}

const MAJOR_LIST: Major[] = [
  'Quản trị doanh nghiệp vừa và nhỏ (VMS)', 'Digital Marketing (DMK)', 'Quản trị khách sạn (VMH)',
  'Chăm sóc sắc đẹp (BTF)', 'Công nghệ ô tô (VIT)', 'Thiết kế đồ hoạ (VIG)', 'Ứng dụng phần mềm (VIS)',
  'Tiếng Trung Quốc (TTQ)', 'Phiên dịch tiếng Anh thương mại (VLB)', 'Tiếng Hàn Quốc (VLK)', 'Tiếng Nhật (TN)',
];

export function Tab2MajorDetail({ stats, baseline, students, filter, dauvaoStatus }: { stats: MonthlyStat[]; baseline: BaselineIntake[]; students: StudentRecord[]; filter: FilterState; dauvaoStatus: DauVaoStatusRow[] }) {
  const [selected, setSelected] = useState<Major>(filter.majors[0] ?? MAJOR_LIST[0]);
  const tpl = QUALITATIVE_TEMPLATES[selected];

  // Đầu vào & Đang học: nguồn "Đầu vào các khóa.xlsx" lũy kế (đồng nhất với Thẻ 1), KHÔNG dùng
  // computeMajorRetention(stats, baseline) nữa vì baseline là bản trích xuất cũ + stats chỉ là năm học hiện tại.
  const majorRetention = useMemo(() => byMajorRetentionLifetime(dauvaoStatus, { ...filter, majors: [selected] }), [dauvaoStatus, filter, selected]);
  const r = majorRetention[0];
  const monthlyForMajor = useMemo(() => {
    const rows = stats.filter((s) => s.major === selected && filter.months.includes(s.month) && (!filter.cohorts.length || filter.cohorts.includes(s.cohort)));
    const byMonth = new Map<string, number>();
    for (const m of filter.months) {
      byMonth.set(m, rows.filter((x) => x.month === m).reduce((s, x) => s + x.thoi_hoc, 0));
    }
    return Array.from(byMonth.entries()).map(([month, thoi_hoc]) => ({ month: MONTH_LABELS[month as keyof typeof MONTH_LABELS], thoi_hoc }));
  }, [stats, filter, selected]);
  const nhdnRows = useMemo(() => nhdnByMajor(stats, students, { ...filter, majors: [selected] }, 8), [stats, students, filter, selected]);

  return (
    <div className="space-y-4">
      {/* Major selector */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Chọn ngành:</span>
          {MAJOR_LIST.map((m) => (
            <button key={m} onClick={() => setSelected(m)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${selected === m ? 'bg-accent text-white shadow-glow' : 'bg-ink-800/60 text-slate-300 hover:bg-ink-700/60'}`}>{m}</button>
          ))}
        </div>
      </Card>

      {/* Part I — Định lượng */}
      <Card>
        <CardHeader title={`Phần I — Phân tích định lượng: ${selected}`} subtitle="Đầu vào tuyển sinh vs Đang học · xu hướng thôi học theo tháng · danh sách NHDN" icon={<FileBarChart className="h-4 w-4" />} />
        <div className="p-5">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Đầu vào" value={r ? fmtNum(r.dau_vao) : '-'} tone="accent" />
            <Stat label="Đang học" value={r ? fmtNum(r.dang_hoc_hien_tai) : '-'} tone="good" />
            <Stat label="Giữ chân" value={r ? fmtPct(r.gan_ket_pct) : '-'} tone={r && r.gan_ket_pct < 85 ? 'danger' : 'good'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Đầu vào vs Đang học</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[{ name: 'Đầu vào', value: r?.dau_vao ?? 0 }, { name: 'Đang học', value: r?.dang_hoc_hien_tai ?? 0 }]} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={axisStyle} />
                  <YAxis tick={axisStyle} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Số lượng" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Thôi học theo tháng</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyForMajor} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={axisStyle} angle={-30} textAnchor="end" height={50} interval={0} />
                  <YAxis tick={axisStyle} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="thoi_hoc" name="Thôi học" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Danh sách sinh viên nghỉ học dài ngày của ngành</h4>
            {nhdnRows.length === 0 ? (
              <p className="rounded-lg bg-ink-800/40 px-4 py-6 text-center text-sm text-slate-500">Không có sinh viên NHDN trong giai đoạn lọc.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-ink-700/60">
                <table className="w-full text-sm">
                  <thead className="bg-ink-800/60">
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-medium">Ngành</th>
                      <th className="px-3 py-2 text-right font-medium">NHDN</th>
                      <th className="px-3 py-2 text-right font-medium">Mất liên lạc</th>
                      <th className="px-4 py-2 text-right font-medium">Tỉ lệ MLL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nhdnRows.map((row) => (
                      <tr key={row.major} className="border-t border-ink-800/60">
                        <td className="px-4 py-2 text-slate-200">{row.major}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-400">{fmtNum(row.nghi_hoc_dai_ngay)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-red-400">{fmtNum(row.mat_lien_lac)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-300">{fmtPct(row.ti_le_mat_lien_lac, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* System comparison chart — Cao đẳng vs Trung cấp */}
      <Card>
        <CardHeader title={`Đối soát hệ đào tạo theo ngành: ${selected}`} subtitle="So sánh Cao đẳng vs Trung cấp: Tỷ lệ thôi học · Bảo lưu · Nhóm nguy cơ" icon={<GitCompare className="h-4 w-4" />} />
        <div className="p-5">
          {(() => {
            const cmpRows = systemMajorCompare(stats, baseline, { ...filter, majors: [selected] });
            const row = cmpRows[0];
            if (!row) return <p className="text-center text-sm text-slate-500">Không đủ dữ liệu để so sánh hệ đào tạo cho ngành này.</p>;
            const chartData = [
              { name: 'Thôi học', 'Hệ Cao đẳng': row.ti_le_thoi_cd, 'Hệ Trung cấp': row.ti_le_thoi_tc },
              { name: 'Bảo lưu', 'Hệ Cao đẳng': row.ti_le_bao_luu_cd, 'Hệ Trung cấp': row.ti_le_bao_luu_tc },
              { name: 'Nhóm nguy cơ', 'Hệ Cao đẳng': row.ti_le_nguy_co_cd, 'Hệ Trung cấp': row.ti_le_nguy_co_tc },
            ];
            return (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v}%`} axisLine={{ stroke: '#334155' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                      contentStyle={{ background: '#0f1626', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Hệ Cao đẳng" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                    <Bar dataKey="Hệ Trung cấp" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat2 label="CD — Thôi học" value={fmtPct(row.ti_le_thoi_cd)} tone="danger" />
                  <Stat2 label="TC — Thôi học" value={fmtPct(row.ti_le_thoi_tc)} tone="danger" />
                  <Stat2 label="CD — Nguy cơ" value={fmtPct(row.ti_le_nguy_co_cd)} tone="warn" />
                  <Stat2 label="TC — Nguy cơ" value={fmtPct(row.ti_le_nguy_co_tc)} tone="warn" />
                  <Stat2 label="CD — Bảo lưu" value={fmtPct(row.ti_le_bao_luu_cd)} tone="accent" />
                  <Stat2 label="TC — Bảo lưu" value={fmtPct(row.ti_le_bao_luu_tc)} tone="accent" />
                </div>
              </>
            );
          })()}
        </div>
      </Card>

      {/* Part II — Định tính */}
      <Card>
        <CardHeader title={`Phần II — Phân tích định tính: ${selected}`} subtitle="Mô hình quản lý · nguyên nhân gốc rễ · rào cản drop-out 4 nhóm" icon={<FlaskConical className="h-4 w-4" />} />
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-4">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-accent-soft">Mô hình quản lý hiện tại</h4>
            <p className="text-sm leading-relaxed text-slate-200">{tpl.moHinhQuanLy}</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">Phân tích nguyên nhân gốc rễ</h4>
            <p className="text-sm leading-relaxed text-slate-200">{tpl.nguyenNhanGocRe}</p>
          </div>
          <div>
            <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Bảng nhận diện rào cản Drop-out</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <BarrierCard title="Khách quan" content={tpl.raoCan.khach_quan} tone="accent" />
              <BarrierCard title="Chủ quan từ sinh viên" content={tpl.raoCan.chu_quan_sv} tone="warn" />
              <BarrierCard title="Từ phía Nhà trường" content={tpl.raoCan.nha_truong} tone="danger" />
              <BarrierCard title="Từ nội tại Ngành học" content={tpl.raoCan.noi_tai_nganh} tone="violet" />
            </div>
          </div>
        </div>
      </Card>

      {/* Part III — Đề xuất */}
      <Card>
        <CardHeader title={`Phần III — Đề xuất & Kiến nghị gửi BGH: ${selected}`} subtitle="Hành động cụ thể giảm tỷ lệ drop-out của ngành" icon={<Lightbulb className="h-4 w-4" />} />
        <div className="p-5">
          <div className="space-y-2.5">
            {tpl.deXuat.map((d, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-500/20 text-xs font-bold text-emerald-300">{i + 1}</span>
                <p className="text-sm leading-relaxed text-slate-200">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* AI Cross-Analysis — đối soát định lượng + định tính (Word report) */}
      {(() => {
        const allMajorRows = byMajorRetentionLifetime(dauvaoStatus, filter);
        const retRow = allMajorRows.find((r) => r.major === selected) ?? null;
        const cmpRows = systemMajorCompare(stats, baseline, { ...filter, majors: [selected] });
        const doc = DOC_REPORTS.find((d) => d.tag === selected.split(' ').map(w => w[0]).join('').slice(0, 4).toUpperCase())
          ?? DOC_REPORTS.find((d) => d.nganh === selected);
        const ctx: MajorAiContext = {
          major: selected,
          retention: retRow,
          compare: cmpRows[0] ?? null,
          docPhanI: doc?.phanI, docPhanII: doc?.phanII, docPhanIII: doc?.phanIII,
          moHinhQuanLy: tpl.moHinhQuanLy, nguyenNhanGocRe: tpl.nguyenNhanGocRe,
          raoCan: tpl.raoCan, deXuat: tpl.deXuat,
        };
        const insight = aiMajorCrossAnalysis(ctx);
        return <AIInsightBox insight={insight} title={`AI Phân tích đối soát chéo — Định lượng × Báo cáo Khoa`} />;
      })()}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'good' | 'danger' | 'accent' | 'warn' }) {
  const cls = { good: 'text-emerald-400', danger: 'text-red-400', accent: 'text-blue-300', warn: 'text-amber-400' }[tone];
  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-3.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}

function Stat2({ label, value, tone }: { label: string; value: string; tone: 'danger' | 'warn' | 'accent' }) {
  const c = { danger: 'text-red-400', warn: 'text-amber-400', accent: 'text-blue-400' };
  return (<div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5 text-center"><div className="text-[10px] text-slate-500">{label}</div><div className={`text-sm font-bold ${c[tone]}`}>{value}</div></div>);
}

function BarrierCard({ title, content, tone }: { title: string; content: string; tone: 'accent' | 'warn' | 'danger' | 'violet' }) {  const cls = {
    accent: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
    warn: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    danger: 'border-red-500/30 bg-red-500/5 text-red-300',
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-300',
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <ChevronRight className="h-3.5 w-3.5" />{title}
      </div>
      <p className="text-sm leading-relaxed text-slate-200">{content}</p>
    </div>
  );
}
