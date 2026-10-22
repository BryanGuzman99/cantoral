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
  source: string;       // letra con acordes (formato de chordpro.ts, acordes en letras americanas)
  createdAt: number;
  updatedAt: number;
}
