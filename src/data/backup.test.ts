import { describe, it, expect } from 'vitest';
import { validateBackup } from './backup.ts';

const song = { title: ' Alegre la mañana ', source: '[E]Hola', baseKey: 4, categories: ['Misa', ''], parts: ['Entrada'], tiempos: ['Ordinario'] };
const ok = { app: 'cantoral-catolico', version: 1, exportedAt: '2026-10-21', songs: [song] };

describe('validateBackup', () => {
  it('acepta un respaldo correcto y limpia los datos', () => {
    const b = validateBackup(ok);
    expect(b.songs.length).toBe(1);
    expect(b.songs[0]?.title).toBe('Alegre la mañana');
    expect(b.songs[0]?.categories).toEqual(['Misa']);
    expect(b.songs[0]?.author).toBe('');
    expect(b.songs[0]?.savedShift).toBe(0);
  });
  it('rechaza archivos que no son del cantoral', () => {
    expect(() => validateBackup({ songs: [] })).toThrow();
    expect(() => validateBackup(null)).toThrow();
    expect(() => validateBackup('hola')).toThrow();
  });
  it('rechaza versiones desconocidas', () => {
    expect(() => validateBackup({ ...ok, version: 9 })).toThrow();
  });
  it('rechaza canciones incompletas', () => {
    expect(() => validateBackup({ ...ok, songs: [{ ...song, title: '' }] })).toThrow();
    expect(() => validateBackup({ ...ok, songs: [{ ...song, baseKey: 13 }] })).toThrow();
    expect(() => validateBackup({ ...ok, songs: [{ ...song, source: 5 }] })).toThrow();
  });
});

describe('respaldo con repertorios', () => {
  it('un respaldo antiguo (versión 1) sigue sirviendo y queda sin repertorios', () => {
    const b = validateBackup(ok);
    expect(b.version).toBe(2);
    expect(b.repertorios).toEqual([]);
  });
  it('lee y limpia repertorios y favoritos', () => {
    const b = validateBackup({ ...ok, version: 2, songs: [{ ...song, favorite: true }],
      repertorios: [{ name: ' Misa ', items: [{ title: 'A ', shift: 2 }, { title: '', shift: 1 }, { shift: 3 }] }] });
    expect(b.songs[0]?.favorite).toBe(true);
    expect(b.repertorios).toEqual([{ name: 'Misa', items: [{ title: 'A', shift: 2 }] }]);
  });
  it('rechaza repertorios sin nombre', () => {
    expect(() => validateBackup({ ...ok, repertorios: [{ name: '', items: [] }] })).toThrow();
  });
});
