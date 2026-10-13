/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The plugin's own vitest config, re-rooted on Stryker's sandbox.
 *
 * Stryker runs each worker with cwd = `<plugin>/.stryker-tmp/sandbox-*`, a
 * mutated copy of the plugin. The plugin's config pins `root: __dirname` (the
 * REAL package, which would test unmutated code and kill nothing) and resolves
 * `../eslint-devkit/src` and `../../vitest.global-setup.ts` relative to
 * itself. This wrapper keeps everything else — include/exclude, pool,
 * timeouts, the devkit alias (already absolute) — and changes only:
 *
 *   root          → the sandbox, so the mutated sources are what runs
 *   globalSetup   → dropped; it only pre-creates coverage/.tmp, and Stryker
 *                   runs with coverage disabled
 *   reporters     → no junit file written into the sandbox per mutant
 *
 * MUTATION_PLUGIN_DIR is set by scripts/mutation.mts.
 */

import path from 'node:path';
import { loadConfigFromFile } from 'vite';
import type { UserConfig } from 'vitest/config';

const pluginDir = process.env.MUTATION_PLUGIN_DIR;
if (!pluginDir) {
  throw new Error(
    'MUTATION_PLUGIN_DIR is not set — run Stryker through `npm run mutation -- --plugin <name>`.',
  );
}

// Loaded through vite rather than `import()`: the plugin configs use
// `__dirname`, which only exists because vite bundles a config before running
// it. A bare dynamic import runs it as plain ESM and throws.
const loaded = await loadConfigFromFile(
  { command: 'serve', mode: 'test' },
  path.join(pluginDir, 'vitest.config.mts'),
);
if (!loaded) throw new Error(`no vitest.config.mts in ${pluginDir}`);
const base = loaded.config as UserConfig;

export default {
  ...base,
  root: process.cwd(),
  test: {
    ...base.test,
    globalSetup: [],
    reporters: ['default'],
    outputFile: undefined,
    coverage: { ...base.test?.coverage, enabled: false },
  },
} satisfies UserConfig;
