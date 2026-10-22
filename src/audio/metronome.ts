// Metrónomo con reloj de audio: los clics se programan por adelantado y no se desfasan.
import { getCtx } from './ctx.ts';
import { clickSamples } from './clicks.ts';

export class Metronome {
  bpm = 80;
  beats = 4;
  volume = 0.9;
  onBeat: (index: number) => void = () => undefined;
  private timer: number | null = null;
  private next = 0;
  private beat = 0;
  private bufs: { accent: AudioBuffer; normal: AudioBuffer } | null = null;
  private out: GainNode | null = null;
  get running(): boolean { return this.timer !== null; }

  setVolume(v: number): void { this.volume = v; if (this.out) this.out.gain.value = v; }

  async start(): Promise<void> {
    if (this.timer !== null) return;
    const ctx = await getCtx();
    if (!this.bufs) {
      const mk = (accent: boolean): AudioBuffer => {
        const d = clickSamples(ctx.sampleRate, accent);
        const b = ctx.createBuffer(1, d.length, ctx.sampleRate);
        b.getChannelData(0).set(d);
        return b;
      };
      this.bufs = { accent: mk(true), normal: mk(false) };
    }
    const comp = ctx.createDynamicsCompressor();
    this.out = ctx.createGain();
    this.out.gain.value = this.volume;
    comp.connect(this.out); this.out.connect(ctx.destination);
    this.beat = 0;
    this.next = ctx.currentTime + 0.08;
    const tick = (): void => {
      while (this.next < ctx.currentTime + 0.15) {
        const src = ctx.createBufferSource();
        src.buffer = this.bufs ? (this.beat === 0 ? this.bufs.accent : this.bufs.normal) : null;
        src.connect(comp);
        src.start(this.next);
        const i = this.beat;
        window.setTimeout(() => { if (this.timer !== null) this.onBeat(i); }, Math.max(0, (this.next - ctx.currentTime) * 1000));
        this.next += 60 / this.bpm;
        this.beat = (this.beat + 1) % this.beats;
      }
    };
    this.timer = window.setInterval(tick, 25);
    tick();
  }

  stop(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.out?.disconnect();
    this.out = null;
  }
}
