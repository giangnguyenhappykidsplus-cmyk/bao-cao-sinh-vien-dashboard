// Header — title + 4-tab navigation + Export BGH button
import { GraduationCap, LayoutDashboard, FileBarChart, FolderOpen, Lightbulb, FileText, Download } from 'lucide-react';
import type { TabKey } from '../types';

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: 'tong_quan', label: '1. Tổng quan', icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: 'cac_nganh_khai_bao', label: '2. Các ngành khai báo', icon: <FolderOpen className="h-4 w-4" /> },
  { key: 'chi_tiet_nganh', label: '3. Phân tích ngành', icon: <FileBarChart className="h-4 w-4" /> },
  { key: 'kho_khan_de_xuat', label: '4. Khó khăn - Đề xuất', icon: <Lightbulb className="h-4 w-4" /> },
];

export function Header({ activeTab, onTabChange, onExport, exporting }: { activeTab: TabKey; onTabChange: (t: TabKey) => void; onExport: () => void; exporting: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-accent to-blue-700 shadow-glow">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">
                BÁO CÁO TÌNH TRẠNG SINH VIÊN NĂM 2026-2027
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Dữ liệu phân tích: Tháng 7/2025 — Tháng 6/2026 · K23 · K24 · K25
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulseDot" />
              Dữ liệu trực tiếp
            </span>
            <button
              onClick={onExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-glow transition-all hover:from-blue-500 hover:to-blue-600 disabled:opacity-60 disabled:cursor-wait"
              title="Xuất báo cáo tổng hợp sang PDF định dạng hành chính A4"
            >
              {exporting ? (
                <>
                  <Download className="h-4 w-4 animate-pulse" />
                  Đang xuất...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Xuất báo cáo BGH
                </>
              )}
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => onTabChange(tab.key)} className={`group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-3 text-sm font-medium transition-colors ${active ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                <span className={`transition-colors ${active ? 'text-accent-soft' : 'text-slate-500 group-hover:text-slate-300'}`}>{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-accent to-blue-400" />}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
