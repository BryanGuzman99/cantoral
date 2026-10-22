// Reproduce la nota de referencia. En graves refuerza la zona que los parlantes del teléfono sí reproducen.
import { getCtx } from './ctx.ts';
import { pluck, tone } from './pluck.ts';

export type RefSound = 'cuerda' | 'continuo';
const cache = new Map<string, Float32Array>();

function softClip(): Float32Array<ArrayBuffer> {
  const c = new Float32Array(1024);
  for (let i = 0; i < c.length; i++) { const x = (i / (c.length - 1)) * 2 - 1; c[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
  return c;
}

export async function playString(freq: number, sound: RefSound, volume: number): Promise<void> {
  const ctx = await getCtx();
  const key = `${sound}:${freq.toFixed(3)}:${ctx.sampleRate}`;
  let data = cache.get(key);
  if (!data) { data = sound === 'cuerda' ? pluck(freq, ctx.sampleRate) : tone(freq, ctx.sampleRate); cache.set(key, data); }
  const buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
  buf.getChannelData(0).set(data);
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const boost = ctx.createGain();                                   // más ganancia mientras más grave
  boost.gain.value = Math.min(3.5, Math.max(1, Math.pow(180 / freq, 0.8)));
  src.connect(boost);
  let node: AudioNode = boost;
  if (freq < 150) {
    const eq = ctx.createBiquadFilter();                            // realce en la zona que el parlante sí mueve
    eq.type = 'peaking'; eq.frequency.value = 240; eq.Q.value = 0.7; eq.gain.value = 7;
    node.connect(eq); node = eq;
    const sh = ctx.createWaveShaper();                              // añade armónicos y evita saturar
    sh.curve = softClip(); sh.oversample = '2x';
    node.connect(sh); node = sh;
  }
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 10; comp.ratio.value = 8; comp.attack.value = 0.002; comp.release.value = 0.2;
  node.connect(comp);
  const master = ctx.createGain();
  master.gain.value = volume;
  comp.connect(master); master.connect(ctx.destination);
  src.start();
}
