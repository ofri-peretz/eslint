// Loader hook: redirect `@interlace/eslint-devkit` imports to the built
// dist/src/index.js (the workspace symlink points at the package root, whose
// package.json `main` field points at unbuilt src/index.js — this hook
// short-circuits that resolution).
//
// Usage: node --import ./loader-hook.mjs ./latency-bench.mjs
// or:    node --experimental-loader ./loader-hook.mjs ./latency-bench.mjs

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

// Map of bare specifiers → absolute file paths (built artifacts).
const REDIRECTS = {
  '@interlace/eslint-devkit': `${REPO_ROOT}/packages/eslint-devkit/dist/src/index.js`,
  '@interlace/eslint-devkit/resolver': `${REPO_ROOT}/packages/eslint-devkit/dist/src/resolver.js`,
  '@interlace/eslint-formatter': `${REPO_ROOT}/packages/eslint-formatter/dist/src/index.js`,
};

export async function resolve_(specifier, context, nextResolve) {
  if (REDIRECTS[specifier]) {
    const target = REDIRECTS[specifier];
    if (existsSync(target)) {
      return {
        url: pathToFileURL(target).href,
        format: 'commonjs',
        shortCircuit: true,
      };
    }
  }
  return nextResolve(specifier, context);
}

// Both names — Node accepts either for a custom resolver.
export { resolve_ as resolve };
