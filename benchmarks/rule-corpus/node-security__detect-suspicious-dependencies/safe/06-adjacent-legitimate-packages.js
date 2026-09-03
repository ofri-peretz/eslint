/**
 * SAFE - real packages that live in the neighbourhood of a popular name:
 * `lodash-es` is lodash's own ESM build, `axios-retry` is its official retry
 * interceptor, `webpack-cli` ships with webpack, `recast` is the AST library
 * jscodeshift is built on, and `redux` is unrelated to react but spelled near
 * it. Every one is an ordinary dependency.
 */
import { debounce } from 'lodash-es';
import axiosRetry from 'axios-retry';
import { createStore } from 'redux';
import recast from 'recast';

export function makeStore(reducer, http) {
  axiosRetry(http, { retries: 3 });
  const store = createStore(reducer);
  const flush = debounce(() => store.dispatch({ type: 'FLUSH' }), 250);
  return { store, flush, parse: (src) => recast.parse(src) };
}
