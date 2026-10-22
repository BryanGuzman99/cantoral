import type { SongInput } from './db.ts';

export const EXAMPLE: SongInput = {
  title: 'Alegre la mañana',
  author: '',
  baseKey: 4,
  savedShift: 0,
  categories: ['Misa'],
  parts: ['Entrada'],
  tiempos: ['Ordinario'],
  videoUrl: '',
  source: `#intro
Melodía:
~E G# G# G# G# G# G# F# F# E
~C# D_
~D F# F#_ / G A G E_ (2)
Armonía:
[E] [A] [E] [B7] [E] / [E] [A] [E] [B7] [E]
#fin

#coro
[E]Alegre la mañana
que nos [A]habla de [E]ti,
[B7]alegre la ma[E]ñana.

[A]En nombre del Dios Padre,
[E]del Hijo y del Espíritu,
[B7]salimos de la noche
[E]y estrenamos la aurora;
[E7]saludamos con [A]gozo
[E]de la luz que nos llega
[B7]resucitada y [E]resucitadora.

#coro
[E]Alegre la mañana
que nos [A]habla de [E]ti,
[B7]alegre la ma[E]ñana.`,
};
