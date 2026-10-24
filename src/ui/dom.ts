export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: Record<string, unknown> = {}, ...kids: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'value') (el as unknown as HTMLInputElement).value = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of kids) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function hero(title: string, sub: string | null, backHref: string | null): HTMLElement {
  return h('div', { class: 'hero' },
    backHref ? h('a', { class: 'ib', href: backHref, 'aria-label': 'Volver' }, '←') : null,
    sub ? h('small', {}, sub) : null,
    h('h1', {}, title));
}

export function topBar(title: string, backHref: string | null, ...right: Child[]): HTMLElement {
  return h('div', { class: 'bar' },
    backHref ? h('a', { class: 'ib', href: backHref, 'aria-label': 'Volver',
      onclick: (e: Event) => { if (history.length > 1) { e.preventDefault(); history.back(); } } }, '←') : null,
    h('h2', {}, title), ...right);
}

let toastEl: HTMLElement | null = null;
let toastTimer = 0;
export function toast(msg: string): void {
  if (!toastEl) { toastEl = h('div', { class: 'toast', role: 'status' }); document.body.append(toastEl); }
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('on'), 2600);
}

export interface SheetAction { label: string; primary?: boolean; run?: () => void | Promise<void> }

/** Panel que sube desde abajo. Cada botón lo cierra y luego ejecuta su acción. */
export function sheet(title: string, body: Node, actions: SheetAction[] = [], onDismiss?: () => void): () => void {
  const close = (): void => back.remove();
  const back = h('div', { class: 'backdrop', onclick: (e: Event) => { if (e.target === back) { close(); onDismiss?.(); } } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('h3', {}, title), body,
      h('div', { class: 'actions' }, ...actions.map((a) =>
        h('button', { type: 'button', class: 'pill' + (a.primary ? ' primary' : ''), onclick: async () => { close(); await a.run?.(); } }, a.label)))));
  document.body.append(back);
  return close;
}

export const confirmBox = (title: string, msg: string, okLabel: string): Promise<boolean> =>
  new Promise<boolean>((res) => {
    sheet(title, h('p', { class: 'mut' }, msg),
      [{ label: 'Cancelar', run: () => res(false) }, { label: okLabel, primary: true, run: () => res(true) }],
      () => res(false));
  });

/** Chips de selección múltiple; modifica el arreglo `selected` directamente. */
export function chipGroup(options: string[], selected: string[], onChange: () => void): HTMLElement {
  const box = h('div', { class: 'chips wrap' });
  const draw = (): void => box.replaceChildren(...options.map((o) =>
    h('button', {
      type: 'button', class: 'chip' + (selected.includes(o) ? ' on' : ''),
      onclick: () => { const i = selected.indexOf(o); if (i >= 0) selected.splice(i, 1); else selected.push(o); draw(); onChange(); },
    }, o)));
  draw();
  return box;
}

/** Opciones excluyentes (una sola activa). */
export function segGroup<T extends string>(options: [T, string][], current: T, onPick: (v: T) => void): HTMLElement {
  const box = h('div', { class: 'chips wrap' });
  let cur = current;
  const draw = (): void => box.replaceChildren(...options.map(([v, label]) =>
    h('button', { type: 'button', class: 'chip' + (cur === v ? ' on' : ''), onclick: () => { cur = v; draw(); onPick(v); } }, label)));
  draw();
  return box;
}
