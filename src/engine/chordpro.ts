// Formato de canción: acordes entre corchetes, #coro, y bloque #intro ... #fin.
import { canonicalChord, parseChord } from './chords.ts';

export interface Segment { chord: string | null; text: string }
export type IntroItem =
  | { kind: 'label'; text: string }
  | { kind: 'notes'; tokens: string[] }
  | { kind: 'line'; segments: Segment[] };
export type Block =
  | { kind: 'line'; segments: Segment[] }
  | { kind: 'blank' }
  | { kind: 'coro'; lines: Segment[][] }
  | { kind: 'intro'; items: IntroItem[] };

export function parseSegments(line: string): Segment[] {
  const out: Segment[] = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let chord: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const text = line.slice(last, m.index);
    if (text || chord !== null) out.push({ chord, text });
    chord = m[1] ?? '';
    last = re.lastIndex;
  }
  out.push({ chord, text: line.slice(last) });
  return out;
}

/** Pasa los acordes entre corchetes a letras americanas (Do→C, Rem7→Dm7). */
export function normalizeSource(src: string): string {
  return src.replace(/\[([^\]]*)\]/g, (_m, inner: string) => '[' + canonicalChord(inner.trim()) + ']');
}

const isChordLine = (line: string): boolean => {
  const t = line.trim();
  if (!t || t.includes('[')) return false;
  return t.split(/\s+/).every((w) => parseChord(w) !== null);
};

/** Convierte "acordes arriba, letra abajo" a acordes entre corchetes. */
export function convertChordLines(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!isChordLine(line)) { out.push(line); continue; }
    const chords = [...line.matchAll(/\S+/g)];
    const next = lines[i + 1];
    if (next !== undefined && next.trim() && !isChordLine(next) && !next.trim().startsWith('#')) {
      const width = Math.max(next.length, ...chords.map((c) => c.index ?? 0));
      let s = next.padEnd(width, ' ');
      for (let k = chords.length - 1; k >= 0; k--) {
        const c = chords[k]!;
        const at = c.index ?? 0;
        s = s.slice(0, at) + '[' + c[0] + ']' + s.slice(at);
      }
      out.push(s.trimEnd());
      i++;
    } else {
      out.push(chords.map((c) => '[' + c[0] + ']').join(' '));
    }
  }
  return out.join('\n');
}

export function parseSong(src: string): Block[] {
  const out: Block[] = [];
  let intro: Extract<Block, { kind: 'intro' }> | null = null;
  let coro: Extract<Block, { kind: 'coro' }> | null = null;
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const t = line.trim();
    if (intro) {
      if (t === '#fin') { out.push(intro); intro = null; continue; }
      if (!t) continue;
      if (t.startsWith('~')) intro.items.push({ kind: 'notes', tokens: t.slice(1).trim().split(/\s+/).filter(Boolean) });
      else if (t.endsWith(':') && !t.includes('[')) intro.items.push({ kind: 'label', text: t });
      else intro.items.push({ kind: 'line', segments: parseSegments(t) });
      continue;
    }
    if (t === '#intro') { if (coro) { out.push(coro); coro = null; } intro = { kind: 'intro', items: [] }; continue; }
    if (t === '#coro') { if (coro) out.push(coro); coro = { kind: 'coro', lines: [] }; continue; }
    if (!t) { if (coro) { out.push(coro); coro = null; } out.push({ kind: 'blank' }); continue; }
    if (coro) coro.lines.push(parseSegments(line));
    else out.push({ kind: 'line', segments: parseSegments(line) });
  }
  if (coro) out.push(coro);
  if (intro) out.push(intro);
  return out;
}
