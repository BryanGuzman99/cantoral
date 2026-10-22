let leaveFn: (() => void) | null = null;
/** Cada pantalla puede registrar qué limpiar al salir (autoscroll, pantalla encendida...). */
export const onLeave = (fn: () => void): void => { leaveFn = fn; };
export const runLeave = (): void => { const f = leaveFn; leaveFn = null; f?.(); };
export const refresh = (): void => { window.dispatchEvent(new HashChangeEvent('hashchange')); };
