/** Pure projectile maths: level ground, no air resistance. Units: m, s, degrees. */
export interface Launch { speed: number; angleDeg: number; gravity: number }
export interface Flight { range: number; maxHeight: number; timeOfFlight: number }

export function flight({ speed, angleDeg, gravity }: Launch): Flight {
  if (!(speed >= 0) || !(gravity > 0) || !Number.isFinite(angleDeg)) throw new RangeError("Invalid launch");
  const a = (angleDeg * Math.PI) / 180;
  const vy = speed * Math.sin(a);
  return {
    range: (speed * speed * Math.sin(2 * a)) / gravity,
    maxHeight: (vy * vy) / (2 * gravity),
    timeOfFlight: (2 * vy) / gravity,
  };
}

export function positionAt(l: Launch, t: number): { x: number; y: number } {
  const a = (l.angleDeg * Math.PI) / 180;
  return { x: l.speed * Math.cos(a) * t, y: Math.max(0, l.speed * Math.sin(a) * t - 0.5 * l.gravity * t * t) };
}

export const WORLDS = [
  { id: "earth", name: "Earth", gravity: 9.8 },
  { id: "moon", name: "Moon", gravity: 1.62 },
  { id: "mars", name: "Mars", gravity: 3.71 },
] as const;

export const TARGET_METRES = 40;
export const TARGET_TOLERANCE = 1.5;
export const hitsTarget = (range: number) => Math.abs(range - TARGET_METRES) <= TARGET_TOLERANCE;
