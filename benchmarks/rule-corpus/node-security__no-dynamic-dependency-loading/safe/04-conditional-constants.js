/**
 * SAFE - a ternary between two literal specifiers. The test decides WHICH
 * constant is loaded; it cannot inject a specifier of its own, so the set of
 * reachable modules is closed and written in this file.
 */
const isProduction = process.env.NODE_ENV === 'production';

const config = require(isProduction ? './config.production.js' : './config.development.js');

export async function loadInstrumentation() {
  return isProduction ? import('./otel/production.js') : import('./otel/noop.js');
}

export default config;
