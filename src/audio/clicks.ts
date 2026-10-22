// Piezas puras del metrónomo: clic de madera y "tap tempo".
export const MIN_BPM = 30;
export const MAX_BPM = 240;

export function clickSamples(sr: number, accent: boolean): Float32Array {
  const len = Math.floor(sr * 0.09);
  const out = new Float32Array(len);
  const f = accent ? 1760 : 1100;
  let seed = accent ? 7 : 3;
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const noise = (seed / 4294967296) * 2 - 1;
    const body = Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 2.4 * t);
    out[i] = Math.tanh(1.6 * (body * Math.exp(-t * 55) * 0.8 + noise * Math.exp(-t * 600) * 0.7));
  }
  return out;
}

/** Tiempo en ms de cada toque. Usa los últimos toques seguidos (menos de 2 s entre ellos). */
export function tapTempo(times: number[]): number | null {
  const run: number[] = [];
  for (let i = times.length - 1; i >= 0 && run.length < 5; i--) {
    const t = times[i] as number;
    if (run.length && (run[0] as number) - t > 2000) break;
    run.unshift(t);
  }
  if (run.length < 2) return null;
  const avg = ((run[run.length - 1] as number) - (run[0] as number)) / (run.length - 1);
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(60000 / avg)));
}
