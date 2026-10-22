// Respaldo en archivo .json. Esta parte no depende de la base de datos para poder probarse sola.
import type { Song } from './types.ts';

export interface Backup {
  app: 'cantoral-catolico';
  version: 1;
  exportedAt: string;
  songs: Song[];
}

const isStr = (v: unknown): v is string => typeof v === 'string';
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter(isStr).map((s) => s.trim()).filter(Boolean) : [];

export function validateBackup(raw: unknown): Backup {
  if (typeof raw !== 'object' || raw === null) throw new Error('El archivo no es un respaldo válido.');
  const d = raw as Record<string, unknown>;
  if (d.app !== 'cantoral-catolico') throw new Error('Este archivo no es un respaldo del Cantoral Católico.');
  if (d.version !== 1) throw new Error('Este respaldo es de una versión que la app no reconoce.');
  if (!Array.isArray(d.songs)) throw new Error('El respaldo no contiene canciones.');

  const songs: Song[] = d.songs.map((item, i): Song => {
    const s = (item ?? {}) as Record<string, unknown>;
    const n = i + 1;
    if (!isStr(s.title) || !s.title.trim()) throw new Error(`La canción ${n} no tiene título.`);
    if (!isStr(s.source)) throw new Error(`La canción «${s.title}» no tiene letra.`);
    const baseKey = s.baseKey;
    if (typeof baseKey !== 'number' || !Number.isInteger(baseKey) || baseKey < 0 || baseKey > 11)
      throw new Error(`La canción «${s.title}» tiene una tonalidad inválida.`);
    const shift = typeof s.savedShift === 'number' && Number.isInteger(s.savedShift) ? s.savedShift : 0;
    const now = Date.now();
    return {
      title: s.title.trim(),
      author: isStr(s.author) ? s.author.trim() : '',
      baseKey,
      savedShift: shift,
      categories: strList(s.categories),
      parts: strList(s.parts),
      tiempos: strList(s.tiempos),
      videoUrl: isStr(s.videoUrl) ? s.videoUrl.trim() : '',
      source: s.source,
      createdAt: typeof s.createdAt === 'number' ? s.createdAt : now,
      updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : now,
    };
  });
  return { app: 'cantoral-catolico', version: 1, exportedAt: isStr(d.exportedAt) ? d.exportedAt : '', songs };
}

export const titleKey = (t: string): string => t.trim().toLowerCase();
