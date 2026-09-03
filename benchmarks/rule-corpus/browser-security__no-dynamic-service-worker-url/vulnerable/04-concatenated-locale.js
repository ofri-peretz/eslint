/**
 * VULNERABLE - The same defect spelled with `+` instead of a template.
 */
export function registerLocalised(locale) {
  navigator.serviceWorker.register('/' + locale + '/service-worker.js');
}
