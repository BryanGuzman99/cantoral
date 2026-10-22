import { describe, it, expect } from 'vitest';
import { BULK_EXAMPLE, parseBulk } from './bulk.ts';

describe('importador masivo', () => {
  const r = parseBulk(BULK_EXAMPLE, []);
  it('encuentra las dos canciones del ejemplo, listas', () => {
    expect(r.length).toBe(2);
    expect(r.map((x) => x.input.title)).toEqual(['Noche de paz', 'Los peces en el río']);
    expect(r.map((x) => x.error)).toEqual(['', '']);
  });
  it('lee los datos de la primera', () => {
    const a = r[0]!.input;
    expect(a.author).toBe('Tradicional');
    expect(a.baseKey).toBe(7);
    expect(a.categories).toEqual(['Misa', 'Festividad']);
    expect(a.parts).toEqual(['Entrada']);
    expect(a.tiempos).toEqual(['Navidad']);
    expect(a.source).toContain('[G]Noche de paz, noche de [D7]amor,');
  });
  it('convierte acordes arriba de la letra, detecta el tono y acepta varios tiempos', () => {
    const b = r[1]!.input;
    expect(b.source).toContain('Per[D]o mira cómo [A]beben');
    expect(b.baseKey).toBe(2);
    expect(b.tiempos).toEqual(['Navidad', 'Adviento']);
    expect(b.parts).toEqual([]);
  });
  it('omite repetidas y las que ya existen', () => {
    expect(parseBulk(BULK_EXAMPLE, ['noche de PAZ'])[0]!.error).toBe('Ya existe en el cancionero');
    expect(parseBulk(BULK_EXAMPLE + '\n\n' + BULK_EXAMPLE, []).filter((x) => x.error).length).toBe(2);
  });
  it('avisa de datos que no existen y de lo que falta', () => {
    const x = parseBulk('=== A\ncategoria: Boda\n---\nhola', [])[0]!;
    expect(x.warnings.length > 0).toBe(true);
    expect(x.input.categories).toEqual(['Misa']);
    expect(parseBulk('=== B\ncategoria: Misa\n---\n', [])[0]!.error).toBe('Falta la letra');
  });
  it('ignora enlaces de video inválidos', () => {
    expect(parseBulk('=== C\nvideo: youtube.com/x\n---\n[C]hola', [])[0]!.input.videoUrl).toBe('');
  });
});
