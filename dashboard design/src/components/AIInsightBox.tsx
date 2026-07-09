// AIInsightBox — Sparkles-branded AI panel with typing effect, 3 sections
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Activity, HeartPulse, Target } from 'lucide-react';
import type { AiInsight } from '../calc';

// Typewriter hook — reveals text char-by-char
function useTypewriter(text: string, speed = 14, startDelay = 0, enabled: boolean) {
  const [shown, setShown] = useState(enabled ? '' : text);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setShown(text);
      return;
    }
    setShown('');
    let i = 0;
    let startTime: number | null = null;
    function step(ts: number) {
      if (startTime === null) startTime = ts + startDelay;
      if (ts < startTime!) { raf.current = requestAnimationFrame(step); return; }
      if (i < text.length) {
        // Reveal a few chars per frame for natural pace
        const chunk = Math.max(1, Math.round(text.length / 220));
        i = Math.min(text.length, i + chunk);
        setShown(text.slice(0, i));
        raf.current = requestAnimationFrame(step);
      }
    }
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [text, enabled, startDelay, speed]);

  return shown;
}

function Section({ icon, title, text, tone, delay, typing }: {
  icon: React.ReactNode; title: string; text: string;
  tone: 'red' | 'amber' | 'emerald'; delay: number; typing: boolean;
}) {
  const shown = useTypewriter(text, 14, delay, typing);
  const done = !typing || shown.length >= text.length;
  const toneCls = {
    red: 'text-red-400', amber: 'text-amber-400', emerald: 'text-emerald-400',
  }[tone];
  const dotCls = { red: 'bg-red-400', amber: 'bg-amber-400', emerald: 'bg-emerald-400' }[tone];

  return (
    <div className="rounded-xl border border-ai-700/40 bg-ai-900/40 p-3.5">
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-md bg-ai-800/70 ${toneCls}`}>{icon}</span>
        <span className={`text-xs font-semibold uppercase tracking-wide ${toneCls}`}>{title}</span>
        {!done && <span className="ml-1 flex items-center gap-1 text-[10px] text-slate-500"><span className={`h-1.5 w-1.5 rounded-full ${dotCls} animate-pulseDot`} /> đang phân tích</span>}
      </div>
      <p className="text-[13px] leading-relaxed text-slate-200">
        {shown}
        {!done && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-ai-400 animate-blink" />}
      </p>
    </div>
  );
}

export function AIInsightBox({ insight, title, typing = true, showKhuyenNghi = true }: { insight: AiInsight; title: string; typing?: boolean; showKhuyenNghi?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ai-600/50 bg-gradient-to-br from-ai-900/90 via-ai-800/70 to-ink-850/80 p-5 shadow-ai animate-slideUp">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-ai-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ai-400 to-accent shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </span>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
            <p className="text-[11px] text-slate-400">Trợ lý AI Phân tích · tự động sinh từ dữ liệu hiện tại</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ai-700/40 px-2.5 py-1 text-[10px] font-semibold text-ai-400 ring-1 ring-ai-600/50">
            <span className="h-1.5 w-1.5 rounded-full bg-ai-400 animate-pulseDot" /> AI Insights
          </span>
        </div>

        <div className="space-y-3">
          <Section icon={<Activity className="h-3.5 w-3.5" />} title="Hiện trạng nổi bật (Điểm nóng dữ liệu)" text={insight.hienTrang} tone="red" delay={150} typing={typing} />
          <Section icon={<HeartPulse className="h-3.5 w-3.5" />} title="Nguyên nhân gốc rễ (Định tính từ dữ liệu ghi chú)" text={insight.nguyenNhan} tone="amber" delay={900} typing={typing} />
          {showKhuyenNghi && (
            <Section icon={<Target className="h-3.5 w-3.5" />} title="Khuyến nghị hành động (Giải pháp giữ chân khẩn cấp)" text={insight.khuyenNghi} tone="emerald" delay={1700} typing={typing} />
          )}
        </div>
      </div>
    </div>
  );
}
