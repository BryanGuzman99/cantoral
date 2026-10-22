// Respaldo en archivo .json. No depende de la base de datos para poder probarse sola.
import type { Song } from './types.ts';

export interface BackupRep { name: string; items: { title: string; shift: number }[] }
export interface Backup {
  app: 'cantoral-catolico';
  version: 2;
  exportedAt: string;
  songs: Song[];
  repertorios: BackupRep[];
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter(isStr).map((s) => s.trim()).filter(Boolean) : [];

export function validateBackup(raw: unknown): Backup {
  if (typeof raw !== 'object' || raw === null) throw new Error('El archivo no es un respaldo válido.');
  const d = raw as Record<string, unknown>;
  if (d.app !== 'cantoral-catolico') throw new Error('Este archivo no es un respaldo del Cantoral Católico.');
  if (d.version !== 1 && d.version !== 2) throw new Error('Este respaldo es de una versión que la app no reconoce.');
  if (!Array.isArray(d.songs)) throw new Error('El respaldo no contiene canciones.');

  const songs: Song[] = d.songs.map((item, i): Song => {
    const s = (item ?? {}) as Record<string, unknown>;
    if (!isStr(s.title) || !s.title.trim()) throw new Error(`La canción ${i + 1} no tiene título.`);
    if (!isStr(s.source)) throw new Error(`La canción «${s.title}» no tiene letra.`);
    if (!isInt(s.baseKey) || s.baseKey < 0 || s.baseKey > 11) throw new Error(`La canción «${s.title}» tiene una tonalidad inválida.`);
    const now = Date.now();
    const song: Song = {
      title: s.title.trim(), author: isStr(s.author) ? s.author.trim() : '', baseKey: s.baseKey,
      savedShift: isInt(s.savedShift) ? s.savedShift : 0,
      categories: strList(s.categories), parts: strList(s.parts), tiempos: strList(s.tiempos),
      videoUrl: isStr(s.videoUrl) ? s.videoUrl.trim() : '', source: s.source,
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : now,
      updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : now,
    };
    if (s.favorite === true) song.favorite = true;
    return song;
  });

  const reps: BackupRep[] = (Array.isArray(d.repertorios) ? d.repertorios : []).map((item, i): BackupRep => {
    const r = (item ?? {}) as Record<string, unknown>;
    if (!isStr(r.name) || !r.name.trim()) throw new Error(`El repertorio ${i + 1} no tiene nombre.`);
    const items = (Array.isArray(r.items) ? r.items : []).flatMap((it): { title: string; shift: number }[] => {
      const x = (it ?? {}) as Record<string, unknown>;
      return isStr(x.title) && x.title.trim() ? [{ title: x.title.trim(), shift: isInt(x.shift) ? x.shift : 0 }] : [];
    });
    return { name: r.name.trim(), items };
  });
  return { app: 'cantoral-catolico', version: 2, exportedAt: isStr(d.exportedAt) ? d.exportedAt : '', songs, repertorios: reps };
}

export const titleKey = (t: string): string => t.trim().toLowerCase();
