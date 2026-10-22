import { h, hero, topBar, sheet, toast, confirmBox } from './dom.ts';
import { deleteRepertorio, getRepertorio, listRepertorios, listSongs, saveRepertorio } from '../data/db.ts';
import { filterSongs } from '../data/filter.ts';
import { decodeRep, encodeRep, repText } from '../data/share.ts';
import { titleKey } from '../data/backup.ts';
import type { RepItem, Song } from '../data/types.ts';
import { keyLabel } from '../engine/chords.ts';
import { settings } from '../state.ts';

const today = (): string => new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
const count = (n: number): string => `${n} ${n === 1 ? 'canción' : 'canciones'}`;
const missing = (title: string): HTMLElement =>
  h('section', { class: 'scr' }, topBar(title, '#/repertorios'), h('p', { class: 'mut pad' }, 'Ese repertorio ya no existe.'));

export async function repertoriosScreen(): Promise<HTMLElement> {
  const reps = await listRepertorios();
  const newRep = (): void => {
    const name = h('input', { class: 'fld', 'aria-label': 'Nombre del repertorio', placeholder: `Ej. Misa dominical ${today()}` });
    sheet('Nuevo repertorio', name, [{ label: 'Cancelar' }, { label: 'Crear', primary: true, run: async () => {
      const id = await saveRepertorio({ name: name.value.trim() || `Repertorio del ${today()}`, items: [] });
      location.hash = `#/repertorio/${id}`;
    } }]);
    window.setTimeout(() => name.focus(), 100);
  };
  return h('section', { class: 'scr' }, hero('REPERTORIOS', 'CANTORAL CATÓLICO', '#/'),
    h('div', { class: 'list' }, ...(reps.length ? reps.map((r) =>
      h('a', { class: 'row', href: `#/repertorio/${r.id}` },
        h('div', {}, h('b', {}, r.name), h('span', {}, count(r.items.length))), h('span', { class: 'key' }, '›')))
      : [h('p', { class: 'mut pad' }, 'Todavía no tienes repertorios. Toca ＋ para crear el primero.')])),
    h('button', { type: 'button', class: 'fab', 'aria-label': 'Nuevo repertorio', onclick: newRep }, '＋'));
}

export async function repertorioScreen(id: number): Promise<HTMLElement> {
  const rep = await getRepertorio(id);
  if (!rep) return missing('No encontrado');
  const songs = await listSongs();
  const byId = new Map<number, Song>();
  for (const s of songs) if (s.id !== undefined) byId.set(s.id, s);
  const body = h('div', { class: 'list' });
  const persist = (): Promise<number> => saveRepertorio({ name: rep.name, items: rep.items }, id);

  const move = async (i: number, d: number): Promise<void> => {
    const j = i + d;
    const a = rep.items[i], b = rep.items[j];
    if (!a || !b) return;
    rep.items[i] = b; rep.items[j] = a;
    await persist(); draw();
  };

  const row = (s: Song, it: RepItem, i: number): HTMLElement => {
    const tone = h('span', { class: 'val sm' }, keyLabel(s.baseKey, it.shift, settings.notation));
    const step = (d: number) => async (): Promise<void> => {
      it.shift += d; tone.textContent = keyLabel(s.baseKey, it.shift, settings.notation); await persist();
    };
    const btn = (label: string, aria: string, fn: () => void | Promise<void>): HTMLElement =>
      h('button', { type: 'button', class: 'sq sm', 'aria-label': aria, onclick: fn }, label);
    return h('div', { class: 'reprow' },
      h('button', { type: 'button', class: 'rhead', onclick: () => { location.hash = `#/song/${s.id}/${it.shift}`; } },
        h('span', { class: 'idx' }, String(i + 1)),
        h('div', {}, h('b', {}, s.title), h('span', {}, s.parts.join(' / ') || s.tiempos.join(' / ')))),
      h('div', { class: 'rctl' }, btn('−', 'Bajar el tono', step(-1)), tone, btn('+', 'Subir el tono', step(1)),
        h('span', { class: 'grow' }),
        btn('↑', 'Subir de lugar', () => move(i, -1)), btn('↓', 'Bajar de lugar', () => move(i, 1)),
        btn('✕', 'Quitar del repertorio', async () => { rep.items.splice(i, 1); await persist(); draw(); })));
  };

  const draw = (): void => {
    const rows = rep.items.flatMap((it, i) => { const s = byId.get(it.songId); return s ? [row(s, it, i)] : []; });
    body.replaceChildren(...(rows.length ? rows : [h('p', { class: 'mut pad' }, 'Este repertorio está vacío. Toca ＋ para agregar canciones.')]));
  };

  const lines = (): string[] => rep.items.flatMap((it) => {
    const s = byId.get(it.songId);
    return s ? [`${s.parts.length ? s.parts.join(' / ') + ': ' : ''}${s.title} (${keyLabel(s.baseKey, it.shift, settings.notation)})`] : [];
  });

  const share = (): void => {
    if (!rep.items.length) { toast('Agrega canciones antes de compartir'); return; }
    const it: [string, number][] = rep.items.flatMap((x) => { const s = byId.get(x.songId); return s ? [[s.title, x.shift] as [string, number]] : []; });
    const link = `${location.origin}${location.pathname}#/import/${encodeRep({ n: rep.name, it })}`;
    const text = repText(rep.name, lines(), link);
    const more = typeof navigator.share === 'function'
      ? h('button', { type: 'button', class: 'pill', onclick: () => { void navigator.share({ text }).catch(() => undefined); } }, 'Otras apps') : null;
    sheet('Compartir repertorio', h('div', {}, h('pre', { class: 'pv' }, text), h('div', { class: 'actions' },
      h('a', { class: 'pill primary', href: `https://wa.me/?text=${encodeURIComponent(text)}`, target: '_blank', rel: 'noopener' }, 'Enviar por WhatsApp'),
      more,
      h('button', { type: 'button', class: 'pill', onclick: async () => {
        try { await navigator.clipboard.writeText(text); toast('Copiado'); } catch { toast('No se pudo copiar'); }
      } }, 'Copiar'))), [{ label: 'Cerrar' }]);
  };

  const pick = (): void => {
    const q = h('input', { class: 'fld', type: 'search', placeholder: 'Buscar canción', 'aria-label': 'Buscar canción', oninput: () => drawPick() });
    const res = h('div', { class: 'picker' });
    const drawPick = (): void => res.replaceChildren(...filterSongs(songs, { q: q.value, category: '', part: '', tiempo: '' }).map((s) => {
      const on = rep.items.some((x) => x.songId === s.id);
      return h('button', { type: 'button', class: 'row', onclick: async () => {
        if (on || s.id === undefined) { toast('Esa canción ya está en el repertorio'); return; }
        rep.items.push({ songId: s.id, shift: s.savedShift }); await persist(); draw(); drawPick(); toast(`Añadida: ${s.title}`);
      } }, h('div', {}, h('b', {}, s.title), h('span', {}, s.parts.join(' / ') || s.tiempos.join(' / '))), h('span', { class: 'key' }, on ? '✓' : '＋'));
    }));
    sheet('Agregar canciones', h('div', {}, q, res), [{ label: 'Listo', primary: true }]);
    drawPick();
  };

  const bar = topBar(rep.name, '#/repertorios',
    h('button', { type: 'button', class: 'ib', 'aria-label': 'Compartir', onclick: share }, '📤'),
    h('button', { type: 'button', class: 'ib', 'aria-label': 'Más opciones', onclick: () => {
      let close = (): void => undefined;
      const item = (label: string, fn: () => void): HTMLElement => h('button', { type: 'button', class: 'tile', onclick: () => { close(); fn(); } }, h('div', {}, h('b', {}, label)));
      close = sheet('Repertorio', h('div', {},
        item('✎ Cambiar el nombre', () => {
          const name = h('input', { class: 'fld', 'aria-label': 'Nombre', value: rep.name });
          sheet('Cambiar el nombre', name, [{ label: 'Cancelar' }, { label: 'Guardar', primary: true, run: async () => {
            rep.name = name.value.trim() || rep.name; await persist(); const t = bar.querySelector('h2'); if (t) t.textContent = rep.name;
          } }]);
        }),
        item('🗑 Eliminar repertorio', async () => {
          if (await confirmBox(`¿Eliminar «${rep.name}»?`, 'Las canciones no se borran, solo la lista.', 'Sí, eliminar')) {
            await deleteRepertorio(id); toast('Repertorio eliminado'); location.hash = '#/repertorios';
          }
        })), [{ label: 'Cerrar' }]);
    } }, '⋮'));

  draw();
  return h('section', { class: 'scr' }, bar, body,
    h('button', { type: 'button', class: 'fab', 'aria-label': 'Agregar canción', onclick: pick }, '＋'));
}

/** Pantalla a la que llega quien abre el enlace de un repertorio compartido. */
export async function importRepScreen(code: string): Promise<HTMLElement> {
  const shared = decodeRep(code);
  const head = hero('REPERTORIO RECIBIDO', 'CANTORAL CATÓLICO', '#/repertorios');
  if (!shared) return h('section', { class: 'scr' }, head, h('p', { class: 'mut pad' }, 'El enlace está dañado o incompleto. Pide que te lo envíen de nuevo.'));
  const songs = await listSongs();
  const byTitle = new Map(songs.map((s) => [titleKey(s.title), s]));
  const found: RepItem[] = [];
  const rows = shared.it.map(([title, shift]) => {
    const s = byTitle.get(titleKey(title));
    if (s?.id !== undefined) found.push({ songId: s.id, shift });
    return h('div', { class: 'row' }, h('div', {}, h('b', {}, title), h('span', {}, s ? 'En tu cancionero' : 'No está en tu cancionero')),
      h('span', { class: 'key' }, s ? '✓' : '✕'));
  });
  const lost = shared.it.length - found.length;
  return h('section', { class: 'scr' }, head, h('div', { class: 'list' },
    h('div', { class: 'pad' }, h('h3', {}, shared.n), h('p', { class: 'mut' }, lost
      ? `${lost} de ${shared.it.length} canciones no están en tu cancionero. Pide un respaldo a quien te lo envió para tenerlas.`
      : 'Tienes todas las canciones de este repertorio.')),
    ...rows,
    h('div', { class: 'pad' }, h('button', { type: 'button', class: 'pill primary', disabled: found.length ? null : true, onclick: async () => {
      const id = await saveRepertorio({ name: shared.n, items: found });
      toast('Repertorio guardado'); location.hash = `#/repertorio/${id}`;
    } }, found.length ? `Guardar con ${count(found.length)}` : 'No hay canciones para guardar'))));
}
