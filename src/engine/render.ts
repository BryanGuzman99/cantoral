// Dibuja una canción como HTML, con tono y capo aplicados.
import type { Block, Segment } from './chordpro.ts';
import { keyPrefersFlats, transposeChord, transposeNote } from './chords.ts';
import type { Notation } from './chords.ts';

export interface RenderOpts {
  baseKey: number;      // 0..11 (0 = Do)
  shift: number;        // semitonos de transposición (tono sonando)
  capo: number;         // traste del capo (solo afecta los acordes de guitarra)
  notation: Notation;
  includeIntro: boolean;
  introOpen?: boolean;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderSong(blocks: Block[], o: RenderOpts): string {
  const chordShift = o.shift - o.capo;
  const chordOpts = { notation: o.notation, flats: keyPrefersFlats(o.baseKey + chordShift) };
  const noteOpts = { notation: o.notation, flats: keyPrefersFlats(o.baseKey + o.shift) };

  const seg = (s: Segment): string =>
    `<span class="s"><span class="c">${s.chord ? esc(transposeChord(s.chord, chordShift, chordOpts)) : ''}</span>` +
    `<span class="t">${s.text ? esc(s.text) : '&nbsp;'}</span></span>`;
  const line = (segs: Segment[]): string => `<div class="line">${segs.map(seg).join('')}</div>`;

  return blocks.map((b): string => {
    switch (b.kind) {
      case 'blank': return '<div class="sp"></div>';
      case 'line': return line(b.segments);
      case 'coro': return `<div class="coro"><div class="sec">Coro</div>${b.lines.map(line).join('')}</div>`;
      case 'intro': {
        if (!o.includeIntro) return '';
        const items = b.items.map((it): string => {
          if (it.kind === 'label') return `<div class="sec">${esc(it.text)}</div>`;
          if (it.kind === 'notes') return `<div class="line notes">${it.tokens.map((t) => esc(transposeNote(t, o.shift, noteOpts))).join(' ')}</div>`;
          return line(it.segments);
        });
        return `<details class="intro"${o.introOpen ? ' open' : ''}><summary>Introducción · para instrumentos</summary>${items.join('')}</details>`;
      }
    }
  }).join('');
}
