// Axial hex-grid helpers (pointy-top hexes).
export const RADIUS = 6;
export const DIRS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export const key = (q: number, r: number) => `${q},${r}`;
export const parse = (k: string): [number, number] => {
  const [q, r] = k.split(',').map(Number);
  return [q, r];
};
export const neighbors = (k: string) => {
  const [q, r] = parse(k);
  return DIRS.map(([dq, dr]) => key(q + dq, r + dr));
};
export const dist = (a: string, b: string) => {
  const [q1, r1] = parse(a), [q2, r2] = parse(b);
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(q1 + r1 - q2 - r2)) / 2;
};
export const inBoard = (k: string) => dist(k, '0,0') <= RADIUS;

export function allHexes(R = RADIUS): string[] {
  const out: string[] = [];
  for (let q = -R; q <= R; q++)
    for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) out.push(key(q, r));
  return out;
}

export function ring(R: number): string[] {
  const out: string[] = [];
  let q = -R, r = R; // start at direction 4 * R
  for (let side = 0; side < 6; side++)
    for (let i = 0; i < R; i++) {
      out.push(key(q, r));
      q += DIRS[side][0];
      r += DIRS[side][1];
    }
  return out;
}

export const HEX_SIZE = 40;
export function toPixel(k: string, size = HEX_SIZE) {
  const [q, r] = parse(k);
  return { x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r };
}
export function hexPoints(size = HEX_SIZE) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(size * Math.cos(a)).toFixed(2)},${(size * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}
