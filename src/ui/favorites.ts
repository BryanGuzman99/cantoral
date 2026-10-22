import { h, hero } from './dom.ts';
import { listSongs } from '../data/db.ts';
import { sortByTitle } from '../data/filter.ts';
import type { Song } from '../data/types.ts';
import { keyLabel } from '../engine/chords.ts';
import { settings } from '../state.ts';

const rowOf = (s: Song): HTMLElement =>
  h('a', { class: 'row', href: `#/song/${s.id}` },
    h('div', {}, h('b', {}, s.title), h('span', {}, [s.author, s.parts.join(', ')].filter(Boolean).join(' · '))),
    h('span', { class: 'key' }, keyLabel(s.baseKey, s.savedShift, settings.notation)));

export async function favoritesScreen(): Promise<HTMLElement> {
  const songs = await listSongs();
  const favs = songs.filter((s) => s.favorite).sort(sortByTitle);
  const recents = songs.filter((s) => s.lastOpenedAt).sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0)).slice(0, 15);
  return h('section', { class: 'scr' }, hero('FAVORITOS Y RECIENTES', 'CANTORAL CATÓLICO', '#/'),
    h('div', { class: 'list' },
      h('p', { class: 'lb pad tight' }, 'Favoritos'),
      ...(favs.length ? favs.map(rowOf) : [h('p', { class: 'mut pad tight' }, 'Toca ☆ dentro de una canción para guardarla aquí.')]),
      h('p', { class: 'lb pad tight' }, 'Recientes'),
      ...(recents.length ? recents.map(rowOf) : [h('p', { class: 'mut pad tight' }, 'Aquí aparecen las últimas canciones que abras.')])));
}
