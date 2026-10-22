// Escucha el micrófono y entrega la frecuencia detectada cada ~80 ms.
import { getCtx } from './ctx.ts';
import { detectPitch } from './pitch.ts';

export class MicTuner {
  private stream: MediaStream | null = null;
  private timer: number | null = null;
  private buf = new Float32Array(4096);
  get running(): boolean { return this.timer !== null; }

  async start(range: { minHz: number; maxHz: number }, onFreq: (f: number | null) => void): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('INSEGURO');
    const ctx = await getCtx();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    ctx.createMediaStreamSource(this.stream).connect(analyser);     // no se conecta a las bocinas
    this.timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(this.buf);
      onFreq(detectPitch(this.buf, ctx.sampleRate, range.minHz, range.maxHz));
    }, 80);
  }

  stop(): void {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
