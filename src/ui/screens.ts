import { h, hero, sheet, toast, segGroup } from './dom.ts';
import { refresh } from './nav.ts';
import { exportBackup, importBackup } from '../data/db.ts';
import { validateBackup } from '../data/backup.ts';
import { applyTheme, saveSettings, settings } from '../state.ts';
import type { Palette, Theme } from '../state.ts';
import type { Notation } from '../engine/chords.ts';

const tile = (icon: string, title: string, sub: string, href: string): HTMLElement =>
  h('a', { class: 'gt', href }, h('i', {}, icon), h('b', {}, title), h('span', {}, sub));

export function homeScreen(): HTMLElement {
  return h('section', { class: 'scr' },
    h('div', { class: 'hero big' }, h('h1', {}, 'CANTORAL CATÓLICO'), h('p', {}, 'Letras y acordes siempre a la mano, también sin internet.')),
    h('div', { class: 'list pad' }, h('div', { class: 'grid' },
      tile('🎶', 'Cancionero', 'Busca y filtra tus cantos', '#/songs'),
      tile('📋', 'Repertorios', 'Listas por misa, para compartir', '#/repertorios'),
      tile('⭐', 'Favoritos y recientes', 'Tus cantos más usados', '#/favorites'),
      tile('📄', 'Exportar PDF', 'Cancionero para imprimir', '#/soon/Exportar PDF'),
      tile('📖', 'Liturgia musical', 'Normas para elegir los cantos', '#/soon/Liturgia musical'),
      tile('🎚', 'Afinador y metrónomo', 'Herramientas para tocar', '#/tools'),
      tile('🛠', 'Administración de Cancionero', 'Agregar, editar, respaldo', '#/admin'),
      tile('⚙️', 'Ajustes', 'Notación, tema y color', '#/settings'),
      tile('ℹ️', 'Acerca de', 'La app y sus creadores', '#/about'))));
}

export function soonScreen(name: string): HTMLElement {
  const msg = name === 'Liturgia musical' ? 'Próximamente disponible' : 'Esta sección llega en las siguientes fases.';
  return h('section', { class: 'scr' }, hero(name.toUpperCase(), 'CANTORAL CATÓLICO', '#/'),
    h('div', { class: 'pad' }, h('div', { class: 'card pad' }, h('h3', {}, 'Próximamente disponible'), msg !== 'Próximamente disponible' ? h('p', { class: 'mut' }, msg) : null)));
}

export function aboutScreen(): HTMLElement {
  return h('section', { class: 'scr' }, hero('ACERCA DE', 'CANTORAL CATÓLICO', '#/'),
    h('div', { class: 'pad' }, h('div', { class: 'card pad' },
      h('h3', {}, 'Cantoral Católico'), h('p', { class: 'mut' }, 'Versión 0.4 (Fase 4)'),
      h('p', { class: 'mut' }, 'Desarrolladores: por definir'), h('p', { class: 'mut' }, 'Contacto: por definir'),
      h('p', { class: 'mut' }, 'Funciona sin conexión a internet. Tus canciones se guardan en este teléfono; haz respaldos con frecuencia.'))));
}

async function downloadBackup(): Promise<void> {
  const blob = new Blob([JSON.stringify(await exportBackup(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `cantoral-respaldo-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('Respaldo descargado. Guárdalo en Drive o envíalo por WhatsApp.');
}

async function restoreFrom(file: File): Promise<void> {
  let count = 0;
  let data: unknown;
  try { data = JSON.parse(await file.text()); count = validateBackup(data).songs.length; }
  catch (e) { toast(e instanceof Error && !(e instanceof SyntaxError) ? e.message : 'El archivo no es un respaldo válido.'); return; }
  const run = (mode: 'merge' | 'replace') => async (): Promise<void> => {
    try {
      const r = await importBackup(data, mode);
      toast((mode === 'merge' ? `Se agregaron ${r.added} canciones (${r.skipped} ya existían)` : `Se restauraron ${r.added} canciones`) + (r.reps ? ` y ${r.reps} repertorios.` : '.'));
      refresh();
    } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo restaurar el respaldo.'); }
  };
  sheet('Restaurar respaldo', h('p', { class: 'mut' }, `El archivo trae ${count} canciones (y sus repertorios, si los tiene). "Agregar las que faltan" conserva lo que ya tienes; "Reemplazar todo" borra tu cancionero actual.`),
    [{ label: 'Cancelar' }, { label: 'Agregar las que faltan', primary: true, run: run('merge') }, { label: 'Reemplazar todo', run: run('replace') }]);
}

export function adminScreen(): HTMLElement {
  const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (f) void restoreFrom(f); (e.target as HTMLInputElement).value = '';
  } });
  const row = (icon: string, title: string, sub: string, act: string | (() => void)): HTMLElement =>
    typeof act === 'string'
      ? h('a', { class: 'tile', href: act }, h('i', {}, icon), h('div', {}, h('b', {}, title), h('span', {}, sub)))
      : h('button', { type: 'button', class: 'tile', onclick: act }, h('i', {}, icon), h('div', {}, h('b', {}, title), h('span', {}, sub)));
  return h('section', { class: 'scr' }, hero('ADMINISTRACIÓN', 'DEL CANCIONERO', '#/'), file,
    h('div', { class: 'list pad' },
      h('p', { class: 'lb' }, 'Canciones'),
      row('＋', 'Agregar canción', 'Escribe o pega la letra con acordes', '#/edit/new'),
      row('✎', 'Editar o eliminar', 'Elige una canción de la lista', '#/songs/edit'),
      row('📥', 'Importar varias canciones', 'Carga muchas canciones de una vez', '#/bulk'),
      h('p', { class: 'lb' }, 'Respaldo'),
      row('💾', 'Descargar respaldo', 'Guarda todas tus canciones en un archivo', () => void downloadBackup()),
      row('♻️', 'Restaurar respaldo', 'Recupera canciones desde un archivo', () => file.click()),
      h('p', { class: 'lb' }, 'Tutoriales'),
      row('📝', 'Cómo escribir acordes, coros e introducción', 'El formato de una canción, con ejemplos', () => sheet('Cómo escribir una canción',
        h('div', {}, h('p', { class: 'mut' }, 'Escribe cada acorde entre corchetes, justo antes de la sílaba donde cambia. La app lo transporta sola, y puedes usar Do-Re-Mi o C-D-E.'),
          h('pre', { class: 'pv' }, '[E]Alegre la ma[A]ñana\nque nos [B7]habla de [E]ti'),
          h('p', { class: 'mut' }, 'Para un coro, escribe #coro arriba de sus líneas y deja una línea vacía al terminar. La introducción va entre #intro y #fin; las notas de la melodía empiezan con ~. Solo la ven quienes la desplieguen.'),
          h('pre', { class: 'pv' }, '#intro\nMelodía:\n~E G# G# F#\nArmonía:\n[E] [A] [E] [B7]\n#fin')),
        [{ label: 'Entendido', primary: true }]))));
}

export function settingsScreen(): HTMLElement {
  const pal: [Palette, string][] = [['esmeralda', 'Esmeralda'], ['vino', 'Vino'], ['azul', 'Azul pizarra'], ['grafito', 'Grafito']];
  const theme: [Theme, string][] = [['light', 'Claro'], ['dark', 'Oscuro'], ['auto', 'Como el teléfono']];
  const nt: [Notation, string][] = [['latin', 'Do Re Mi'], ['american', 'C D E']];
  return h('section', { class: 'scr' }, hero('AJUSTES', 'CANTORAL CATÓLICO', '#/'),
    h('div', { class: 'list pad' },
      h('p', { class: 'lb' }, 'Notación de acordes'), segGroup(nt, settings.notation, (v) => { settings.notation = v; saveSettings(); }),
      h('p', { class: 'lb' }, 'Color'), segGroup(pal, settings.palette, (v) => { settings.palette = v; saveSettings(); }),
      h('p', { class: 'lb' }, 'Tema (opcional)'), segGroup(theme, settings.theme, (v) => { settings.theme = v; saveSettings(); applyTheme(); }),
      h('p', { class: 'lb' }, 'Pantalla encendida al leer una canción'),
      segGroup<'si' | 'no'>([['si', 'Sí'], ['no', 'No']], settings.wake ? 'si' : 'no', (v) => { settings.wake = v === 'si'; saveSettings(); })));
}
