// AnalysisPanel — rich drill-down views per KPI card, each with charts + tables + AI Insights
import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, AreaChart, Area, Legend, LabelList, PieChart, Pie, Cell,
  ComposedChart,
} from 'recharts';
import { TrendingDown, BarChart3, Activity, AlertTriangle, ShieldAlert, Users, PieChart as PieIcon, HeartPulse } from 'lucide-react';
import type { KpiDrillKey, FilterState, MonthlyStat, BaselineIntake, StudentRecord, MonthKey } from '../types';
import { MONTH_LABELS, SAFE_RETENTION_THRESHOLD, fmtPct, fmtNum } from '../calc';
import {
  computeCohortRetention, computeMajorRetention, computeSystemRetention, dropoutTrendWithPct,
  causeSummary, causeDetailSummary, nhdnByMajor, riskByMajorFull, riskByCohortFull,
  baoLuuTrend, baoLuuByMajorFull, baoLuuByCohortFull, dropoutByMajorFull, dropoutByCohortFull,
  monthlyEnrollmentTrend, statusDonutData, returnTrend, returnByMajor, majorSystemMatrix,
  aiRetention, aiDropout, aiNhdn, aiRiskGroup, aiBaoLuu,
} from '../calc';
import { Card, CardHeader, Badge, EmptyState } from './ui';
import { AIInsightBox } from './AIInsightBox';

const COLORS = { good: '#10b981', warn: '#f59e0b', danger: '#ef4444', risk: '#f97316', accent: '#3b82f6', violet: '#8b5cf6', cyan: '#06b6d4' };
const axisStyle = { fontSize: 11, fill: '#94a3b8' };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs shadow-card">
      <div className="mb-1 font-semibold text-slate-200">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>{p.name}:</span>
          <span className="font-semibold text-white">{typeof p.value === 'number' ? fmtNum(p.value) : p.value}{p.unit || ''}</span>
        </div>
      ))}
    </div>
  );
}

// Heatmap color helper for % columns
function heatColor(pct: number, max: number): string {
  const ratio = max > 0 ? pct / max : 0;
  if (ratio > 0.75) return 'bg-red-500/20 text-red-300';
  if (ratio > 0.5) return 'bg-orange-500/15 text-orange-300';
  if (ratio > 0.25) return 'bg-amber-500/12 text-amber-300';
  return 'bg-ink-800/40 text-slate-400';
}

export function AnalysisPanel({
  drillKey, stats, baseline, students, filter, kpi,
}: {
  drillKey: KpiDrillKey; stats: MonthlyStat[]; baseline: BaselineIntake[];
  students: StudentRecord[]; filter: FilterState; kpi: any;
}) {
  const content = useMemo(() => {
    switch (drillKey) {
      case 'dang_hoc': return <DangHocAnalysis stats={stats} baseline={baseline} filter={filter} kpi={kpi} />;
      case 'thoi_hoc': return <ThoiHocAnalysis stats={stats} baseline={baseline} students={students} filter={filter} kpi={kpi} />;
      case 'bao_luu': return <BaoLuuAnalysis stats={stats} baseline={baseline} students={students} filter={filter} kpi={kpi} />;
      case 'nghi_hoc_dai_ngay': return <NhdnAnalysis stats={stats} students={students} filter={filter} />;
      case 'nhom_nguy_co': return <NguyCoAnalysis stats={stats} baseline={baseline} filter={filter} kpi={kpi} />;
      case 'quay_lai': return <QuayLaiAnalysis stats={stats} filter={filter} />;
    }
  }, [drillKey, stats, baseline, students, filter, kpi]);

  return <div className="space-y-4 animate-slideUp">{content}</div>;
}

// ==================== CARD 1: QUY MÔ & ĐANG HỌC ====================
function DangHocAnalysis({ stats, baseline, filter, kpi }: any) {
  const donut = statusDonutData(stats, baseline, filter);
  const systemRows = computeSystemRetention(stats, baseline, filter);
  const cohortRows = computeCohortRetention(stats, baseline, filter);
  const majorRows = computeMajorRetention(stats, baseline, filter);
  const monthlyTrend = monthlyEnrollmentTrend(stats, filter);
  const insight = aiRetention(kpi, cohortRows, majorRows);

  const systemData = systemRows.map((r: any) => ({ system: r.system, dau_vao: r.dau_vao, dang_hoc: r.dang_hoc, pct: Math.round(r.gan_ket_pct * 10) / 10 }));
  const cohortData = cohortRows.map((r: any) => ({ cohort: r.cohort, dau_vao: r.dau_vao, dang_hoc: r.dang_hoc_hien_tai, pct: Math.round(r.gan_ket_pct * 10) / 10 }));
  const majorData = majorRows.map((r: any) => ({ major: r.major.length > 16 ? r.major.slice(0, 15) + '…' : r.major, gan_ket: Math.round(r.gan_ket_pct * 10) / 10, hien_tai: r.dang_hoc_hien_tai, dau_vao: r.dau_vao }));
  const trendData = monthlyTrend.map((t: any) => ({ month: MONTH_LABELS[t.month as MonthKey], dang_hoc: t.dang_hoc_luy_ke, tuyen_moi: t.tuyen_moi }));

  // Bảng đối soát theo Ngành × Hệ (Phần 1.5)
  const matrixRows = majorSystemMatrix(stats, baseline, filter);

  return (
    <>
      {/* 1.1 Donut + 1.2/1.3 system/cohort charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="1.1 Phân rã trạng thái sinh viên" subtitle="Donut — tâm: tổng đầu kỳ" icon={<PieIcon className="h-4 w-4" />} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={donut.slices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {donut.slices.map((s: any, i: number) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 text-center">
              <div className="text-2xl font-bold text-white">{fmtNum(donut.total)}</div>
              <div className="text-xs text-slate-500">Tổng SV đầu kỳ</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="1.2 Theo Hệ đào tạo" subtitle="Cột kép: tuyển vào vs đang học" icon={<BarChart3 className="h-4 w-4" />} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={systemData} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="system" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="dau_vao" name="Tuyển vào" fill={COLORS.accent} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="dau_vao" position="top" style={{ fill: '#94a3b8', fontSize: 10 }} />
                </Bar>
                <Bar dataKey="dang_hoc" name="Đang học" fill={COLORS.good} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="pct" position="bottom" formatter={(v: any) => `${v}%`} style={{ fill: '#10b981', fontSize: 10, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="1.3 Theo Khóa đào tạo" subtitle="Cột kép: tuyển vào vs đang học" icon={<Users className="h-4 w-4" />} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cohortData} margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="cohort" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="dau_vao" name="Tuyển vào" fill={COLORS.accent} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="dau_vao" position="top" style={{ fill: '#94a3b8', fontSize: 10 }} />
                </Bar>
                <Bar dataKey="dang_hoc" name="Đang học" fill={COLORS.good} radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="pct" position="bottom" formatter={(v: any) => `${v}%`} style={{ fill: '#10b981', fontSize: 10, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 1.4 Major retention bar + 1.5 Cross-tab table */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="1.4 Tỷ lệ giữ chân theo Ngành (Đầu vào = 100%)" subtitle="Hover xem [hiện tại / đầu vào]" icon={<TrendingDown className="h-4 w-4" />} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={majorData} margin={{ top: 8, right: 16, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="major" tick={axisStyle} angle={-35} textAnchor="end" interval={0} height={70} />
                <YAxis tick={axisStyle} domain={[0, 100]} unit="%" />
                <Tooltip content={({ active, payload }: any) => active && payload?.length ? (
                  <div className="rounded-lg border border-ink-600 bg-ink-850 px-3 py-2 text-xs shadow-card">
                    <div className="font-semibold text-slate-200">{payload[0].payload.major}</div>
                    <div className="mt-1 text-slate-300">Hiện tại: <span className="font-bold text-white">{fmtNum(payload[0].payload.hien_tai)}</span> / Đầu vào: <span className="font-bold text-white">{fmtNum(payload[0].payload.dau_vao)}</span></div>
                    <div className="text-emerald-400">Giữ chân: {payload[0].payload.gan_ket}%</div>
                  </div>
                ) : null} />
                <Bar dataKey="gan_ket" name="Giữ chân" radius={[4, 4, 0, 0]}>
                  {majorData.map((d: any, i: number) => <Cell key={i} fill={d.gan_ket < SAFE_RETENTION_THRESHOLD ? COLORS.danger : COLORS.good} />)}
                  <LabelList dataKey="gan_ket" position="top" formatter={(v: any) => `${v}%`} style={{ fill: '#94a3b8', fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="1.5 Bảng đối soát Ngành × Hệ đào tạo" subtitle="Mỗi ngành tách 2 dòng Cao đẳng + Trung cấp để đối soát giữ chân" icon={<BarChart3 className="h-4 w-4" />} />
          <div className="max-h-[340px] overflow-auto p-4">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ink-850">
                <tr className="border-b border-ink-700/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2 font-medium">Ngành nghề đào tạo</th><th className="px-2 py-2 font-medium">Hệ đào tạo</th>
                  <th className="px-2 py-2 text-right font-medium">Tuyển sinh đầu vào</th><th className="px-2 py-2 text-right font-medium">Đang học thực tế</th>
                  <th className="px-2 py-2 text-right font-medium">Chênh lệch hao hụt</th><th className="py-2 pl-2 text-right font-medium">% Giữ chân</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((r, i) => {
                  const prevSameMajor = i > 0 && matrixRows[i - 1].major === r.major;
                  return (
                    <tr key={i} className={`border-b border-ink-800/60 ${!prevSameMajor ? 'border-t border-ink-700/40' : ''}`}>
                      <td className="py-1.5 pr-2 text-slate-200">{!prevSameMajor ? r.major : ''}</td>
                      <td className="px-2 py-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${r.system === 'Cao đẳng' ? 'bg-blue-500/15 text-blue-300' : r.system === 'Trung cấp' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-600/30 text-slate-300'}`}>{r.system}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-300">{fmtNum(r.dau_vao)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-300">{fmtNum(r.dang_hoc)}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${r.chenh_lech < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{r.chenh_lech > 0 ? '+' : ''}{fmtNum(r.chenh_lech)}</td>
                      <td className={`py-1.5 pl-2 text-right tabular-nums font-semibold ${r.gan_ket_pct < SAFE_RETENTION_THRESHOLD ? 'text-red-400' : 'text-emerald-400'}`}>{fmtPct(r.gan_ket_pct, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 1.6 Monthly trend */}
      <Card>
        <CardHeader title="1.6 Biến động sinh viên theo chuỗi thời gian" subtitle="Cột kép: đang học lũy kế + tuyển mới phát sinh" icon={<Activity className="h-4 w-4" />} />
        <div className="px-2 pb-4 pt-3">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="dang_hoc" name="Đang học lũy kế" fill={COLORS.good} radius={[4, 4, 0, 0]} />
              <Bar dataKey="tuyen_moi" name="Tuyển mới/Phục hồi" fill={COLORS.cyan} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 1.7 AI Insights */}
      <AIInsightBox insight={insight} title="1.7 AI Phân tích: Giữ chân sinh viên" />
    </>
  );
}

// ==================== CARD 2: THÔI HỌC ====================
function ThoiHocAnalysis({ stats, baseline, students, filter }: any) {
  const trend = dropoutTrendWithPct(stats, baseline, filter);
  const byMajor = dropoutByMajorFull(stats, baseline, filter);
  const byCohort = dropoutByCohortFull(stats, baseline, filter);
  const causes = causeSummary(students, filter);
  const systemRows = computeSystemRetention(stats, baseline, filter);
  const total = trend.reduce((s: number, x: any) => s + x.thoi_hoc, 0);
  const insight = aiDropout(trend, causes, total, byMajor, byCohort, systemRows);
  const maxMajorPct = Math.max(...byMajor.map((m: any) => m.ti_le), 1);

  const comboData = trend.map((t: any) => ({ month: MONTH_LABELS[t.month as MonthKey], thoi_hoc: t.thoi_hoc, ti_le: Math.round(t.ti_le * 100) / 100 }));
  void causes;
  return (
    <>
      {/* 2.1 Combo chart */}
      <Card>
        <CardHeader title="2.1 Xu hướng thôi học theo tháng (Combo)" subtitle="Cột: số lượng · Đường: tỷ lệ %" icon={<TrendingDown className="h-4 w-4" />} />
        <div className="px-2 pb-4 pt-3">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={comboData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={axisStyle} />
              <YAxis yAxisId="left" tick={axisStyle} />
              <YAxis yAxisId="right" orientation="right" tick={axisStyle} unit="%" />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="thoi_hoc" name="Số lượng thôi học" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="ti_le" name="Tỷ lệ %" stroke={COLORS.warn} strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 2.2 By major heatmap table */}
        <Card>
          <CardHeader title="2.2 Thôi học theo Ngành (Heatmap)" subtitle="Xếp top giảm dần · dải màu cảnh báo" icon={<BarChart3 className="h-4 w-4" />} />
          <div className="max-h-[360px] overflow-auto p-4">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ink-850">
                <tr className="border-b border-ink-700/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2 font-medium">Ngành</th><th className="px-2 py-2 text-right font-medium">Thôi học</th>
                  <th className="px-2 py-2 text-right font-medium">Quy mô</th><th className="py-2 pl-2 text-right font-medium">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {byMajor.map((r: any) => (
                  <tr key={r.major} className="border-b border-ink-800/60">
                    <td className="py-1.5 pr-2 text-slate-200">{r.major}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-300">{fmtNum(r.thoi_hoc)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-400">{fmtNum(r.quy_mo)}</td>
                    <td className={`py-1.5 pl-2 text-right tabular-nums font-semibold ${heatColor(r.ti_le, maxMajorPct)}`}>{fmtPct(r.ti_le, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 2.3 By cohort table */}
        <Card>
          <CardHeader title="2.3 Thôi học theo Khóa" subtitle="K23, K24, K25 — số lượng & tỷ lệ" icon={<Users className="h-4 w-4" />} />
          <div className="p-4">
            <div className="space-y-3">
              {byCohort.map((r: any) => {
                const pctColor = r.ti_le > 15 ? 'text-red-400' : r.ti_le > 8 ? 'text-amber-400' : 'text-emerald-400';
                return (
                  <div key={r.cohort} className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-100">{r.cohort}</span>
                      <span className={`text-lg font-bold tabular-nums ${pctColor}`}>{fmtPct(r.ti_le, 1)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Thôi học: <span className="font-semibold text-red-400">{fmtNum(r.thoi_hoc)}</span></span>
                      <span>Quy mô: {fmtNum(r.quy_mo)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-700">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.ti_le * 3)}%`, background: pctColor === 'text-red-400' ? COLORS.danger : pctColor === 'text-amber-400' ? COLORS.warn : COLORS.good }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* 2.4 Causes detailed table */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="2.4 Gom nhóm nguyên nhân thôi học" subtitle="Bảng chi tiết — Nhóm nguyên nhân · Lý do · Số lượng · Tỷ lệ" icon={<Activity className="h-4 w-4" />} />
          <div className="max-h-[280px] overflow-auto p-4">
            <CauseDetailTable rows={causeDetailSummary(students, filter, ['thoi_hoc'])} />
          </div>
        </Card>
        <div className="lg:col-span-2">
          {/* 2.5 AI Insights */}
          <AIInsightBox insight={insight} title="2.5 AI Phân tích: Điểm rơi rủi ro thôi học" />
        </div>
      </div>
    </>
  );
}

// ==================== CARD 3: BẢO LƯU ====================
function BaoLuuAnalysis({ stats, baseline, students, filter, kpi }: any) {
  const trend = baoLuuTrend(stats, baseline, filter);
  const byMajor = baoLuuByMajorFull(stats, baseline, filter);
  const byCohort = baoLuuByCohortFull(stats, baseline, filter);
  const causes = causeSummary(students, { ...filter, months: filter.months } as any);
  const insight = aiBaoLuu(trend, byMajor, byCohort, kpi);
  const maxMajorPct = Math.max(...byMajor.map((m: any) => m.ti_le), 1);

  const comboData = trend.map((t: any) => ({ month: MONTH_LABELS[t.month as MonthKey], bao_luu: t.bao_luu, ti_le: Math.round(t.ti_le * 100) / 100 }));
  void causes;
  return (
    <>
      <Card>
        <CardHeader title="3.1 Xu hướng bảo lưu theo tháng (Combo)" subtitle="Cột: số lượng · Đường: tỷ lệ %" icon={<TrendingDown className="h-4 w-4" />} />
        <div className="px-2 pb-4 pt-3">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={comboData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={axisStyle} />
              <YAxis yAxisId="left" tick={axisStyle} />
              <YAxis yAxisId="right" orientation="right" tick={axisStyle} unit="%" />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="bao_luu" name="Số lượng bảo lưu" fill={COLORS.violet} radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="ti_le" name="Tỷ lệ %" stroke={COLORS.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="3.2 Bảo lưu theo Ngành (Heatmap)" subtitle="Xếp top giảm dần" icon={<BarChart3 className="h-4 w-4" />} />
          <div className="max-h-[360px] overflow-auto p-4">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ink-850">
                <tr className="border-b border-ink-700/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2 font-medium">Ngành</th><th className="px-2 py-2 text-right font-medium">Bảo lưu</th>
                  <th className="px-2 py-2 text-right font-medium">Quy mô</th><th className="py-2 pl-2 text-right font-medium">Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {byMajor.map((r: any) => (
                  <tr key={r.major} className="border-b border-ink-800/60">
                    <td className="py-1.5 pr-2 text-slate-200">{r.major}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-300">{fmtNum(r.bao_luu)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-400">{fmtNum(r.quy_mo)}</td>
                    <td className={`py-1.5 pl-2 text-right tabular-nums font-semibold ${heatColor(r.ti_le, maxMajorPct)}`}>{fmtPct(r.ti_le, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="3.3 Bảo lưu theo Khóa" subtitle="K23, K24, K25" icon={<Users className="h-4 w-4" />} />
          <div className="p-4">
            <div className="space-y-3">
              {byCohort.map((r: any) => {
                const pctColor = r.ti_le > 10 ? 'text-red-400' : r.ti_le > 5 ? 'text-amber-400' : 'text-emerald-400';
                return (
                  <div key={r.cohort} className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-100">{r.cohort}</span>
                      <span className={`text-lg font-bold tabular-nums ${pctColor}`}>{fmtPct(r.ti_le, 1)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Bảo lưu: <span className="font-semibold text-violet-400">{fmtNum(r.thoi_hoc)}</span></span>
                      <span>Quy mô: {fmtNum(r.quy_mo)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-700">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.ti_le * 5)}%`, background: COLORS.violet }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="3.4 Gom nhóm nguyên nhân bảo lưu" subtitle="Bảng chi tiết — TUYỆT ĐỐI KHÔNG dùng biểu đồ tròn" icon={<Activity className="h-4 w-4" />} />
          <div className="max-h-[280px] overflow-auto p-4">
            <CauseDetailTable rows={causeDetailSummary(students, filter, ['bao_luu'])} />
          </div>
        </Card>
        <div className="lg:col-span-3">
          <AIInsightBox insight={insight} title="3.5 AI Phân tích: Lý do bảo lưu theo Khóa/Hệ/Ngành" />
        </div>
      </div>
    </>
  );
}

// ==================== CARD 4: NGHỈ HỌC DÀI NGÀY ====================
function NhdnAnalysis({ stats, students, filter }: any) {
  const rows = nhdnByMajor(stats, students, filter);
  const totalNhdn = rows.reduce((s: number, r: any) => s + r.nghi_hoc_dai_ngay, 0);
  const totalMatLienLac = rows.reduce((s: number, r: any) => s + r.mat_lien_lac, 0);
  const insight = aiNhdn(rows, totalNhdn, totalMatLienLac);
  const chartData = rows.map((r: any) => ({ major: r.major.length > 18 ? r.major.slice(0, 17) + '…' : r.major, nghi: r.nghi_hoc_dai_ngay, mat_lien_lac: r.mat_lien_lac })).reverse();

  return (
    <>
      <Card>
        <CardHeader title="Xếp hạng ngành có NHDN lũy kế cao nhất" subtitle="Bar ngang — tính đến tháng gần nhất · cam = mất liên lạc" icon={<AlertTriangle className="h-4 w-4" />} />
        <div className="px-2 pb-4 pt-3">
          <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 38)}>
            <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={axisStyle} />
              <YAxis type="category" dataKey="major" tick={axisStyle} width={140} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="nghi" name="NHDN lũy kế" fill={COLORS.warn} radius={[0, 4, 4, 0]} />
              <Bar dataKey="mat_lien_lac" name="Mất liên lạc" fill={COLORS.danger} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Bảng chi tiết NHDN theo ngành" subtitle="Đánh giá hiệu quả GVCN · cảnh báo mất liên lạc" icon={<BarChart3 className="h-4 w-4" />} />
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700/60 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">Ngành</th><th className="px-3 py-2 text-right font-medium">NHDN</th>
                  <th className="px-3 py-2 text-right font-medium">Mất LL</th><th className="px-3 py-2 text-right font-medium">Tỉ lệ MLL</th>
                  <th className="py-2 pl-3 text-right font-medium">Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.major} className="border-b border-ink-800/60 hover:bg-ink-800/40">
                    <td className="py-2 pr-3 text-slate-200">{r.major}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">{fmtNum(r.nghi_hoc_dai_ngay)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-400">{fmtNum(r.mat_lien_lac)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">{fmtPct(r.ti_le_mat_lien_lac, 0)}</td>
                    <td className="py-2 pl-3 text-right">{r.ti_le_mat_lien_lac > 25 ? <Badge tone="danger" pulse>Cảnh báo</Badge> : <Badge tone="neutral">Bình thường</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="lg:col-span-2">
          <AIInsightBox insight={insight} title="AI Phân tích: Nghỉ học dài ngày & GVCN" />
        </div>
      </div>
    </>
  );
}

// ==================== CARD 5: NHÓM NGUY CƠ ====================
function NguyCoAnalysis({ stats, baseline, filter, kpi }: any) {
  const allRiskRows = riskByMajorFull(stats, filter);
  const cohortRisk = riskByCohortFull(stats, baseline, filter);
  const top5 = allRiskRows.slice(0, 5);
  const insight = aiRiskGroup(top5, kpi);
  const maxRisk = Math.max(...allRiskRows.map((r: any) => r.tong_nguy_co), 1);

  return (
    <>
      {/* 5.1 Total + breakdown */}
      <Card>
        <CardHeader title="5.1 Tổng nhóm nguy cơ toàn trường & cơ cấu" subtitle="Thôi học + NHDN + Bảo lưu" icon={<ShieldAlert className="h-4 w-4" />} />
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          <div className="flex flex-col items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
            <div className="text-4xl font-bold text-orange-400">{fmtNum(kpi.nhom_nguy_co)}</div>
            <div className="mt-1 text-xs text-slate-400">Tổng nhóm nguy cơ</div>
            <div className="mt-2 text-sm font-semibold text-orange-300">{fmtPct(kpi.nhom_nguy_co_pct)}</div>
          </div>
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={[
                  { name: 'Thôi học', value: kpi.thoi_hoc, color: COLORS.danger },
                  { name: 'Nghỉ học dài ngày', value: kpi.nghi_hoc_dai_ngay, color: COLORS.warn },
                  { name: 'Bảo lưu', value: kpi.bao_luu, color: COLORS.violet },
                ]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {[COLORS.danger, COLORS.warn, COLORS.violet].map((c, i) => <Cell key={i} fill={c} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* 5.2 Full risk by major table */}
      <Card>
        <CardHeader title="5.2 Bảng tổng hợp nhóm nguy cơ theo Ngành" subtitle="Heatmap — đỏ = nguy cơ cao" icon={<BarChart3 className="h-4 w-4" />} />
        <div className="max-h-[400px] overflow-auto p-4">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-ink-850">
              <tr className="border-b border-ink-700/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2 font-medium">Ngành</th><th className="px-2 py-2 text-right font-medium">Thôi học</th>
                <th className="px-2 py-2 text-right font-medium">Nghỉ dài ngày</th><th className="px-2 py-2 text-right font-medium">Bảo lưu</th>
                <th className="px-2 py-2 text-right font-medium">Tổng nguy cơ</th><th className="py-2 pl-2 text-right font-medium">Xu hướng</th>
              </tr>
            </thead>
            <tbody>
              {allRiskRows.map((r: any) => (
                <tr key={r.major} className="border-b border-ink-800/60">
                  <td className="py-1.5 pr-2 text-slate-200">{r.major}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-red-400">{fmtNum(r.thoi_hoc)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-amber-400">{fmtNum(r.nghi_hoc_dai_ngay)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-violet-400">{fmtNum(r.bao_luu)}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-bold ${heatColor(r.tong_nguy_co, maxRisk)}`}>{fmtNum(r.tong_nguy_co)}</td>
                  <td className="py-1.5 pl-2 text-right">
                    {r.tong_nguy_co / maxRisk > 0.7 ? <Badge tone="danger" pulse>Cao</Badge> : r.tong_nguy_co / maxRisk > 0.4 ? <Badge tone="warn">Trung bình</Badge> : <Badge tone="good">Thấp</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* 5.3 Cohort comparison matrix */}
        <Card className="lg:col-span-2">
          <CardHeader title="5.3 So sánh nhóm nguy cơ giữa các Khóa" subtitle="Ma trận K23 vs K24 vs K25" icon={<Users className="h-4 w-4" />} />
          <div className="p-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ink-700/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 font-medium">Khóa</th><th className="px-2 py-2 text-right font-medium">Thôi</th>
                  <th className="px-2 py-2 text-right font-medium">NHDN</th><th className="px-2 py-2 text-right font-medium">Bảo lưu</th>
                  <th className="px-2 py-2 text-right font-medium">Tổng</th><th className="py-2 pl-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {cohortRisk.map((r: any) => (
                  <tr key={r.cohort} className="border-b border-ink-800/60">
                    <td className="py-2 font-semibold text-slate-100">{r.cohort}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-red-400">{fmtNum(r.thoi_hoc)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-amber-400">{fmtNum(r.nghi_hoc_dai_ngay)}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-violet-400">{fmtNum(r.bao_luu)}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-bold text-orange-400">{fmtNum(r.tong_nguy_co)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums text-slate-300">{fmtPct(r.ti_le, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 5.4 AI Insights */}
        <div className="lg:col-span-3">
          <AIInsightBox insight={insight} title="5.4 AI Phân tích: Ma trận điểm nóng & kế hoạch hành động" />
        </div>
      </div>
    </>
  );
}

// ==================== CARD 6: QUAY LẠI HỌC ====================
function QuayLaiAnalysis({ stats, filter }: any) {
  const trend = returnTrend(stats, filter);
  const byMajor = returnByMajor(stats, filter);
  const total = trend.reduce((s: number, x: any) => s + x.quay_lai, 0);
  const trendData = trend.map((t: any) => ({ month: MONTH_LABELS[t.month as MonthKey], quay_lai: t.quay_lai }));
  const peak = [...trend].sort((a: any, b: any) => b.quay_lai - a.quay_lai)[0];
  const topMajors = byMajor.filter((m: any) => m.quay_lai > 0).slice(0, 10);

  const insight = {
    hienTrang: `Giai đoạn lọc ghi nhận ${fmtNum(total)} sinh viên quay lại học. Tháng ${peak ? MONTH_LABELS[peak.month as MonthKey] : '-'} có lượng phục hồi cao nhất (${fmtNum(peak?.quay_lai ?? 0)} ca). Ngành dẫn đầu phục hồi: ${topMajors[0] ? topMajors[0].major : '-'} (${fmtNum(topMajors[0]?.quay_lai ?? 0)} ca).`,
    nguyenNhan: `Sinh viên quay lại thường thuộc nhóm nghỉ học dài ngày hoặc bảo lưu được vận động tích cực. Các tháng có lượng quay lại cao thường tương ứng với đợt ra quân chiến dịch "Quay lại trường" hoặc điểm bắt đầu học kỳ mới.`,
    khuyenNghi: `Đầu tư vào chiến dịch vận động tập trung vào các tháng có lịch sử phục hồi cao. Mở rộng phương pháp vận động thành công của ngành dẫn đầu (${topMajors[0]?.major ?? '-'}) sang các ngành có tỷ lệ quay lại thấp.`,
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Xu hướng sinh viên quay lại học theo tháng" subtitle="Line Chart — hiệu quả công tác vận động" icon={<HeartPulse className="h-4 w-4" />} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="returnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={axisStyle} />
                <YAxis tick={axisStyle} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="quay_lai" name="Quay lại học" stroke={COLORS.cyan} strokeWidth={2.5} fill="url(#returnGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Recovery Leaderboard — Quay lại học theo Ngành" subtitle="Sắp xếp từ cao đến thấp" icon={<TrendingDown className="h-4 w-4" />} />
          <div className="px-2 pb-4 pt-3">
            {topMajors.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topMajors.map((m: any) => ({ label: m.major.length > 16 ? m.major.slice(0, 15) + '…' : m.major, quay_lai: m.quay_lai }))} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={axisStyle} />
                  <YAxis type="category" dataKey="label" tick={{ ...axisStyle, fontSize: 10 }} width={130} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="quay_lai" name="Quay lại" radius={[0, 4, 4, 0]}>
                    {topMajors.map((_: any, i: number) => <Cell key={i} fill={i === 0 ? COLORS.good : i < 3 ? COLORS.cyan : COLORS.accent} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState message="Không có dữ liệu sinh viên quay lại trong giai đoạn này." />}
          </div>
        </Card>
      </div>
      <AIInsightBox insight={insight as any} title="AI Phân tích: Sinh viên quay lại học" />
    </>
  );
}

function CauseDetailTable({ rows }: { rows: Array<{ nhom: string; ly_do: string; so_luong: number; ti_le: number }> }) {
  const maxN = Math.max(...rows.map((r) => r.so_luong), 1);
  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-ink-850">
        <tr className="border-b border-ink-700/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
          <th className="py-2 pr-2 font-medium">Nhóm nguyên nhân</th>
          <th className="px-2 py-2 font-medium">Lý do chi tiết</th>
          <th className="px-2 py-2 text-right font-medium">Số lượng</th>
          <th className="py-2 pl-2 text-right font-medium">Tỷ lệ %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-ink-800/60 transition-colors hover:bg-ink-800/40">
            <td className="py-2 pr-2 align-top font-medium text-slate-200">{r.nhom}</td>
            <td className="px-2 py-2 text-slate-300">{r.ly_do}</td>
            <td className="px-2 py-2 text-right align-top tabular-nums text-slate-300">{fmtNum(r.so_luong)}</td>
            <td className="py-2 pl-2 text-right align-top">
              <div className="flex items-center justify-end gap-1.5">
                <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-ink-800 sm:block">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${(r.so_luong / maxN) * 100}%` }} />
                </div>
                <span className="tabular-nums font-semibold text-orange-400">{fmtPct(r.ti_le, 1)}</span>
              </div>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={4} className="py-6 text-center text-slate-500">Không có dữ liệu nguyên nhân trong giai đoạn này.</td></tr>
        )}
      </tbody>
    </table>
  );
}
