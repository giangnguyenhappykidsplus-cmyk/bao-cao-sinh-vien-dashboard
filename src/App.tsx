import { useMemo, useRef, useState, useEffect } from 'react';
import type { FilterState, KpiDrillKey, TabKey } from './types';
import { ALL_MONTHS } from './types';
import { buildBaselineIntake, buildMonthlyStats, buildStudentRecords, buildDauVaoLifetime, buildDetailCauses, buildDauVaoStatus, buildEnrollmentTimeline } from './data';
import { computeKpi, queryStudents, quyModauKyLifetime, dangHocLifetime, type DrillDownQuery } from './calc';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { AnalysisPanel } from './components/AnalysisPanel';
import { Tab1Overview } from './components/Tab1Overview';
import { Tab2MajorDetail } from './components/Tab2MajorDetail';
import { Tab3DocumentRepo } from './components/Tab3DocumentRepo';
import { Tab3Difficulties } from './components/Tab3Difficulties';
import { StudentModal } from './components/StudentModal';
import { exportBghReport } from './components/PdfExport';
import { X } from 'lucide-react';

const baseline = buildBaselineIntake();
const stats = buildMonthlyStats(baseline);
const students = buildStudentRecords(baseline, stats);
const dauvaoLifetime = buildDauVaoLifetime();
const detailCauses = buildDetailCauses();
const dauvaoStatus = buildDauVaoStatus();
const enrollmentTimeline = buildEnrollmentTimeline();

const DEFAULT_FILTER: FilterState = { months: [...ALL_MONTHS], systems: [], majors: [], cohorts: [] };

function App() {
  const [tab, setTab] = useState<TabKey>('tong_quan');
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [drill, setDrill] = useState<KpiDrillKey | null>(null);
  const [modalQuery, setModalQuery] = useState<DrillDownQuery | null>(null);
  const [modalRecords, setModalRecords] = useState<typeof students>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Toggle admin mode via keyboard shortcut: Ctrl+Shift+A (only admin knows)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdmin((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openStudentModal(key: KpiDrillKey) {
    const f = filter;
    const q: DrillDownQuery = {
      title: `Danh sách sinh viên — ${key}`,
      caption: `Giai đoạn: ${f.months.length} tháng · ${f.cohorts.length ? f.cohorts.join(', ') : 'tất cả khóa'}`,
      months: f.months, cohorts: f.cohorts.length ? f.cohorts : undefined,
      systems: f.systems.length ? f.systems : undefined, majors: f.majors.length ? f.majors : undefined,
    };
    switch (key) {
      case 'thoi_hoc': q.statuses = ['thoi_hoc']; break;
      case 'bao_luu': q.statuses = ['bao_luu']; break;
      case 'nghi_hoc_dai_ngay': q.statuses = ['nghi_hoc_dai_ngay']; break;
      case 'nhom_nguy_co': q.statuses = ['thoi_hoc', 'nghi_hoc_dai_ngay', 'bao_luu']; break;
      case 'quay_lai': q.statuses = ['quay_lai']; break;
      case 'dang_hoc': q.statuses = ['dang_hoc']; break;
    }
    setModalRecords(queryStudents(students, q));
    setModalQuery(q);
  }
  const [exporting, setExporting] = useState(false);
  const chartRefs = useRef<HTMLDivElement[]>([]);
  void chartRefs;

  const kpi = useMemo(() => computeKpi(stats, baseline, filter), [filter]);
  // Quy mô & Đang học (Thẻ 1) — nguồn riêng "Đầu vào các khóa.xlsx" lũy kế, KHÔNG dùng kpi.tong_sinh_vien_dau_ky/kpi.dang_hoc
  // (những field đó vẫn giữ nguyên để Thẻ 3 (Bảo lưu) và các nơi khác dùng làm mẫu số, không bị ảnh hưởng).
  const quyMoDauKyC1 = useMemo(() => quyModauKyLifetime(dauvaoStatus, filter), [filter]);
  const dangHocC1 = useMemo(() => dangHocLifetime(dauvaoStatus, filter), [filter]);

  // KPI card drill-down: toggle the analysis panel.
  // Direct student-list drill-down is handled via handleDrill → AnalysisPanel.
  function handleDrill(key: KpiDrillKey) {
    setDrill((prev) => (prev === key ? null : key));
  }

  // Reserved for future direct student-list drill-down from KPI numbers.
  // Currently KPI cards toggle the analysis panel via handleDrill instead.

  async function handleExport() {
    setExporting(true);
    try {
      await exportBghReport({
        kpi, filter, quyMoDauKy: quyMoDauKyC1, dangHoc: dangHocC1,
        stats, baseline, students, dauvao: dauvaoLifetime, dauvaoStatus,
      });
    } catch (e) {
      console.error('PDF export failed:', e);
      alert('Xuất báo cáo thất bại. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header activeTab={tab} onTabChange={setTab} onExport={handleExport} exporting={exporting} />
      <FilterBar filter={filter} onChange={setFilter} />

      <main className="mx-auto max-w-[1400px] px-5 py-5 lg:px-8">
        {tab === 'tong_quan' && (
          <div className="mb-5 space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Bộ chỉ số dòng chảy sinh viên</h2>
              {drill && (
                <button onClick={() => setDrill(null)} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600/70 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-ink-700/50">
                  <X className="h-3.5 w-3.5" /> Đóng phân tích
                </button>
              )}
            </div>
            <KpiCards kpi={kpi} quyMoDauKy={quyMoDauKyC1} dangHocHienTai={dangHocC1} activeDrill={drill} onDrill={handleDrill} onViewStudents={openStudentModal} onExportReport={handleExport} exporting={exporting} />
          </div>
        )}

        {tab === 'tong_quan' && (
          drill ? (
            <AnalysisPanel drillKey={drill} stats={stats} baseline={baseline} students={students} dauvao={dauvaoLifetime} detailCauses={detailCauses} dauvaoStatus={dauvaoStatus} enrollmentTimeline={enrollmentTimeline} filter={filter} kpi={kpi} />
          ) : (
            <Tab1Overview stats={stats} baseline={baseline} students={students} filter={filter} onDrill={handleDrill} />
          )
        )}

        {tab === 'chi_tiet_nganh' && <Tab2MajorDetail stats={stats} baseline={baseline} students={students} filter={filter} dauvaoStatus={dauvaoStatus} />}
        {tab === 'cac_nganh_khai_bao' && <Tab3DocumentRepo isAdmin={isAdmin} />}
        {tab === 'kho_khan_de_xuat' && <Tab3Difficulties />}
      </main>

      <footer className="border-t border-ink-800/60 px-5 py-6 text-center text-xs text-slate-600 lg:px-8">
        Hệ thống Báo cáo Tình trạng Sinh viên 2025-2026 · Dữ liệu phân tích T7/2025–T6/2026 · K23·K24·K25
      </footer>

      {modalQuery && <StudentModal records={modalRecords} query={modalQuery} onClose={() => setModalQuery(null)} />}
      {/* Drill-down student list is triggered from AnalysisPanel/Tab1 via queryStudents */}
    </div>
  );
}

export default App;
