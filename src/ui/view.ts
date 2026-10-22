import { h, topBar, toast } from './dom.ts';
import { onLeave } from './nav.ts';
import { getSong, setSavedShift } from '../data/db.ts';
import { parseSong } from '../engine/chordpro.ts';
import { keyLabel } from '../engine/chords.ts';
import { renderSong } from '../engine/render.ts';
import { saveSettings, settings } from '../state.ts';

const MIN_Z = 0.7, MAX_Z = 2.6;
const SPEEDS = [0, 0.35, 0.7, 1.2];

export function notFound(): HTMLElement {
  return h('section', { class: 'scr' }, topBar('No encontrada', '#/songs'), h('p', { class: 'mut pad' }, 'Esa canción ya no existe.'));
}

export async function viewScreen(id: number): Promise<HTMLElement> {
  const song = await getSong(id);
  if (!song) return notFound();
  const blocks = parseSong(song.source);
  const st = { shift: song.savedShift, capo: 0, introOpen: false, speed: 0 };

  const songEl = h('div', { class: 'song' });
  const box = h('div', { class: 'songbox' },
    h('p', { class: 'meta' }, [song.author, 'Tono original: ' + keyLabel(song.baseKey, 0, settings.notation)].filter(Boolean).join(' · ')),
    songEl);
  const keyEl = h('span', { class: 'val' });
  const capoEl = h('span', { class: 'lbl' });
  const saveBtn = h('button', { type: 'button', class: 'pill primary', onclick: async () => {
    await setSavedShift(id, st.shift); song.savedShift = st.shift; draw(); toast('Tono guardado: ' + keyLabel(song.baseKey, st.shift, settings.notation));
  } }, 'Guardar este tono');
  const resetBtn = h('button', { type: 'button', class: 'pill', onclick: () => { st.shift = song.savedShift; st.capo = 0; draw(); } }, '↺ Restablecer');
  const autoBtn = h('button', { type: 'button', class: 'pill', onclick: () => { st.speed = (st.speed + 1) % SPEEDS.length; draw(); } }, '');
  const noteBtn = h('button', { type: 'button', class: 'ib txt', 'aria-label': 'Cambiar notación', onclick: () => {
    settings.notation = settings.notation === 'latin' ? 'american' : 'latin'; saveSettings(); draw();
  } }, '');

  const draw = (): void => {
    songEl.innerHTML = renderSong(blocks, { baseKey: song.baseKey, shift: st.shift, capo: st.capo, notation: settings.notation, includeIntro: true, introOpen: st.introOpen });
    const d = songEl.querySelector('details.intro') as HTMLDetailsElement | null;
    d?.addEventListener('toggle', () => { st.introOpen = d.open; });
    songEl.style.setProperty('--z', String(settings.zoom));
    keyEl.textContent = keyLabel(song.baseKey, st.shift, settings.notation);
    capoEl.textContent = st.capo ? `Capo ${st.capo} · forma ${keyLabel(song.baseKey, st.shift - st.capo, settings.notation)}` : 'Sin capo';
    const changed = st.shift !== song.savedShift || st.capo !== 0;
    saveBtn.hidden = st.shift === song.savedShift;
    resetBtn.hidden = !changed;
    autoBtn.textContent = st.speed ? `❚❚ Auto ${st.speed}x` : '▶ Auto';
    autoBtn.classList.toggle('on', st.speed > 0);
    noteBtn.textContent = settings.notation === 'latin' ? 'Do' : 'C';
  };

  const stepper = (label: string, fn: () => void): HTMLElement =>
    h('button', { type: 'button', class: 'sq', 'aria-label': label, onclick: () => { fn(); draw(); } }, label.startsWith('Menos') || label.startsWith('Bajar') ? '−' : '+');
  const setZoom = (z: number): void => { settings.zoom = Math.min(MAX_Z, Math.max(MIN_Z, +z.toFixed(2))); songEl.style.setProperty('--z', String(settings.zoom)); };

  const ctl = h('div', { class: 'ctl' },
    h('div', { class: 'r' },
      h('div', { class: 'step' }, stepper('Bajar un semitono', () => { st.shift--; }), h('div', { class: 'k' }, keyEl, h('span', { class: 'lbl' }, 'Tono')), stepper('Subir un semitono', () => { st.shift++; })),
      h('div', { class: 'step' },
        h('button', { type: 'button', class: 'sq sm', 'aria-label': 'Letra más pequeña', onclick: () => { setZoom(settings.zoom - 0.1); saveSettings(); } }, 'A−'),
        h('button', { type: 'button', class: 'sq sm', 'aria-label': 'Letra más grande', onclick: () => { setZoom(settings.zoom + 0.1); saveSettings(); } }, 'A+'))),
    h('div', { class: 'r' },
      h('div', { class: 'step' }, stepper('Menos capo', () => { st.capo = Math.max(0, st.capo - 1); }), capoEl, stepper('Más capo', () => { st.capo = Math.min(7, st.capo + 1); })),
      autoBtn),
    h('div', { class: 'r wrapr' }, saveBtn, resetBtn));

  const root = h('section', { class: 'scr' },
    topBar(song.title, '#/songs', song.videoUrl ? h('a', { class: 'ib', href: song.videoUrl, target: '_blank', rel: 'noopener', 'aria-label': 'Ver video' }, '🎬') : null,
      noteBtn, h('a', { class: 'ib', href: `#/edit/${id}`, 'aria-label': 'Editar canción' }, '✎')),
    box, ctl);

  // Zoom con dos dedos (o Ctrl + rueda en computadora)
  let d0 = 0, z0 = 1;
  const dist = (e: TouchEvent): number => { const a = e.touches[0]!, b = e.touches[1]!; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); };
  box.addEventListener('touchstart', (e) => { if (e.touches.length === 2) { d0 = dist(e); z0 = settings.zoom; } }, { passive: true });
  box.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && d0) { e.preventDefault(); setZoom(z0 * dist(e) / d0); } }, { passive: false });
  box.addEventListener('touchend', () => { if (d0) { d0 = 0; saveSettings(); } });
  box.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); setZoom(settings.zoom - e.deltaY * 0.004); } }, { passive: false });

  // Desplazamiento automático
  let raf = 0, acc = 0;
  const tick = (): void => {
    const sp = SPEEDS[st.speed] ?? 0;
    if (sp) {
      acc += sp;
      const whole = Math.floor(acc);
      if (whole) { box.scrollTop += whole; acc -= whole; }
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 1) { st.speed = 0; draw(); }
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // Pantalla encendida mientras lees (si el teléfono lo permite)
  let lock: WakeLockSentinel | null = null;
  const acquire = async (): Promise<void> => {
    if (!settings.wake || document.visibilityState !== 'visible') return;
    try { lock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* no disponible */ }
  };
  document.addEventListener('visibilitychange', acquire);
  void acquire();
  onLeave(() => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', acquire); void lock?.release(); });

  draw();
  return root;
}
