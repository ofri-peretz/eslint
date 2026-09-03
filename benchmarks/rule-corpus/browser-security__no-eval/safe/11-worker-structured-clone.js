/**
 * SAFE - A worker handed structured data, not source. `postMessage` clones; it
 * does not evaluate.
 */
const worker = new Worker(new URL('./parser.worker.js', import.meta.url), {
  type: 'module',
});

export function parseInBackground(rows) {
  worker.postMessage({ kind: 'parse', rows });
}
