// Sonido de cuerda pulsada (síntesis Karplus-Strong). Se genera en el teléfono, sin archivos de audio.
// La longitud de la cuerda se ajusta con un filtro de fase para que la nota salga afinada con precisión.

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pluck(freq: number, sr: number, seconds = 2.4): Float32Array {
  const len = Math.floor(sr * seconds);
  const out = new Float32Array(len);
  const P = sr / freq;
  const Pa = P - 0.5;                       // el promedio de dos muestras retrasa media muestra
  const N = Math.floor(Pa - 0.5);
  const D = Pa - N;                         // parte fraccionaria, entre 0.5 y 1.5
  const C = (1 - D) / (1 + D);
  const buf = new Float32Array(N);

  // Excitación: ruido suavizado (más suave en graves, más brillante en agudos).
  const rand = rng(Math.round(freq * 100));
  const bright = freq < 120 ? 0.35 : freq > 300 ? 0.75 : 0.55;
  let lp = 0, mean = 0;
  for (let i = 0; i < N; i++) { lp += bright * ((rand() * 2 - 1) - lp); buf[i] = lp; mean += lp; }
  mean /= N;
  let peak = 1e-9;
  for (let i = 0; i < N; i++) { buf[i] = (buf[i] ?? 0) - mean; peak = Math.max(peak, Math.abs(buf[i] ?? 0)); }
  for (let i = 0; i < N; i++) buf[i] = (buf[i] ?? 0) / peak;

  const g = Math.exp(-1 / (freq * 1.3));    // pérdida por vuelta: dura casi lo mismo en graves y agudos
  let k = 0, prev = 0, x1 = 0, y1 = 0;
  for (let i = 0; i < len; i++) {
    const cur = buf[k] ?? 0;
    out[i] = cur;
    const avg = g * 0.5 * (cur + prev);
    prev = cur;
    const y = C * avg + x1 - C * y1;
    x1 = avg; y1 = y;
    buf[k] = y;
    k = (k + 1) % N;
  }
  // Normalizar y cerrar con un fundido corto para evitar el "clic" final.
  let mx = 1e-9;
  for (let i = 0; i < len; i++) mx = Math.max(mx, Math.abs(out[i] ?? 0));
  const fade = Math.floor(sr * 0.15);
  for (let i = 0; i < len; i++) {
    let v = ((out[i] ?? 0) / mx) * 0.9;
    if (i > len - fade) v *= (len - i) / fade;
    out[i] = v;
  }
  return out;
}

/** Tono continuo; en graves suma armónicos para que los parlantes pequeños lo reproduzcan. */
export function tone(freq: number, sr: number, seconds = 2.4): Float32Array {
  const len = Math.floor(sr * seconds);
  const out = new Float32Array(len);
  const harm = freq < 150 ? [0.6, 1, 0.9, 0.7, 0.5] : freq < 250 ? [1, 0.35, 0.15] : [1, 0.12];
  const norm = harm.reduce((a, b) => a + b, 0);
  const fade = Math.floor(sr * 0.05);
  for (let i = 0; i < len; i++) {
    let v = 0;
    harm.forEach((h, j) => { v += h * Math.sin(2 * Math.PI * freq * (j + 1) * (i / sr)); });
    const env = Math.min(1, i / fade, (len - i) / (fade * 3));
    out[i] = (v / norm) * 0.9 * env;
  }
  return out;
}
