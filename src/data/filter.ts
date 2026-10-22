import type { Song } from './types.ts';

export interface Filters { q: string; category: string; part: string; tiempo: string } // '' = todos

export const plain = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const lyricsOnly = (src: string): string => src.replace(/\[[^\]]*\]/g, '').replace(/^[#~].*$/gm, '');
export const sortByTitle = (a: Song, b: Song): number => a.title.localeCompare(b.title, 'es');

export function filterSongs(songs: Song[], f: Filters): Song[] {
  const q = plain(f.q.trim());
  return songs.filter((s) => {
    if (f.category && !s.categories.includes(f.category)) return false;
    if (f.category === 'Misa' && f.part && !s.parts.includes(f.part)) return false;
    if (f.tiempo && !s.tiempos.includes(f.tiempo)) return false;
    if (q && !plain(`${s.title} ${s.author} ${lyricsOnly(s.source)}`).includes(q)) return false;
    return true;
  });
}
