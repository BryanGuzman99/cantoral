// Detector de nota (algoritmo YIN): devuelve la frecuencia en Hz o null si no hay una nota clara.
export function detectPitch(buf: Float32Array, sr: number, minHz = 30, maxHz = 700): number | null {
  const n = buf.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (buf[i] ?? 0) * (buf[i] ?? 0);
  if (Math.sqrt(sum / n) < 0.008) return null;          // silencio o ruido muy bajo

  const maxLag = Math.min(Math.floor(sr / minHz), Math.floor(n / 2));
  const minLag = Math.max(2, Math.floor(sr / maxHz));
  const w = n - maxLag;
  const c = new Float32Array(maxLag + 2);
  let run = 0;
  c[0] = 1;
  for (let t = 1; t <= maxLag; t++) {
    let s = 0;
    for (let i = 0; i < w; i++) { const d = (buf[i] ?? 0) - (buf[i + t] ?? 0); s += d * d; }
    run += s;
    c[t] = run > 0 ? (s * t) / run : 1;
  }
  let t = minLag;
  while (t < maxLag && (c[t] ?? 1) >= 0.15) t++;
  if (t >= maxLag) return null;
  while (t + 1 < maxLag && (c[t + 1] ?? 1) < (c[t] ?? 1)) t++;
  const a = c[t - 1] ?? 1, b = c[t] ?? 1, e = c[t + 1] ?? 1;
  const den = 2 * (a - 2 * b + e);
  const shift = den !== 0 ? (a - e) / den : 0;
  return sr / (t + shift);
}
