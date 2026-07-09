// PdfExport — native print-to-PDF via hidden iframe (no external deps)
// "Báo cáo tổng quát" — tổng hợp toàn bộ dashboard: tự tính lại từ calc.ts theo dữ liệu + bộ lọc
// hiện tại (KHÔNG phụ thuộc tab/thẻ nào đang mở trên màn hình), nên luôn khớp dữ liệu mới nhất.
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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- simple print-friendly "chart" helpers built with plain divs (no external chart lib needed,
//     and does not depend on any recharts SVG being mounted in the current tab) ---
function hBarChart(rows: Array<{ label: string; value: number; color: string; sub?: string }>, opts?: { unit?: string }): string {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `<div class="hbar-chart">${rows.map((r) => `
    <div class="hbar-row">
      <div class="hbar-label" title="${esc(r.label)}">${esc(r.label)}</div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(2, (r.value / max) * 100)}%;background:${r.color}"></div></div>
      <div class="hbar-value">${fmtNum(r.value)}${opts?.unit ?? ''}${r.sub ? ` <span class="hbar-sub">${esc(r.sub)}</span>` : ''}</div>
    </div>`).join('')}</div>`;
}

function vBarChart(rows: Array<{ label: string; value: number; sub?: string }>, color: string): string {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `<div class="vbar-chart">${rows.map((r) => `
    <div class="vbar-col">
      <div class="vbar-sub">${r.sub ?? ''}</div>
      <div class="vbar-track"><div class="vbar-fill" style="height:${Math.max(3, (r.value / max) * 100)}%;background:${color}"><span class="vbar-value">${fmtNum(r.value)}</span></div></div>
      <div class="vbar-label">${esc(r.label)}</div>
    </div>`).join('')}</div>`;
}

function proportionBar(value: number, total: number, color: string): string {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return `<div class="prop-track"><div class="prop-fill" style="width:${pct}%;background:${color}"></div></div>`;
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
    { label: 'Quy mô & Đang học', value: `${fmtNum(dangHoc)} SV`, pct: fmtPct(quyMoDauKy > 0 ? (dangHoc / quyMoDauKy) * 100 : 0), color: '#10b981' },
    { label: 'Thôi học (cộng dồn)', value: `${fmtNum(kpi.thoi_hoc)} SV`, pct: fmtPct(kpi.thoi_hoc_pct), color: '#ef4444' },
    { label: 'Bảo lưu (cộng dồn)', value: `${fmtNum(kpi.bao_luu)} SV`, pct: fmtPct(kpi.tong_sinh_vien_dau_ky > 0 ? (kpi.bao_luu / kpi.tong_sinh_vien_dau_ky) * 100 : 0), color: '#8b5cf6' },
    { label: 'Nghỉ học dài ngày', value: `${fmtNum(kpi.nghi_hoc_dai_ngay)} SV`, pct: 'lũy kế', color: '#f59e0b' },
    { label: 'Tỷ lệ nhóm nguy cơ', value: `${fmtNum(kpi.nhom_nguy_co)} SV`, pct: fmtPct(kpi.nhom_nguy_co_pct), color: '#f97316' },
    { label: 'Quay lại học (cộng dồn)', value: `${fmtNum(kpi.quay_lai)} SV`, pct: 'phục hồi', color: '#3b82f6' },
  ];

  // ================= PHẦN 1: QUY MÔ & ĐANG HỌC =================
  const cohortRowsC1 = byCohortLifetime(dauvaoStatus, filter);
  const majorRowsC1 = byMajorRetentionLifetime(dauvaoStatus, filter);
  const insight1 = aiRetentionLifetime(quyMoDauKy, dangHoc, cohortRowsC1, majorRowsC1);
  const dangHocPct = quyMoDauKy > 0 ? (dangHoc / quyMoDauKy) * 100 : 0;

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

  const monthlyBarsData = trend.map((t) => ({ label: MONTH_LABELS[t.month as MonthKey], value: t.thoi_hoc, sub: `${fmtPct(t.ti_le, 1)}` }));

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
  @page { size: A4 portrait; margin: 18mm 20mm 18mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', 'Be Vietnam Pro', serif; color: #1a1a2e; font-size: 12pt; line-height: 1.5; }
  .tieu-ngu { text-align: center; font-weight: bold; }
  .tieu-ngu .line { border-bottom: 1px solid #333; display: inline-block; width: 160px; margin: 0 4px 4px; }
  h1 { font-size: 16pt; text-align: center; color: #1e3a8a; margin-top: 14pt; text-transform: uppercase; }
  h2 { font-size: 14pt; text-align: center; color: #1e3a8a; text-transform: uppercase; }
  .meta { text-align: center; color: #555; font-size: 10pt; margin-top: 4pt; }
  .sep { border: none; border-top: 1px solid #aaa; margin: 10pt 0; }
  h3 { font-size: 13pt; color: #1e3a8a; margin: 16pt 0 6pt; page-break-after: avoid; }
  h4 { font-size: 11.5pt; color: #1e3a8a; margin: 10pt 0 4pt; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0; }
  td, th { padding: 4pt 7pt; border: 1px solid #ccc; font-size: 10pt; }
  th { background: #f0f4f8; text-align: left; font-weight: bold; }
  .kpi-row td:first-child { width: 45%; }
  .kpi-row .val { font-weight: bold; }
  .warn-cell { font-weight: bold; color: #b91c1c; background: #fef2f2; }
  .insight { margin: 8pt 0; padding: 8pt 12pt; border-left: 3px solid; page-break-inside: avoid; }
  .insight.red { border-color: #ef4444; background: #fef2f2; }
  .insight.amber { border-color: #f59e0b; background: #fffbeb; }
  .insight.green { border-color: #10b981; background: #f0fdf4; }
  .insight .label { font-weight: bold; margin-bottom: 3pt; }
  .insight.red .label { color: #b91c1c; }
  .insight.amber .label { color: #b45309; }
  .insight.green .label { color: #047857; }
  .sign { margin-top: 24pt; display: flex; justify-content: space-between; page-break-inside: avoid; }
  .sign div { text-align: center; width: 45%; }
  .sign .role { font-weight: bold; }
  .sign .hint { font-style: italic; font-size: 10pt; color: #555; margin-top: 4pt; }
  .page-break { page-break-before: always; }
  .baseline { color: #666; font-style: italic; margin-top: 4pt; }
  .note { color: #666; font-style: italic; font-size: 9.5pt; margin-top: 3pt; }
  .hbar-chart { margin: 6pt 0; page-break-inside: avoid; }
  .hbar-row { display: flex; align-items: center; gap: 6pt; margin: 3pt 0; font-size: 9.5pt; }
  .hbar-label { width: 32%; text-align: right; color: #333; }
  .hbar-track { flex: 1; background: #eef1f5; border-radius: 3pt; height: 12pt; overflow: hidden; }
  .hbar-fill { height: 100%; border-radius: 3pt; }
  .hbar-value { width: 20%; font-weight: 600; }
  .hbar-sub { font-weight: normal; color: #b91c1c; font-size: 8.5pt; }
  .vbar-chart { display: flex; align-items: flex-end; gap: 3pt; height: 110pt; margin: 8pt 0 4pt; page-break-inside: avoid; }
  .vbar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
  .vbar-sub { font-size: 7.5pt; color: #b45309; margin-bottom: 1pt; }
  .vbar-track { width: 70%; height: 80pt; display: flex; align-items: flex-end; }
  .vbar-fill { width: 100%; background: #ef4444; border-radius: 2pt 2pt 0 0; position: relative; display: flex; align-items: flex-start; justify-content: center; }
  .vbar-value { font-size: 7.5pt; color: #fff; position: relative; top: -9pt; font-weight: 600; }
  .vbar-label { font-size: 7.5pt; color: #555; margin-top: 2pt; }
  .prop-track { width: 100%; height: 16pt; background: #eef1f5; border-radius: 4pt; overflow: hidden; margin: 6pt 0; }
  .prop-fill { height: 100%; }
  .big-nums { display: flex; justify-content: space-around; text-align: center; margin: 6pt 0; }
  .big-nums .n { font-size: 18pt; font-weight: bold; }
  .big-nums .l { font-size: 9pt; color: #666; }
  .diff-item { margin: 5pt 0; padding: 6pt 9pt; border: 1px solid #ddd; border-radius: 4pt; page-break-inside: avoid; }
  .diff-item .stt { font-weight: bold; color: #b91c1c; }
  .diff-item .de-xuat { margin-top: 3pt; padding: 4pt 6pt; background: #f0fdf4; border-left: 2px solid #10b981; }
  .diff-item .chu-tri { font-size: 9pt; color: #555; margin-top: 3pt; }
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
  <h3>PHẦN 0: TÓM TẮT CHỈ SỐ ĐIỀU HÀNH</h3>
  <table>
    <tbody>
      ${kpiRows.map((r) => `<tr class="kpi-row"><td>${esc(r.label)}</td><td class="val" style="color:${r.color}">${esc(r.value)}</td><td class="val" style="color:${r.color};text-align:right">${esc(r.pct)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="baseline">Quy mô đầu kỳ (Đầu vào các khóa.xlsx, lũy kế): ${fmtNum(quyMoDauKy)} sinh viên</div>

  <h3 class="page-break">PHẦN 1: QUY MÔ &amp; ĐANG HỌC</h3>
  <div class="big-nums">
    <div><div class="n" style="color:#3b82f6">${fmtNum(quyMoDauKy)}</div><div class="l">Tổng quy mô tuyển sinh đầu kỳ (lũy kế)</div></div>
    <div><div class="n" style="color:#10b981">${fmtNum(dangHoc)}</div><div class="l">Đang học hiện tại</div></div>
    <div><div class="n" style="color:#10b981">${fmtPct(dangHocPct)}</div><div class="l">Tỷ lệ giữ chân</div></div>
  </div>
  ${proportionBar(dangHoc, quyMoDauKy, '#10b981')}
  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu):</div><div>${esc(insight1.hienTrang)}</div></div>

  <h3 class="page-break">PHẦN 2: TÌNH HÌNH THÔI HỌC</h3>
  <h4>Phần A — Tổng quan lũy kế toàn khóa (Đầu vào các khóa.xlsx)</h4>
  <table>
    <thead><tr><th>Khóa</th><th style="text-align:right">Thôi học lũy kế</th><th style="text-align:right">Tổng tuyển</th><th style="text-align:right">Tỷ lệ</th></tr></thead>
    <tbody>
      ${lifeCohort.map((r) => `<tr><td>Khóa ${esc(r.cohort)}</td><td style="text-align:right">${fmtNum(r.thoi_hoc)}</td><td style="text-align:right">${fmtNum(r.total)}</td><td style="text-align:right;font-weight:bold">${fmtPct(r.ti_le, 1)}</td></tr>`).join('')}
    </tbody>
  </table>

  <h4>Biểu đồ A3: Thôi học theo Ngành (lũy kế toàn khóa)</h4>
  ${hBarChart(lifeMajor.slice(0, 11).map((r) => ({ label: r.major, value: r.thoi_hoc, color: lifeTop5ByCount.has(r.major) ? '#ef4444' : '#f59e0b', sub: lifeTop5ByRate.has(r.major) ? `${fmtPct(r.ti_le, 1)} ⚠` : `${fmtPct(r.ti_le, 1)}` })))}
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
  <p class="note">Bôi đậm/đỏ: Top 5 ngành cao nhất theo từng cột tương ứng (số lượng / tổng tuyển / tỷ lệ) — 3 tập hợp tính độc lập.</p>

  <h4>Xu hướng thôi học theo tháng (năm thống kê T7/2025–T6/2026)</h4>
  ${vBarChart(monthlyBarsData, '#ef4444')}

  <h4>Top 5 lý do thôi học (theo thống kê)</h4>
  <table>
    <thead><tr><th>#</th><th>Nhóm nguyên nhân</th><th>Lý do chi tiết</th><th style="text-align:right">Số lượng</th><th style="text-align:right">Tỷ lệ</th></tr></thead>
    <tbody>
      ${top5LyDo.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.nhom)}</td><td>${esc(r.ly_do)}</td><td style="text-align:right">${fmtNum(r.so_luong)}</td><td style="text-align:right;font-weight:bold">${fmtPct(r.ti_le, 1)}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu):</div><div>${esc(insight2.hienTrang)}</div></div>

  <h3 class="page-break">PHẦN 3: NGHỈ HỌC DÀI NGÀY</h3>
  <h4>Xếp hạng ngành có NHDN lũy kế cao nhất (tính đến tháng gần nhất)</h4>
  ${hBarChart(nhdnRows.map((r) => ({ label: r.major, value: r.nghi_hoc_dai_ngay, color: '#f59e0b', sub: `${fmtNum(r.mat_lien_lac)} mất LL (${fmtPct(r.ti_le_mat_lien_lac, 0)})` })))}
  <table>
    <thead><tr><th>Ngành</th><th style="text-align:right">NHDN</th><th style="text-align:right">Mất liên lạc</th><th style="text-align:right">Tỷ lệ mất LL</th></tr></thead>
    <tbody>
      ${nhdnRows.map((r) => `<tr><td>${esc(r.major)}</td><td style="text-align:right">${fmtNum(r.nghi_hoc_dai_ngay)}</td><td style="text-align:right" class="${r.ti_le_mat_lien_lac > 25 ? 'warn-cell' : ''}">${fmtNum(r.mat_lien_lac)}</td><td style="text-align:right" class="${r.ti_le_mat_lien_lac > 25 ? 'warn-cell' : ''}">${fmtPct(r.ti_le_mat_lien_lac, 0)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu):</div><div>${esc(insight3.hienTrang)}</div></div>
  <div class="insight amber"><div class="label">Nguyên nhân gốc rễ:</div><div>${esc(insight3.nguyenNhan)}</div></div>

  <h3 class="page-break">PHẦN 4: NHÓM NGUY CƠ</h3>
  <h4>Top 5 ngành nguy cơ cao nhất (Bảng 5.2 — Thôi học + NHDN + Bảo lưu)</h4>
  <table>
    <thead><tr><th>#</th><th>Ngành</th><th style="text-align:right">Thôi học</th><th style="text-align:right">Nghỉ dài ngày</th><th style="text-align:right">Bảo lưu</th><th style="text-align:right">Tổng nguy cơ</th></tr></thead>
    <tbody>
      ${top5Risk.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.major)}</td><td style="text-align:right">${fmtNum(r.thoi_hoc)}</td><td style="text-align:right">${fmtNum(r.nghi_hoc_dai_ngay)}</td><td style="text-align:right">${fmtNum(r.bao_luu)}</td><td style="text-align:right" class="warn-cell">${fmtNum(r.tong_nguy_co)}</td></tr>`).join('')}
    </tbody>
  </table>
  ${hBarChart(top5Risk.map((r) => ({ label: r.major, value: r.tong_nguy_co, color: '#f97316' })))}
  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu):</div><div>${esc(insight4.hienTrang)}</div></div>
  <div class="insight amber"><div class="label">Nguyên nhân gốc rễ:</div><div>${esc(insight4.nguyenNhan)}</div></div>

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
