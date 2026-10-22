// Listas iniciales. En una fase posterior serán editables por el usuario.
export const CATEGORIES = ['Misa', 'Rosario de difuntos', 'Festividad'];
export const MASS_PARTS = ['Entrada', 'Ten piedad', 'Gloria', 'Aleluya', 'Gloria y honor', 'Ofertorio', 'Santo', 'Cordero', 'Comunión', 'Salida'];
export const TIEMPOS = ['Ordinario', 'Adviento', 'Navidad', 'Cuaresma', 'Pascua', 'Pentecostés'];

export interface Song {
  id?: number;
  title: string;
  author: string;
  baseKey: number;      // tonalidad original, 0..11 (0 = Do)
  savedShift: number;   // semitonos guardados sobre el tono original
  categories: string[];
  parts: string[];      // partes de la misa (solo si tiene la categoría "Misa")
  tiempos: string[];    // tiempos litúrgicos (uno o varios)
  videoUrl: string;
  source: string;       // letra con acordes (acordes en letras americanas)
  favorite?: boolean;
  lastOpenedAt?: number;
  createdAt: number;
  updatedAt: number;
}
export type SongInput = Omit<Song, 'id' | 'createdAt' | 'updatedAt' | 'lastOpenedAt'>;

export interface RepItem { songId: number; shift: number }  // shift = semitonos sobre el tono original
export interface Repertorio {
  id?: number;
  name: string;
  items: RepItem[];
  createdAt: number;
  updatedAt: number;
}
