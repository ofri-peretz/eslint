/**
 * SAFE - deep sub-path imports of correctly-spelled packages. Everything after
 * the first slash is a path inside an already-resolved package, so it cannot
 * be a separate registry name to squat.
 */
import debounce from 'lodash/debounce.js';
import merge from 'lodash/merge.js';
import Router from 'express/lib/router/index.js';
import { createElement } from 'react/jsx-runtime';

export function buildRouter(handlers) {
  const router = new Router();
  const merged = merge({}, ...handlers);
  const flush = debounce(() => router.handle(merged), 100);
  return { router, flush, node: createElement('div', null) };
}
