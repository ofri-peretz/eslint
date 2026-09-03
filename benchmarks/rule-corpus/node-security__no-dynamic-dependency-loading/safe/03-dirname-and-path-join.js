/**
 * SAFE - the module's own location on disk. `__dirname` and `import.meta` are
 * fixed when the module is resolved; `path.join` over static segments is a
 * pure function of static input. Nothing here is a value a caller supplies.
 */
const path = require('node:path');

const helpers = require(__dirname + '/helpers/index.js');
const shared = require(path.join(__dirname, '..', 'shared', 'constants.js'));
const manifest = require(require.resolve('eslint/package.json'));

module.exports = {
  version: manifest.version,
  helpers,
  shared,
};
