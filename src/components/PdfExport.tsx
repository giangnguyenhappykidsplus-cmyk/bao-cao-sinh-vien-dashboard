// PdfExport — native print-to-PDF via hidden iframe (no external deps)
// Generates a clean A4 administrative document the user saves as PDF from the print dialog.
import type { KpiSnapshot } from '../types';
import { fmtNum, fmtPct, MONTH_LABELS, type AiInsight } from '../calc';
import type { FilterState } from '../types';
import { ALL_MONTHS } from '../types';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function exportBghReport(
  kpi: KpiSnapshot,
  filter: FilterState,
  insights: AiInsight,
  quyMoDauKyC1?: number,
  dangHocC1?: number,
): Promise<void> {
  // Thẻ 1 (Quy mô & Đang học): nếu có truyền số liệu lũy kế từ "Đầu vào các khóa.xlsx" thì ưu tiên
  // dùng số đó (khớp với dashboard); nếu không có thì fallback về kpi.dang_hoc như trước.
  const dangHocDisplay = dangHocC1 ?? kpi.dang_hoc;
  const dangHocPctDisplay = quyMoDauKyC1 && quyMoDauKyC1 > 0 && dangHocC1 !== undefined
    ? (dangHocC1 / quyMoDauKyC1) * 100
    : kpi.dang_hoc_pct;
  const monthRange = filter.months.length === ALL_MONTHS.length
    ? 'Toàn kỳ (T7/2025 - T6/2026)'
    : `${MONTH_LABELS[filter.months[0] as keyof typeof MONTH_LABELS]} - ${MONTH_LABELS[filter.months[filter.months.length - 1] as keyof typeof MONTH_LABELS]}`;

  const filterLine = [
    `Giai đoạn: ${monthRange}`,
    filter.cohorts.length ? `Khóa: ${filter.cohorts.join(', ')}` : '',
    filter.systems.length ? `Hệ: ${filter.systems.join(', ')}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const kpiRows: Array<{ label: string; value: string; pct: string; color: string }> = [
    { label: 'Quy mô & Đang học', value: `${fmtNum(dangHocDisplay)} SV`, pct: fmtPct(dangHocPctDisplay), color: '#10b981' },
    { label: 'Thôi học (cộng dồn)', value: `${fmtNum(kpi.thoi_hoc)} SV`, pct: fmtPct(kpi.thoi_hoc_pct), color: '#ef4444' },
    { label: 'Bảo lưu (cộng dồn)', value: `${fmtNum(kpi.bao_luu)} SV`, pct: fmtPct(kpi.tong_sinh_vien_dau_ky > 0 ? (kpi.bao_luu / kpi.tong_sinh_vien_dau_ky) * 100 : 0), color: '#8b5cf6' },
    { label: 'Nghỉ học dài ngày', value: `${fmtNum(kpi.nghi_hoc_dai_ngay)} SV`, pct: 'lũy kế', color: '#f59e0b' },
    { label: 'Tỷ lệ nhóm nguy cơ', value: `${fmtNum(kpi.nhom_nguy_co)} SV`, pct: fmtPct(kpi.nhom_nguy_co_pct), color: '#f97316' },
    { label: 'Quay lại học (cộng dồn)', value: `${fmtNum(kpi.quay_lai)} SV`, pct: 'phục hồi', color: '#3b82f6' },
  ];

  // Capture the 3 most important charts from the current dashboard as SVG strings
  const chartContainers = Array.from(document.querySelectorAll('.recharts-surface')) as SVGElement[];
  const chartTitles = [
    'Biểu đồ 1: Phân rã trạng thái sinh viên (Donut)',
    'Biểu đồ 2: Xu hướng thôi học theo tháng (Combo Chart)',
    'Biểu đồ 3: Cơ cấu nhóm nguy cơ toàn trường',
  ];
  const chartHtml: string[] = [];
  for (let i = 0; i < Math.min(3, chartContainers.length); i++) {
    const svg = chartContainers[i];
    const parent = svg.parentElement?.parentElement?.parentElement;
    if (!parent) continue;
    const cloned = svg.cloneNode(true) as SVGElement;
    cloned.setAttribute('width', '700');
    cloned.setAttribute('height', '320');
    const wrapper = document.createElement('div');
    wrapper.appendChild(cloned);
    chartHtml.push(`<div class="chart-block"><div class="chart-title">${esc(chartTitles[i] || `Biểu đồ ${i + 1}`)}</div>${wrapper.innerHTML}</div>`);
  }

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Báo cáo BGH - Sinh viên Việt Mỹ 2025-2026</title>
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
  h3 { font-size: 13pt; color: #1e3a8a; margin: 14pt 0 6pt; }
  table { width: 100%; border-collapse: collapse; margin: 6pt 0; }
  td, th { padding: 5pt 8pt; border: 1px solid #ccc; font-size: 11pt; }
  th { background: #f0f4f8; text-align: left; font-weight: bold; }
  .kpi-row td:first-child { width: 45%; }
  .kpi-row .val { font-weight: bold; }
  .chart-block { margin: 10pt 0; text-align: center; page-break-inside: avoid; }
  .chart-block svg { max-width: 100%; height: auto; background: #0f1626; border-radius: 6px; }
  .chart-title { font-weight: bold; color: #1e3a8a; margin-bottom: 4pt; font-size: 11pt; }
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
</style>
</head>
<body>

  <div class="tieu-ngu">
    <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div>Độc lập &ndash; Tự do &ndash; Hạnh phúc<span class="line"></span></div>
  </div>
  <hr class="sep">
  <h1>BÁO CÁO TỔNG HỢP</h1>
  <h2>HỆ THỐNG QUẢN TRỊ &amp; BIẾN ĐỘNG TÌNH TRẠNG SINH VIÊN VIỆT MỸ</h2>
  <div class="meta">${filterLine}</div>

  <hr class="sep">
  <h3>PHẦN 1: TÓM TẮT CHỈ SỐ ĐIỀU HÀNH</h3>
  <table>
    <tbody>
      ${kpiRows.map((r) => `<tr class="kpi-row"><td>${esc(r.label)}</td><td class="val" style="color:${r.color}">${esc(r.value)}</td><td class="val" style="color:${r.color};text-align:right">${esc(r.pct)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="baseline">Quy mô đầu kỳ (Đầu vào các khóa.xlsx, lũy kế): ${fmtNum(quyMoDauKyC1 ?? kpi.tong_sinh_vien_dau_ky)} sinh viên</div>

  <h3>PHẦN 2: ĐỒ HỌA TRỰC QUAN</h3>
  ${chartHtml.join('') || '<p>(Mở Tab Tổng quan và nhấp vào một thẻ KPI để hiển thị biểu đồ trước khi xuất báo cáo.)</p>'}

  <h3>PHẦN 3: KẾT LUẬN ĐỊNH TÍNH CỦA TRỢ LÝ AI</h3>
  <div class="insight red"><div class="label">Hiện trạng nổi bật (Điểm nóng dữ liệu):</div><div>${esc(insights.hienTrang)}</div></div>
  <div class="insight amber"><div class="label">Nguyên nhân gốc rễ (Định tính từ dữ liệu ghi chú):</div><div>${esc(insights.nguyenNhan)}</div></div>

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
