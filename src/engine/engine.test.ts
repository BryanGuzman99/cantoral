import { describe, it, expect } from 'vitest';
import { parseChord, transposeChord, transposeNote, keyPrefersFlats, keyLabel, canonicalChord } from './chords.ts';
import { normalizeSource, convertChordLines, parseSong } from './chordpro.ts';
import { renderSong } from './render.ts';

const A = { notation: 'american' as const, flats: false };
const AF = { notation: 'american' as const, flats: true };
const L = { notation: 'latin' as const, flats: false };

describe('lectura de acordes', () => {
  it('reconoce americano y latino', () => {
    expect(parseChord('Dm')?.root).toBe(2);
    expect(parseChord('Do')?.root).toBe(0);
    expect(parseChord('Sol')?.root).toBe(7);
    expect(parseChord('Rem7')?.quality).toBe('m7');
    expect(parseChord('Am7b5')?.quality).toBe('m7b5');
  });
  it('distingue Fadd9 (F + add9) de Fa', () => {
    expect(parseChord('Fadd9')?.root).toBe(5);
    expect(parseChord('Fadd9')?.quality).toBe('add9');
    expect(parseChord('Fa')?.quality).toBe('');
  });
  it('rechaza lo que no es acorde', () => {
    expect(parseChord('N.C.')).toBeNull();
    expect(parseChord('hola')).toBeNull();
    expect(parseChord('')).toBeNull();
  });
});

describe('transposición', () => {
  it('suma semitonos', () => {
    expect(transposeChord('E', 2, A)).toBe('F#');
    expect(transposeChord('B7', 5, A)).toBe('E7');
    expect(transposeChord('F#dim', 1, A)).toBe('Gdim');
    expect(transposeChord('Fadd9', 2, A)).toBe('Gadd9');
  });
  it('elige sostenidos o bemoles según el tono', () => {
    expect(transposeChord('E', 1, AF)).toBe('F');
    expect(transposeChord('E', -1, A)).toBe('D#');
    expect(transposeChord('E', -1, AF)).toBe('Eb');
    expect(keyPrefersFlats(10)).toBe(true);
    expect(keyPrefersFlats(5)).toBe(true);
    expect(keyPrefersFlats(7)).toBe(false);
    expect(keyPrefersFlats(6)).toBe(false);
  });
  it('funciona en notación latina y con bajo', () => {
    expect(transposeChord('Mi', 5, L)).toBe('La');
    expect(transposeChord('Lam', 2, L)).toBe('Sim');
    expect(transposeChord('Sol/Si', 2, L)).toBe('La/Do#');
    expect(transposeChord('Rem7', 0, A)).toBe('Dm7');
    expect(transposeChord('Reb', 0, A)).toBe('Db');
  });
  it('sin transponer respeta lo escrito', () => {
    expect(transposeChord('Bb', 0, A)).toBe('Bb');
  });
  it('doce semitonos regresan al mismo acorde', () => {
    for (const c of ['C', 'F#m7', 'Bb', 'G/B', 'Edim']) expect(transposeChord(c, 12, A)).toBe(c);
  });
  it('lo desconocido se queda igual', () => {
    expect(transposeChord('N.C.', 3, A)).toBe('N.C.');
  });
  it('notas de la melodía', () => {
    expect(transposeNote('G#_', 1, A)).toBe('A_');
    expect(transposeNote('E', 2, A)).toBe('F#');
    expect(transposeNote('(2)', 3, A)).toBe('(2)');
    expect(transposeNote('/', 3, A)).toBe('/');
  });
  it('nombre del tono', () => {
    expect(keyLabel(4, 0, 'latin')).toBe('Mi');
    expect(keyLabel(4, 3, 'latin')).toBe('Sol');
    expect(keyLabel(0, 10, 'american')).toBe('Bb');
  });
  it('forma canónica', () => {
    expect(canonicalChord('Sol/Si')).toBe('G/B');
    expect(canonicalChord('Fadd9')).toBe('Fadd9');
  });
});

describe('formato de canción', () => {
  it('normaliza los acordes a letras americanas', () => {
    expect(normalizeSource('[Do]Hola [Rem7]mundo [Fadd9]')).toBe('[C]Hola [Dm7]mundo [Fadd9]');
  });
  it('convierte acordes arriba de la letra', () => {
    const t = '   Re          La\nPero mira cómo beben\n';
    expect(convertChordLines(t)).toBe('Per[Re]o mira cómo [La]beben\n');
  });
  it('no toca líneas que ya tienen corchetes', () => {
    expect(convertChordLines('[E]Alegre la mañana')).toBe('[E]Alegre la mañana');
  });
  it('separa introducción y coros', () => {
    const src = '#intro\nMelodía:\n~E G# F#\nArmonía:\n[E] [A]\n#fin\n\n#coro\n[E]Alegre\nla mañana\n\n[A]Estrofa';
    const b = parseSong(src);
    expect(b.map((x) => x.kind)).toEqual(['intro', 'blank', 'coro', 'blank', 'line']);
    const intro = b[0];
    expect(intro?.kind === 'intro' ? intro.items.length : 0).toBe(4);
    const coro = b[2];
    expect(coro?.kind === 'coro' ? coro.lines.length : 0).toBe(2);
  });
});

describe('dibujo de la canción', () => {
  const src = '#intro\n~E G#\n#fin\n\n#coro\n[E]Alegre <b>\n';
  const base = { baseKey: 4, shift: 0, capo: 0, notation: 'american' as const, includeIntro: true };
  it('oculta la introducción si no se pide', () => {
    expect(renderSong(parseSong(src), { ...base, includeIntro: false })).not.toContain('intro');
    expect(renderSong(parseSong(src), base)).toContain('Introducción');
  });
  it('escapa el texto', () => {
    expect(renderSong(parseSong(src), base)).toContain('&lt;b&gt;');
  });
  it('transpone los acordes y el capo solo cambia la forma', () => {
    const b = parseSong('[E]Hola');
    expect(renderSong(b, { ...base, shift: 2 })).toContain('>F#<');
    expect(renderSong(b, { ...base, shift: 2, capo: 2 })).toContain('>E<');
  });
  it('transpone las notas de la introducción pero no por el capo', () => {
    const b = parseSong('#intro\n~E\n#fin');
    expect(renderSong(b, { ...base, shift: 2, capo: 2 })).toContain('F#');
  });
});
