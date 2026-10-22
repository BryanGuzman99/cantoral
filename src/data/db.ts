// Base de datos local (IndexedDB con Dexie). Todo vive en el teléfono.
import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Song } from './types.ts';
import { titleKey, validateBackup } from './backup.ts';
import type { Backup } from './backup.ts';

class CantoralDB extends Dexie {
  declare songs: Table<Song, number>;
  constructor() {
    super('cantoral');
    this.version(1).stores({
      songs: '++id,title,updatedAt,*categories,*parts,*tiempos',
    });
  }
}

export const db = new CantoralDB();

export type SongInput = Omit<Song, 'id' | 'createdAt' | 'updatedAt'>;

export async function saveSong(input: SongInput, id?: number): Promise<number> {
  const now = Date.now();
  if (id === undefined) return db.songs.add({ ...input, createdAt: now, updatedAt: now });
  await db.songs.update(id, { ...input, updatedAt: now });
  return id;
}

export const deleteSong = (id: number): Promise<void> => db.songs.delete(id);
export const getSong = (id: number): Promise<Song | undefined> => db.songs.get(id);
export const listSongs = (): Promise<Song[]> => db.songs.orderBy('title').toArray();

export async function exportBackup(): Promise<Backup> {
  const songs = await db.songs.toArray();
  return {
    app: 'cantoral-catolico',
    version: 1,
    exportedAt: new Date().toISOString(),
    songs: songs.map(({ id: _id, ...s }) => s),
  };
}

/** "merge" agrega solo las canciones nuevas (por título); "replace" borra todo y restaura. */
export async function importBackup(raw: unknown, mode: 'merge' | 'replace'): Promise<{ added: number; skipped: number }> {
  const backup = validateBackup(raw);
  return db.transaction('rw', db.songs, async () => {
    if (mode === 'replace') {
      await db.songs.clear();
      await db.songs.bulkAdd(backup.songs);
      return { added: backup.songs.length, skipped: 0 };
    }
    const have = new Set((await db.songs.toArray()).map((s) => titleKey(s.title)));
    const fresh = backup.songs.filter((s) => {
      const k = titleKey(s.title);
      if (have.has(k)) return false;
      have.add(k);
      return true;
    });
    await db.songs.bulkAdd(fresh);
    return { added: fresh.length, skipped: backup.songs.length - fresh.length };
  });
}
