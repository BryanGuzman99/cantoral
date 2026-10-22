// Importador masivo: varias canciones en un solo texto.
import type { SongInput } from './types.ts';
import { CATEGORIES, MASS_PARTS, TIEMPOS } from './types.ts';
import { convertChordLines, normalizeSource } from '../engine/chordpro.ts';
import { parseChord } from '../engine/chords.ts';
import { plain } from './filter.ts';
import { titleKey } from './backup.ts';

export interface BulkItem { input: SongInput; warnings: string[]; error: string }  // error '' = lista

export function parseBulk(text: string, existingTitles: string[]): BulkItem[] {
  const have = new Set(existingTitles.map(titleKey));
  const seen = new Set<string>();
  return text.replace(/\r\n?/g, '\n').split(/^===[ \t]*/m).map((b) => b.trim()).filter(Boolean).map((block): BulkItem => {
    const lines = block.split('\n');
    const title = (lines.shift() ?? '').trim();
    const cut = lines.findIndex((l) => l.trim() === '---');
    const meta: Record<string, string> = {};
    for (const l of cut < 0 ? [] : lines.slice(0, cut)) {
      const m = /^([^:]+):\s*(.*)$/.exec(l);
      if (m) meta[plain((m[1] ?? '').trim()).replace(/s$/, '')] = (m[2] ?? '').trim();
    }
    const source = normalizeSource(convertChordLines((cut < 0 ? lines : lines.slice(cut + 1)).join('\n').replace(/\s+$/, '')));
    const warnings: string[] = [];
    const pick = (key: string, all: string[]): string[] =>
      (meta[key] ?? '').split(',').map((x) => x.trim()).filter(Boolean).flatMap((x) => {
        const f = all.find((a) => plain(a) === plain(x));
        if (!f) { warnings.push(`«${x}» no existe`); return []; }
        return [f];
      });
    let categories = pick('categoria', CATEGORIES);
    const parts = pick('parte', MASS_PARTS);
    let tiempos = pick('tiempo', TIEMPOS);
    if (parts.length && !categories.includes('Misa')) categories = [...categories, 'Misa'];
    if (!categories.length) { categories = ['Misa']; warnings.push('Sin categoría: se pondrá en Misa'); }
    if (!tiempos.length) tiempos = ['Ordinario'];
    let base: number | null = meta.tono ? (parseChord(meta.tono)?.root ?? null) : null;
    if (base === null) { const m = /\[([^\]]+)\]/.exec(source); const c = m ? parseChord(m[1] ?? '') : null; if (c) base = c.root; }
    if (base === null) { base = 0; warnings.push('No se detectó el tono: se usará Do'); }
    let videoUrl = meta.video ?? '';
    if (videoUrl && !/^https?:\/\//i.test(videoUrl)) { warnings.push('El enlace de video no es válido y se omitió'); videoUrl = ''; }
    const k = titleKey(title);
    const error = !title ? 'Falta el título' : !source.trim() ? 'Falta la letra'
      : have.has(k) ? 'Ya existe en el cancionero' : seen.has(k) ? 'Está repetida en este texto' : '';
    seen.add(k);
    return { input: { title, author: meta.autor ?? '', baseKey: base, savedShift: 0, categories,
      parts: categories.includes('Misa') ? parts : [], tiempos, videoUrl, source }, warnings, error };
  });
}

export const BULK_EXAMPLE = `=== Noche de paz
autor: Tradicional
tono: Sol
categoria: Misa, Festividad
parte: Entrada
tiempo: Navidad
---
[Sol]Noche de paz, noche de [Re7]amor,
[Sol]todo duerme en derredor,
entre los [Do]astros que esparcen su [Sol]luz,
bella anunciando al niñito [Re7]Jesús,
brilla la estrella de [Sol]paz.

=== Los peces en el río
categoria: Festividad
tiempo: Navidad, Adviento
---
   Re          La
Pero mira cómo beben
    La          Re
los peces en el río`;
