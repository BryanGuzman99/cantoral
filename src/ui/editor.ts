import { h, topBar, toast, confirmBox, chipGroup } from './dom.ts';
import { notFound } from './view.ts';
import { deleteSong, getSong, saveSong } from '../data/db.ts';
import type { SongInput } from '../data/db.ts';
import { CATEGORIES, MASS_PARTS, TIEMPOS } from '../data/types.ts';
import { convertChordLines, normalizeSource, parseSong } from '../engine/chordpro.ts';
import { keyLabel, keyPrefersFlats, spellPc } from '../engine/chords.ts';
import { renderSong } from '../engine/render.ts';
import { settings } from '../state.ts';

const INTRO_TEMPLATE = '#intro\nMelodía:\n~\nArmonía:\n[]\n#fin\n\n';

export async function editorScreen(id?: number): Promise<HTMLElement> {
  const old = id === undefined ? undefined : await getSong(id);
  if (id !== undefined && !old) return notFound();

  const categories = [...(old?.categories ?? [])];
  const parts = [...(old?.parts ?? [])];
  const tiempos = [...(old?.tiempos ?? ['Ordinario'])];

  const title = h('input', { class: 'fld', 'aria-label': 'Título', value: old?.title ?? '' });
  const author = h('input', { class: 'fld', 'aria-label': 'Autor', value: old?.author ?? '' });
  const video = h('input', { class: 'fld', 'aria-label': 'Enlace de video', inputmode: 'url', placeholder: 'https://', value: old?.videoUrl ?? '' });
  const keySel = h('select', { class: 'fld', 'aria-label': 'Tonalidad', onchange: () => { bar(); preview(); } },
    ...Array.from({ length: 12 }, (_, pc) => h('option', { value: String(pc) }, keyLabel(pc, 0, settings.notation))));
  keySel.value = String(old?.baseKey ?? 0);
  const ta = h('textarea', { class: 'fld mono', rows: '12', spellcheck: 'false', 'aria-label': 'Letra y acordes', oninput: () => preview() });
  ta.value = old?.source ?? '';
  const prev = h('div', { class: 'song prev' });
  const chordBar = h('div', { class: 'chips' });
  const partsBox = h('div', {}, h('p', { class: 'lb' }, 'Partes de la misa'), chipGroup(MASS_PARTS, parts, () => undefined));

  const catBox = chipGroup(CATEGORIES, categories, () => { partsBox.hidden = !categories.includes('Misa'); });
  partsBox.hidden = !categories.includes('Misa');

  function insert(text: string): void {
    const a = ta.selectionStart, b = ta.selectionEnd;
    ta.value = ta.value.slice(0, a) + text + ta.value.slice(b);
    ta.focus();
    ta.setSelectionRange(a + text.length, a + text.length);
    preview();
  }
  function bar(): void {
    const r = Number(keySel.value), o = { notation: settings.notation, flats: keyPrefersFlats(r) };
    const n = (i: number): string => spellPc(r + i, o);
    const chords = [n(0), n(5), n(7), n(7) + '7', n(9) + 'm', n(2) + 'm'];
    chordBar.replaceChildren(
      ...chords.map((c) => h('button', { type: 'button', class: 'chip', onclick: () => insert(`[${c}]`) }, c)),
      ...['#', 'b', 'm', '7', '/'].map((c) => h('button', { type: 'button', class: 'chip', onclick: () => insert(c) }, c)));
  }
  function preview(): void {
    prev.innerHTML = renderSong(parseSong(normalizeSource(ta.value)), {
      baseKey: Number(keySel.value), shift: 0, capo: 0, notation: settings.notation, includeIntro: true, introOpen: true });
    prev.style.setProperty('--z', '0.9');
  }

  async function save(): Promise<void> {
    const t = title.value.trim();
    if (!t) return toast('Escribe el título de la canción');
    if (!ta.value.trim()) return toast('Escribe la letra de la canción');
    if (!categories.length) return toast('Elige al menos una categoría');
    if (!tiempos.length) return toast('Elige al menos un tiempo litúrgico');
    const v = video.value.trim();
    if (v && !/^https?:\/\//i.test(v)) return toast('El enlace del video debe empezar con http:// o https://');
    const baseKey = Number(keySel.value);
    const input: SongInput = {
      title: t, author: author.value.trim(), baseKey,
      savedShift: old && old.baseKey === baseKey ? old.savedShift : 0,
      categories: [...categories], parts: categories.includes('Misa') ? [...parts] : [], tiempos: [...tiempos],
      videoUrl: v, source: normalizeSource(ta.value).replace(/\s+$/, ''),
    };
    const newId = await saveSong(input, id);
    toast('Canción guardada');
    location.hash = `#/song/${newId}`;
  }

  const root = h('section', { class: 'scr' },
    topBar(old ? 'Editar canción' : 'Nueva canción', id === undefined ? '#/songs' : `#/song/${id}`,
      h('button', { type: 'button', class: 'pill primary', onclick: () => void save() }, 'Guardar')),
    h('div', { class: 'list pad' },
      h('p', { class: 'lb' }, 'Título'), title,
      h('p', { class: 'lb' }, 'Autor (opcional)'), author,
      h('p', { class: 'lb' }, 'Tonalidad'), keySel,
      h('p', { class: 'lb' }, 'Categorías'), catBox, partsBox,
      h('p', { class: 'lb' }, 'Tiempo litúrgico (puedes elegir varios)'), chipGroup(TIEMPOS, tiempos, () => undefined),
      h('p', { class: 'lb' }, 'Enlace de video (opcional)'), video,
      h('p', { class: 'lb' }, 'Letra y acordes'), chordBar, ta,
      h('div', { class: 'chips wrap' },
        h('button', { type: 'button', class: 'pill', onclick: () => { ta.value = convertChordLines(ta.value); preview(); toast('Acordes convertidos'); } }, 'Convertir acordes de arriba'),
        h('button', { type: 'button', class: 'pill', onclick: () => { if (/^#intro/m.test(ta.value)) toast('Ya tiene introducción'); else { ta.value = INTRO_TEMPLATE + ta.value; preview(); } } }, '🎹 Introducción'),
        h('button', { type: 'button', class: 'pill', onclick: () => insert('\n#coro\n') }, 'Coro')),
      h('p', { class: 'lb' }, 'Vista previa'), h('div', { class: 'card pad scrollx' }, prev),
      old && h('button', { type: 'button', class: 'pill danger', onclick: async () => {
        if (await confirmBox(`¿Eliminar «${old.title}»?`, 'Esta acción no se puede deshacer.', 'Sí, eliminar')) {
          await deleteSong(id!); toast('Canción eliminada'); location.hash = '#/songs';
        }
      } }, 'Eliminar canción')));
  bar();
  preview();
  return root;
}
