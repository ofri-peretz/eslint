/**
 * VULNERABLE - `raect` is a finger-slip transposition of `react` in an ESM
 * default import. The squat resolves, the app renders, and the postinstall
 * script of the impostor package has already run by the time this file is hit.
 */
import raect from 'raect';
import { createRoot } from 'react-dom/client';

export function mount(container, App) {
  const element = raect.createElement(App, { hydrated: true });
  createRoot(container).render(element);
  return element;
}
