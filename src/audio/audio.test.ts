import { describe, it, expect } from 'vitest';
import { pluck } from './pluck.ts';
import { detectPitch } from './pitch.ts';
import { INSTRUMENT_NAMES, centsBetween, median, nearest, searchRange, stringLabel, stringsOf, tuneMessage } from './tunings.ts';
import { MAX_BPM, MIN_BPM, clickSamples, tapTempo } from './clicks.ts';

const r2 = (n: number): number => Math.round(n * 100) / 100;
function energy(x: Float32Array, sr: number, f: number): number {
  let re = 0, im = 0;
  for (let i = 0; i < x.length; i++) { const a = (2 * Math.PI * f * i) / sr; re += (x[i] ?? 0) * Math.cos(a); im -= (x[i] ?? 0) * Math.sin(a); }
  return Math.hypot(re, im);
}

describe('instrumentos', () => {
  it('guitarra, bajo, ukulele y mandolina con sus frecuencias', () => {
    expect(stringsOf('Guitarra').map((s) => r2(s.freq))).toEqual([82.41, 110, 146.83, 196, 246.94, 329.63]);
    expect(stringsOf('Bajo').map((s) => r2(s.freq))).toEqual([41.2, 55, 73.42, 98]);
    expect(stringsOf('Ukulele').map((s) => r2(s.freq))).toEqual([392, 261.63, 329.63, 440]);
    expect(stringsOf('Mandolina').map((s) => r2(s.freq))).toEqual([196, 293.66, 440, 659.26]);
  });
  it('nombres de las cuerdas', () => {
    expect(stringsOf('Guitarra').map((s) => stringLabel(s, 'latin'))).toEqual(['Mi2', 'La2', 'Re3', 'Sol3', 'Si3', 'Mi4']);
    expect(stringsOf('Ukulele').map((s) => stringLabel(s, 'american'))).toEqual(['G4', 'C4', 'E4', 'A4']);
  });
  it('encuentra la cuerda más cercana y los centésimos', () => {
    const g = stringsOf('Guitarra');
    const n = nearest(112, g);
    expect(n?.index).toBe(1);
    expect(Math.round(n?.cents ?? 0)).toBe(31);
    expect(nearest(5000, g)).toBeNull();
    expect(Math.round(centsBetween(220, 110))).toBe(1200);
  });
  it('mensajes: tensar o destensar', () => {
    expect(tuneMessage(0).state).toBe('ok');
    expect(tuneMessage(-5).state).toBe('ok');
    expect(tuneMessage(-8).text).toContain('tensa un poco');
    expect(tuneMessage(-30).text).toContain('Muy baja');
    expect(tuneMessage(8).text).toContain('destensa un poco');
    expect(tuneMessage(40).text).toContain('Muy alta');
  });
  it('mediana', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 100])).toBe(2.5);
  });
});

describe('sonido de cuerda y detección', () => {
  for (const sr of [44100, 48000]) {
    it(`todas las cuerdas salen afinadas y se detectan (${sr} Hz)`, () => {
      for (const name of INSTRUMENT_NAMES) {
        const strs = stringsOf(name);
        const rg = searchRange(strs);
        for (const s of strs) {
          const p = pluck(s.freq, sr);
          const f = detectPitch(p.slice(Math.floor(sr * 0.25), Math.floor(sr * 0.25) + 4096), sr, rg.minHz, rg.maxHz);
          expect(f !== null && Math.abs(centsBetween(f, s.freq)) < 3).toBe(true);
        }
      }
    });
  }
  it('detecta con ruido de fondo', () => {
    const sr = 44100;
    const strs = stringsOf('Guitarra');
    const rg = searchRange(strs);
    let seed = 11;
    for (const s of strs) {
      const seg = pluck(s.freq, sr).slice(Math.floor(sr * 0.25), Math.floor(sr * 0.25) + 4096);
      for (let i = 0; i < seg.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; seg[i] = (seg[i] ?? 0) + ((seed / 4294967296) * 2 - 1) * 0.08; }
      const f = detectPitch(seg, sr, rg.minHz, rg.maxHz);
      expect(f !== null && Math.abs(centsBetween(f, s.freq)) < 5).toBe(true);
    }
  });
  it('detecta el bajo aunque el micrófono no capte la nota fundamental', () => {
    const sr = 44100;
    const rg = searchRange(stringsOf('Bajo'));
    for (const s of stringsOf('Bajo')) {
      const x = new Float32Array(4096);
      for (let i = 0; i < x.length; i++) { let v = 0; for (let k = 2; k <= 6; k++) v += Math.sin((2 * Math.PI * s.freq * k * i) / sr) / k; x[i] = v * 0.3; }
      const f = detectPitch(x, sr, rg.minHz, rg.maxHz);
      expect(f !== null && Math.abs(centsBetween(f, s.freq)) < 10).toBe(true);
    }
  });
  it('silencio y ruido no dan nota', () => {
    expect(detectPitch(new Float32Array(4096), 44100)).toBeNull();
    const n = new Float32Array(4096);
    let seed = 5;
    for (let i = 0; i < n.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; n[i] = ((seed / 4294967296) * 2 - 1) * 0.3; }
    expect(detectPitch(n, 44100)).toBeNull();
  });
  it('los graves tienen su energía en frecuencias que el teléfono reproduce', () => {
    const sr = 44100;
    for (const f0 of [41.2, 55]) {
      const x = pluck(f0, sr).slice(0, sr / 2);
      let all = 0, audible = 0;
      for (let k = 1; k <= 8; k++) { const e = energy(x, sr, f0 * k) ** 2; all += e; if (f0 * k >= 120) audible += e; }
      expect(audible / all > 0.6).toBe(true);
    }
  });
  it('el sonido nunca pasa de 1 ni queda vacío', () => {
    const p = pluck(82.41, 44100);
    expect(p.every((v) => Math.abs(v) <= 1)).toBe(true);
    expect(p.some((v) => Math.abs(v) > 0.5)).toBe(true);
  });
});

describe('metrónomo', () => {
  it('tap tempo promedia los toques', () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 1000])).toBe(60);
    expect(tapTempo([0])).toBeNull();
  });
  it('olvida toques viejos y limita el rango', () => {
    expect(tapTempo([0, 500, 5000, 5500])).toBe(120);
    expect(tapTempo([0, 5000])).toBeNull();
    expect(tapTempo([0, 2000])).toBe(MIN_BPM);
    expect(tapTempo([0, 100])).toBe(MAX_BPM);
  });
  it('los clics del tiempo fuerte y débil son distintos y dentro de rango', () => {
    const a = clickSamples(44100, true), b = clickSamples(44100, false);
    expect(a.length).toBe(b.length);
    expect(a.some((v, i) => v !== b[i])).toBe(true);
    expect(a.every((v) => Math.abs(v) <= 1)).toBe(true);
  });
});
