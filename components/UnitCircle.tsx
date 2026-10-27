"use client";
import { useMemo, useRef, useState } from "react";

const TARGETS = [30, 45, 60] as const;
const TOLERANCE = 2;

/** Drag the point or use the slider (keyboard accessible). Reports once when 30, 45 and 60 degrees were all found. */
export function UnitCircle({ done, onComplete }: { done: boolean; onComplete: () => void }) {
  const [angle, setAngle] = useState(0);
  const [found, setFound] = useState<number[]>([]);
  const reported = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const tan = useMemo(() => (Math.abs(cos) < 1e-9 ? null : sin / cos), [sin, cos]);
  const cx = 120, cy = 120, r = 100;
  const px = cx + r * cos, py = cy - r * sin;

  function update(next: number) {
    const a = ((Math.round(next) % 360) + 360) % 360;
    setAngle(a);
    const hit = TARGETS.find((t) => Math.abs(a - t) <= TOLERANCE);
    if (hit !== undefined && !found.includes(hit)) {
      const nextFound = [...found, hit];
      setFound(nextFound);
      if (nextFound.length === TARGETS.length && !reported.current && !done) {
        reported.current = true;
        onComplete();
      }
    }
  }

  function fromPointer(e: React.PointerEvent<SVGSVGElement>) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * 240 - cx;
    const y = cy - ((e.clientY - box.top) / box.height) * 240;
    update((Math.atan2(y, x) * 180) / Math.PI);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <svg
        ref={svgRef}
        viewBox="0 0 240 240"
        className="w-full max-w-xs touch-none rounded border border-slate-600 bg-slate-900"
        role="img"
        aria-label={`Unit circle with the point at ${angle} degrees`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
        onPointerMove={(e) => { if (e.buttons === 1) fromPointer(e); }}
      >
        <line x1="10" y1={cy} x2="230" y2={cy} stroke="#64748b" />
        <line x1={cx} y1="10" x2={cx} y2="230" stroke="#64748b" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#38bdf8" strokeWidth="2" />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke="#facc15" strokeWidth="2" />
        <line x1={px} y1={py} x2={px} y2={cy} stroke="#f472b6" strokeWidth="2" />
        <line x1={cx} y1={cy} x2={px} y2={cy} stroke="#4ade80" strokeWidth="2" />
        <circle cx={px} cy={py} r="8" fill="#facc15" />
      </svg>
      <div className="space-y-3">
        <label className="block text-sm font-medium" htmlFor="angle">Angle: {angle}°</label>
        <input
          id="angle" type="range" min={0} max={359} value={angle} className="w-full"
          aria-valuetext={`${angle} degrees`} onChange={(e) => update(Number(e.target.value))}
        />
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded bg-slate-800 p-2"><dt className="text-pink-300">sin θ</dt><dd>{sin.toFixed(3)}</dd></div>
          <div className="rounded bg-slate-800 p-2"><dt className="text-green-300">cos θ</dt><dd>{cos.toFixed(3)}</dd></div>
          <div className="rounded bg-slate-800 p-2"><dt>tan θ</dt><dd>{tan === null ? "undefined" : tan.toFixed(3)}</dd></div>
        </dl>
        <div>
          <p className="text-sm font-medium">Task: find each angle (±{TOLERANCE}°)</p>
          <ul className="mt-1 text-sm">
            {TARGETS.map((t) => (
              <li key={t}>{found.includes(t) || done ? "✅" : "⬜"} {t}°</li>
            ))}
          </ul>
        </div>
        <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => { setAngle(0); setFound([]); }}>
          Reset
        </button>
        {done && <p role="status" className="text-green-300">Simulation task complete.</p>}
      </div>
    </div>
  );
}
