/**
 * Oxlint JS Plugin Shim — @interlace/eslint-plugin-pg
 *
 * This shim loads the built Interlace plugin from the dist directory,
 * patching module resolution so workspace dependencies resolve correctly.
 * Required because oxlint's JS plugin API uses Node.js require() which
 * can't resolve Nx workspace symlinks to TS source files.
 *
 * Usage in .oxlintrc.json:
 *   "jsPlugins": ["./tools/oxlint-plugins/interlace-pg.cjs"]
 *
 * Prerequisites:
 *   npx nx build eslint-plugin-pg
 */

const path = require('path');
const Module = require('module');

const distPath = path.join(__dirname, '../../dist/packages');

// Patch module resolution for @interlace workspace dependencies
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === '@interlace/eslint-devkit') {
    return path.join(distPath, 'eslint-devkit/src/index.js');
  }
  if (request === '@interlace/eslint-devkit/resolver') {
    return path.join(distPath, 'eslint-devkit/src/resolver.js');
  }
  return originalResolve.apply(this, arguments);
};

const plugin = require(path.join(distPath, 'eslint-plugin-pg/src/index.js'));

module.exports = plugin;
