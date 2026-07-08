// Tab1Overview — Tổng quan tab (overview charts when no KPI drill is active)
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell,
} from 'recharts';
import { TrendingDown, BarChart3, HeartPulse, Activity, ShieldAlert, Sparkles } from 'lucide-react';
import type { FilterState, MonthlyStat, BaselineIntake, StudentRecord, KpiDrillKey } from '../types';
import { MONTH_LABELS, SAFE_RETENTION_THRESHOLD, fmtPct, fmtNum } from '../calc';
import {
  computeCohortRetention, topDropoutByMajor, topDropoutByCohort, riskByMajor,
  returnTrend, causeSummary,
} from '../calc';
import { Card, CardHeader, Badge } from './ui';

const COLORS = { good: '#10b981', warn: '#f59e0b', danger: '#ef4444', risk: '#f97316', accent: '#3b82f6', violet: '#8b5cf6', cyan: '#06b6d4' };
const axisStyle = { fontSize: 11, fill: '#94a3b8' };

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

export function Tab1Overview({
  stats, baseline, students, filter, onDrill,
}: {
  stats: MonthlyStat[]; baseline: BaselineIntake[]; students: StudentRecord[];
  filter: FilterState; onDrill: (key: KpiDrillKey) => void;
}) {
  const cohortRows = useMemo(() => computeCohortRetention(stats, baseline, filter), [stats, baseline, filter]);
  const topMajors = useMemo(() => topDropoutByMajor(stats, filter, 8), [stats, filter]);
  const topCohorts = useMemo(() => topDropoutByCohort(stats, filter), [stats, filter]);
  const riskRows = useMemo(() => riskByMajor(stats, filter, 5), [stats, filter]);
  const trend = useMemo(() => returnTrend(stats, filter), [stats, filter]);
  const causes = useMemo(() => causeSummary(students, filter), [students, filter]);

  const cohortChart = cohortRows.map((r) => ({
    cohort: r.cohort, dau_vao: r.dau_vao, dang_hoc: r.dang_hoc_hien_tai,
    gan_ket: Math.round(r.gan_ket_pct * 10) / 10,
  }));
  const trendChart = trend.map((t) => ({ month: MONTH_LABELS[t.month], quay_lai: t.quay_lai }));

  return (
    <div className="space-y-4">
      {/* Hint banner */}
      <div className="flex items-center gap-2 rounded-xl border border-ai-600/40 bg-ai-900/40 px-4 py-2.5 text-sm text-slate-300">
        <Sparkles className="h-4 w-4 text-ai-400" />
        <span>Nhấp vào <strong className="text-white">một thẻ KPI</strong> phía trên để mở khu vực phân tích chuyên sâu tích hợp AI Insights.</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* a. Cohort retention stacked */}
        <Card>
          <CardHeader title="Biến động theo Khóa (Đầu vào vs Đang học)" subtitle="Đối soát baseline tuyển sinh làm mốc 100%" icon={<TrendingDown className="h-4 w-4" />}
            action={<button onClick={() => onDrill('dang_hoc')} className="text-xs font-medium text-accent-soft hover:text-blue-300">Phân tích AI →</button>} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cohortChart} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="cohort" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="dau_vao" name="Đầu vào" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                <Bar dataKey="dang_hoc" name="Đang học" fill={COLORS.good} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="border-t border-ink-800/60 px-5 py-3">
            {cohortRows.map((r) => (
              <div key={r.cohort} className="flex items-center justify-between py-1 text-sm">
                <span className="text-slate-300">{r.cohort}</span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-slate-400">{fmtNum(r.dang_hoc_hien_tai)}/{fmtNum(r.dau_vao)}</span>
                  <span className={`tabular-nums font-semibold ${r.gan_ket_pct < SAFE_RETENTION_THRESHOLD ? 'text-red-400' : 'text-emerald-400'}`}>{fmtPct(r.gan_ket_pct)}</span>
                  {r.gan_ket_pct < SAFE_RETENTION_THRESHOLD && <Badge tone="danger">Báo động</Badge>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* b. Top dropout majors */}
        <Card>
          <CardHeader title="Top Ngành thôi học cao nhất" subtitle="Giai đoạn đang lọc" icon={<BarChart3 className="h-4 w-4" />}
            action={<button onClick={() => onDrill('thoi_hoc')} className="text-xs font-medium text-accent-soft hover:text-blue-300">Phân tích AI →</button>} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topMajors.map((m) => ({ label: m.label.length > 16 ? m.label.slice(0, 15) + '…' : m.label, thoi_hoc: m.thoi_hoc }))} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={axisStyle} />
                <YAxis type="category" dataKey="label" tick={axisStyle} width={130} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="thoi_hoc" name="Thôi học" radius={[0, 4, 4, 0]}>
                  {topMajors.map((_, i) => <Cell key={i} fill={i < 2 ? COLORS.danger : i < 4 ? COLORS.risk : COLORS.warn} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="border-t border-ink-800/60 px-5 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Top Khóa thôi học:</span>
              <div className="flex gap-2">
                {topCohorts.map((c, i) => (
                  <span key={c.label} className={`rounded-md px-2 py-1 text-xs font-semibold ${i === 0 ? 'bg-red-500/15 text-red-300' : 'bg-ink-700/60 text-slate-300'}`}>{c.label}: {fmtNum(c.thoi_hoc)}</span>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* c. Risk by major */}
        <Card>
          <CardHeader title="Top 5 ngành nhóm nguy cơ" subtitle="Thôi học + NHDN + Bảo lưu" icon={<ShieldAlert className="h-4 w-4" />}
            action={<button onClick={() => onDrill('nhom_nguy_co')} className="text-xs font-medium text-accent-soft hover:text-blue-300">Phân tích AI →</button>} />
          <div className="space-y-2 p-4">
            {riskRows.map((r, i) => (
              <div key={r.major} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink-700 text-xs font-bold text-slate-300">{i + 1}</span>
                <span className="w-40 shrink-0 truncate text-sm text-slate-200" title={r.major}>{r.major}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${Math.min(100, (r.tong_nguy_co / (riskRows[0]?.tong_nguy_co || 1)) * 100)}%` }} />
                </div>
                <span className="w-12 shrink-0 text-right tabular-nums font-semibold text-orange-400">{fmtNum(r.tong_nguy_co)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* d. Return trend */}
        <Card>
          <CardHeader title="Sinh viên quay lại học — xu hướng" subtitle="Ghi nhận hiệu quả công tác vận động" icon={<HeartPulse className="h-4 w-4" />} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendChart} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="quay_lai" name="Quay lại" stroke={COLORS.cyan} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.cyan }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* e. Cause summary table */}
      <Card>
        <CardHeader title="Bảng tổng hợp nhóm nguyên nhân thôi học + NHDN" subtitle="Phân loại định tính từ ghi chú & lý do của GVCN" icon={<Activity className="h-4 w-4" />} />
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">Nhóm nguyên nhân</th>
                <th className="px-3 py-2 text-right font-medium">Số lượng</th>
                <th className="px-3 py-2 text-right font-medium">Tỉ lệ</th>
                <th className="py-2 pl-3 font-medium">Ví dụ lý do thực tế</th>
              </tr>
            </thead>
            <tbody>
              {causes.map((c) => (
                <tr key={c.nhom} className="border-b border-ink-800/60 transition-colors hover:bg-ink-800/40">
                  <td className="py-2 pr-3 font-medium text-slate-200">{c.nhom}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-300">{fmtNum(c.so_luong)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="tabular-nums text-slate-300">{fmtPct(c.ti_le, 0)}</span>
                  </td>
                  <td className="py-2 pl-3 text-xs text-slate-400">{c.vi_du_ly_do.join(' · ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
