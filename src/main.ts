import './style.css';
import { normalizeSource } from './engine/chordpro.ts';
import { parseSong } from './engine/chordpro.ts';
import { keyLabel } from './engine/chords.ts';
import { renderSong } from './engine/render.ts';
import type { Notation } from './engine/chords.ts';

// Pantalla de arranque de la Fase 1: prueba el motor y la instalación sin conexión.
// Las pantallas reales (biblioteca, editor, respaldo) se agregan en los siguientes pasos.
const SAMPLE = normalizeSource(`#intro
Melodía:
~E G# G# G# G# G# G# F# F# E
Armonía:
[E] [A] [E] [B7] [E]
#fin

#coro
[Mi]Alegre la mañana
que nos [La]habla de [Mi]ti,
[Si7]alegre la ma[Mi]ñana.

[La]En nombre del Dios Padre,
[Mi]del Hijo y del Espíritu,
[Si7]salimos de la noche
[Mi]y estrenamos la aurora;`);

const BASE_KEY = 4; // Mi
const blocks = parseSong(SAMPLE);
const st = { shift: 0, capo: 0, notation: 'latin' as Notation, intro: false };

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header><h1>Cantoral Católico</h1><p>Fase 1 · prueba del motor de acordes</p></header>
  <main><div id="song"></div></main>
  <div class="ctl">
    <button id="dn" aria-label="Bajar un semitono">−</button>
    <span class="val" id="key"></span>
    <button id="up" aria-label="Subir un semitono">+</button>
    <button id="capo"></button>
    <button id="nt"></button>
    <button id="in"></button>
  </div>`;

const $ = (id: string): HTMLElement => document.getElementById(id)!;

function draw(): void {
  $('song').innerHTML = renderSong(blocks, { baseKey: BASE_KEY, ...st, includeIntro: st.intro, notation: st.notation });
  $('key').textContent = keyLabel(BASE_KEY, st.shift, st.notation);
  $('capo').textContent = st.capo ? `Capo ${st.capo}` : 'Sin capo';
  $('nt').textContent = st.notation === 'latin' ? 'Do Re Mi' : 'C D E';
  $('in').textContent = st.intro ? 'Ocultar intro' : 'Ver intro';
  $('in').classList.toggle('on', st.intro);
}
$('dn').onclick = () => { st.shift--; draw(); };
$('up').onclick = () => { st.shift++; draw(); };
$('capo').onclick = () => { st.capo = (st.capo + 1) % 8; draw(); };
$('nt').onclick = () => { st.notation = st.notation === 'latin' ? 'american' : 'latin'; draw(); };
$('in').onclick = () => { st.intro = !st.intro; draw(); };
draw();
