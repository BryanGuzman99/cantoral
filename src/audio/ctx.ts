// Un solo contexto de audio para toda la app. Debe crearse a partir de un toque del usuario.
let ctx: AudioContext | null = null;
export async function getCtx(): Promise<AudioContext> {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}
