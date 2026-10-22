import { h, hero } from './dom.ts';
import { refresh } from './nav.ts';
import { listSongs, saveSong } from '../data/db.ts';
import { EXAMPLE } from '../data/example.ts';
import { filterSongs, sortByTitle } from '../data/filter.ts';
import type { Filters } from '../data/filter.ts';
import { CATEGORIES, MASS_PARTS, TIEMPOS } from '../data/types.ts';
import { keyLabel } from '../engine/chords.ts';
import { settings } from '../state.ts';

export async function libraryScreen(manage: boolean): Promise<HTMLElement> {
  const songs = (await listSongs()).sort(sortByTitle);
  const f: Filters = { q: '', category: '', part: '', tiempo: '' };
  const root = h('section', { class: 'scr' },
    hero(manage ? 'EDITAR O ELIMINAR' : 'CANCIONERO', 'CANTORAL CATÓLICO', manage ? '#/admin' : '#/'));

  if (songs.length === 0) {
    root.append(h('div', { class: 'pad' }, h('div', { class: 'card pad' },
      h('h3', {}, 'Aún no hay canciones'),
      h('p', { class: 'mut' }, 'Agrega la primera o carga una canción de ejemplo para probar la app.'),
      h('div', { class: 'actions' },
        h('a', { class: 'pill primary', href: '#/edit/new' }, 'Agregar canción'),
        h('button', { type: 'button', class: 'pill', onclick: async () => { await saveSong(EXAMPLE); refresh(); } }, 'Cargar ejemplo')))));
    return root;
  }

  const chipsC = h('div', { class: 'chips' });
  const chipsP = h('div', { class: 'chips' });
  const list = h('div', { class: 'list' });
  const tl = h('select', { class: 'fld', 'aria-label': 'Tiempo litúrgico', onchange: (e: Event) => { f.tiempo = (e.target as HTMLSelectElement).value; draw(); } },
    h('option', { value: '' }, 'Todos los tiempos litúrgicos'), ...TIEMPOS.map((t) => h('option', { value: t }, t)));
  const search = h('input', {
    class: 'fld', type: 'search', placeholder: 'Buscar por título, autor o letra', 'aria-label': 'Buscar',
    oninput: (e: Event) => { f.q = (e.target as HTMLInputElement).value; draw(); },
  });

  const chip = (label: string, on: boolean, click: () => void): HTMLElement =>
    h('button', { type: 'button', class: 'chip' + (on ? ' on' : ''), onclick: click }, label);

  function draw(): void {
    chipsC.replaceChildren(chip('Todas', f.category === '', () => { f.category = ''; f.part = ''; draw(); }),
      ...CATEGORIES.map((c) => chip(c, f.category === c, () => { f.category = c; f.part = ''; draw(); })));
    chipsP.hidden = f.category !== 'Misa';
    chipsP.replaceChildren(chip('Todas las partes', f.part === '', () => { f.part = ''; draw(); }),
      ...MASS_PARTS.map((p) => chip(p, f.part === p, () => { f.part = p; draw(); })));
    const res = filterSongs(songs, f);
    list.replaceChildren(...(res.length ? res.map((s) =>
      h('a', { class: 'row', href: manage ? `#/edit/${s.id}` : `#/song/${s.id}` },
        h('div', {}, h('b', {}, s.title),
          h('span', {}, [s.author, s.parts.join(', '), s.tiempos.join(', ')].filter(Boolean).join(' · '))),
        h('span', { class: 'key' }, keyLabel(s.baseKey, s.savedShift, settings.notation))))
      : [h('p', { class: 'mut pad' }, 'No hay canciones con esos filtros. Prueba quitar alguno.')]));
  }

  root.append(h('div', { class: 'pad tight' }, search), chipsC, chipsP, h('div', { class: 'pad tight' }, tl), list,
    h('a', { class: 'fab', href: '#/edit/new', 'aria-label': 'Nueva canción' }, '＋'));
  draw();
  return root;
}
