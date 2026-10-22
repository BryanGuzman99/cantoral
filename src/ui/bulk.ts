import { h, topBar, sheet, toast } from './dom.ts';
import { addSongs, listSongs } from '../data/db.ts';
import { BULK_EXAMPLE, parseBulk } from '../data/bulk.ts';
import type { BulkItem } from '../data/bulk.ts';
import { keyLabel } from '../engine/chords.ts';
import { settings } from '../state.ts';



export async function bulkScreen(): Promise<HTMLElement> {
  const existing = (await listSongs()).map((s) => s.title);
  let items: BulkItem[] = [];
  const ta = h('textarea', { class: 'fld mono', rows: '10', spellcheck: 'false', 'aria-label': 'Canciones a importar' });
  const out = h('div', {});

  const review = (): void => {
    items = parseBulk(ta.value, existing);
    if (!items.length) { out.replaceChildren(h('p', { class: 'mut' }, 'No se encontró ninguna canción. Cada una debe empezar con === y su título.')); return; }
    const good = items.filter((x) => !x.error);
    const warn = good.filter((x) => x.warnings.length).length;
    const skip = items.length - good.length;
    out.replaceChildren(
      h('p', { class: 'meta' }, `${good.length} para importar${warn ? ` (${warn} con avisos)` : ''}${skip ? ` · ${skip} se omiten` : ''}`),
      ...items.map((x) => h('div', { class: 'row' }, h('div', {}, h('b', {}, x.input.title || '(sin título)'),
        h('span', {}, x.error ? `✕ ${x.error} — se omite`
          : `${x.warnings.length ? '⚠ ' + x.warnings.join(' · ') : '✓ Lista'} · tono ${keyLabel(x.input.baseKey, 0, settings.notation)}`)))),
      ...(good.length ? [h('button', { type: 'button', class: 'pill primary full', onclick: async () => {
        await addSongs(good.map((x) => x.input));
        toast(`Importación lista: ${good.length}`); location.hash = '#/songs';
      } }, `Importar ${good.length}`)] : []));
  };

  const help = (): void => { sheet('Cómo escribir varias canciones', h('div', {},
    h('p', { class: 'mut' }, 'Cada canción empieza con === y su título. Los datos son opcionales y van antes de una línea con ---. Después va la letra, con los acordes entre corchetes o en una línea arriba de cada verso.'),
    h('pre', { class: 'pv' }, '=== Título\nautor: Nombre\ntono: Sol\ncategoria: Misa, Festividad\nparte: Entrada, Salida\ntiempo: Navidad, Adviento\nvideo: https://...\n---\n[Sol]Letra con [Re]acordes'),
    h('p', { class: 'mut' }, 'Si no pones el tono, se toma del primer acorde. Las canciones que ya existen no se duplican.')), [{ label: 'Entendido', primary: true }]); };

  const file = h('input', { type: 'file', accept: '.txt,text/plain', hidden: true, onchange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) { ta.value = await f.text(); review(); }
    (e.target as HTMLInputElement).value = '';
  } });

  return h('section', { class: 'scr' }, topBar('Importar canciones', '#/admin'), file,
    h('div', { class: 'list pad' },
      h('p', { class: 'meta' }, 'Pega varias canciones o carga un archivo de texto (.txt).'),
      h('div', { class: 'chips wrap' },
        h('button', { type: 'button', class: 'pill', onclick: () => file.click() }, '📂 Cargar archivo'),
        h('button', { type: 'button', class: 'pill', onclick: () => { ta.value = BULK_EXAMPLE; review(); } }, 'Ver ejemplo'),
        h('button', { type: 'button', class: 'pill', onclick: help }, 'Cómo se escribe')),
      ta, h('button', { type: 'button', class: 'pill primary full', onclick: review }, 'Revisar'), h('div', { class: 'gap' }, out)));
}
