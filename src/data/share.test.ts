import { describe, it, expect } from 'vitest';
import { decodeRep, encodeRep, repText } from './share.ts';

describe('compartir repertorios', () => {
  it('ida y vuelta con acentos, ñ y emojis', () => {
    const r = { n: 'Misa del niño · 24 oct 🎶', it: [['Alegre la mañana', 2], ['Pedir posada', -3]] as [string, number][] };
    expect(decodeRep(encodeRep(r))).toEqual(r);
  });
  it('el código solo usa caracteres seguros para un enlace', () => {
    const c = encodeRep({ n: 'Ñandú ¿?', it: [['Canción ~?>', 1]] });
    expect(/^[A-Za-z0-9_-]+$/.test(c)).toBe(true);
  });
  it('rechaza códigos dañados o con otra forma', () => {
    expect(decodeRep('%%%')).toBeNull();
    expect(decodeRep(encodeRep({ n: '', it: [] }))).toBeNull();
    expect(decodeRep(btoa('{"n":"x","it":[["a","b"]]}'))).toBeNull();
    expect(decodeRep(btoa('hola'))).toBeNull();
  });
  it('arma el texto para WhatsApp', () => {
    const t = repText('Misa', ['Entrada: A (Mi)', 'Salida: B (Re)'], 'https://x/#/import/abc');
    expect(t).toContain('*Misa*');
    expect(t).toContain('1. Entrada: A (Mi)');
    expect(t).toContain('2. Salida: B (Re)');
    expect(t).toContain('https://x/#/import/abc');
  });
});
