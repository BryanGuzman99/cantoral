import './style.css';
import { applyTheme } from './state.ts';
import { runLeave } from './ui/nav.ts';
import { libraryScreen } from './ui/library.ts';
import { viewScreen } from './ui/view.ts';
import { editorScreen } from './ui/editor.ts';
import { adminScreen, aboutScreen, homeScreen, settingsScreen, soonScreen } from './ui/screens.ts';

type Route = [RegExp, (m: RegExpMatchArray) => HTMLElement | Promise<HTMLElement>];
const routes: Route[] = [
  [/^\/?$/, () => homeScreen()],
  [/^\/songs(?:\/(edit))?$/, (m) => libraryScreen(m[1] === 'edit')],
  [/^\/song\/(\d+)$/, (m) => viewScreen(Number(m[1]))],
  [/^\/edit\/(new|\d+)$/, (m) => editorScreen(m[1] === 'new' ? undefined : Number(m[1]))],
  [/^\/admin$/, () => adminScreen()],
  [/^\/settings$/, () => settingsScreen()],
  [/^\/about$/, () => aboutScreen()],
  [/^\/soon\/(.+)$/, (m) => soonScreen(decodeURIComponent(m[1] ?? ''))],
];

const app = document.querySelector<HTMLDivElement>('#app')!;

async function render(): Promise<void> {
  runLeave();
  const path = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
  for (const [re, make] of routes) {
    const m = path.match(re);
    if (m) { app.replaceChildren(await make(m)); window.scrollTo(0, 0); return; }
  }
  location.hash = '#/';
}

applyTheme();
window.addEventListener('hashchange', () => void render());
void render();
// Pide al navegador que no borre las canciones cuando falte espacio (no todos lo conceden).
void navigator.storage?.persist?.();
