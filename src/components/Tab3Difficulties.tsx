// Tab3Difficulties — Khó khăn & Đề xuất (whole-school qualitative + strategic)
import { AlertOctagon, ClipboardList, ShieldAlert } from 'lucide-react';
import { GLOBAL_DIFFICULTIES, STRATEGIC_RECOMMENDATIONS } from '../data';
import { Card, CardHeader, Badge } from './ui';

export function Tab3Difficulties() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Tổng hợp khó khăn toàn trường" subtitle="Báo cáo định tính + đơn thuốc chiến lược cho toàn trường" icon={<AlertOctagon className="h-4 w-4" />} />
        <div className="space-y-2.5 p-5">
          {GLOBAL_DIFFICULTIES.map((d) => (
            <div key={d.stt} className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-red-500/15 text-xs font-bold text-red-300 ring-1 ring-red-500/30">{d.stt}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-relaxed text-slate-100">{d.kho_khan}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone="neutral">Chủ trì: {d.bo_phan_chu_tri}</Badge>
                  </div>
                  <div className="mt-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Đề xuất: </span>
                    <span className="text-sm text-slate-200">{d.de_xuat}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Kế hoạch hành động" subtitle="Khuyến nghị của Trợ lý AI dựa trên toàn bộ dữ liệu biến động" icon={<ShieldAlert className="h-4 w-4" />} />
        <div className="overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">STT</th>
                <th className="px-3 py-2 font-medium">Nhóm hành động</th>
                <th className="px-3 py-2 font-medium">Hành động cụ thể</th>
                <th className="px-3 py-2 font-medium">Ưu tiên</th>
                <th className="py-2 pl-3 font-medium">Thời hạn</th>
              </tr>
            </thead>
            <tbody>
              {STRATEGIC_RECOMMENDATIONS.map((r) => (
                <tr key={r.stt} className="border-b border-ink-800/60 transition-colors hover:bg-ink-800/40">
                  <td className="py-3 pr-3 tabular-nums text-slate-400">{r.stt}</td>
                  <td className="px-3 py-3"><Badge tone={r.u_tien === 'Cao' ? 'danger' : r.u_tien === 'Trung bình' ? 'warn' : 'neutral'}>{r.nhom}</Badge></td>
                  <td className="px-3 py-3 text-slate-200">{r.hanh_dong}</td>
                  <td className="px-3 py-3">
                    <span className={`font-semibold ${r.u_tien === 'Cao' ? 'text-red-400' : r.u_tien === 'Trung bình' ? 'text-amber-400' : 'text-slate-400'}`}>{r.u_tien}</span>
                  </td>
                  <td className="py-3 pl-3 text-xs text-slate-400">{r.thoi_han}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Ghi chú phương pháp luận" subtitle="Nguyên tắc tính toán & đối soát dữ liệu" icon={<ClipboardList className="h-4 w-4" />} />
        <div className="space-y-2 p-5 text-sm leading-relaxed text-slate-300">
          <p>• <strong className="text-slate-100">Baseline tuyển sinh</strong>: lấy từ file "Số lượng đầu vào theo khóa.xlsx" làm mốc 100% để tính tỷ lệ giữ chân.</p>
          <p>• <strong className="text-slate-100">Thôi học</strong>: số phát sinh trong tháng, cộng dồn theo giai đoạn lọc.</p>
          <p>• <strong className="text-slate-100">Nghỉ học dài ngày</strong>: số lũy kế tính đến tháng gần nhất — khi lọc từ tháng A đến B, lấy giá trị tại B (không cộng dồn).</p>
          <p>• <strong className="text-slate-100">Nhóm nguy cơ</strong> = Thôi học + Nghỉ học dài ngày + Bảo lưu.</p>
          <p>• <strong className="text-slate-100">Ngưỡng an toàn</strong>: tỷ lệ giữ chân ≥ 85%. Dưới ngưỡng = "BÁO ĐỘNG ĐỎ".</p>
        </div>
      </Card>
    </div>
  );
}
