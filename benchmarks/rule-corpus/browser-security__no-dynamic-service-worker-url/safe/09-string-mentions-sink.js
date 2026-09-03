/**
 * SAFE - The sink appears only inside a string literal.
 */
export const DOC_HINT =
  'call navigator.serviceWorker.register(swUrl) only with a build-time constant';

export function logHint() {
  console.info(DOC_HINT);
}
