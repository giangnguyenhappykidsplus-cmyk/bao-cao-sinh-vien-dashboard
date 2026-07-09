// Calculation, aggregation, filtering, and AI insight generation utilities.
import {
  ALL_MONTHS,
  MONTH_LABELS,
  type BaselineIntake,
  type BaoLuuByMajorRow,
  type CauseGroup,
  type CauseSummaryRow,
  type CohortKey,
  type CohortRetentionRow,
  type DauVaoLifetimeRow,
  type DetailCauseRow,
  type DropoutByCohortRow,
  type DropoutByMajorRow,
  type FilterState,
  type KpiSnapshot,
  type LifetimeByCohortRow,
  type LifetimeByCohortBaoLuuRow,
  type LifetimeByMajorRow,
  type LifetimeByMajorBaoLuuRow,
  type LifetimeCrossTabRow,
  type LifetimeCrossTabBaoLuuRow,
  type Major,
  type MajorRetentionRow,
  type MonthKey,
  type MonthlyStat,
  type MonthlyTrendPoint,
  type NhdnByMajorRow,
  type ReturnTrendPoint,
  type RiskByCohortRow,
  type RiskByMajorRow,
  type StudentRecord,
  type SystemRetentionRow,
  type TopDropoutRow,
  type TrainingSystem,
  type DauVaoStatusRow,
  type EnrollmentTimelinePoint,
} from './types';
import { MAX_CAPACITY } from './data';

export { MONTH_LABELS };
export const SAFE_RETENTION_THRESHOLD = 85;

// --- Month helpers ---
export function sortMonths(months: MonthKey[]): MonthKey[] {
  return [...months].sort((a, b) => ALL_MONTHS.indexOf(a) - ALL_MONTHS.indexOf(b));
}
export function latestMonth(months: MonthKey[]): MonthKey {
  return sortMonths(months)[months.length - 1] ?? ALL_MONTHS[ALL_MONTHS.length - 1];
}

// --- Filtering ---
function matchesStat(s: { cohort: CohortKey; system: TrainingSystem; major: Major }, f: FilterState): boolean {
  if (f.cohorts.length && !f.cohorts.includes(s.cohort)) return false;
  if (f.systems.length && !f.systems.includes(s.system)) return false;
  if (f.majors.length && !f.majors.includes(s.major)) return false;
  return true;
}
function matchesStudent(s: { nien_khoa: CohortKey; he_dao_tao: TrainingSystem; nganh: Major }, f: FilterState): boolean {
  if (f.cohorts.length && !f.cohorts.includes(s.nien_khoa)) return false;
  if (f.systems.length && !f.systems.includes(s.he_dao_tao)) return false;
  if (f.majors.length && !f.majors.includes(s.nganh)) return false;
  return true;
}
export function filterStats(stats: MonthlyStat[], f: FilterState): MonthlyStat[] {
  return stats.filter((s) => f.months.includes(s.month) && matchesStat(s, f));
}
export function filterBaseline(baseline: BaselineIntake[], f: FilterState): BaselineIntake[] {
  return baseline.filter((b) => matchesStat(b, f));
}
export function filterStudents(students: StudentRecord[], f: FilterState): StudentRecord[] {
  return students.filter((s) => f.months.includes(s.thang_bien_dong) && matchesStudent(s, f));
}

// --- KPI ---
export function computeKpi(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): KpiSnapshot {
  const filtered = filterStats(stats, f);
  const filteredBaseline = filterBaseline(baseline, f);
  const lastMonth = latestMonth(f.months);
  const tongDauKy = filteredBaseline.reduce((s, b) => s + b.count, 0);
  const lastStats = filtered.filter((s) => s.month === lastMonth);
  const dangHoc = lastStats.reduce((s, x) => s + x.dang_hoc, 0);
  const thoiHoc = filtered.reduce((s, x) => s + x.thoi_hoc, 0);
  const baoLuu = filtered.reduce((s, x) => s + x.bao_luu, 0);
  const quayLai = filtered.reduce((s, x) => s + x.quay_lai, 0);
  const chuyenNganh = filtered.reduce((s, x) => s + x.chuyen_nganh, 0);
  const nghiHocDaiNgay = lastStats.reduce((s, x) => s + x.nghi_hoc_dai_ngay, 0);
  const nhomNguyCo = thoiHoc + nghiHocDaiNgay + baoLuu;
  // thoi_hoc_pct = TRUNG BINH cong cua ti le % Thoi hoc tung thang (moi thang = thoi_hoc(thang)/mau_so(thang)),
  // KHONG phai cong don thoi_hoc ca ky chia cho baseline — theo yeu cau doi chieu voi sheet nguon
  const monthlyDropoutPcts = sortMonths(f.months).map((month) => {
    const monthStats = filtered.filter((s) => s.month === month);
    const mThoiHoc = monthStats.reduce((s, x) => s + x.thoi_hoc, 0);
    const mMauSo = monthStats.reduce((s, x) => s + x.mau_so, 0);
    return mMauSo > 0 ? (mThoiHoc / mMauSo) * 100 : 0;
  });
  const thoiHocPctAvg = monthlyDropoutPcts.length > 0
    ? monthlyDropoutPcts.reduce((a, b) => a + b, 0) / monthlyDropoutPcts.length
    : 0;
  return {
    tong_sinh_vien_dau_ky: tongDauKy, dang_hoc: dangHoc,
    dang_hoc_pct: tongDauKy > 0 ? (dangHoc / tongDauKy) * 100 : 0,
    thoi_hoc: thoiHoc, thoi_hoc_pct: thoiHocPctAvg,
    nghi_hoc_dai_ngay: nghiHocDaiNgay,
    nhom_nguy_co: nhomNguyCo, nhom_nguy_co_pct: tongDauKy > 0 ? (nhomNguyCo / tongDauKy) * 100 : 0,
    bao_luu: baoLuu, quay_lai: quayLai, chuyen_nganh: chuyenNganh,
  };
}

// --- Retention (cohort & major) ---
export function computeCohortRetention(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): CohortRetentionRow[] {
  const lastMonth = latestMonth(f.months);
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((cohort) => {
    const dauVao = baseline.filter((b) => b.cohort === cohort && matchesStat(b, f)).reduce((s, b) => s + b.count, 0);
    const dangHoc = stats.filter((s) => s.cohort === cohort && s.month === lastMonth && matchesStat(s, f)).reduce((s, x) => s + x.dang_hoc, 0);
    const g = dauVao > 0 ? (dangHoc / dauVao) * 100 : 0;
    return { cohort, dau_vao: dauVao, dang_hoc_hien_tai: dangHoc, gan_ket_pct: g, bien_mat_pct: 100 - g };
  });
}
export function computeMajorRetention(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): MajorRetentionRow[] {
  const lastMonth = latestMonth(f.months);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(baseline);
  return majors.map((major) => {
    const dauVao = baseline.filter((b) => b.major === major && matchesStat(b, f)).reduce((s, b) => s + b.count, 0);
    const dangHoc = stats.filter((s) => s.major === major && s.month === lastMonth && matchesStat(s, f)).reduce((s, x) => s + x.dang_hoc, 0);
    const g = dauVao > 0 ? (dangHoc / dauVao) * 100 : 0;
    return { major, dau_vao: dauVao, dang_hoc_hien_tai: dangHoc, gan_ket_pct: g, bien_mat_pct: 100 - g };
  });
}

// --- Dropout trend (monthly) ---
export function dropoutTrend(stats: MonthlyStat[], f: FilterState): Array<{ month: MonthKey; thoi_hoc: number }> {
  const filtered = filterStats(stats, f);
  return sortMonths(f.months).map((month) => ({
    month,
    thoi_hoc: filtered.filter((s) => s.month === month).reduce((s, x) => s + x.thoi_hoc, 0),
  }));
}

// --- Top dropouts ---
export function topDropoutByCohort(stats: MonthlyStat[], f: FilterState): TopDropoutRow[] {
  const filtered = filterStats(stats, f);
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((c) => ({ label: c, thoi_hoc: filtered.filter((s) => s.cohort === c).reduce((s, x) => s + x.thoi_hoc, 0) })).sort((a, b) => b.thoi_hoc - a.thoi_hoc);
}
export function topDropoutBySystem(stats: MonthlyStat[], f: FilterState): TopDropoutRow[] {
  const filtered = filterStats(stats, f);
  const systems: TrainingSystem[] = f.systems.length ? f.systems : ['Cao đẳng', 'Trung cấp'];
  return systems.map((s) => ({ label: s, thoi_hoc: filtered.filter((st) => st.system === s).reduce((sum, x) => sum + x.thoi_hoc, 0) })).sort((a, b) => b.thoi_hoc - a.thoi_hoc);
}
export function topDropoutByMajor(stats: MonthlyStat[], f: FilterState, limit = 8): TopDropoutRow[] {
  const filtered = filterStats(stats, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => ({ label: m, thoi_hoc: filtered.filter((s) => s.major === m).reduce((sum, x) => sum + x.thoi_hoc, 0) })).sort((a, b) => b.thoi_hoc - a.thoi_hoc).slice(0, limit);
}

// --- Risk by major ---
export function riskByMajor(stats: MonthlyStat[], f: FilterState, limit = 5): RiskByMajorRow[] {
  const filtered = filterStats(stats, f);
  const lastMonth = latestMonth(f.months);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => {
    const rows = filtered.filter((s) => s.major === m);
    const thoi_hoc = rows.reduce((s, x) => s + x.thoi_hoc, 0);
    const nghi_hoc_dai_ngay = rows.filter((s) => s.month === lastMonth).reduce((s, x) => s + x.nghi_hoc_dai_ngay, 0);
    const bao_luu = rows.reduce((s, x) => s + x.bao_luu, 0);
    return { major: m, thoi_hoc, nghi_hoc_dai_ngay, bao_luu, tong_nguy_co: thoi_hoc + nghi_hoc_dai_ngay + bao_luu };
  }).sort((a, b) => b.tong_nguy_co - a.tong_nguy_co).slice(0, limit);
}

// --- Risk area chart: nguy cơ vs thôi học hẳn across months ---
export function riskAreaTrend(stats: MonthlyStat[], f: FilterState): Array<{ month: MonthKey; nhom_nguy_co: number; thoi_hoc_luy_ke: number; nghi_hd_luy_ke: number; bao_luu_luy_ke: number }> {
  const filtered = filterStats(stats, f);
  return sortMonths(f.months).map((month) => {
    const upTo = filtered.filter((s) => ALL_MONTHS.indexOf(s.month) <= ALL_MONTHS.indexOf(month));
    const atMonth = filtered.filter((s) => s.month === month);
    return {
      month,
      thoi_hoc_luy_ke: upTo.reduce((s, x) => s + x.thoi_hoc, 0),
      nghi_hd_luy_ke: atMonth.reduce((s, x) => s + x.nghi_hoc_dai_ngay, 0),
      bao_luu_luy_ke: upTo.reduce((s, x) => s + x.bao_luu, 0),
      nhom_nguy_co: upTo.reduce((s, x) => s + x.thoi_hoc, 0) + atMonth.reduce((s, x) => s + x.nghi_hoc_dai_ngay, 0) + upTo.reduce((s, x) => s + x.bao_luu, 0),
    };
  });
}

// --- Return trend ---
export function returnTrend(stats: MonthlyStat[], f: FilterState): ReturnTrendPoint[] {
  const filtered = filterStats(stats, f);
  return sortMonths(f.months).map((month) => ({ month, quay_lai: filtered.filter((s) => s.month === month).reduce((s, x) => s + x.quay_lai, 0) }));
}

// --- NHDN by major (cumulative at last month) ---
export function nhdnByMajor(stats: MonthlyStat[], students: StudentRecord[], f: FilterState, limit = 8): NhdnByMajorRow[] {
  const filtered = filterStats(stats, f);
  const lastMonth = latestMonth(f.months);
  const filteredStudents = filterStudents(students, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => {
    const nghi = filtered.filter((s) => s.major === m && s.month === lastMonth).reduce((sum, x) => sum + x.nghi_hoc_dai_ngay, 0);
    const matLienLac = filteredStudents.filter((s) => s.nganh === m && s.loai_trang_thai === 'nghi_hoc_dai_ngay' && s.mat_lien_lac).length;
    return { major: m, nghi_hoc_dai_ngay: nghi, mat_lien_lac: matLienLac, ti_le_mat_lien_lac: nghi > 0 ? (matLienLac / nghi) * 100 : 0 };
  }).filter((r) => r.nghi_hoc_dai_ngay > 0).sort((a, b) => b.nghi_hoc_dai_ngay - a.nghi_hoc_dai_ngay).slice(0, limit);
}

// --- Cause summary ---
const CAUSE_GROUPS: CauseGroup[] = ['Kinh tế', 'Động lực', 'Kết quả học tập', 'Gia đình', 'Sức khỏe', 'Chuyển nơi học', 'Khác'];
export function causeSummary(students: StudentRecord[], f: FilterState): CauseSummaryRow[] {
  const filtered = filterStudents(students, f).filter((s) => s.loai_trang_thai === 'thoi_hoc' || s.loai_trang_thai === 'nghi_hoc_dai_ngay');
  const total = filtered.length || 1;
  const samples: Record<CauseGroup, string[]> = { 'Kinh tế': [], 'Sức khỏe': [], 'Chuyển nơi học': [], 'Kết quả học tập': [], 'Động lực': [], 'Gia đình': [], 'Khác': [] };
  for (const s of filtered) if (samples[s.nhom_nguyen_nhan].length < 2) samples[s.nhom_nguyen_nhan].push(s.ly_do);
  return CAUSE_GROUPS.map((nhom) => {
    const so_luong = filtered.filter((s) => s.nhom_nguyen_nhan === nhom).length;
    return { nhom, so_luong, ti_le: (so_luong / total) * 100, vi_du_ly_do: samples[nhom] };
  }).sort((a, b) => b.so_luong - a.so_luong);
}

// --- Drill-down student query ---
export interface DrillDownQuery {
  months?: MonthKey[]; cohorts?: CohortKey[]; systems?: TrainingSystem[];
  majors?: Major[]; statuses?: StudentRecord['loai_trang_thai'][]; matLienLacOnly?: boolean;
  title: string; caption?: string;
}
export function queryStudents(students: StudentRecord[], q: DrillDownQuery): StudentRecord[] {
  return students.filter((s) => {
    if (q.months?.length && !q.months.includes(s.thang_bien_dong)) return false;
    if (q.cohorts?.length && !q.cohorts.includes(s.nien_khoa)) return false;
    if (q.systems?.length && !q.systems.includes(s.he_dao_tao)) return false;
    if (q.majors?.length && !q.majors.includes(s.nganh)) return false;
    if (q.statuses?.length && !q.statuses.includes(s.loai_trang_thai)) return false;
    if (q.matLienLacOnly && !s.mat_lien_lac) return false;
    return true;
  });
}

function uniqueMajors(source: { major: Major }[]): Major[] {
  return Array.from(new Set(source.map((s) => s.major)));
}

// --- Display helpers ---
export const STATUS_LABELS: Record<StudentRecord['loai_trang_thai'], string> = {
  dang_hoc: 'Đang học', nghi_hoc_dai_ngay: 'Nghỉ học dài ngày', bao_luu: 'Bảo lưu',
  quay_lai: 'Quay lại học', thoi_hoc: 'Thôi học', chuyen_nganh: 'Chuyển ngành',
};
export const STATUS_COLORS: Record<StudentRecord['loai_trang_thai'], string> = {
  dang_hoc: '#10b981', nghi_hoc_dai_ngay: '#f59e0b', bao_luu: '#8b5cf6',
  quay_lai: '#06b6d4', thoi_hoc: '#ef4444', chuyen_nganh: '#ec4899',
};
export function fmtPct(v: number, digits = 1): string { return `${v.toFixed(digits)}%`; }
export function fmtNum(v: number): string { return v.toLocaleString('vi-VN'); }
export function orDash(v: string | undefined | null): string { return v && v.trim() ? v : '-'; }

// --- NEW AGGREGATIONS for expanded dashboard ---

// Retention by training system
export function computeSystemRetention(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): SystemRetentionRow[] {
  const lastMonth = latestMonth(f.months);
  const systems: TrainingSystem[] = f.systems.length ? f.systems : ['Cao đẳng', 'Trung cấp'];
  return systems.map((system) => {
    const dauVao = baseline.filter((b) => b.system === system && matchesStat(b, f)).reduce((s, b) => s + b.count, 0);
    const dangHoc = stats.filter((s) => s.system === system && s.month === lastMonth && matchesStat(s, f)).reduce((s, x) => s + x.dang_hoc, 0);
    return { system, dau_vao: dauVao, dang_hoc: dangHoc, gan_ket_pct: dauVao > 0 ? (dangHoc / dauVao) * 100 : 0 };
  });
}

// Dropout by major with % (for heatmap tables)
export function dropoutByMajorFull(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): DropoutByMajorRow[] {
  const filtered = filterStats(stats, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => {
    const thoi_hoc = filtered.filter((s) => s.major === m).reduce((sum, x) => sum + x.thoi_hoc, 0);
    const quy_mo = baseline.filter((b) => b.major === m && matchesStat(b, f)).reduce((s, b) => s + b.count, 0);
    return { major: m, thoi_hoc, quy_mo, ti_le: quy_mo > 0 ? (thoi_hoc / quy_mo) * 100 : 0 };
  }).sort((a, b) => b.thoi_hoc - a.thoi_hoc);
}

// Dropout by cohort with %
export function dropoutByCohortFull(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): DropoutByCohortRow[] {
  const filtered = filterStats(stats, f);
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((c) => {
    const thoi_hoc = filtered.filter((s) => s.cohort === c).reduce((sum, x) => sum + x.thoi_hoc, 0);
    const quy_mo = baseline.filter((b) => b.cohort === c && matchesStat(b, f)).reduce((s, b) => s + b.count, 0);
    return { cohort: c, thoi_hoc, quy_mo, ti_le: quy_mo > 0 ? (thoi_hoc / quy_mo) * 100 : 0 };
  }).sort((a, b) => b.thoi_hoc - a.thoi_hoc);
}

// ============================================================
// PHẦN A — TỔNG QUAN LŨY KẾ TRỌN ĐỜI (nguồn: "Đầu vào các khóa.xlsx", Cột J)
// Gộp hệ Cao đẳng + Trung cấp theo từng Khóa, KHÔNG tách riêng hệ.
// ============================================================

// --- Hiệu chỉnh đối soát thủ công (theo yêu cầu người phụ trách báo cáo sau khi đối chiếu thực tế) ---
const LIFETIME_COHORT_TOTAL_OVERRIDE: Partial<Record<CohortKey, number>> = { K23: 1498 };
const LIFETIME_COHORT_THOIHOC_OVERRIDE: Partial<Record<CohortKey, number>> = { K25: 94 };
const LIFETIME_MAJOR_TOTAL_OVERRIDE: Partial<Record<Major, number>> = { 'Digital Marketing (DMK)': 473 };
// Công nghệ ô tô (VIT): giá trị gốc từ parser (42) đã được xác nhận đúng — không override.
const YEAR_MAJOR_THOIHOC_OVERRIDE: Partial<Record<Major, number>> = {};

function filterDauVao(dauvao: DauVaoLifetimeRow[], f: FilterState): DauVaoLifetimeRow[] {
  return dauvao.filter((r) => {
    if (f.cohorts.length && !f.cohorts.includes(r.cohort)) return false;
    if (f.majors.length && !f.majors.includes(r.major)) return false;
    return true;
  });
}

// Bảng 1: Số lượng & tỷ lệ thôi học lũy kế theo Khóa (K23/K24/K25, đã gộp hệ)
export function lifetimeByCohort(dauvao: DauVaoLifetimeRow[], f: FilterState): LifetimeByCohortRow[] {
  const filtered = filterDauVao(dauvao, f);
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((cohort) => {
    const rows = filtered.filter((r) => r.cohort === cohort);
    const thoi_hoc = LIFETIME_COHORT_THOIHOC_OVERRIDE[cohort] ?? rows.reduce((s, r) => s + r.thoi_hoc, 0);
    const total = LIFETIME_COHORT_TOTAL_OVERRIDE[cohort] ?? rows.reduce((s, r) => s + r.total, 0);
    return { cohort, thoi_hoc, total, ti_le: total > 0 ? (thoi_hoc / total) * 100 : 0 };
  });
}

// Bảng 1 chi tiết: đối soát chéo Khóa × Ngành
export function lifetimeCrossTab(dauvao: DauVaoLifetimeRow[], f: FilterState): LifetimeCrossTabRow[] {
  const filtered = filterDauVao(dauvao, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(dauvao);
  return majors.map((major) => {
    const get = (c: CohortKey) => {
      const r = filtered.find((x) => x.major === major && x.cohort === c);
      return { thoi_hoc: r?.thoi_hoc ?? 0, total: r?.total ?? 0 };
    };
    const k23 = get('K23'), k24 = get('K24'), k25 = get('K25');
    return {
      major,
      k23_thoi_hoc: k23.thoi_hoc, k23_total: k23.total,
      k24_thoi_hoc: k24.thoi_hoc, k24_total: k24.total,
      k25_thoi_hoc: k25.thoi_hoc, k25_total: k25.total,
    };
  });
}

// Bảng 2: Số lượng & tỷ lệ thôi học lũy kế theo Ngành (gộp tất cả Khóa), xếp giảm dần theo số lượng
export function lifetimeByMajor(dauvao: DauVaoLifetimeRow[], f: FilterState): LifetimeByMajorRow[] {
  const filtered = filterDauVao(dauvao, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(dauvao);
  return majors.map((major) => {
    const rows = filtered.filter((r) => r.major === major);
    const thoi_hoc = rows.reduce((s, r) => s + r.thoi_hoc, 0);
    const total = LIFETIME_MAJOR_TOTAL_OVERRIDE[major] ?? rows.reduce((s, r) => s + r.total, 0);
    return { major, thoi_hoc, total, ti_le: total > 0 ? (thoi_hoc / total) * 100 : 0 };
  }).sort((a, b) => b.thoi_hoc - a.thoi_hoc);
}

// ============================================================
// PHẦN A (Bảo lưu) — cùng công thức/quy tắc như Thôi học, đọc từ cùng nguồn "Đầu vào các khóa.xlsx"
// (không có hiệu chỉnh đối soát thủ công nào cho Bảo lưu — dùng nguyên giá trị từ parser)
// ============================================================

export function lifetimeByCohortBaoLuu(dauvao: DauVaoLifetimeRow[], f: FilterState): LifetimeByCohortBaoLuuRow[] {
  const filtered = filterDauVao(dauvao, f);
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((cohort) => {
    const rows = filtered.filter((r) => r.cohort === cohort);
    const bao_luu = rows.reduce((s, r) => s + r.bao_luu, 0);
    const total = rows.reduce((s, r) => s + r.total, 0);
    return { cohort, bao_luu, total, ti_le: total > 0 ? (bao_luu / total) * 100 : 0 };
  });
}

export function lifetimeCrossTabBaoLuu(dauvao: DauVaoLifetimeRow[], f: FilterState): LifetimeCrossTabBaoLuuRow[] {
  const filtered = filterDauVao(dauvao, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(dauvao);
  return majors.map((major) => {
    const get = (c: CohortKey) => {
      const r = filtered.find((x) => x.major === major && x.cohort === c);
      return { bao_luu: r?.bao_luu ?? 0, total: r?.total ?? 0 };
    };
    const k23 = get('K23'), k24 = get('K24'), k25 = get('K25');
    return {
      major,
      k23_bao_luu: k23.bao_luu, k23_total: k23.total,
      k24_bao_luu: k24.bao_luu, k24_total: k24.total,
      k25_bao_luu: k25.bao_luu, k25_total: k25.total,
    };
  });
}

export function lifetimeByMajorBaoLuu(dauvao: DauVaoLifetimeRow[], f: FilterState): LifetimeByMajorBaoLuuRow[] {
  const filtered = filterDauVao(dauvao, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(dauvao);
  return majors.map((major) => {
    const rows = filtered.filter((r) => r.major === major);
    const bao_luu = rows.reduce((s, r) => s + r.bao_luu, 0);
    const total = rows.reduce((s, r) => s + r.total, 0);
    return { major, bao_luu, total, ti_le: total > 0 ? (bao_luu / total) * 100 : 0 };
  }).sort((a, b) => b.bao_luu - a.bao_luu);
}

// ============================================================
// PHẦN B — PHÂN TÍCH THÔI HỌC THEO NĂM THỐNG KÊ (T7/2025–T6/2026)
// Quy mô trong năm học = Tổng SV đầu kỳ (mẫu số tháng đầu tiên trong giai đoạn lọc)
//   + Tổng SV phát sinh trong năm (Tuyển mới + Quay lại)
// ============================================================

export function dropoutByMajorYearFull(stats: MonthlyStat[], f: FilterState): DropoutByMajorRow[] {
  const filtered = filterStats(stats, f);
  const firstMonth = sortMonths(f.months)[0];
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => {
    const rows = filtered.filter((s) => s.major === m);
    const thoi_hoc = YEAR_MAJOR_THOIHOC_OVERRIDE[m] ?? rows.reduce((s, x) => s + x.thoi_hoc, 0);
    const dauKy = rows.filter((s) => s.month === firstMonth).reduce((s, x) => s + x.mau_so, 0);
    const phatSinh = rows.reduce((s, x) => s + x.tuyen_moi + x.quay_lai, 0);
    const quy_mo = dauKy + phatSinh;
    return { major: m, thoi_hoc, quy_mo, ti_le: quy_mo > 0 ? (thoi_hoc / quy_mo) * 100 : 0 };
  }).sort((a, b) => b.thoi_hoc - a.thoi_hoc);
}

export function dropoutByCohortYearFull(stats: MonthlyStat[], f: FilterState): DropoutByCohortRow[] {
  const filtered = filterStats(stats, f);
  const firstMonth = sortMonths(f.months)[0];
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((c) => {
    const rows = filtered.filter((s) => s.cohort === c);
    const thoi_hoc = rows.reduce((s, x) => s + x.thoi_hoc, 0);
    const dauKy = rows.filter((s) => s.month === firstMonth).reduce((s, x) => s + x.mau_so, 0);
    const phatSinh = rows.reduce((s, x) => s + x.tuyen_moi + x.quay_lai, 0);
    const quy_mo = dauKy + phatSinh;
    return { cohort: c, thoi_hoc, quy_mo, ti_le: quy_mo > 0 ? (thoi_hoc / quy_mo) * 100 : 0 };
  }).sort((a, b) => b.thoi_hoc - a.thoi_hoc);
}

// Bao luu trend (monthly) with % — ti le = bao_luu(thang)/mau_so(thang) dung theo cong thuc Quy uoc,
// khop truc tiep voi cot "% Bao luu" cua sheet "Thong ke tinh trang chi tiet" (khong dung baseline hang so)
export function baoLuuTrend(stats: MonthlyStat[], _baseline: BaselineIntake[], f: FilterState): Array<{ month: MonthKey; bao_luu: number; ti_le: number }> {
  const filtered = filterStats(stats, f);
  return sortMonths(f.months).map((month) => {
    const monthStats = filtered.filter((s) => s.month === month);
    const bao_luu = monthStats.reduce((sum, x) => sum + x.bao_luu, 0);
    const mauSo = monthStats.reduce((sum, x) => sum + x.mau_so, 0);
    return { month, bao_luu, ti_le: mauSo > 0 ? (bao_luu / mauSo) * 100 : 0 };
  });
}

// Dropout trend (monthly) with % — ti le = thoi_hoc(thang)/mau_so(thang), mau_so = Dang hoc(T-1) + NHDN(T-1) + Quay lai(T)
// lay truc tiep tu cot "Tong sv dau ky" cua sheet "Thong ke tinh trang chi tiet", khop chinh xac tung thang voi sheet nguon
export function dropoutTrendWithPct(stats: MonthlyStat[], _baseline: BaselineIntake[], f: FilterState): Array<{ month: MonthKey; thoi_hoc: number; ti_le: number }> {
  const filtered = filterStats(stats, f);
  return sortMonths(f.months).map((month) => {
    const monthStats = filtered.filter((s) => s.month === month);
    const thoi_hoc = monthStats.reduce((sum, x) => sum + x.thoi_hoc, 0);
    const mauSo = monthStats.reduce((sum, x) => sum + x.mau_so, 0);
    return { month, thoi_hoc, ti_le: mauSo > 0 ? (thoi_hoc / mauSo) * 100 : 0 };
  });
}

// Bao luu by major — Quy mô trong năm học (cùng công thức Phần B của Thôi học):
// Quy mô = SV đầu kỳ (mẫu số tháng đầu tiên) + Tuyển mới + Quay lại phát sinh trong năm
export function baoLuuByMajorFull(stats: MonthlyStat[], _baseline: BaselineIntake[], f: FilterState): BaoLuuByMajorRow[] {
  const filtered = filterStats(stats, f);
  const firstMonth = sortMonths(f.months)[0];
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => {
    const rows = filtered.filter((s) => s.major === m);
    const bao_luu = rows.reduce((s, x) => s + x.bao_luu, 0);
    const dauKy = rows.filter((s) => s.month === firstMonth).reduce((s, x) => s + x.mau_so, 0);
    const phatSinh = rows.reduce((s, x) => s + x.tuyen_moi + x.quay_lai, 0);
    const quy_mo = dauKy + phatSinh;
    return { major: m, bao_luu, quy_mo, ti_le: quy_mo > 0 ? (bao_luu / quy_mo) * 100 : 0 };
  }).sort((a, b) => b.bao_luu - a.bao_luu);
}

// Bao luu by cohort — cùng công thức Quy mô như trên
export function baoLuuByCohortFull(stats: MonthlyStat[], _baseline: BaselineIntake[], f: FilterState): DropoutByCohortRow[] {
  const filtered = filterStats(stats, f);
  const firstMonth = sortMonths(f.months)[0];
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((c) => {
    const rows = filtered.filter((s) => s.cohort === c);
    const bao_luu = rows.reduce((s, x) => s + x.bao_luu, 0);
    const dauKy = rows.filter((s) => s.month === firstMonth).reduce((s, x) => s + x.mau_so, 0);
    const phatSinh = rows.reduce((s, x) => s + x.tuyen_moi + x.quay_lai, 0);
    const quy_mo = dauKy + phatSinh;
    return { cohort: c, thoi_hoc: bao_luu, quy_mo, ti_le: quy_mo > 0 ? (bao_luu / quy_mo) * 100 : 0 };
  });
}

// Risk by cohort (full matrix)
export function riskByCohortFull(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): RiskByCohortRow[] {
  const filtered = filterStats(stats, f);
  const lastMonth = latestMonth(f.months);
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((c) => {
    const rows = filtered.filter((s) => s.cohort === c);
    const thoi_hoc = rows.reduce((s, x) => s + x.thoi_hoc, 0);
    const nghi_hoc_dai_ngay = rows.filter((s) => s.month === lastMonth).reduce((s, x) => s + x.nghi_hoc_dai_ngay, 0);
    const bao_luu = rows.reduce((s, x) => s + x.bao_luu, 0);
    const quy_mo = baseline.filter((b) => b.cohort === c && matchesStat(b, f)).reduce((s, b) => s + b.count, 0);
    const tong = thoi_hoc + nghi_hoc_dai_ngay + bao_luu;
    return { cohort: c, thoi_hoc, nghi_hoc_dai_ngay, bao_luu, tong_nguy_co: tong, quy_mo, ti_le: quy_mo > 0 ? (tong / quy_mo) * 100 : 0 };
  });
}

// Monthly trend: dang_hoc luy_ke + tuyen_moi
export function monthlyEnrollmentTrend(stats: MonthlyStat[], f: FilterState): MonthlyTrendPoint[] {
  const filtered = filterStats(stats, f);
  return sortMonths(f.months).map((month) => {
    const dang_hoc_luy_ke = filtered.filter((s) => s.month === month).reduce((sum, x) => sum + x.dang_hoc, 0);
    const tuyen_moi = filtered.filter((s) => s.month === month).reduce((sum, x) => sum + x.quay_lai, 0);
    return { month, dang_hoc_luy_ke, tuyen_moi };
  });
}

// Status donut data
export function statusDonutData(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState) {
  const filtered = filterStats(stats, f);
  const lastMonth = latestMonth(f.months);
  const lastStats = filtered.filter((s) => s.month === lastMonth);
  const totalDauKy = filterBaseline(baseline, f).reduce((s, b) => s + b.count, 0);
  const dangHoc = lastStats.reduce((s, x) => s + x.dang_hoc, 0);
  const thoiHoc = filtered.reduce((s, x) => s + x.thoi_hoc, 0);
  const baoLuu = filtered.reduce((s, x) => s + x.bao_luu, 0);
  const nghiHdn = lastStats.reduce((s, x) => s + x.nghi_hoc_dai_ngay, 0);
  return {
    total: totalDauKy,
    slices: [
      { name: 'Đang học', value: dangHoc, color: '#10b981' },
      { name: 'Thôi học', value: thoiHoc, color: '#ef4444' },
      { name: 'Bảo lưu', value: baoLuu, color: '#8b5cf6' },
      { name: 'Nghỉ học dài ngày', value: nghiHdn, color: '#f59e0b' },
    ],
  };
}

// Risk by major — ALL majors (not just top 5)
export function riskByMajorFull(stats: MonthlyStat[], f: FilterState): RiskByMajorRow[] {
  const filtered = filterStats(stats, f);
  const lastMonth = latestMonth(f.months);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => {
    const rows = filtered.filter((s) => s.major === m);
    const thoi_hoc = rows.reduce((s, x) => s + x.thoi_hoc, 0);
    const nghi_hoc_dai_ngay = rows.filter((s) => s.month === lastMonth).reduce((s, x) => s + x.nghi_hoc_dai_ngay, 0);
    const bao_luu = rows.reduce((s, x) => s + x.bao_luu, 0);
    return { major: m, thoi_hoc, nghi_hoc_dai_ngay, bao_luu, tong_nguy_co: thoi_hoc + nghi_hoc_dai_ngay + bao_luu };
  }).sort((a, b) => b.tong_nguy_co - a.tong_nguy_co);
}

// AI: Bao luu insight
export function aiBaoLuu(
  trend: Array<{ month: MonthKey; bao_luu: number; ti_le: number }>,
  byMajor: BaoLuuByMajorRow[],
  byCohort: DropoutByCohortRow[],
  kpi: KpiSnapshot,
  lifetimeMajor?: LifetimeByMajorBaoLuuRow[],
  lifetimeCohort?: LifetimeByCohortBaoLuuRow[],
): AiInsight {
  const sorted = [...trend].sort((a, b) => b.bao_luu - a.bao_luu);
  const peak = sorted[0];
  const avg = trend.reduce((s, x) => s + x.bao_luu, 0) / (trend.length || 1);
  const topMajor = byMajor[0];
  const topCohort = [...byCohort].sort((a, b) => b.thoi_hoc - a.thoi_hoc)[0];
  const lifeTopMajor = lifetimeMajor?.[0];
  const lifeTopCohort = lifetimeCohort?.slice().sort((a, b) => b.ti_le - a.ti_le)[0];
  const lifetimeStr = [
    lifeTopMajor ? `Ngành "${lifeTopMajor.major}" dẫn đầu số ca bảo lưu lũy kế trọn đời (${fmtNum(lifeTopMajor.bao_luu)}/${fmtNum(lifeTopMajor.total)} SV, ${fmtPct(lifeTopMajor.ti_le)})` : '',
    lifeTopCohort ? `Khóa ${lifeTopCohort.cohort} có tỷ lệ bảo lưu trọn đời cao nhất (${fmtPct(lifeTopCohort.ti_le)})` : '',
  ].filter(Boolean).join('; ');
  return {
    hienTrang: `Giai đoạn lọc ghi nhận ${fmtNum(kpi.bao_luu)} ca bảo lưu. Tháng ${peak ? MONTH_LABELS[peak.month] : '-'} có lượng bảo lưu cao nhất (${fmtNum(peak?.bao_luu ?? 0)} ca). Ngành "${topMajor?.major}" dẫn đầu trong năm (${fmtNum(topMajor?.bao_luu ?? 0)} ca, ${fmtPct(topMajor?.ti_le ?? 0)}). Khóa ${topCohort?.cohort} có tỉ lệ bảo lưu trong năm cao nhất (${fmtPct(topCohort?.ti_le ?? 0)}).${lifetimeStr ? ` Tính lũy kế từ đầu khóa: ${lifetimeStr}.` : ''}`,
    nguyenNhan: `Bảo lưu thường bùng phát vào các điểm rơi rủi ro tương tự thôi học — áp lực tài chính, kết quả học tập yếu, và biến cố gia đình. Trung bình ${fmtNum(avg)} ca/tháng. Sinh viên chọn bảo lưu thay vì thôi học thường còn muốn quay lại nhưng cần thời gian giải quyết vấn đề cá nhân.`,
    khuyenNghi: `Thiết lập "cửa sổ theo dõi bảo lưu": mỗi ca bảo lưu được phân công GVCN theo dõi hàng tháng, xác nhận tình trạng và lộ trình quay lại. Ngành "${topMajor?.major}" cần ưu tiên gắn cố vấn chuyên trách${lifeTopMajor && lifeTopMajor.major !== topMajor?.major ? `, cùng với ngành "${lifeTopMajor.major}" (cao nhất lũy kế trọn đời)` : ''}. Mở đợt quay lại tập trung vào tháng có ca phục hồi cao để tận dụng động lực.`,
  };
}

// ============================================================
// AI INSIGHT GENERATORS — produce structured text from data
// ============================================================

export interface AiInsight {
  hienTrang: string;
  nguyenNhan: string;
  khuyenNghi: string;
}

const CAUSE_LABEL: Record<CauseGroup, string> = {
  'Kinh tế': 'Áp lực tài chính',
  'Động lực': 'Sai định hướng ngành / mất động lực',
  'Kết quả học tập': 'Kết quả học tập yếu',
  'Gia đình': 'Yếu tố gia đình',
  'Sức khỏe': 'Vấn đề sức khỏe',
  'Chuyển nơi học': 'Chuyển nơi học / chuyển trường',
  'Khác': 'Nguyên nhân khác',
};

// 1. Tổng SV đầu kỳ / Đang học
export function aiRetention(kpi: KpiSnapshot, cohortRows: CohortRetentionRow[], majorRows: MajorRetentionRow[]): AiInsight {
  const bestCohort = [...cohortRows].sort((a, b) => b.gan_ket_pct - a.gan_ket_pct)[0];
  const worstCohort = [...cohortRows].sort((a, b) => a.gan_ket_pct - b.gan_ket_pct)[0];
  const majorsByBest = [...majorRows].filter((m) => m.dau_vao > 0).sort((a, b) => b.gan_ket_pct - a.gan_ket_pct);
  const top3Majors = majorsByBest.slice(0, 3);
  const worst4Majors = majorsByBest.slice(-4).reverse();
  const top3MajorsStr = top3Majors.map((m) => `"${m.major}" (${fmtPct(m.gan_ket_pct)})`).join(', ');
  const worst4MajorsStr = worst4Majors.map((m) => `"${m.major}" (${fmtPct(m.gan_ket_pct)})`).join(', ');
  const capPct = (kpi.dang_hoc / MAX_CAPACITY) * 100;
  const capStatus = capPct < 60 ? 'còn dư địa tiếp nhận đáng kể' : capPct < 85 ? 'đang khai thá gần mức tối đa' : 'gần đạt ngưỡng công suất, cần kiểm soát tuyển sinh';

  return {
    hienTrang: `Toàn trường đang quản lý ${fmtNum(kpi.dang_hoc)} sinh viên đang học, tương đương ${fmtPct(kpi.dang_hoc_pct)} so với đầu kỳ (${fmtNum(kpi.tong_sinh_vien_dau_ky)} SV). Khóa ${bestCohort?.cohort} có tỷ lệ gắn kết cao nhất (${fmtPct(bestCohort?.gan_ket_pct ?? 0)}), trong khi ${worstCohort?.cohort} sụt giảm nặng nhất (${fmtPct(worstCohort?.gan_ket_pct ?? 0)}). Nhóm ngành giữ chân tốt nhất: ${top3MajorsStr}. Nhóm ngành giữ chân chưa tốt: ${worst4MajorsStr}.`,
    nguyenNhan: `Chênh lệch giữa các khóa phản ánh đặc thù thời điểm nhập học và quy mô mẫu số lũy kế: K23/K24 đã tích lũy nhiều năm nhập học nên mẫu số "Đầu vào" rất lớn so với số đang học hiện tại; K25 mới tuyển sinh nên còn dao động mạnh theo từng ngành. Ngành Công nghệ ô tô và Tiếng Trung Quốc biến động/biến mất nhiều nhất do sốc chương trình kỹ thuật và ghi danh không thực chất ở tân sinh viên, trong khi Tiếng Nhật/Tiếng Hàn gắn kết tốt hơn nhờ mô hình cảnh báo sớm hiệu quả.`,
    khuyenNghi: `Quy mô hiện tại chiếm khoảng ${fmtPct(capPct)} công suất đào tạo tối đa (${fmtNum(MAX_CAPACITY)} SV) — trường ${capStatus}. Ưu tiên giữ chân K23 bằng chiến dịch vận động quay lại, và can thiệp sớm cho các ngành dưới ngưỡng ${SAFE_RETENTION_THRESHOLD}% bằng cố vấn học tập chuyên trách.`,
  };
}

// ============================================================
// THẺ 1 — QUY MÔ & ĐANG HỌC: chuẩn hóa lại nguồn dữ liệu 1.1-1.5 theo "Đầu vào các khóa.xlsx"
// (Cột J, lũy kế, tách riêng theo Hệ đào tạo — KHÔNG gộp như Thẻ 2/3), và 1.6 theo dòng
// "Tổng số" (row 123) của sheet "Thống kê tổng hợp". Các hàm này KHÔNG được các Thẻ khác dùng,
// và KHÔNG ghi đè kpi.tong_sinh_vien_dau_ky / kpi.dang_hoc dùng chung toàn hệ thống.
// ============================================================

function filterDauVaoStatus(rows: DauVaoStatusRow[], f: FilterState): DauVaoStatusRow[] {
  return rows.filter((r) => {
    if (f.cohorts.length && !f.cohorts.includes(r.cohort)) return false;
    if (f.systems.length && !f.systems.includes(r.system)) return false;
    if (f.majors.length && !f.majors.includes(r.major)) return false;
    return true;
  });
}

export function quyModauKyLifetime(rows: DauVaoStatusRow[], f: FilterState): number {
  return filterDauVaoStatus(rows, f).reduce((s, r) => s + r.total, 0);
}
export function dangHocLifetime(rows: DauVaoStatusRow[], f: FilterState): number {
  return filterDauVaoStatus(rows, f).reduce((s, r) => s + r.dang_hoc, 0);
}

// 1.1 Donut 5 nhóm: Đang học / Thôi học / Bảo lưu / Nghỉ học dài ngày / Khác
export function statusDonutLifetime(rows: DauVaoStatusRow[], f: FilterState) {
  const filtered = filterDauVaoStatus(rows, f);
  const sum = (k: 'dang_hoc' | 'thoi_hoc' | 'bao_luu' | 'nghi_hoc_dai_ngay' | 'khac' | 'total') =>
    filtered.reduce((s, r) => s + r[k], 0);
  return {
    total: sum('total'),
    slices: [
      { name: 'Đang học', value: sum('dang_hoc'), color: '#10b981' },
      { name: 'Thôi học', value: sum('thoi_hoc'), color: '#ef4444' },
      { name: 'Bảo lưu', value: sum('bao_luu'), color: '#8b5cf6' },
      { name: 'Nghỉ học dài ngày', value: sum('nghi_hoc_dai_ngay'), color: '#f59e0b' },
      { name: 'Khác', value: sum('khac'), color: '#64748b' },
    ],
  };
}

// 1.2 Theo Hệ đào tạo
export function bySystemLifetime(rows: DauVaoStatusRow[], f: FilterState): SystemRetentionRow[] {
  const filtered = filterDauVaoStatus(rows, f);
  const systems: TrainingSystem[] = f.systems.length ? f.systems : ['Cao đẳng', 'Trung cấp'];
  return systems.map((system) => {
    const rs = filtered.filter((r) => r.system === system);
    const dauVao = rs.reduce((s, r) => s + r.total, 0);
    const dangHoc = rs.reduce((s, r) => s + r.dang_hoc, 0);
    return { system, dau_vao: dauVao, dang_hoc: dangHoc, gan_ket_pct: dauVao > 0 ? (dangHoc / dauVao) * 100 : 0 };
  });
}

// 1.3 Theo Khóa đào tạo (gộp cả 2 hệ của khóa đó)
export function byCohortLifetime(rows: DauVaoStatusRow[], f: FilterState): CohortRetentionRow[] {
  const filtered = filterDauVaoStatus(rows, f);
  const cohorts: CohortKey[] = f.cohorts.length ? f.cohorts : ['K23', 'K24', 'K25'];
  return cohorts.map((cohort) => {
    const rs = filtered.filter((r) => r.cohort === cohort);
    const dauVao = rs.reduce((s, r) => s + r.total, 0);
    const dangHoc = rs.reduce((s, r) => s + r.dang_hoc, 0);
    const g = dauVao > 0 ? (dangHoc / dauVao) * 100 : 0;
    return { cohort, dau_vao: dauVao, dang_hoc_hien_tai: dangHoc, gan_ket_pct: g, bien_mat_pct: 100 - g };
  });
}

// 1.4 Tỷ lệ giữ chân theo Ngành (gộp cả 2 hệ, tất cả các khóa)
export function byMajorRetentionLifetime(rows: DauVaoStatusRow[], f: FilterState): MajorRetentionRow[] {
  const filtered = filterDauVaoStatus(rows, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(rows);
  return majors.map((major) => {
    const rs = filtered.filter((r) => r.major === major);
    const dauVao = rs.reduce((s, r) => s + r.total, 0);
    const dangHoc = rs.reduce((s, r) => s + r.dang_hoc, 0);
    const g = dauVao > 0 ? (dangHoc / dauVao) * 100 : 0;
    return { major, dau_vao: dauVao, dang_hoc_hien_tai: dangHoc, gan_ket_pct: g, bien_mat_pct: 100 - g };
  });
}

// 1.5 Bảng đối soát Ngành × Hệ đào tạo
export function majorSystemMatrixLifetime(rows: DauVaoStatusRow[], f: FilterState): MajorSystemMatrixRow[] {
  const filtered = filterDauVaoStatus(rows, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(rows);
  const systems: TrainingSystem[] = f.systems.length ? f.systems : ['Cao đẳng', 'Trung cấp'];
  const result: MajorSystemMatrixRow[] = [];
  for (const m of majors) {
    for (const sys of systems) {
      const rs = filtered.filter((r) => r.major === m && r.system === sys);
      const dv = rs.reduce((s, r) => s + r.total, 0);
      const dh = rs.reduce((s, r) => s + r.dang_hoc, 0);
      result.push({ major: m, system: sys, dau_vao: dv, dang_hoc: dh, chenh_lech: dh - dv, gan_ket_pct: dv > 0 ? (dh / dv) * 100 : 0 });
    }
  }
  return result;
}

// 1.6 Biến động sinh viên theo chuỗi thời gian — dòng "Tổng số" (row 123) sheet "Thống kê tổng hợp"
export function enrollmentTimelineLifetime(timeline: EnrollmentTimelinePoint[], f: FilterState): MonthlyTrendPoint[] {
  const months = sortMonths(f.months.length ? f.months : (timeline.map((t) => t.month)));
  return months.map((month) => {
    const row = timeline.find((t) => t.month === month);
    return { month, dang_hoc_luy_ke: row?.dang_hoc ?? 0, tuyen_moi: row?.kha_nang_phuc_hoi ?? 0 };
  });
}

// 1.7 AI Phân tích giữ chân sinh viên — dùng nguồn lũy kế đồng bộ ở trên (thay cho aiRetention cũ)
export function aiRetentionLifetime(
  quyMoDauKy: number,
  dangHoc: number,
  cohortRows: CohortRetentionRow[],
  majorRows: MajorRetentionRow[],
): AiInsight {
  const dangHocPct = quyMoDauKy > 0 ? (dangHoc / quyMoDauKy) * 100 : 0;
  const bestCohort = [...cohortRows].sort((a, b) => b.gan_ket_pct - a.gan_ket_pct)[0];
  const worstCohort = [...cohortRows].sort((a, b) => a.gan_ket_pct - b.gan_ket_pct)[0];
  const majorsByBest = [...majorRows].filter((m) => m.dau_vao > 0).sort((a, b) => b.gan_ket_pct - a.gan_ket_pct);
  const top3Majors = majorsByBest.slice(0, 3);
  const worst4Majors = majorsByBest.slice(-4).reverse();
  const worstMajor = worst4Majors[0];
  const top3MajorsStr = top3Majors.map((m) => `"${m.major}" (${fmtPct(m.gan_ket_pct)})`).join(', ');
  const worst4MajorsStr = worst4Majors.map((m) => `"${m.major}" (${fmtPct(m.gan_ket_pct)})`).join(', ');
  const capPct = (dangHoc / MAX_CAPACITY) * 100;
  const capStatus = capPct < 60 ? 'còn dư địa tiếp nhận đáng kể' : capPct < 85 ? 'đang khai thác gần mức tối đa' : 'gần đạt ngưỡng công suất, cần kiểm soát tuyển sinh';

  // Ghi chú thời gian theo học từng khóa — dùng để diễn giải tỷ lệ gắn kết đúng ngữ cảnh
  // (khóa mới tuyển sinh tự nhiên có tỷ lệ cao hơn vì chưa đủ thời gian phát sinh thôi học/bảo lưu;
  // khóa sắp tốt nghiệp thì số liệu đã ổn định, gần như không còn biến động).
  const cohortTenure: Record<CohortKey, string> = {
    K23: 'đã học 2 năm 4 tháng và chuẩn bị tốt nghiệp trong năm nay',
    K24: 'đang ở giữa lộ trình đào tạo',
    K25: 'mới nhập học năm thứ nhất',
  };
  const cohortOrderIdx: Record<CohortKey, number> = { K23: 0, K24: 1, K25: 2 };
  let tenureCaveat = '';
  if (bestCohort && worstCohort && cohortOrderIdx[bestCohort.cohort] > cohortOrderIdx[worstCohort.cohort]) {
    tenureCaveat = ` Tuy nhiên cần đọc đúng ngữ cảnh thời gian theo học: Khóa ${bestCohort.cohort} ${cohortTenure[bestCohort.cohort]}, nên tỷ lệ gắn kết cao hiện tại là điều tự nhiên (chưa đủ thời gian để phát sinh thôi học/bảo lưu), chưa hẳn phản ánh chất lượng giữ chân vượt trội. Ngược lại, Khóa ${worstCohort.cohort} ${cohortTenure[worstCohort.cohort]} — tỷ lệ sụt giảm mạnh nhất ở khóa này là số liệu đã đi hết hành trình học tập nên gần như không còn biến động, phản ánh đúng thực chất mức hao hụt trọn khóa chứ không phải dấu hiệu xấu đi.`;
  }

  return {
    hienTrang: `Lũy kế toàn khóa (Đầu vào các khóa.xlsx): ${fmtNum(dangHoc)} sinh viên đang học trên tổng ${fmtNum(quyMoDauKy)} SV từng tuyển (${fmtPct(dangHocPct)}). Khóa ${bestCohort?.cohort} có tỷ lệ gắn kết cao nhất (${fmtPct(bestCohort?.gan_ket_pct ?? 0)}), trong khi ${worstCohort?.cohort} sụt giảm nặng nhất (${fmtPct(worstCohort?.gan_ket_pct ?? 0)}). Nhóm ngành giữ chân tốt nhất: ${top3MajorsStr}. Nhóm ngành giữ chân chưa tốt: ${worst4MajorsStr}.${tenureCaveat}`,
    nguyenNhan: `Chênh lệch giữa các khóa phản ánh đặc thù thời điểm nhập học và quy mô mẫu số lũy kế: K23/K24 đã tích lũy nhiều năm nhập học nên mẫu số "Đầu vào" rất lớn so với số đang học hiện tại; K25 mới tuyển sinh nên còn dao động mạnh theo từng ngành. Ngành có tỷ lệ giữ chân thấp thường do sốc chương trình hoặc ghi danh không thực chất ở tân sinh viên, trong khi các ngành ngôn ngữ thường gắn kết tốt hơn nhờ mô hình cảnh báo sớm hiệu quả.`,
    khuyenNghi: `Quy mô đang học hiện chiếm khoảng ${fmtPct(capPct)} công suất đào tạo tối đa (${fmtNum(MAX_CAPACITY)} SV) — trường ${capStatus}. Ưu tiên giữ chân khóa ${worstCohort?.cohort} bằng chiến dịch vận động quay lại, và can thiệp sớm cho ngành "${worstMajor?.major}" (dưới ngưỡng ${SAFE_RETENTION_THRESHOLD}%) bằng cố vấn học tập chuyên trách.`,
  };
}

// 2. Thôi học
export function aiDropout(
  trend: Array<{ month: MonthKey; thoi_hoc: number }>,
  causes: CauseSummaryRow[],
  total: number,
  byMajor?: DropoutByMajorRow[],
  byCohort?: DropoutByCohortRow[],
  bySystem?: SystemRetentionRow[],
  lifetimeMajor?: LifetimeByMajorRow[],
  lifetimeCohort?: LifetimeByCohortRow[],
): AiInsight {
  const sorted = [...trend].sort((a, b) => b.thoi_hoc - a.thoi_hoc);
  const peak = sorted[0];
  const avg = trend.reduce((s, x) => s + x.thoi_hoc, 0) / (trend.length || 1);
  const peakRatio = avg > 0 ? peak.thoi_hoc / avg : 0;
  const top3 = causes.filter((c) => c.so_luong > 0).slice(0, 3);
  const topMajor = byMajor?.[0];
  const topCohort = byCohort?.slice().sort((a, b) => b.thoi_hoc - a.thoi_hoc)[0];
  const topSystem = bySystem?.slice().sort((a, b) => (b.dau_vao - b.dang_hoc) - (a.dau_vao - a.dang_hoc))[0];
  const lifeTopMajor = lifetimeMajor?.[0];
  const lifeTopCohort = lifetimeCohort?.slice().sort((a, b) => b.ti_le - a.ti_le)[0];

  const majorCohortStr = [
    topMajor ? `Ngành "${topMajor.major}" (${fmtNum(topMajor.thoi_hoc)} ca, ${fmtPct(topMajor.ti_le)})` : '',
    topCohort ? `Khóa ${topCohort.cohort} (${fmtNum(topCohort.thoi_hoc)} ca, ${fmtPct(topCohort.ti_le)})` : '',
    topSystem ? `Hệ "${topSystem.system}" (${fmtPct(topSystem.dau_vao > 0 ? ((topSystem.dau_vao - topSystem.dang_hoc) / topSystem.dau_vao) * 100 : 0)} biến mất)` : '',
  ].filter(Boolean).join('; ');

  const lifetimeStr = [
    lifeTopMajor ? `Ngành "${lifeTopMajor.major}" dẫn đầu số ca thôi học lũy kế trọn đời (${fmtNum(lifeTopMajor.thoi_hoc)}/${fmtNum(lifeTopMajor.total)} SV, ${fmtPct(lifeTopMajor.ti_le)})` : '',
    lifeTopCohort ? `Khóa ${lifeTopCohort.cohort} có tỷ lệ thôi học trọn đời cao nhất (${fmtPct(lifeTopCohort.ti_le)})` : '',
  ].filter(Boolean).join('; ');

  return {
    hienTrang: `Năm học ghi nhận ${fmtNum(total)} sinh viên thôi học. Điểm rơi rủi ro rõ nhất tại ${MONTH_LABELS[peak.month]} với ${fmtNum(peak.thoi_hoc)} ca — cao ${fmtPct(Math.max(0, (peakRatio - 1) * 100), 0)} so với trung bình (${fmtNum(avg)} ca/tháng). Top nguy cơ trong năm: ${majorCohortStr}.${lifetimeStr ? ` Tính lũy kế từ đầu khóa: ${lifetimeStr}.` : ''}`,
    nguyenNhan: `Quét trường "Lý do" gom được 3 nguyên nhân cốt lõi: ${top3.map((c, i) => `${i + 1}. ${CAUSE_LABEL[c.nhom]} (${fmtPct(c.ti_le, 0)}, ${c.so_luong} ca)`).join('; ')}. "Áp lực tài chính" và "Sai định hướng ngành" thường bùng phát vào tháng có hạn nộp học phí hoặc sau kỳ thi. Chênh lệch giữa tỷ lệ trong năm và tỷ lệ lũy kế trọn đời cho thấy các khóa cũ (K23/K24) đã tích lũy rủi ro qua nhiều năm học, trong khi K25 mới phản ánh biến động của riêng năm nay.`,
    khuyenNghi: `Triển khai "cửa sổ can thiệp" 2 tuần trước tháng ${MONTH_LABELS[peak.month].split('/')[0]}/${MONTH_LABELS[peak.month].split('/')[1]}: cố vấn học tập chủ động gọi nhóm nguy cơ, mở thêm đợt trả góp học phí, và tổ chức tư vấn lại định hướng cho sinh viên có dấu hiệu mất động lực.${lifeTopMajor ? ` Ưu tiên rà soát toàn diện ngành "${lifeTopMajor.major}" — đây là ngành có rủi ro tích lũy cao nhất trọn đời, cần đánh giá lại chương trình đào tạo/tuyển sinh đầu vào.` : ''}`,
  };
}

// 3. Nghỉ học dài ngày (NHDN)
export function aiNhdn(nhdnRows: NhdnByMajorRow[], totalNhdn: number, totalMatLienLac: number): AiInsight {
  const topMajor = nhdnRows[0];
  const avgMatLienLac = totalNhdn > 0 ? (totalMatLienLac / totalNhdn) * 100 : 0;
  const worstContact = [...nhdnRows].filter((r) => r.nghi_hoc_dai_ngay > 0).sort((a, b) => b.ti_le_mat_lien_lac - a.ti_le_mat_lien_lac)[0];

  return {
    hienTrang: `Tính đến tháng gần nhất, toàn trường có ${fmtNum(totalNhdn)} sinh viên nghỉ học dài ngày lũy kế. Ngành "${topMajor?.major}" dẫn đầu với ${fmtNum(topMajor?.nghi_hoc_dai_ngay ?? 0)} SV. Tỷ lệ "mất liên lạc/sai số điện thoại" toàn trường đạt ${fmtPct(avgMatLienLac, 0)}, ${worstContact ? `cao nhất ở ngành "${worstContact.major}" (${fmtPct(worstContact.ti_le_mat_lien_lac, 0)})` : ''}.`,
    nguyenNhan: `Tỷ lệ mất liên lạc cao phản ánh năng lực vận động của bộ phận GVCN còn bị động: dữ liệu liên lạc cập nhật chủ yếu đầu năm, thiếu quy trình xác thực định kỳ. Sinh viên nghỉ dài ngày thường thuộc nhóm yếu thế (kinh tế, gia đình), dễ "trôi" khỏi radar quản lý nếu GVCN không chủ động tìm kiếm.`,
    khuyenNghi: `Đề xuất "Đợt xác thực liên lạc tháng" — GVCN bắt buộc cập nhật/confirm số điện thoại sinh viên NHDN mỗi 30 ngày. Ngành "${topMajor?.major}" cần phân công GVCN chuyên trách cho từng ca NHDN, có KPI vận động quay lại. Hệ thống điểm danh điện tử nên bổ trường "trạng thái liên lạc" để cảnh báo tự động.`,
  };
}

// 4. Nhóm nguy cơ
export function aiRiskGroup(riskRows: RiskByMajorRow[], kpi: KpiSnapshot): AiInsight {
  const top5 = riskRows.slice(0, 5);
  const redAlert = top5.filter((r) => {
    const rate = kpi.tong_sinh_vien_dau_ky > 0 ? (r.tong_nguy_co / kpi.tong_sinh_vien_dau_ky) * 100 : 0;
    return rate > 4;
  });

  return {
    hienTrang: `Công thức tổng nguy cơ = Thôi học + NHDN + Bảo lưu = ${fmtNum(kpi.nhom_nguy_co)} SV (${fmtPct(kpi.nhom_nguy_co_pct)}). Top 5 ngành nguy cơ cao nhất: ${top5.map((r, i) => `${i + 1}. ${r.major} (${fmtNum(r.tong_nguy_co)} SV)`).join('; ')}. ${redAlert.length} ngành đạt ngưỡng CẢNH BÁO ĐỎ (>4% tổng đầu kỳ).`,
    nguyenNhan: `Ngành Công nghệ ô tô, Tiếng Trung Quốc và Thiết kế đồ hoạ tập trung nguy cơ cao — chủ yếu do sốc chương trình/chuyên ngành ngay học kỳ đầu, ghi danh không thực chất ở hệ 9+, và chi phí thiết bị/phần mềm cao. Nhóm NHDN và Bảo lưu là "vùng đệm" — nếu không can thiệp, một phần đáng kể sẽ chuyển sang thôi học hẳn trong 1–2 tháng kế tiếp, đặc biệt vào các điểm rơi rủi ro đầu học kỳ và sau Tết Nguyên đán.`,
    khuyenNghi: `Đơn thuốc chiến lược cho ${redAlert.length || top5.length} ngành CẢNH BÁO ĐỎ: (1) Phân công ban giữ chân chuyên trách, họp tuần theo từng sinh viên; (2) Mỗi ngành xây 1 "kế hoạch vận động 30 ngày" cho nhóm NHDN + Bảo lưu; (3) Ưu tiên quỹ hỗ trợ học phí cho sinh viên nguy cơ có lý do kinh tế; (4) Báo cáo BGH tự động hàng tháng theo ngành.`,
  };
}

// --- System comparison per major (Cao đẳng vs Trung cấp) ---
export interface SystemMajorCompareRow {
  major: Major;
  thoi_hoc_cd: number; ti_le_thoi_cd: number;
  thoi_hoc_tc: number; ti_le_thoi_tc: number;
  bao_luu_cd: number; ti_le_bao_luu_cd: number;
  bao_luu_tc: number; ti_le_bao_luu_tc: number;
  nguy_co_cd: number; ti_le_nguy_co_cd: number;
  nguy_co_tc: number; ti_le_nguy_co_tc: number;
}
export function systemMajorCompare(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): SystemMajorCompareRow[] {
  const filtered = filterStats(stats, f);
  const lastMonth = latestMonth(f.months);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => {
    const calc = (sys: TrainingSystem) => {
      const rows = filtered.filter((s) => s.major === m && s.system === sys);
      const dauVao = baseline.filter((b) => b.major === m && b.system === sys && matchesStat(b, f)).reduce((s, b) => s + b.count, 0);
      const thoi = rows.reduce((s, x) => s + x.thoi_hoc, 0);
      const baoLuu = rows.reduce((s, x) => s + x.bao_luu, 0);
      const nghi = rows.filter((s) => s.month === lastMonth).reduce((s, x) => s + x.nghi_hoc_dai_ngay, 0);
      return { thoi, baoLuu, nghi, dauVao, nguyCo: thoi + baoLuu + nghi };
    };
    const cd = calc('Cao đẳng');
    const tc = calc('Trung cấp');
    return {
      major: m,
      thoi_hoc_cd: cd.thoi, ti_le_thoi_cd: cd.dauVao > 0 ? (cd.thoi / cd.dauVao) * 100 : 0,
      thoi_hoc_tc: tc.thoi, ti_le_thoi_tc: tc.dauVao > 0 ? (tc.thoi / tc.dauVao) * 100 : 0,
      bao_luu_cd: cd.baoLuu, ti_le_bao_luu_cd: cd.dauVao > 0 ? (cd.baoLuu / cd.dauVao) * 100 : 0,
      bao_luu_tc: tc.baoLuu, ti_le_bao_luu_tc: tc.dauVao > 0 ? (tc.baoLuu / tc.dauVao) * 100 : 0,
      nguy_co_cd: cd.nguyCo, ti_le_nguy_co_cd: cd.dauVao > 0 ? (cd.nguyCo / cd.dauVao) * 100 : 0,
      nguy_co_tc: tc.nguyCo, ti_le_nguy_co_tc: tc.dauVao > 0 ? (tc.nguyCo / tc.dauVao) * 100 : 0,
    };
  });
}

// --- AI cross-analysis: merge quantitative + qualitative (Word report) data ---
export interface MajorAiContext {
  major: Major;
  retention: MajorRetentionRow | null;
  compare: SystemMajorCompareRow | null;
  docPhanI?: string; docPhanII?: string; docPhanIII?: string;
  moHinhQuanLy: string; nguyenNhanGocRe: string;
  raoCan: { khach_quan: string; chu_quan_sv: string; nha_truong: string; noi_tai_nganh: string };
  deXuat: string[];
}
export function aiMajorCrossAnalysis(ctx: MajorAiContext): AiInsight {
  const r = ctx.retention;
  const cmp = ctx.compare;
  const cdRisk = cmp?.ti_le_nguy_co_cd ?? 0;
  const tcRisk = cmp?.ti_le_nguy_co_tc ?? 0;
  const higher = cdRisk > tcRisk ? 'Cao đẳng' : 'Trung cấp';
  const lower = cdRisk > tcRisk ? 'Trung cấp' : 'Cao đẳng';

  const hienTrang = [
    `Ngành "${ctx.major}": đầu vào ${r ? fmtNum(r.dau_vao) : '-'} SV, đang học ${r ? fmtNum(r.dang_hoc_hien_tai) : '-'} (${r ? fmtPct(r.gan_ket_pct) : '-'} giữ chân).`,
    cmp ? `So sánh hệ: ${higher} có tỷ lệ nhóm nguy cơ ${fmtPct(Math.max(cdRisk, tcRisk))} cao hơn ${lower} (${fmtPct(Math.min(cdRisk, tcRisk))}).` : '',
    ctx.docPhanI ? `[Báo cáo Khoa]: ${ctx.docPhanI.slice(0, 180)}...` : '',
  ].filter(Boolean).join(' ');

  const nguyenNhan = [
    ctx.nguyenNhanGocRe,
    cmp && Math.abs(cdRisk - tcRisk) > 3 ? ` Chênh lệch rủi ro giữa hai hệ (${fmtPct(Math.abs(cdRisk - tcRisk))}) cho thấy ${higher} chịu áp lực lớn hơn — ${ctx.raoCan.noi_tai_nganh}` : '',
    ctx.docPhanII ? ` [Định tính từ Khoa]: ${ctx.docPhanII.slice(0, 180)}...` : '',
  ].filter(Boolean).join('');

  const khuyenNghi = [
    ...ctx.deXuat,
    cmp && higher === 'Cao đẳng' ? `Ưu tiên can thiệp hệ Cao đẳng của ngành do tỷ lệ nguy cơ cao hơn (${fmtPct(cdRisk)} vs ${fmtPct(tcRisk)}).` : '',
    cmp && higher === 'Trung cấp' ? `Tập trung giữ chân hệ Trung cấp (${fmtPct(tcRisk)} nguy cơ vs ${fmtPct(cdRisk)} Cao đẳng).` : '',
    ctx.docPhanIII ? `[Kiến nghị Khoa]: ${ctx.docPhanIII.slice(0, 150)}...` : '',
  ].filter(Boolean).join(' ');

  return { hienTrang, nguyenNhan, khuyenNghi };
}

// --- Major × System matrix for Phần 1.5 ---
export interface MajorSystemMatrixRow {
  major: Major; system: TrainingSystem;
  dau_vao: number; dang_hoc: number; chenh_lech: number; gan_ket_pct: number;
}
export function majorSystemMatrix(stats: MonthlyStat[], baseline: BaselineIntake[], f: FilterState): MajorSystemMatrixRow[] {
  const lastMonth = latestMonth(f.months);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  const systems: TrainingSystem[] = f.systems.length ? f.systems : ['Cao đẳng', 'Trung cấp'];
  const rows: MajorSystemMatrixRow[] = [];
  for (const m of majors) {
    for (const sys of systems) {
      const dv = baseline.filter((b) => b.major === m && b.system === sys && matchesStat(b, f)).reduce((s, b) => s + b.count, 0);
      const dh = stats.filter((s) => s.major === m && s.system === sys && s.month === lastMonth && matchesStat(s, f)).reduce((s, x) => s + x.dang_hoc, 0);
      rows.push({ major: m, system: sys, dau_vao: dv, dang_hoc: dh, chenh_lech: dh - dv, gan_ket_pct: dv > 0 ? (dh / dv) * 100 : 0 });
    }
  }
  return rows;
}

// --- Return by major (Recovery Leaderboard) ---
export interface ReturnByMajorRow { major: Major; quay_lai: number; }
export function returnByMajor(stats: MonthlyStat[], f: FilterState): ReturnByMajorRow[] {
  const filtered = filterStats(stats, f);
  const majors: Major[] = f.majors.length ? f.majors : uniqueMajors(stats);
  return majors.map((m) => ({ major: m, quay_lai: filtered.filter((s) => s.major === m).reduce((s, x) => s + x.quay_lai, 0) }))
    .sort((a, b) => b.quay_lai - a.quay_lai);
}

// --- Cause detail summary: nhóm + lý do chi tiết + số lượng + tỷ lệ ---
export interface CauseDetailRow {
  nhom: CauseGroup; ly_do: string; so_luong: number; ti_le: number;
}
export function causeDetailSummary(students: StudentRecord[], f: FilterState, statuses?: StudentRecord['loai_trang_thai'][]): CauseDetailRow[] {
  const statusFilter = statuses ?? ['thoi_hoc', 'nghi_hoc_dai_ngay'];
  const filtered = filterStudents(students, f).filter((s) => statusFilter.includes(s.loai_trang_thai));
  const total = filtered.length || 1;
  const map = new Map<string, { nhom: CauseGroup; ly_do: string; so_luong: number }>();
  for (const s of filtered) {
    const key = `${s.nhom_nguyen_nhan}|||${s.ly_do}`;
    const ex = map.get(key);
    if (ex) ex.so_luong++;
    else map.set(key, { nhom: s.nhom_nguyen_nhan, ly_do: s.ly_do, so_luong: 1 });
  }
  return Array.from(map.values()).map((r) => ({ ...r, ti_le: (r.so_luong / total) * 100 }))
    .sort((a, b) => b.so_luong - a.so_luong);
}

// --- Cause summary từ nguồn Detail1-88 (Thống kê năm 2025-2026.xlsx): quét Cột H = "Thôi học",
//     đọc Ghi chú/Lý do (GVCN), phân loại nhóm nguyên nhân bằng quy tắc từ khóa. 207 sinh viên
//     thôi học duy nhất (loại trùng lặp do 1 SV có thể xuất hiện ở nhiều sheet Detail). ---
// Nhãn "nội dung chính" — phân loại chi tiết hơn nhóm nguyên nhân, rút ra trực tiếp từ nội dung
// Ghi chú/Lý do thực tế của GVCN (không bịa nội dung), dùng để hiển thị gọn thay cho trích dẫn dài.
function tagOfDetailCause(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/nghĩa vụ quân sự|nvqs|nhập ngũ|bộ đội|quân sự/.test(t)) return 'TH vì đi nghĩa vụ quân sự';
  if (t.includes('du học')) return 'TH để đi du học / định cư nước ngoài';
  if (/chuyển trường|trường khác|trường gần nhà|học lại lớp 10/.test(t)) return 'TH vì chuyển trường / chuyển nơi học';
  if (/lập gia đình|việc gia đình|hoàn cảnh gia đình|lý do gia đình/.test(t)) return 'TH vì lý do gia đình';
  if (/nợ học phí|không đóng học phí|không đủ chi trả|khó khăn tài chính/.test(t)) return 'TH vì không đóng được học phí / khó khăn kinh tế';
  if (/tai nạn|gãy tay|gãy chân|bất tỉnh|sức khỏe/.test(t)) return 'TH vì lý do sức khỏe / tai nạn';
  if (/ôn thi đại học|ôn thi lại đại học|ôn thi đh/.test(t)) return 'TH để ôn thi Đại học';
  if (/không phù hợp|muốn học ngành khác|chuyển ngành|không theo được|không theo học được/.test(t)) return 'TH vì không phù hợp ngành / muốn đổi ngành';
  if (/đi làm|kiếm tiền/.test(t)) return 'TH để đi làm';
  if (/nghỉ ngay từ đầu|chưa đi học buổi nào|thôi học từ đầu|ko đi học từ đầu/.test(t)) return 'Nghỉ học ngay từ đầu, chưa từng đến lớp';
  if (/không liên lạc được|mất liên lạc|sai số điện thoại|sai sdt|không nghe máy|không phản hồi/.test(t)) return 'Mất liên lạc với SV/phụ huynh, không rõ lý do';
  if (t.includes('không rõ lý do')) return 'Không rõ lý do cụ thể';
  return 'Lý do khác (đã ghi nhận, chưa gom nhóm cụ thể)';
}

export function causeSummaryFromDetail(rows: DetailCauseRow[], f: FilterState): CauseDetailRow[] {
  const filtered = rows.filter((r) => {
    if (f.months.length && !f.months.includes(r.month)) return false;
    if (f.cohorts.length && !f.cohorts.includes(r.cohort)) return false;
    if (f.systems.length && !f.systems.includes(r.system)) return false;
    if (f.majors.length && !f.majors.includes(r.major)) return false;
    return true;
  });
  const total = filtered.length || 1;
  const groups = new Map<CauseGroup, { so_luong: number; tags: Map<string, number> }>();
  for (const r of filtered) {
    const tag = tagOfDetailCause(r.ly_do_text) ?? '(Không ghi chú / chưa cập nhật lý do)';
    const ex = groups.get(r.nhom);
    if (ex) {
      ex.so_luong++;
      ex.tags.set(tag, (ex.tags.get(tag) ?? 0) + 1);
    } else {
      groups.set(r.nhom, { so_luong: 1, tags: new Map([[tag, 1]]) });
    }
  }
  return Array.from(groups.entries())
    .map(([nhom, v]) => {
      const topTags = Array.from(v.tags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
      return {
        nhom,
        ly_do: topTags.map(([tag, n]) => `${tag} (${n})`).join('; '),
        so_luong: v.so_luong,
        ti_le: (v.so_luong / total) * 100,
      };
    })
    .sort((a, b) => b.so_luong - a.so_luong);
}

export { MAX_CAPACITY };
