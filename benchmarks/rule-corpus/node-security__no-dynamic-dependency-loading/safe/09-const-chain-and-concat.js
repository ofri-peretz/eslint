/**
 * SAFE (adversarial) - the specifier is composed by string concatenation and
 * reaches the loader through a CHAIN of `const` bindings, plus the same
 * constant used twice in one expression. Every part is a literal written in
 * this file, so nothing here is steerable; a report would mean the analysis
 * gave up on depth rather than on evidence.
 */
const ADAPTER_DIR = './adapters';
const DRIVER = 'postgres';
const DRIVER_ALIAS = DRIVER;

const adapter = require(ADAPTER_DIR + '/' + DRIVER_ALIAS + '.js');
const pair = require(`${ADAPTER_DIR}/${DRIVER}-${DRIVER}.js`);

export function pool(url) {
  return adapter.createPool({ connectionString: url, pair });
}
