// Type definitions — Hệ thống Báo cáo Tình trạng Sinh viên 2026-2027

export type CohortKey = 'K23' | 'K24' | 'K25';

export type TrainingSystem = 'Cao đẳng' | 'Trung cấp';

export type Major =
  | 'Quản trị doanh nghiệp vừa và nhỏ (VMS)'
  | 'Digital Marketing (DMK)'
  | 'Quản trị khách sạn (VMH)'
  | 'Chăm sóc sắc đẹp (BTF)'
  | 'Công nghệ ô tô (VIT)'
  | 'Thiết kế đồ hoạ (VIG)'
  | 'Ứng dụng phần mềm (VIS)'
  | 'Tiếng Trung Quốc (TTQ)'
  | 'Phiên dịch tiếng Anh thương mại (VLB)'
  | 'Tiếng Hàn Quốc (VLK)'
  | 'Tiếng Nhật (TN)';

export interface BaselineIntake {
  cohort: CohortKey;
  system: TrainingSystem;
  major: Major;
  count: number;
}

export type MonthKey =
  | '2025-07' | '2025-08' | '2025-09' | '2025-10' | '2025-11' | '2025-12'
  | '2026-01' | '2026-02' | '2026-03' | '2026-04' | '2026-05' | '2026-06';

export const ALL_MONTHS: MonthKey[] = [
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
];

export const MONTH_LABELS: Record<MonthKey, string> = {
  '2025-07': 'T7/2025', '2025-08': 'T8/2025', '2025-09': 'T9/2025',
  '2025-10': 'T10/2025', '2025-11': 'T11/2025', '2025-12': 'T12/2025',
  '2026-01': 'T1/2026', '2026-02': 'T2/2026', '2026-03': 'T3/2026',
  '2026-04': 'T4/2026', '2026-05': 'T5/2026', '2026-06': 'T6/2026',
};

export const QUARTER_MAP: Record<string, MonthKey[]> = {
  'Q3/2025': ['2025-07', '2025-08', '2025-09'],
  'Q4/2025': ['2025-10', '2025-11', '2025-12'],
  'Q1/2026': ['2026-01', '2026-02', '2026-03'],
  'Q2/2026': ['2026-04', '2026-05', '2026-06'],
};

export type StatusCategory =
  | 'dang_hoc'
  | 'nghi_hoc_dai_ngay'
  | 'bao_luu'
  | 'quay_lai'
  | 'thoi_hoc'
  | 'chuyen_nganh';

export interface MonthlyStat {
  month: MonthKey;
  cohort: CohortKey;
  system: TrainingSystem;
  major: Major;
  mau_so: number; // Mẫu số(T) = Đang học(T-1) + NHDN(T-1) + Quay lại(T), theo đúng "Tổng sv đầu kỳ" của sheet nguồn
  dang_hoc: number;
  nghi_hoc_dai_ngay: number; // lũy kế tính đến tháng này
  bao_luu: number; // lũy kế
  quay_lai: number; // phát sinh trong tháng
  thoi_hoc: number; // phát sinh trong tháng
  chuyen_nganh: number; // phát sinh trong tháng
}

export type CauseGroup =
  | 'Kinh tế'
  | 'Sức khỏe'
  | 'Chuyển nơi học'
  | 'Kết quả học tập'
  | 'Động lực'
  | 'Gia đình'
  | 'Khác';

export interface StudentRecord {
  id: string;
  ma_sv: string;
  ho_ten: string;
  nien_khoa: CohortKey;
  he_dao_tao: TrainingSystem;
  nganh: Major;
  lop: string;
  thang_bien_dong: MonthKey;
  loai_trang_thai: StatusCategory;
  ghi_chu: string;
  ly_do: string;
  nhom_nguyen_nhan: CauseGroup;
  mat_lien_lac: boolean; // GVCN đánh dấu mất liên lạc / sai số điện thoại
}

export type TabKey = 'tong_quan' | 'chi_tiet_nganh' | 'cac_nganh_khai_bao' | 'kho_khan_de_xuat';

export type KpiDrillKey =
  | 'dang_hoc'
  | 'thoi_hoc'
  | 'bao_luu'
  | 'nghi_hoc_dai_ngay'
  | 'nhom_nguy_co'
  | 'quay_lai';

// --- Khoa → Ngành mapping for Tab 3 (Các ngành khai báo) ---
export interface KhoaNganh {
  khoa: string;
  code: string;
  nganh: string;
  tag: string;
}

export const KHOA_NGANH_MAP: KhoaNganh[] = [
  { khoa: 'Khoa Kinh doanh', code: 'VMS', nganh: 'Quản trị doanh nghiệp vừa và nhỏ (VMS)', tag: 'VMS' },
  { khoa: 'Khoa Kinh doanh', code: 'DMK', nganh: 'Digital Marketing (DMK)', tag: 'DMK' },
  { khoa: 'Khoa Kinh doanh', code: 'VMH', nganh: 'Quản trị khách sạn (VMH)', tag: 'VMH' },
  { khoa: 'Khoa Kinh doanh', code: 'BTF', nganh: 'Chăm sóc sắc đẹp (BTF)', tag: 'BTF' },
  { khoa: 'Khoa Công nghệ - Thiết kế', code: 'VIT', nganh: 'Công nghệ ô tô (VIT)', tag: 'VIT' },
  { khoa: 'Khoa Công nghệ - Thiết kế', code: 'VIG', nganh: 'Thiết kế đồ hoạ (VIG)', tag: 'VIG' },
  { khoa: 'Khoa Công nghệ - Thiết kế', code: 'VIS', nganh: 'Ứng dụng phần mềm (VIS)', tag: 'VIS' },
  { khoa: 'Khoa Ngôn ngữ', code: 'TTQ', nganh: 'Tiếng Trung Quốc (TTQ)', tag: 'TTQ' },
  { khoa: 'Khoa Ngôn ngữ', code: 'VLB', nganh: 'Phiên dịch tiếng Anh thương mại (VLB)', tag: 'VLB' },
  { khoa: 'Khoa Ngôn ngữ', code: 'VLK', nganh: 'Tiếng Hàn Quốc (VLK)', tag: 'VLK' },
  { khoa: 'Khoa Ngôn ngữ', code: 'TN', nganh: 'Tiếng Nhật (TN)', tag: 'TN' },
];

export interface DocReport {
  id: string;
  khoa: string;
  nganh: string;
  tag: string;
  fileName: string;
  uploadedAt: string;
  size: string;
  phanI: string;
  phanII: string;
  phanIII: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  khoa: string;
  tag: string;
}

export interface SystemRetentionRow {
  system: TrainingSystem;
  dau_vao: number;
  dang_hoc: number;
  gan_ket_pct: number;
}

export interface DropoutByMajorRow {
  major: Major;
  thoi_hoc: number;
  quy_mo: number;
  ti_le: number;
}

export interface DropoutByCohortRow {
  cohort: CohortKey;
  thoi_hoc: number;
  quy_mo: number;
  ti_le: number;
}

export interface BaoLuuByMajorRow {
  major: Major;
  bao_luu: number;
  quy_mo: number;
  ti_le: number;
}

export interface RiskByCohortRow {
  cohort: CohortKey;
  thoi_hoc: number;
  nghi_hoc_dai_ngay: number;
  bao_luu: number;
  tong_nguy_co: number;
  quy_mo: number;
  ti_le: number;
}

export interface MonthlyTrendPoint {
  month: MonthKey;
  dang_hoc_luy_ke: number;
  tuyen_moi: number;
}

export interface FilterState {
  months: MonthKey[];
  systems: TrainingSystem[];
  majors: Major[];
  cohorts: CohortKey[];
}

export interface KpiSnapshot {
  tong_sinh_vien_dau_ky: number;
  dang_hoc: number;
  dang_hoc_pct: number;
  thoi_hoc: number;
  thoi_hoc_pct: number;
  nghi_hoc_dai_ngay: number;
  nhom_nguy_co: number;
  nhom_nguy_co_pct: number;
  bao_luu: number;
  quay_lai: number;
  chuyen_nganh: number;
}

export interface CohortRetentionRow {
  cohort: CohortKey;
  dau_vao: number;
  dang_hoc_hien_tai: number;
  gan_ket_pct: number;
  bien_mat_pct: number;
}

export interface MajorRetentionRow {
  major: Major;
  dau_vao: number;
  dang_hoc_hien_tai: number;
  gan_ket_pct: number;
  bien_mat_pct: number;
}

export interface TopDropoutRow {
  label: string;
  thoi_hoc: number;
}

export interface RiskByMajorRow {
  major: Major;
  thoi_hoc: number;
  nghi_hoc_dai_ngay: number;
  bao_luu: number;
  tong_nguy_co: number;
}

export interface ReturnTrendPoint {
  month: MonthKey;
  quay_lai: number;
}

export interface CauseSummaryRow {
  nhom: CauseGroup;
  so_luong: number;
  ti_le: number;
  vi_du_ly_do: string[];
}

export interface NhdnByMajorRow {
  major: Major;
  nghi_hoc_dai_ngay: number;
  mat_lien_lac: number;
  ti_le_mat_lien_lac: number;
}
