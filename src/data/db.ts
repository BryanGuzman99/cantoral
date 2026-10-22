// Base de datos local (IndexedDB con Dexie). Todo vive en el teléfono.
import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Repertorio, Song, SongInput } from './types.ts';
import { titleKey, validateBackup } from './backup.ts';
import type { Backup } from './backup.ts';

export type { SongInput } from './types.ts';

class CantoralDB extends Dexie {
  declare songs: Table<Song, number>;
  declare repertorios: Table<Repertorio, number>;
  constructor() {
    super('cantoral');
    this.version(1).stores({ songs: '++id,title,updatedAt,*categories,*parts,*tiempos' });
    this.version(2).stores({
      songs: '++id,title,updatedAt,*categories,*parts,*tiempos',
      repertorios: '++id,name,updatedAt',
    });
  }
}

export const db = new CantoralDB();

// ---- Canciones ----
export async function saveSong(input: SongInput, id?: number): Promise<number> {
  const now = Date.now();
  if (id === undefined) return db.songs.add({ ...input, createdAt: now, updatedAt: now });
  await db.songs.update(id, { ...input, updatedAt: now });
  return id;
}

export async function addSongs(inputs: SongInput[]): Promise<void> {
  const now = Date.now();
  await db.songs.bulkAdd(inputs.map((s) => ({ ...s, createdAt: now, updatedAt: now })));
}

/** Borra la canción y la quita de todos los repertorios. */
export const deleteSong = (id: number): Promise<void> =>
  db.transaction('rw', db.songs, db.repertorios, async () => {
    await db.songs.delete(id);
    await db.repertorios.toCollection().modify((r) => { r.items = r.items.filter((i) => i.songId !== id); });
  });

export const getSong = (id: number): Promise<Song | undefined> => db.songs.get(id);
export const listSongs = (): Promise<Song[]> => db.songs.orderBy('title').toArray();
export const setSavedShift = (id: number, shift: number): Promise<number> =>
  db.songs.update(id, { savedShift: shift, updatedAt: Date.now() });
export const touchOpened = (id: number): Promise<number> => db.songs.update(id, { lastOpenedAt: Date.now() });

export async function toggleFavorite(id: number): Promise<boolean> {
  const s = await db.songs.get(id);
  const next = !(s?.favorite ?? false);
  await db.songs.update(id, { favorite: next });
  return next;
}

// ---- Repertorios ----
export type RepInput = Pick<Repertorio, 'name' | 'items'>;

export async function saveRepertorio(input: RepInput, id?: number): Promise<number> {
  const now = Date.now();
  if (id === undefined) return db.repertorios.add({ ...input, createdAt: now, updatedAt: now });
  await db.repertorios.update(id, { ...input, updatedAt: now });
  return id;
}
export const getRepertorio = (id: number): Promise<Repertorio | undefined> => db.repertorios.get(id);
export const listRepertorios = (): Promise<Repertorio[]> => db.repertorios.orderBy('updatedAt').reverse().toArray();
export const deleteRepertorio = (id: number): Promise<void> => db.repertorios.delete(id);

// ---- Respaldo ----
export async function exportBackup(): Promise<Backup> {
  const [songs, reps] = await Promise.all([db.songs.toArray(), db.repertorios.toArray()]);
  const title = new Map(songs.map((s) => [s.id, s.title]));
  return {
    app: 'cantoral-catolico',
    version: 2,
    exportedAt: new Date().toISOString(),
    songs: songs.map(({ id: _id, lastOpenedAt: _l, ...s }) => s),
    repertorios: reps.map((r) => ({
      name: r.name,
      items: r.items.flatMap((i) => { const t = title.get(i.songId); return t ? [{ title: t, shift: i.shift }] : []; }),
    })),
  };
}

export interface ImportResult { added: number; skipped: number; reps: number }

/** "merge" agrega solo lo nuevo (por título/nombre); "replace" borra todo y restaura. */
export async function importBackup(raw: unknown, mode: 'merge' | 'replace'): Promise<ImportResult> {
  const backup = validateBackup(raw);
  return db.transaction('rw', db.songs, db.repertorios, async () => {
    let added = 0, skipped = 0;
    if (mode === 'replace') {
      await db.songs.clear();
      await db.repertorios.clear();
      await db.songs.bulkAdd(backup.songs);
      added = backup.songs.length;
    } else {
      const have = new Set((await db.songs.toArray()).map((s) => titleKey(s.title)));
      const fresh = backup.songs.filter((s) => { const k = titleKey(s.title); if (have.has(k)) return false; have.add(k); return true; });
      await db.songs.bulkAdd(fresh);
      added = fresh.length;
      skipped = backup.songs.length - fresh.length;
    }
    const ids = new Map((await db.songs.toArray()).map((s) => [titleKey(s.title), s.id as number]));
    const haveReps = new Set((await db.repertorios.toArray()).map((r) => titleKey(r.name)));
    let reps = 0;
    for (const r of backup.repertorios) {
      if (haveReps.has(titleKey(r.name))) continue;
      const now = Date.now();
      await db.repertorios.add({
        name: r.name, createdAt: now, updatedAt: now,
        items: r.items.flatMap((i) => { const id = ids.get(titleKey(i.title)); return id === undefined ? [] : [{ songId: id, shift: i.shift }]; }),
      });
      reps++;
    }
    return { added, skipped, reps };
  });
}
