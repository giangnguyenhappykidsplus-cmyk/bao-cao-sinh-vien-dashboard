// PdfExport — native print-to-PDF via hidden iframe (no external deps)
// "Báo cáo tổng quát" — tổng hợp toàn bộ dashboard: tự tính lại từ calc.ts theo dữ liệu + bộ lọc
// hiện tại (KHÔNG phụ thuộc tab/thẻ nào đang mở trên màn hình), nên luôn khớp dữ liệu mới nhất.
// Biểu đồ được vẽ bằng SVG thuần (không phụ thuộc recharts/DOM) để trông giống dashboard trên web.
import type {
  KpiSnapshot, FilterState, MonthlyStat, BaselineIntake, StudentRecord,
  DauVaoLifetimeRow, DauVaoStatusRow, MonthKey,
} from '../types';
import { ALL_MONTHS } from '../types';
import {
  fmtNum, fmtPct, MONTH_LABELS,
  byCohortLifetime, byMajorRetentionLifetime, aiRetentionLifetime,
  lifetimeByCohort, lifetimeByMajor,
  dropoutTrendWithPct, dropoutByMajorYearFull, dropoutByCohortYearFull,
  computeSystemRetention, causeSummary, causeDetailSummary, aiDropout,
  nhdnByMajor, aiNhdn,
  riskByMajorFull, aiRiskGroup,
} from '../calc';
import { GLOBAL_DIFFICULTIES, STRATEGIC_RECOMMENDATIONS } from '../data';

const C = { good: '#10b981', danger: '#ef4444', warn: '#f59e0b', risk: '#f97316', accent: '#3b82f6', violet: '#8b5cf6', grid: '#e2e8f0', axis: '#94a3b8', text: '#334155' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// --- SVG chart helpers (self-contained, no external chart lib — renders like the web dashboard) ---

function svgDonut(slices: Array<{ label: string; value: number; color: string }>, total: number, centerLabel: string): string {
  const size = 190, cx = size / 2, cy = size / 2, r = 68, sw = 30;
  const circumference = 2 * Math.PI * r;
  let acc = 0;
  const arcs = slices.filter((s) => s.value > 0).map((s) => {
    const len = total > 0 ? (s.value / total) * circumference : 0;
    const dash = `${len} ${circumference - len}`;
    const offset = -acc;
    acc += len;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})" />`;
  }).join('');
  const legend = slices.map((s) => `
    <div class="legend-row"><span class="legend-dot" style="background:${s.color}"></span>${esc(s.label)}: <strong>${fmtNum(s.value)}</strong> (${fmtPct(total > 0 ? (s.value / total) * 100 : 0, 1)})</div>`).join('');
  return `<div class="chart-flex">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${arcs}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="20" font-weight="bold" fill="${C.text}">${esc(fmtNum(total))}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="8.5" fill="#777">${esc(centerLabel)}</text>
    </svg>
    <div class="legend">${legend}</div>
  </div>`;
}

function svgVBarChart(data: Array<{ label: string; value: number; color: string; valueLabel?: string }>, opts?: { height?: number; unit?: string }): string {
  const width = 660, height = opts?.height ?? 280, padL = 42, padR = 12, padT = 16, padB = 78;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const n = Math.max(data.length, 1);
  const slot = plotW / n;
  const barW = Math.min(34, slot * 0.62);
  const max = Math.max(...data.map((d) => d.value), 1) * 1.18;
  const gridN = 4;
  const grid = Array.from({ length: gridN + 1 }, (_, i) => {
    const y = padT + plotH - (i / gridN) * plotH;
    const val = (i / gridN) * max;
    return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="${C.grid}" stroke-width="1" />
      <text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="8.5" fill="${C.axis}">${fmtNum(Math.round(val))}</text>`;
  }).join('');
  const bars = data.map((d, i) => {
    const x = padL + i * slot + (slot - barW) / 2;
    const barH = (d.value / max) * plotH;
    const y = padT + plotH - barH;
    const labelX = x + barW / 2;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="2.5" fill="${d.color}" />
      <text x="${labelX.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" fill="${d.color}">${esc(d.valueLabel ?? fmtNum(d.value))}</text>
      <text x="${labelX.toFixed(1)}" y="${(padT + plotH + 12).toFixed(1)}" text-anchor="end" font-size="8" fill="#555" transform="rotate(-38 ${labelX.toFixed(1)} ${(padT + plotH + 12).toFixed(1)})">${esc(truncate(d.label, 16))}</text>`;
  }).join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%">
    ${grid}
    <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="#999" stroke-width="1.2" />
    ${bars}
  </svg>`;
}

function svgHBarChart(data: Array<{ label: string; value: number; color: string; value2?: number; color2?: string; sub?: string }>): string {
  const width = 660, rowH = 24, labelW = 172, padR = 70, padTop = 8;
  const height = padTop + data.length * rowH + 8;
  const max = Math.max(...data.map((d) => Math.max(d.value, d.value2 ?? 0)), 1) * 1.12;
  const plotW = width - labelW - padR;
  const rows = data.map((d, i) => {
    const y = padTop + i * rowH;
    const hasSecond = d.value2 !== undefined && d.color2;
    const barH = hasSecond ? 8 : 14;
    const barW1 = (d.value / max) * plotW;
    const row1 = `<rect x="${labelW}" y="${(y + (hasSecond ? 1 : 5)).toFixed(1)}" width="${barW1.toFixed(1)}" height="${barH}" rx="2" fill="${d.color}" />
      <text x="${(labelW + barW1 + 5).toFixed(1)}" y="${(y + (hasSecond ? 1 : 5) + barH - 2).toFixed(1)}" font-size="8.5" font-weight="700" fill="${d.color}">${fmtNum(d.value)}</text>`;
    let row2 = '';
    if (hasSecond) {
      const barW2 = ((d.value2 as number) / max) * plotW;
      row2 = `<rect x="${labelW}" y="${(y + 11).toFixed(1)}" width="${barW2.toFixed(1)}" height="${barH}" rx="2" fill="${d.color2}" />
        <text x="${(labelW + barW2 + 5).toFixed(1)}" y="${(y + 11 + barH - 2).toFixed(1)}" font-size="8.5" font-weight="700" fill="${d.color2}">${fmtNum(d.value2 as number)}</text>`;
    }
    return `<text x="${labelW - 6}" y="${(y + rowH / 2 + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="${C.text}">${esc(truncate(d.label, 24))}</text>${row1}${row2}`;
  }).join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%">${rows}</svg>`;
}

function svgCombo(months: string[], counts: number[], pcts: number[]): string {
  const width = 660, height = 270, padL = 40, padR = 40, padT = 16, padB = 40;
  const plotW = width - padL - padR, plotH = height - padT - padB;
  const n = months.length || 1;
  const slot = plotW / n;
  const barW = Math.min(30, slot * 0.5);
  const maxCount = Math.max(...counts, 1) * 1.25;
  const maxPct = Math.max(...pcts, 1) * 1.3;
  const gridN = 4;
  const grid = Array.from({ length: gridN + 1 }, (_, i) => {
    const y = padT + plotH - (i / gridN) * plotH;
    return `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="${C.grid}" stroke-width="1" />
      <text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="8" fill="${C.axis}">${Math.round((i / gridN) * maxCount)}</text>
      <text x="${width - padR + 6}" y="${y + 3}" font-size="8" fill="${C.warn}">${((i / gridN) * maxPct).toFixed(0)}%</text>`;
  }).join('');
  const bars = months.map((m, i) => {
    const x = padL + i * slot + (slot - barW) / 2;
    const barH = (counts[i] / maxCount) * plotH;
    const y = padT + plotH - barH;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="2" fill="${C.danger}" />
      <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${C.danger}">${counts[i]}</text>
      <text x="${(x + barW / 2).toFixed(1)}" y="${(padT + plotH + 12).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="#555">${esc(m)}</text>`;
  }).join('');
  const points = months.map((_, i) => {
    const x = padL + i * slot + slot / 2;
    const y = padT + plotH - (pcts[i] / maxPct) * plotH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `<polyline points="${points.join(' ')}" fill="none" stroke="${C.warn}" stroke-width="2.2" />`;
  const dots = months.map((_, i) => {
    const [x, y] = points[i].split(',');
    return `<circle cx="${x}" cy="${y}" r="2.6" fill="${C.warn}" /><text x="${x}" y="${(parseFloat(y) - 6).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${C.warn}">${pcts[i].toFixed(1)}%</text>`;
  }).join('');
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width:100%">
    ${grid}
    <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="#999" stroke-width="1.2" />
    ${bars}${line}${dots}
  </svg>
  <div class="chart-legend-inline"><span class="legend-dot" style="background:${C.danger}"></span>Số lượng thôi học &nbsp;&nbsp; <span class="legend-dot" style="background:${C.warn}"></span>Tỷ lệ %</div>`;
}

export interface PdfExportParams {
  kpi: KpiSnapshot;
  filter: FilterState;
  quyMoDauKy: number;
  dangHoc: number;
  stats: MonthlyStat[];
  baseline: BaselineIntake[];
  students: StudentRecord[];
  dauvao: DauVaoLifetimeRow[];
  dauvaoStatus: DauVaoStatusRow[];
}

export async function exportBghReport(p: PdfExportParams): Promise<void> {
  const { kpi, filter, quyMoDauKy, dangHoc, stats, baseline, students, dauvao, dauvaoStatus } = p;

  const monthRange = filter.months.length === ALL_MONTHS.length
    ? 'Toàn kỳ (T7/2025 - T6/2026)'
    : `${MONTH_LABELS[filter.months[0] as keyof typeof MONTH_LABELS]} - ${MONTH_LABELS[filter.months[filter.months.length - 1] as keyof typeof MONTH_LABELS]}`;
  const filterLine = [
    `Giai đoạn: ${monthRange}`,
    filter.cohorts.length ? `Khóa: ${filter.cohorts.join(', ')}` : '',
    filter.systems.length ? `Hệ: ${filter.systems.join(', ')}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const kpiRows: Array<{ label: string; value: string; pct: string; color: string }> = [
    { label: 'Quy mô & Đang học', value: `${fmtNum(dangHoc)} SV`, pct: fmtPct(quyMoDauKy > 0 ? (dangHoc / quyMoDauKy) * 100 : 0), color: C.good },
    { label: 'Thôi học (cộng dồn)', value: `${fmtNum(kpi.thoi_hoc)} SV`, pct: fmtPct(kpi.thoi_hoc_pct), color: C.danger },
    { label: 'Bảo lưu (cộng dồn)', value: `${fmtNum(kpi.bao_luu)} SV`, pct: fmtPct(kpi.tong_sinh_vien_dau_ky > 0 ? (kpi.bao_luu / kpi.tong_sinh_vien_dau_ky) * 100 : 0), color: C.violet },
    { label: 'Nghỉ học dài ngày', value: `${fmtNum(kpi.nghi_hoc_dai_ngay)} SV`, pct: 'lũy kế', color: C.warn },
    { label: 'Tỷ lệ nhóm nguy cơ', value: `${fmtNum(kpi.nhom_nguy_co)} SV`, pct: fmtPct(kpi.nhom_nguy_co_pct), color: C.risk },
    { label: 'Quay lại học (cộng dồn)', value: `${fmtNum(kpi.quay_lai)} SV`, pct: 'phục hồi', color: C.accent },
  ];

  // ================= PHẦN 1: QUY MÔ & ĐANG HỌC =================
  const cohortRowsC1 = byCohortLifetime(dauvaoStatus, filter);
  const majorRowsC1 = byMajorRetentionLifetime(dauvaoStatus, filter);
  const insight1 = aiRetentionLifetime(quyMoDauKy, dangHoc, cohortRowsC1, majorRowsC1);
  const dangHocPct = quyMoDauKy > 0 ? (dangHoc / quyMoDauKy) * 100 : 0;
  const daMat = Math.max(0, quyMoDauKy - dangHoc);

  // ================= PHẦN 2: THÔI HỌC =================
  // Phần A — lũy kế toàn khóa (Đầu vào các khóa.xlsx)
  const lifeCohort = lifetimeByCohort(dauvao, filter);
  const lifeMajor = lifetimeByMajor(dauvao, filter);
  const lifeTop5ByCount = new Set([...lifeMajor].sort((a, b) => b.thoi_hoc - a.thoi_hoc).slice(0, 5).map((r) => r.major));
  const lifeTop5ByRate = new Set([...lifeMajor].sort((a, b) => b.ti_le - a.ti_le).slice(0, 5).map((r) => r.major));
  const lifeTop5ByTotal = new Set([...lifeMajor].sort((a, b) => b.total - a.total).slice(0, 5).map((r) => r.major));

  // Phần B — theo năm thống kê (T7/2025 - T6/2026)
  const trend = dropoutTrendWithPct(stats, baseline, filter);
  const byMajorYear = dropoutByMajorYearFull(stats, filter);
  const byCohortYear = dropoutByCohortYearFull(stats, filter);
  const causes = causeSummary(students, filter);
  const systemRows = computeSystemRetention(stats, baseline, filter);
  const totalThoiHocYear = trend.reduce((s, x) => s + x.thoi_hoc, 0);
  const insight2 = aiDropout(trend, causes, totalThoiHocYear, byMajorYear, byCohortYear, systemRows, lifeMajor, lifeCohort);
  const top5LyDo = causeDetailSummary(students, filter, ['thoi_hoc']).slice(0, 5);

  // ================= PHẦN 3: NGHỈ HỌC DÀI NGÀY =================
  const nhdnRows = nhdnByMajor(stats, students, filter);
  const totalNhdn = nhdnRows.reduce((s, r) => s + r.nghi_hoc_dai_ngay, 0);
  const totalMatLienLac = nhdnRows.reduce((s, r) => s + r.mat_lien_lac, 0);
  const insight3 = aiNhdn(nhdnRows, totalNhdn, totalMatLienLac);

  // ================= PHẦN 4: NHÓM NGUY CƠ =================
  const allRiskRows = riskByMajorFull(stats, filter);
  const top5Risk = allRiskRows.slice(0, 5);
  const insight4 = aiRiskGroup(top5Risk, kpi);

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Báo cáo tổng quát - Sinh viên Việt Mỹ 2025-2026</title>
<style>
  @page { size: A4 portrait; margin: 16mm 18mm 16mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', 'Be Vietnam Pro', serif; color: #1a1a2e; font-size: 12.5pt; line-height: 1.55; }
  .tieu-ngu { text-align: center; font-weight: bold; }
  .tieu-ngu .line { border-bottom: 1px solid #333; display: inline-block; width: 160px; margin: 0 4px 4px; }
  h1 { font-size: 17pt; text-align: center; color: #1e3a8a; margin-top: 14pt; text-transform: uppercase; letter-spacing: 0.3pt; }
  h2 { font-size: 13.5pt; text-align: center; color: #1e3a8a; text-transform: uppercase; margin-top: 3pt; }
  .meta { text-align: center; color: #555; font-size: 10pt; margin-top: 5pt; }
  .sep { border: none; border-top: 1px solid #aaa; margin: 11pt 0; }
  h3 { font-size: 13.5pt; color: #1e3a8a; margin: 18pt 0 8pt; page-break-after: avoid; border-bottom: 1.5pt solid #dbe4f0; padding-bottom: 4pt; }
  h4 { font-size: 11.5pt; color: #1e3a8a; margin: 13pt 0 6pt; page-break-after: avoid; }
  p.body-text { text-align: justify; text-indent: 14pt; margin: 4pt 0; }
  table { width: 100%; border-collapse: collapse; margin: 7pt 0; }
  td, th { padding: 4.5pt 7pt; border: 1px solid #d5dbe3; font-size: 10pt; }
  th { background: #eef2f8; text-align: left; font-weight: bold; color: #1e3a8a; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  .kpi-row td:first-child { width: 45%; }
  .kpi-row .val { font-weight: bold; }
  .warn-cell { font-weight: bold; color: #b91c1c; }
  .insight { margin: 9pt 0; padding: 9pt 13pt; border-left: 3.5px solid; border-radius: 0 4pt 4pt 0; page-break-inside: avoid; background: #fbfbfb; }
  .insight.red { border-color: #ef4444; }
  .insight.amber { border-color: #f59e0b; }
  .insight.green { border-color: #10b981; }
  .insight .label { font-weight: bold; margin-bottom: 4pt; font-size: 10.5pt; text-transform: uppercase; letter-spacing: 0.2pt; }
  .insight.red .label { color: #b91c1c; }
  .insight.amber .label { color: #b45309; }
  .insight.green .label { color: #047857; }
  .insight div:last-child { text-align: justify; font-size: 11pt; }
  .sign { margin-top: 26pt; display: flex; justify-content: space-between; page-break-inside: avoid; }
  .sign div { text-align: center; width: 45%; }
  .sign .role { font-weight: bold; }
  .sign .hint { font-style: italic; font-size: 10pt; color: #555; margin-top: 4pt; }
  .page-break { page-break-before: always; }
  .baseline { color: #666; font-style: italic; margin-top: 5pt; font-size: 10.5pt; }
  .note { color: #666; font-style: italic; font-size: 9pt; margin-top: 4pt; }
  .chart-wrap { margin: 8pt 0; page-break-inside: avoid; text-align: center; }
  .chart-flex { display: flex; align-items: center; justify-content: center; gap: 20pt; }
  .legend { text-align: left; font-size: 9.5pt; }
  .legend-row { margin: 3pt 0; }
  .legend-dot { display: inline-block; width: 8pt; height: 8pt; border-radius: 2pt; margin-right: 5pt; vertical-align: middle; }
  .chart-legend-inline { text-align: center; font-size: 9pt; color: #555; margin-top: 2pt; }
  .big-nums { display: flex; justify-content: space-around; text-align: center; margin: 8pt 0; }
  .big-nums .n { font-size: 19pt; font-weight: bold; }
  .big-nums .l { font-size: 9pt; color: #666; margin-top: 1pt; }
  .diff-item { margin: 6pt 0; padding: 7pt 10pt; border: 1px solid #e2e8f0; border-radius: 5pt; page-break-inside: avoid; background: #fdfdfd; }
  .diff-item .stt { font-weight: bold; color: #b91c1c; }
  .diff-item .de-xuat { margin-top: 4pt; padding: 5pt 7pt; background: #f0fdf4; border-left: 2.5px solid #10b981; border-radius: 0 3pt 3pt 0; }
  .diff-item .chu-tri { font-size: 9pt; color: #555; margin-top: 4pt; font-style: italic; }
  .section-intro { color: #555; font-size: 10.5pt; margin: -3pt 0 8pt; font-style: italic; }
</style>
</head>
<body>

  <div class="tieu-ngu">
    <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div>Độc lập &ndash; Tự do &ndash; Hạnh phúc<span class="line"></span></div>
  </div>
  <hr class="sep">
  <h1>BÁO CÁO TỔNG QUÁT</h1>
  <h2>HỆ THỐNG QUẢN TRỊ &amp; BIẾN ĐỘNG TÌNH TRẠNG SINH VIÊN VIỆT MỸ</h2>
  <div class="meta">${filterLine}</div>

  <hr class="sep">
  <h3>TÓM TẮT CHỈ SỐ ĐIỀU HÀNH</h3>
  <table>
    <tbody>
      ${kpiRows.map((r) => `<tr class="kpi-row"><td>${esc(r.label)}</td><td class="val" style="color:${r.color}">${esc(r.value)}</td><td class="val" style="color:${r.color};text-align:right">${esc(r.pct)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="baseline">Quy mô đầu kỳ (Đầu vào các khóa.xlsx, lũy kế): ${fmtNum(quyMoDauKy)} sinh viên</div>

  <h3 class="page-break">PHẦN 1: QUY MÔ &amp; ĐANG HỌC</h3>
  <div class="chart-wrap">${svgDonut([
    { label: 'Đang học', value: dangHoc, color: C.good },
    { label: 'Đã mất (thôi học/bảo lưu/tốt nghiệp...)', value: daMat, color: '#cbd5e1' },
  ], quyMoDauKy, 'Tổng đầu kỳ')}</div>
  <div class="big-nums">
    <div><div class="n" style="color:${C.accent}">${fmtNum(quyMoDauKy)}</div><div class="l">Tổng quy mô tuyển sinh đầu kỳ (lũy kế)</div></div>
    <div><div class="n" style="color:${C.good}">${fmtNum(dangHoc)}</div><div class="l">Đang học hiện tại</div></div>
    <div><div class="n" style="color:${C.good}">${fmtPct(dangHocPct)}</div><div class="l">Tỷ lệ giữ chân</div></div>
  </div>
  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu)</div><div>${esc(insight1.hienTrang)}</div></div>

  <h3 class="page-break">PHẦN 2: TÌNH HÌNH THÔI HỌC</h3>
  <h4>Phần A — Tổng quan lũy kế toàn khóa (Đầu vào các khóa.xlsx)</h4>
  <table>
    <thead><tr><th>Khóa</th><th style="text-align:right">Thôi học lũy kế</th><th style="text-align:right">Tổng tuyển</th><th style="text-align:right">Tỷ lệ</th></tr></thead>
    <tbody>
      ${lifeCohort.map((r) => `<tr><td>Khóa ${esc(r.cohort)}</td><td style="text-align:right">${fmtNum(r.thoi_hoc)}</td><td style="text-align:right">${fmtNum(r.total)}</td><td style="text-align:right;font-weight:bold">${fmtPct(r.ti_le, 1)}</td></tr>`).join('')}
    </tbody>
  </table>

  <h4>Biểu đồ A3: Thôi học theo Ngành (lũy kế toàn khóa)</h4>
  <div class="chart-wrap">${svgVBarChart(lifeMajor.map((r) => ({
    label: r.major, value: r.thoi_hoc,
    color: lifeTop5ByCount.has(r.major) ? C.danger : C.warn,
    valueLabel: lifeTop5ByRate.has(r.major) ? `${fmtNum(r.thoi_hoc)} (${fmtPct(r.ti_le, 0)})` : fmtNum(r.thoi_hoc),
  })), { height: 300 })}</div>
  <p class="note" style="text-align:center">■ Đỏ = Top 5 ngành số lượng thôi học lũy kế cao nhất &nbsp; ■ Cam = các ngành còn lại &nbsp; · &nbsp; Số trong ngoặc = tỷ lệ, hiển thị khi ngành thuộc Top 5 tỷ lệ cao nhất.</p>
  <table>
    <thead><tr><th>Ngành</th><th style="text-align:right">Thôi học lũy kế</th><th style="text-align:right">Tổng tuyển</th><th style="text-align:right">Tỷ lệ</th></tr></thead>
    <tbody>
      ${lifeMajor.map((r) => {
        const hlCount = lifeTop5ByCount.has(r.major);
        const hlRate = lifeTop5ByRate.has(r.major);
        const hlTotal = lifeTop5ByTotal.has(r.major);
        return `<tr><td>${esc(r.major)}</td><td style="text-align:right" class="${hlCount ? 'warn-cell' : ''}">${fmtNum(r.thoi_hoc)}</td><td style="text-align:right" class="${hlTotal ? 'warn-cell' : ''}">${fmtNum(r.total)}</td><td style="text-align:right" class="${hlRate ? 'warn-cell' : ''}">${fmtPct(r.ti_le, 1)}</td></tr>`;
      }).join('')}
    </tbody>
  </table>
  <p class="note">Bôi đậm/đỏ trong bảng: Top 5 ngành cao nhất theo từng cột tương ứng (số lượng / tổng tuyển / tỷ lệ) — 3 tập hợp tính độc lập.</p>

  <h4>Xu hướng thôi học theo tháng (năm thống kê T7/2025–T6/2026)</h4>
  <div class="chart-wrap">${svgCombo(trend.map((t) => MONTH_LABELS[t.month as MonthKey]), trend.map((t) => t.thoi_hoc), trend.map((t) => t.ti_le))}</div>

  <h4>Top 5 lý do thôi học (theo thống kê)</h4>
  <div class="chart-wrap">${svgHBarChart(top5LyDo.map((r) => ({ label: r.ly_do, value: r.so_luong, color: C.risk })))}</div>
  <table>
    <thead><tr><th>#</th><th>Nhóm nguyên nhân</th><th>Lý do chi tiết</th><th style="text-align:right">Số lượng</th><th style="text-align:right">Tỷ lệ</th></tr></thead>
    <tbody>
      ${top5LyDo.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.nhom)}</td><td>${esc(r.ly_do)}</td><td style="text-align:right">${fmtNum(r.so_luong)}</td><td style="text-align:right;font-weight:bold">${fmtPct(r.ti_le, 1)}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu)</div><div>${esc(insight2.hienTrang)}</div></div>

  <h3 class="page-break">PHẦN 3: NGHỈ HỌC DÀI NGÀY</h3>
  <h4>Xếp hạng ngành có NHDN lũy kế cao nhất (tính đến tháng gần nhất)</h4>
  <div class="chart-wrap">${svgHBarChart(nhdnRows.map((r) => ({ label: r.major, value: r.nghi_hoc_dai_ngay, color: C.warn, value2: r.mat_lien_lac, color2: C.danger })))}</div>
  <p class="chart-legend-inline"><span class="legend-dot" style="background:${C.warn}"></span>Nghỉ học dài ngày &nbsp;&nbsp; <span class="legend-dot" style="background:${C.danger}"></span>Mất liên lạc</p>
  <table>
    <thead><tr><th>Ngành</th><th style="text-align:right">NHDN</th><th style="text-align:right">Mất liên lạc</th><th style="text-align:right">Tỷ lệ mất LL</th></tr></thead>
    <tbody>
      ${nhdnRows.map((r) => `<tr><td>${esc(r.major)}</td><td style="text-align:right">${fmtNum(r.nghi_hoc_dai_ngay)}</td><td style="text-align:right" class="${r.ti_le_mat_lien_lac > 25 ? 'warn-cell' : ''}">${fmtNum(r.mat_lien_lac)}</td><td style="text-align:right" class="${r.ti_le_mat_lien_lac > 25 ? 'warn-cell' : ''}">${fmtPct(r.ti_le_mat_lien_lac, 0)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu)</div><div>${esc(insight3.hienTrang)}</div></div>
  <div class="insight amber"><div class="label">Nguyên nhân gốc rễ</div><div>${esc(insight3.nguyenNhan)}</div></div>

  <h3 class="page-break">PHẦN 4: NHÓM NGUY CƠ</h3>
  <h4>Top 5 ngành nguy cơ cao nhất (Bảng 5.2 — Thôi học + NHDN + Bảo lưu)</h4>
  <div class="chart-wrap">${svgHBarChart(top5Risk.map((r) => ({ label: r.major, value: r.tong_nguy_co, color: C.risk })))}</div>
  <table>
    <thead><tr><th>#</th><th>Ngành</th><th style="text-align:right">Thôi học</th><th style="text-align:right">Nghỉ dài ngày</th><th style="text-align:right">Bảo lưu</th><th style="text-align:right">Tổng nguy cơ</th></tr></thead>
    <tbody>
      ${top5Risk.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.major)}</td><td style="text-align:right">${fmtNum(r.thoi_hoc)}</td><td style="text-align:right">${fmtNum(r.nghi_hoc_dai_ngay)}</td><td style="text-align:right">${fmtNum(r.bao_luu)}</td><td style="text-align:right" class="warn-cell">${fmtNum(r.tong_nguy_co)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu)</div><div>${esc(insight4.hienTrang)}</div></div>
  <div class="insight amber"><div class="label">Nguyên nhân gốc rễ</div><div>${esc(insight4.nguyenNhan)}</div></div>

  <h3 class="page-break">PHẦN 5: KHÓ KHĂN &ndash; ĐỀ XUẤT</h3>
  ${GLOBAL_DIFFICULTIES.map((d) => `
    <div class="diff-item">
      <span class="stt">${d.stt}.</span> ${esc(d.kho_khan)}
      <div class="chu-tri">Chủ trì: ${esc(d.bo_phan_chu_tri)}</div>
      <div class="de-xuat"><strong>Đề xuất:</strong> ${esc(d.de_xuat)}</div>
    </div>`).join('')}

  <h3 class="page-break">PHẦN 6: KẾ HOẠCH HÀNH ĐỘNG</h3>
  <table>
    <thead><tr><th>#</th><th>Nhóm hành động</th><th>Hành động cụ thể</th><th>Ưu tiên</th><th>Thời hạn</th></tr></thead>
    <tbody>
      ${STRATEGIC_RECOMMENDATIONS.map((r) => `<tr><td>${r.stt}</td><td>${esc(r.nhom)}</td><td>${esc(r.hanh_dong)}</td><td style="font-weight:bold;color:${r.u_tien === 'Cao' ? '#b91c1c' : r.u_tien === 'Trung bình' ? '#b45309' : '#555'}">${esc(r.u_tien)}</td><td>${esc(r.thoi_han)}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="sign">
    <div><div class="role">ĐẠI DIỆN PHÒNG ĐÀO TẠO</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
    <div><div class="role">KT. HIỆU TRƯỞNG</div><div class="hint">(Ký, ghi rõ họ tên)</div></div>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); throw new Error('Không thể tạo iframe in'); }
  doc.open();
  doc.write(html);
  doc.close();
}

export { exportBghReport as default };
