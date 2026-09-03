// CommonJS resolution shim — redirects `@interlace/eslint-devkit` and friends
// to their built dist artifacts. Loaded via `node --require` so it patches
// CJS resolution before any user code runs.
//
// Why this is needed: workspace symlinks at node_modules/@interlace/eslint-devkit
// point at packages/eslint-devkit/, whose package.json `main` is "./src/index.js"
// (which only exists post-build at dist/src/index.js). The pure-ESM loader-hook
// only intercepts `import` — not `require` — so the built CJS runtime in
// secure-coding's dist/src/*.js still hits the broken path.

const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');

const REPO_ROOT = path.resolve(__dirname, '../..');

const REDIRECTS = {
  '@interlace/eslint-devkit': path.join(REPO_ROOT, 'packages/eslint-devkit/dist/src/index.js'),
  '@interlace/eslint-devkit/resolver': path.join(REPO_ROOT, 'packages/eslint-devkit/dist/src/resolver.js'),
  '@interlace/eslint-formatter': path.join(REPO_ROOT, 'packages/eslint-formatter/dist/src/index.js'),
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, ...rest) {
  if (REDIRECTS[request] && fs.existsSync(REDIRECTS[request])) {
    return REDIRECTS[request];
  }
  return originalResolve.call(this, request, ...rest);
};
