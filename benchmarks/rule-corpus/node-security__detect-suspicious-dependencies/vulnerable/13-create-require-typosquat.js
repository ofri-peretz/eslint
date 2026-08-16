/**
 * VULNERABLE (adversarial) - `module.createRequire` is the documented way an
 * ESM file loads a CommonJS dependency. The loader is bound to a local name,
 * so the call never forms a callee literally spelled `require`, but it loads
 * the `raect` impostor all the same.
 */
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);

const raect = requireCjs('raect');
const legacyUtil = requireCjs('lodahs');

export function renderLegacy(App, props) {
  return raect.createElement(App, legacyUtil.defaults(props, { hydrate: true }));
}
