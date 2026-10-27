"use client";
import { useEffect, useRef, useState } from "react";
import { flight, hitsTarget, positionAt, TARGET_METRES, TARGET_TOLERANCE, WORLDS, type Launch } from "@/lib/physics/projectile";

const W = 400, H = 200, PAD = 24;

/** Set speed, angle and world, then launch. Measured outputs come from the same maths the tests check. */
export function ProjectileLab({ done, onComplete }: { done: boolean; onComplete: () => void }) {
  const [speed, setSpeed] = useState(20);
  const [angle, setAngle] = useState(30);
  const [worldId, setWorldId] = useState<(typeof WORLDS)[number]["id"]>("earth");
  const [launched, setLaunched] = useState<Launch | null>(null);
  const [t, setT] = useState(0);
  const [hit, setHit] = useState(false);
  const reported = useRef(false);
  const raf = useRef<number | null>(null);

  const gravity = WORLDS.find((w) => w.id === worldId)!.gravity;
  const shown = launched ?? { speed, angleDeg: angle, gravity };
  const f = flight(shown);

  const xMax = Math.max(f.range, TARGET_METRES + 10, 50) * 1.1;
  const yMax = Math.max(f.maxHeight, 10) * 1.2;
  const scale = Math.min((W - 2 * PAD) / xMax, (H - 2 * PAD) / yMax);
  const sx = (x: number) => PAD + x * scale;
  const sy = (y: number) => H - PAD - y * scale;

  const steps = 60;
  const path = Array.from({ length: steps + 1 }, (_, i) => {
    const p = positionAt(shown, (f.timeOfFlight * i) / steps);
    return `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`;
  }).join(" ");
  const ball = positionAt(shown, Math.min(t, f.timeOfFlight));

  function stop() { if (raf.current !== null) cancelAnimationFrame(raf.current); raf.current = null; }
  useEffect(() => stop, []);

  function finish(l: Launch) {
    const landed = hitsTarget(flight(l).range);
    setHit(landed);
    if (landed && !reported.current && !done) { reported.current = true; onComplete(); }
  }

  function launch() {
    stop();
    const l: Launch = { speed, angleDeg: angle, gravity };
    setLaunched(l);
    const total = flight(l).timeOfFlight;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || total === 0) { setT(total); finish(l); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const el = (now - start) / 1000;
      if (el >= total) { setT(total); finish(l); raf.current = null; return; }
      setT(el); raf.current = requestAnimationFrame(tick);
    };
    setT(0); setHit(false); raf.current = requestAnimationFrame(tick);
  }

  function reset() { stop(); setLaunched(null); setT(0); setHit(false); setSpeed(20); setAngle(30); setWorldId("earth"); }

  const tx0 = sx(TARGET_METRES - TARGET_TOLERANCE), tx1 = sx(TARGET_METRES + TARGET_TOLERANCE);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-slate-600 bg-slate-900" role="img"
        aria-label={`Projectile path. Range ${f.range.toFixed(1)} metres, target at ${TARGET_METRES} metres.`}>
        <line x1={PAD} y1={sy(0)} x2={W - PAD} y2={sy(0)} stroke="#64748b" />
        <rect x={tx0} y={sy(0) - 6} width={Math.max(tx1 - tx0, 3)} height="6" fill="#f472b6" />
        <text x={sx(TARGET_METRES)} y={sy(0) + 14} textAnchor="middle" fontSize="10" fill="#f9a8d4">target {TARGET_METRES} m</text>
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray={launched ? undefined : "4 4"} />
        <circle cx={sx(ball.x)} cy={sy(ball.y)} r="5" fill="#facc15" />
      </svg>
      <div className="space-y-3">
        <label className="block text-sm" htmlFor="speed">Launch speed: {speed} m/s</label>
        <input id="speed" type="range" min={5} max={40} value={speed} className="w-full" onChange={(e) => setSpeed(Number(e.target.value))} />
        <label className="block text-sm" htmlFor="angle2">Launch angle: {angle}°</label>
        <input id="angle2" type="range" min={5} max={85} value={angle} className="w-full" onChange={(e) => setAngle(Number(e.target.value))} />
        <label className="block text-sm" htmlFor="world">World (gravity)</label>
        <select id="world" value={worldId} onChange={(e) => setWorldId(e.target.value as typeof worldId)} className="rounded border bg-slate-900 px-2 py-1">
          {WORLDS.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.gravity} m/s²)</option>)}
        </select>
        <dl className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded bg-slate-800 p-2"><dt>Range</dt><dd>{f.range.toFixed(1)} m</dd></div>
          <div className="rounded bg-slate-800 p-2"><dt>Max height</dt><dd>{f.maxHeight.toFixed(1)} m</dd></div>
          <div className="rounded bg-slate-800 p-2"><dt>Flight time</dt><dd>{f.timeOfFlight.toFixed(2)} s</dd></div>
        </dl>
        <p className="text-xs text-slate-400">Level ground, no air resistance. Dashed line = preview of the current settings.</p>
        <div className="flex gap-2">
          <button type="button" onClick={launch} className="rounded bg-sky-600 px-3 py-1">Launch</button>
          <button type="button" onClick={reset} className="rounded border px-3 py-1">Reset</button>
        </div>
        <p role="status">
          {done ? "✅ Simulation task complete." : hit ? "🎯 Hit!" : launched ? `Missed by ${Math.abs(flight(launched).range - TARGET_METRES).toFixed(1)} m. Adjust and launch again.` : `Goal: land within ${TARGET_TOLERANCE} m of the ${TARGET_METRES} m target.`}
        </p>
      </div>
    </div>
  );
}
