// Compartir repertorios: un código corto dentro de un enlace + un texto legible para WhatsApp.
export interface SharedRep { n: string; it: [string, number][] }  // nombre, [título, semitonos]

const toB64 = (s: string): string => {
  let bin = '';
  new TextEncoder().encode(s).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64 = (s: string): string => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export const encodeRep = (r: SharedRep): string => toB64(JSON.stringify(r));

export function decodeRep(code: string): SharedRep | null {
  try {
    const d = JSON.parse(fromB64(code)) as { n?: unknown; it?: unknown };
    if (typeof d.n !== 'string' || !d.n.trim() || d.n.length > 120 || !Array.isArray(d.it) || d.it.length > 300) return null;
    const it: [string, number][] = [];
    for (const x of d.it as unknown[]) {
      if (!Array.isArray(x) || typeof x[0] !== 'string' || !Number.isInteger(x[1])) return null;
      it.push([x[0], x[1] as number]);
    }
    return { n: d.n.trim(), it };
  } catch { return null; }
}

export const repText = (name: string, lines: string[], link: string): string =>
  `*${name}*\n` + lines.map((l, i) => `${i + 1}. ${l}`).join('\n') + `\n\nAbrir en el Cantoral:\n${link}`;
