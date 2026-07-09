// Tab3DocumentRepo — Các ngành khai báo: folder tree + split-screen viewer + secret triangle upload
import { useState, useRef } from 'react';
import { FileText, FileBarChart, FlaskConical, Lightbulb, Building2, Cpu, Languages, ChevronRight, ChevronDown } from 'lucide-react';
import { DOC_REPORTS, KHOA_REPORTS } from '../data';
import type { DocReport } from '../types';
import { Card } from './ui';

const KHOA_INFO = [
  { name: 'Khoa Kinh doanh', icon: Building2, color: 'text-blue-300', bg: 'bg-blue-500/10', ring: 'ring-blue-500/25' },
  { name: 'Khoa Công nghệ - Thiết kế', icon: Cpu, color: 'text-emerald-300', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/25' },
  { name: 'Khoa Ngôn ngữ', icon: Languages, color: 'text-amber-300', bg: 'bg-amber-500/10', ring: 'ring-amber-500/25' },
];

interface UploadedDoc { id: string; name: string; khoa: string; nganh: string; size: number; }
interface ViewTarget { type: 'khoa' | 'nganh'; khoa: string; nganh?: string; doc?: DocReport; uploaded?: UploadedDoc; }

export function Tab3DocumentRepo(_: { isAdmin?: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([KHOA_INFO[0].name]));
  const [viewTarget, setViewTarget] = useState<ViewTarget | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDoc[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCtx, setUploadCtx] = useState<{ khoa: string; nganh?: string } | null>(null);

  function toggleKhoa(khoa: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(khoa)) next.delete(khoa);
      else next.add(khoa);
      return next;
    });
  }

  function openKhoaReport(khoa: string) {
    const khoaReport = KHOA_REPORTS.find((k) => k.khoa === khoa);
    setViewTarget({ type: 'khoa', khoa, doc: khoaReport ? ({ id: `khoa-${khoa}`, khoa, nganh: khoa, tag: 'TỔNG HỢP', fileName: `BaoCao_${khoa}.docx`, size: '—', uploadedAt: '—', phanI: khoaReport.phanI, phanII: khoaReport.phanII, phanIII: khoaReport.phanIII } as DocReport) : undefined });
  }

  function openNganhReport(doc: DocReport) {
    setViewTarget({ type: 'nganh', khoa: doc.khoa, nganh: doc.nganh, doc });
  }

  function openUploadedReport(up: UploadedDoc) {
    setViewTarget({ type: 'nganh', khoa: up.khoa, nganh: up.nganh, uploaded: up, doc: { id: up.id, khoa: up.khoa, nganh: up.nganh, tag: 'UPLOADED', fileName: up.name, size: fmtSize(up.size), uploadedAt: 'Vừa tải lên', phanI: '(Nội dung sẽ được phân tích tự động sau khi xử lý file Word.)', phanII: '(Đang chờ trích xuất nội dung định tính từ file đã tải lên.)', phanIII: '(Đang chờ trích xuất đề xuất từ file đã tải lên.)' } as DocReport });
  }

  function triggerUpload(khoa: string, nganh?: string) {
    setUploadCtx({ khoa, nganh });
    fileInputRef.current?.click();
  }

  function handleFiles(files: FileList | null) {
    if (!files || !uploadCtx) return;
    const newFiles = Array.from(files).map((f) => ({
      id: `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name, khoa: uploadCtx.khoa, nganh: uploadCtx.nganh ?? uploadCtx.khoa, size: f.size,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setUploadCtx(null);
  }

  function fmtSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  const doc = viewTarget?.doc;

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".doc,.docx" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT: Folder Tree */}
        <Card className="lg:max-h-[calc(100vh-220px)]">
          <div className="flex items-center gap-2 border-b border-ink-700/60 px-4 py-3">
            <FolderIcon className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Kho báo cáo Khoa / Ngành</h3>
          </div>
          <div className="overflow-auto p-3">
            {KHOA_INFO.map((khoa) => {
              const isExpanded = expanded.has(khoa.name);
              const khoaDocs = DOC_REPORTS.filter((d) => d.khoa === khoa.name);
              const khoaUploads = uploadedFiles.filter((f) => f.khoa === khoa.name && f.nganh === khoa.name);
              const Icon = khoa.icon;
              return (
                <div key={khoa.name} className="mb-2">
                  {/* Khoa row */}
                  <div className="group flex items-center gap-1.5 rounded-lg px-2 py-2 transition-colors hover:bg-ink-800/60">
                    <button onClick={() => toggleKhoa(khoa.name)} className="shrink-0 text-slate-400 hover:text-white">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openKhoaReport(khoa.name)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${khoa.bg} ${khoa.color} ring-1 ${khoa.ring}`}><Icon className="h-3.5 w-3.5" /></span>
                      <span className="truncate text-sm font-semibold text-slate-200 hover:text-white">{khoa.name}</span>
                      <span className="ml-auto rounded-md bg-ink-700/50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">{khoaDocs.length} ngành</span>
                    </button>
                    {/* Triangle upload icon (màu xám mờ) — click để tải file Word */}
                    <button onClick={() => triggerUpload(khoa.name)} title="" className="ml-1 shrink-0 leading-none text-slate-600 transition-colors hover:text-accent-soft">
                      <svg width="8" height="8" viewBox="0 0 10 10" className="opacity-60 hover:opacity-100"><polygon points="5,1 9,8 1,8" fill="currentColor" /></svg>
                    </button>
                  </div>
                  {/* Uploaded Khoa-level files */}
                  {khoaUploads.length > 0 && (
                    <div className="ml-8 mt-1 space-y-1">
                      {khoaUploads.map((f) => (
                        <button key={f.id} onClick={() => openUploadedReport(f)} className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-ink-800/60">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          <span className="truncate text-xs font-medium text-slate-300 group-hover:text-white">{f.name}</span>
                          <span className="ml-auto text-[10px] text-emerald-400">Mới</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Ngành list under Khoa */}
                  {isExpanded && (
                    <div className="ml-7 mt-1 space-y-0.5 border-l border-ink-700/40 pl-3">
                      {khoaDocs.map((d) => {
                        const nganhUploads = uploadedFiles.filter((f) => f.khoa === khoa.name && f.nganh === d.nganh);
                        return (
                          <div key={d.id}>
                            <div className="group flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-ink-800/60">
                              <button onClick={() => openNganhReport(d)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-accent-soft" />
                                <span className="truncate text-xs font-medium text-slate-300 group-hover:text-white">{d.nganh}</span>
                                <span className="ml-1 rounded bg-ink-700/40 px-1 py-0.5 text-[9px] font-medium text-slate-500">{d.tag}</span>
                              </button>
                              <button onClick={() => triggerUpload(khoa.name, d.nganh)} title="" className="shrink-0 leading-none text-slate-600 transition-colors hover:text-accent-soft">
                                <svg width="7" height="7" viewBox="0 0 10 10" className="opacity-60 hover:opacity-100"><polygon points="5,1 9,8 1,8" fill="currentColor" /></svg>
                              </button>
                            </div>
                            {nganhUploads.length > 0 && (
                              <div className="ml-5 space-y-0.5">
                                {nganhUploads.map((f) => (
                                  <button key={f.id} onClick={() => openUploadedReport(f)} className="group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-ink-800/60">
                                    <FileText className="h-3 w-3 shrink-0 text-emerald-400" />
                                    <span className="truncate text-[11px] text-slate-400 group-hover:text-white">{f.name}</span>
                                    <span className="ml-auto text-[9px] text-emerald-400">Mới</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT: Split Screen Document Viewer */}
        <Card className="lg:max-h-[calc(100vh-220px)]">
          {!doc ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-800/60 ring-1 ring-ink-700/40">
                <FileText className="h-8 w-8 text-slate-600" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Trình xem văn bản báo cáo</h3>
                <p className="mt-1 text-xs text-slate-500">Chọn một Khoa hoặc Ngành ở danh sách bên trái để xem báo cáo Word.</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-ink-700/60 px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/30">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      {viewTarget?.type === 'khoa' ? `Báo cáo tổng hợp ${doc.nganh}` : doc.nganh}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {viewTarget?.type === 'khoa' ? 'Tổng hợp toàn khối Khoa' : `${doc.khoa} · ${doc.fileName}`}
                    </p>
                  </div>
                </div>
                {viewTarget?.uploaded && <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300">FILE TẢI LÊN</span>}
              </div>

              <div className="overflow-auto bg-ink-900/40 p-6">
                <div className="mx-auto max-w-2xl space-y-5">
                  {/* Doc header */}
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="text-[10px] font-semibold text-slate-400">Độc lập - Tự do - Hạnh phúc</div>
                    <div className="mx-auto mt-2 h-px w-28 bg-ink-600" />
                    <h3 className="mt-3 text-sm font-bold uppercase text-white">BÁO CÁO TÌNH TRẠNG SINH VIÊN</h3>
                    <p className="mt-1 text-xs text-slate-300">
                      {viewTarget?.type === 'khoa' ? doc.nganh : `Ngành: ${doc.nganh} (${doc.tag})`}
                      {' — Năm học 2025-2026'}
                    </p>
                  </div>

                  {/* Part I */}
                  <DocPart icon={<FileBarChart className="h-3.5 w-3.5" />} title="PHẦN I — THỐNG KÊ ĐỊNH LƯỢNG" color="accent" text={doc.phanI} />

                  {/* Part II */}
                  <DocPart icon={<FlaskConical className="h-3.5 w-3.5" />} title="PHẦN II — THỰC TRẠNG ĐỊNH TÍNH & RÀO CẢN" color="amber" text={doc.phanII} />

                  {/* Part III */}
                  <DocPart icon={<Lightbulb className="h-3.5 w-3.5" />} title="PHẦN III — ĐỀ XUẤT & KIẾN NGHỊ" color="emerald" text={doc.phanIII} />

                  <div className="border-t border-ink-700/60 pt-4 text-center text-[10px] text-slate-500">
                    <p>{doc.khoa} · {viewTarget?.type === 'khoa' ? 'Báo cáo tổng hợp' : `Ngành ${doc.nganh}`}</p>
                    <p>Ngày tải lên: {doc.uploadedAt}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function DocPart({ icon, title, color, text }: { icon: React.ReactNode; title: string; color: 'accent' | 'amber' | 'emerald'; text: string }) {
  const colorMap = { accent: 'text-blue-300 border-blue-500/25 bg-blue-500/5', amber: 'text-amber-300 border-amber-500/25 bg-amber-500/5', emerald: 'text-emerald-300 border-emerald-500/25 bg-emerald-500/5' };
  return (
    <div>
      <h4 className={`mb-1.5 flex items-center gap-1.5 text-xs font-bold ${colorMap[color].split(' ')[0]}`}>{icon}{title}</h4>
      <div className={`rounded-lg border p-3.5 ${colorMap[color]}`}>
        <p className="text-xs leading-relaxed text-slate-200">{text}</p>
      </div>
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></svg>;
}
