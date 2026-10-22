// Motor de acordes: lectura, transposición y escritura (Do-Re-Mi o C-D-E).
export type Notation = 'american' | 'latin';
export interface FormatOpts { notation: Notation; flats: boolean }
export interface Chord {
  root: number; rootName: string; quality: string;
  bass: number | null; bassName: string | null;
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const LATIN_NAME: Record<string, string> = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
const AMERICAN_FROM_LATIN: Record<string, string> = { Do: 'C', Re: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };
const NATURAL_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const mod12 = (n: number): number => ((n % 12) + 12) % 12;

const TAIL = '([#b]?)([^/]*)(?:/(Sol|Do|Re|Mi|Fa|La|Si|[A-G])([#b]?))?$';
const RE_LATIN = new RegExp('^(Sol|Do|Re|Mi|Fa|La|Si)' + TAIL);
const RE_AMERICAN = new RegExp('^([A-G])' + TAIL);
// Calidades válidas: m, 7, maj7, dim, sus4, add9, b5, etc. Sirve para distinguir
// "Fadd9" (F + add9) de "Fa" + "dd9" (que no es válido).
const QUALITY_OK = /^(?:m(?!aj)|min|maj|M|dim|aug|sus|add|no|[+°ø-]|[#b]?\d+|[(),])*$/;

function pcOf(name: string, acc: string): { pc: number; name: string } {
  const letter = AMERICAN_FROM_LATIN[name] ?? name;
  let pc = NATURAL_PC[letter] ?? 0;
  if (acc === '#') pc += 1;
  else if (acc === 'b') pc -= 1;
  return { pc: mod12(pc), name: letter + acc };
}

export function parseChord(text: string): Chord | null {
  const t = text.trim();
  if (!t) return null;
  for (const re of [RE_LATIN, RE_AMERICAN]) {
    const m = re.exec(t);
    if (!m) continue;
    const quality = m[3] ?? '';
    if (!QUALITY_OK.test(quality)) continue;
    const r = pcOf(m[1] ?? '', m[2] ?? '');
    const b = m[4] ? pcOf(m[4], m[5] ?? '') : null;
    return { root: r.pc, rootName: r.name, quality, bass: b ? b.pc : null, bassName: b ? b.name : null };
  }
  return null;
}

const toNotation = (americanName: string, n: Notation): string =>
  n === 'latin' ? (LATIN_NAME[americanName.charAt(0)] ?? americanName.charAt(0)) + americanName.slice(1) : americanName;

export function spellPc(pc: number, o: FormatOpts): string {
  const name = (o.flats ? FLATS : SHARPS)[mod12(pc)] ?? 'C';
  return toNotation(name, o.notation);
}

export const keyPrefersFlats = (pc: number): boolean => [1, 3, 5, 8, 10].includes(mod12(pc));

export function formatChord(c: Chord, shift: number, o: FormatOpts): string {
  if (mod12(shift) === 0) {
    // Sin transponer: se respeta cómo lo escribió el autor (p. ej. Sib en tono de Do).
    return toNotation(c.rootName, o.notation) + c.quality + (c.bassName ? '/' + toNotation(c.bassName, o.notation) : '');
  }
  return spellPc(c.root + shift, o) + c.quality + (c.bass !== null ? '/' + spellPc(c.bass + shift, o) : '');
}

export function transposeChord(text: string, shift: number, o: FormatOpts): string {
  const c = parseChord(text);
  return c ? formatChord(c, shift, o) : text;
}

/** Forma canónica (letras americanas, respetando # o b escrito) para guardar. */
export function canonicalChord(text: string): string {
  const c = parseChord(text);
  return c ? c.rootName + c.quality + (c.bassName ? '/' + c.bassName : '') : text;
}

/** Notas sueltas de la melodía (E G# F#_ ...). Lo que no es nota se deja igual. */
export function transposeNote(token: string, shift: number, o: FormatOpts): string {
  const m = /^(Sol|Do|Re|Mi|Fa|La|Si|[A-G])([#b]?)(.*)$/.exec(token);
  if (!m) return token;
  const { pc, name } = pcOf(m[1] ?? '', m[2] ?? '');
  if (mod12(shift) === 0) return toNotation(name, o.notation) + (m[3] ?? '');
  return spellPc(pc + shift, o) + (m[3] ?? '');
}

export function keyLabel(baseKey: number, shift: number, notation: Notation): string {
  const pc = baseKey + shift;
  return spellPc(pc, { notation, flats: keyPrefersFlats(pc) });
}
