// StudentModal — drill-down list of individual students
import { useEffect, useState } from 'react';
import { X, Search, Users } from 'lucide-react';
import type { StudentRecord } from '../types';
import { STATUS_LABELS, STATUS_COLORS, orDash } from '../calc';
import type { DrillDownQuery } from '../calc';
import { MONTH_LABELS } from '../types';

const PAGE_SIZE = 12;

export function StudentModal({ records, query, onClose }: { records: StudentRecord[]; query: DrillDownQuery; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const filtered = records.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.ma_sv.toLowerCase().includes(q) || s.ho_ten.toLowerCase().includes(q) || s.ly_do.toLowerCase().includes(q) || s.lop.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const statusCounts = records.reduce((acc, s) => { acc[s.loai_trang_thai] = (acc[s.loai_trang_thai] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-ink-600 bg-ink-850 shadow-card animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-ink-700/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent-soft ring-1 ring-accent/30">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">{query.title}</h2>
              {query.caption && <p className="text-xs text-slate-400">{query.caption}</p>}
              <p className="mt-0.5 text-xs text-slate-500">{records.length.toLocaleString('vi-VN')} sinh viên · trang {page}/{totalPages}</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-ink-700/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status summary chips */}
        <div className="flex flex-wrap gap-2 border-b border-ink-800/60 px-5 py-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <span key={status} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: `${STATUS_COLORS[status as keyof typeof STATUS_COLORS]}1f`, color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }} />
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}: {count}
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="border-b border-ink-800/60 px-5 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-ink-700/70 bg-ink-800/60 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm theo mã SV, họ tên, lớp, lý do..." className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink-850/95 backdrop-blur">
              <tr className="border-b border-ink-700/60 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-medium">Mã SV</th>
                <th className="px-3 py-2.5 font-medium">Họ và tên</th>
                <th className="px-3 py-2.5 font-medium">Niên khóa</th>
                <th className="px-3 py-2.5 font-medium">Hệ</th>
                <th className="px-3 py-2.5 font-medium">Ngành</th>
                <th className="px-3 py-2.5 font-medium">Lớp</th>
                <th className="px-3 py-2.5 font-medium">Tháng BD</th>
                <th className="px-3 py-2.5 font-medium">Trạng thái</th>
                <th className="px-3 py-2.5 font-medium">Ghi chú</th>
                <th className="px-4 py-2.5 font-medium">Lý do</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center text-sm text-slate-500">Không có sinh viên nào phù hợp bộ lọc.</td></tr>
              )}
              {pageRows.map((s) => (
                <tr key={s.id} className="border-b border-ink-800/50 transition-colors hover:bg-ink-800/40">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{s.ma_sv}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-100">{s.ho_ten}</td>
                  <td className="px-3 py-2.5 text-slate-400">{s.nien_khoa}</td>
                  <td className="px-3 py-2.5 text-slate-400">{s.he_dao_tao}</td>
                  <td className="px-3 py-2.5 text-slate-400">{s.nganh}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{s.lop}</td>
                  <td className="px-3 py-2.5 text-slate-400">{MONTH_LABELS[s.thang_bien_dong]}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: `${STATUS_COLORS[s.loai_trang_thai]}1f`, color: STATUS_COLORS[s.loai_trang_thai] }}>
                      {STATUS_LABELS[s.loai_trang_thai]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{orDash(s.ghi_chu)}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">{orDash(s.ly_do)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-ink-700/60 px-5 py-3">
            <span className="text-xs text-slate-500">Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
            <div className="flex gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-ink-700/70 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-ink-700/50 disabled:opacity-40">Trước</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-ink-700/70 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-ink-700/50 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
