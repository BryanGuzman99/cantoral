// Instrumentos y sus cuerdas (notas MIDI), más utilidades para comparar notas.
import { spellPc } from '../engine/chords.ts';
import type { Notation } from '../engine/chords.ts';

export interface StringDef { midi: number; pc: number; octave: number; freq: number }

export const midiToFreq = (m: number, a4 = 440): number => a4 * Math.pow(2, (m - 69) / 12);

// Orden de las cuerdas tal como se afinan normalmente.
export const INSTRUMENTS: Record<string, number[]> = {
  Guitarra: [40, 45, 50, 55, 59, 64],   // Mi2 La2 Re3 Sol3 Si3 Mi4
  Bajo: [28, 33, 38, 43],               // Mi1 La1 Re2 Sol2
  Ukulele: [67, 60, 64, 69],            // Sol4 Do4 Mi4 La4
  Mandolina: [55, 62, 69, 76],          // Sol3 Re4 La4 Mi5
};
export const INSTRUMENT_NAMES = Object.keys(INSTRUMENTS);

export function stringsOf(name: string, a4 = 440): StringDef[] {
  return (INSTRUMENTS[name] ?? INSTRUMENTS.Guitarra ?? []).map((midi) => ({
    midi, pc: midi % 12, octave: Math.floor(midi / 12) - 1, freq: midiToFreq(midi, a4),
  }));
}

export const stringLabel = (s: StringDef, notation: Notation): string =>
  spellPc(s.pc, { notation, flats: false }) + s.octave;

export const centsBetween = (f: number, target: number): number => 1200 * Math.log2(f / target);

/** Rango de búsqueda para el detector: un poco debajo de la cuerda más grave y arriba de la más aguda. */
export function searchRange(strs: StringDef[]): { minHz: number; maxHz: number } {
  const fs = strs.map((s) => s.freq);
  return { minHz: Math.min(...fs) * 0.75, maxHz: Math.max(...fs) * 1.3 };
}

export function nearest(f: number, strs: StringDef[]): { s: StringDef; index: number; cents: number } | null {
  let best: { s: StringDef; index: number; cents: number } | null = null;
  strs.forEach((s, index) => {
    const c = centsBetween(f, s.freq);
    if (!best || Math.abs(c) < Math.abs(best.cents)) best = { s, index, cents: c };
  });
  const b = best as { s: StringDef; index: number; cents: number } | null;
  return b && Math.abs(b.cents) <= 600 ? b : null;
}

export type TuneState = 'ok' | 'low' | 'high';
/** Mensaje para el músico. "Baja" = hay que tensar; "alta" = hay que destensar. */
export function tuneMessage(c: number): { state: TuneState; text: string } {
  const a = Math.abs(c);
  if (a <= 5) return { state: 'ok', text: '¡Afinada! ✓' };
  if (c < 0) return { state: 'low', text: a > 15 ? 'Muy baja · tensa la cuerda ↑' : 'Un poco baja · tensa un poco ↑' };
  return { state: 'high', text: a > 15 ? 'Muy alta · destensa la cuerda ↓' : 'Un poco alta · destensa un poco ↓' };
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}
