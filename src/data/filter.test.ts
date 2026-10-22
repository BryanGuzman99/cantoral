import { describe, it, expect } from 'vitest';
import { filterSongs, plain } from './filter.ts';
import type { Song } from './types.ts';

const mk = (o: Partial<Song>): Song => ({
  title: 'X', author: '', baseKey: 0, savedShift: 0, categories: ['Misa'], parts: [], tiempos: ['Ordinario'],
  videoUrl: '', source: '', createdAt: 0, updatedAt: 0, ...o,
});
const songs = [
  mk({ title: 'Alegre la mañana', parts: ['Entrada'], source: '[E]Alegre la mañana\n#coro' }),
  mk({ title: 'Los reyes', categories: ['Festividad'], tiempos: ['Navidad', 'Adviento'], source: '[D]Camino a Belén' }),
  mk({ title: 'Santo', parts: ['Santo', 'Cordero'], author: 'José Pérez' }),
];
const none = { q: '', category: '', part: '', tiempo: '' };

describe('filtros del cancionero', () => {
  it('sin filtros regresa todo', () => expect(filterSongs(songs, none).length).toBe(3));
  it('filtra por categoría', () => expect(filterSongs(songs, { ...none, category: 'Festividad' }).length).toBe(1));
  it('filtra por parte de la misa solo con categoría Misa', () => {
    expect(filterSongs(songs, { ...none, category: 'Misa', part: 'Cordero' }).length).toBe(1);
    expect(filterSongs(songs, { ...none, part: 'Cordero' }).length).toBe(3);
  });
  it('una canción con varios tiempos aparece en cada uno', () => {
    expect(filterSongs(songs, { ...none, tiempo: 'Adviento' }).length).toBe(1);
    expect(filterSongs(songs, { ...none, tiempo: 'Navidad' }).length).toBe(1);
  });
  it('busca sin acentos ni mayúsculas, en título, autor y letra', () => {
    expect(filterSongs(songs, { ...none, q: 'MAÑANA' }).length).toBe(1);
    expect(filterSongs(songs, { ...none, q: 'manana' }).length).toBe(1);
    expect(filterSongs(songs, { ...none, q: 'perez' }).length).toBe(1);
    expect(filterSongs(songs, { ...none, q: 'belen' }).length).toBe(1);
  });
  it('la búsqueda no encuentra acordes ni marcas', () => {
    expect(filterSongs(songs, { ...none, q: 'coro' }).length).toBe(0);
  });
  it('plain quita acentos', () => expect(plain('Éxodo ÑU')).toBe('exodo nu'));
});
