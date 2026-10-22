import { h, hero, segGroup, toast } from './dom.ts';
import { onLeave } from './nav.ts';
import { Metronome } from '../audio/metronome.ts';
import { MAX_BPM, MIN_BPM, tapTempo } from '../audio/clicks.ts';
import { playString } from '../audio/player.ts';
import { MicTuner } from '../audio/tuner.ts';
import { INSTRUMENT_NAMES, median, nearest, searchRange, stringLabel, stringsOf, tuneMessage } from '../audio/tunings.ts';
import { saveSettings, settings } from '../state.ts';

const BEATS = ['2', '3', '4', '6'];

export function toolsScreen(): HTMLElement {
  const tuner = new MicTuner();
  const metro = new Metronome();
  metro.bpm = settings.bpm; metro.beats = settings.beats; metro.volume = settings.volume;
  let lock: WakeLockSentinel | null = null;
  const keepAwake = async (): Promise<void> => { try { lock = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* no disponible */ } };
  const letSleep = (): void => { void lock?.release(); lock = null; };

  const volume = (): HTMLElement => h('input', { type: 'range', class: 'range', min: '0.2', max: '1', step: '0.05', 'aria-label': 'Volumen', value: String(settings.volume),
    oninput: (e: Event) => { settings.volume = Number((e.target as HTMLInputElement).value); metro.setVolume(settings.volume); saveSettings(); } });

  // ---------- Afinador ----------
  let hist: number[] = [], lastIdx = -1, lastSeen = 0, muteUntil = 0;
  const note = h('div', { class: 'tn' }, '–');
  const msg = h('div', { class: 'tm' });
  const info = h('div', { class: 'th' });
  const needle = h('div', { class: 'needle' });
  const strBox = h('div', { class: 'strs' });
  const micBtn = h('button', { type: 'button', class: 'pill primary big' }, '🎤 Afinar con micrófono');

  const idle = (): void => {
    note.textContent = '–'; info.textContent = ''; needle.style.left = '50%'; needle.classList.remove('ok'); msg.classList.remove('ok');
    msg.textContent = tuner.running ? 'Escuchando… toca una cuerda' : 'Toca una cuerda cerca del teléfono';
    strBox.querySelectorAll('.chip').forEach((c) => c.classList.remove('hit'));
  };
  const drawStrings = (): void => {
    strBox.replaceChildren(...stringsOf(settings.instrument).map((s) =>
      h('button', { type: 'button', class: 'chip', 'aria-label': `Escuchar ${stringLabel(s, settings.notation)}`, onclick: () => {
        muteUntil = performance.now() + 2600;
        void playString(s.freq, settings.refSound, settings.volume);
      } }, stringLabel(s, settings.notation))));
  };
  const onFreq = (f: number | null): void => {
    const now = performance.now();
    if (now < muteUntil) return;
    if (f === null) { if (now - lastSeen > 1200) { hist = []; lastIdx = -1; idle(); } return; }
    const strs = stringsOf(settings.instrument);
    const r = nearest(f, strs);
    if (!r) return;
    lastSeen = now;
    if (r.index !== lastIdx) { hist = []; lastIdx = r.index; }
    hist.push(r.cents); if (hist.length > 5) hist.shift();
    const c = median(hist);
    const t = tuneMessage(c);
    note.textContent = stringLabel(r.s, settings.notation);
    needle.style.left = `${50 + Math.max(-50, Math.min(50, c))}%`;
    needle.classList.toggle('ok', t.state === 'ok'); msg.classList.toggle('ok', t.state === 'ok');
    msg.textContent = t.text;
    info.textContent = `${f.toFixed(1)} Hz · ${c > 0 ? '+' : ''}${Math.round(c)} centésimas`;
    strBox.querySelectorAll('.chip').forEach((el, i) => el.classList.toggle('hit', i === r.index));
  };
  const stopMic = (): void => { tuner.stop(); micBtn.textContent = '🎤 Afinar con micrófono'; micBtn.classList.add('primary'); hist = []; lastIdx = -1; idle(); letSleep(); };
  micBtn.addEventListener('click', async () => {
    if (tuner.running) { stopMic(); return; }
    try {
      await tuner.start(searchRange(stringsOf(settings.instrument)), onFreq);
      micBtn.textContent = '■ Detener'; micBtn.classList.remove('primary'); idle(); void keepAwake();
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      toast(name === 'NotAllowedError' ? 'Permiso del micrófono denegado. Actívalo en la configuración del navegador.'
        : name === 'NotFoundError' ? 'No se encontró un micrófono en este dispositivo.'
        : e instanceof Error && e.message === 'INSEGURO' ? 'El micrófono necesita una dirección segura (https).'
        : 'No se pudo usar el micrófono.');
      stopMic();
    }
  });

  const tunerPanel = h('div', { class: 'panel' },
    segGroup(INSTRUMENT_NAMES.map((n): [string, string] => [n, n]), settings.instrument, (v) => {
      settings.instrument = v; saveSettings(); const was = tuner.running;
      if (was) { stopMic(); toast('Instrumento cambiado. Vuelve a tocar «Afinar con micrófono».'); } else idle();
      hist = []; lastIdx = -1; drawStrings();
    }),
    note, msg, info,
    h('div', { class: 'meter' }, h('div', { class: 'zone' }), h('div', { class: 'mid' }), needle),
    h('div', { class: 'mlabels' }, h('span', {}, '♭ baja'), h('span', {}, 'afinada'), h('span', {}, 'alta ♯')),
    micBtn,
    h('p', { class: 'lb' }, 'Escucha la nota de cada cuerda'), strBox,
    h('p', { class: 'lb' }, 'Sonido de referencia'),
    segGroup<'cuerda' | 'continuo'>([['cuerda', 'Cuerda del instrumento'], ['continuo', 'Tono continuo']], settings.refSound, (v) => { settings.refSound = v; saveSettings(); }),
    h('p', { class: 'lb' }, 'Volumen'), volume(),
    h('p', { class: 'meta' }, 'En graves, el parlante del teléfono casi no mueve aire; por eso la nota se refuerza con sus armónicos y tu oído la reconoce igual. Con audífonos o una bocina se escucha más grave y completa.'));

  // ---------- Metrónomo ----------
  const bpmEl = h('div', { class: 'bpm' }, String(settings.bpm), h('small', {}, 'pulsos por minuto'));
  const slider = h('input', { type: 'range', class: 'range', min: String(MIN_BPM), max: String(MAX_BPM), step: '1', 'aria-label': 'Tempo', value: String(settings.bpm),
    oninput: (e: Event) => setBpm(Number((e.target as HTMLInputElement).value)) });
  const dots = h('div', { class: 'dots' });
  const goBtn = h('button', { type: 'button', class: 'pill primary big' }, '▶ Iniciar');
  const setBpm = (v: number): void => {
    const b = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v)));
    settings.bpm = b; metro.bpm = b; (slider as HTMLInputElement).value = String(b);
    bpmEl.firstChild!.textContent = String(b); saveSettings();
  };
  const drawDots = (): void => dots.replaceChildren(...Array.from({ length: settings.beats }, (_, i) => h('span', { class: 'dot' + (i === 0 ? ' first' : '') })));
  metro.onBeat = (i) => dots.querySelectorAll('.dot').forEach((d, j) => d.classList.toggle('on', j === i));
  const stopMetro = (): void => { metro.stop(); goBtn.textContent = '▶ Iniciar'; goBtn.classList.add('primary'); dots.querySelectorAll('.dot').forEach((d) => d.classList.remove('on')); letSleep(); };
  goBtn.addEventListener('click', async () => {
    if (metro.running) { stopMetro(); return; }
    try { await metro.start(); goBtn.textContent = '■ Detener'; goBtn.classList.remove('primary'); void keepAwake(); }
    catch { toast('No se pudo iniciar el sonido.'); }
  });
  const taps: number[] = [];
  const stepBtn = (label: string, d: number): HTMLElement => h('button', { type: 'button', class: 'pill', 'aria-label': `${d > 0 ? 'Subir' : 'Bajar'} ${Math.abs(d)}`, onclick: () => setBpm(settings.bpm + d) }, label);

  const metroPanel = h('div', { class: 'panel' }, bpmEl, slider,
    h('div', { class: 'btnrow' }, stepBtn('−5', -5), stepBtn('−1', -1), stepBtn('+1', 1), stepBtn('+5', 5),
      h('button', { type: 'button', class: 'pill', onclick: () => { taps.push(performance.now()); const t = tapTempo(taps); if (t) setBpm(t); } }, 'Tap')),
    h('p', { class: 'lb' }, 'Pulsos por compás (el primero suena más fuerte)'),
    segGroup(BEATS.map((n): [string, string] => [n, n]), String(settings.beats), (v) => { settings.beats = Number(v); metro.beats = settings.beats; saveSettings(); drawDots(); }),
    dots, goBtn, h('p', { class: 'lb' }, 'Volumen'), volume());
  metroPanel.hidden = true;

  const tabs = h('div', { class: 'tabs' });
  const showTab = (t: 'afinador' | 'metronomo'): void => {
    tunerPanel.hidden = t !== 'afinador'; metroPanel.hidden = t !== 'metronomo';
    tabs.replaceChildren(
      h('button', { type: 'button', class: 'chip' + (t === 'afinador' ? ' on' : ''), onclick: () => { if (metro.running) stopMetro(); showTab('afinador'); } }, 'Afinador'),
      h('button', { type: 'button', class: 'chip' + (t === 'metronomo' ? ' on' : ''), onclick: () => { if (tuner.running) stopMic(); showTab('metronomo'); } }, 'Metrónomo'));
  };

  onLeave(() => { tuner.stop(); metro.stop(); letSleep(); });
  drawStrings(); drawDots(); idle(); showTab('afinador');
  return h('section', { class: 'scr' }, hero('AFINADOR Y METRÓNOMO', 'CANTORAL CATÓLICO', '#/'), tabs, h('div', { class: 'list' }, tunerPanel, metroPanel));
}
