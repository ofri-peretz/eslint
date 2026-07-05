/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { plugin as mainPlugin } from './index';

/**
 * Smoke test for the `./oxlint` sub-export.
 *
 * Runtime shape: `oxlint.ts` uses `export = plugin`, which compiles to
 * `module.exports = plugin`. From an ESM dynamic `import('./oxlint')` view,
 * Node's CJS interop surfaces that value at `.default`. From oxlint's
 * `require('eslint-plugin-jwt/oxlint')` view, it sits at the top of
 * `module.exports` — exactly the `{ meta, rules }` shape oxlint's JS plugin
 * loader expects.
 */

type Plugin = typeof mainPlugin;

describe('eslint-plugin-jwt/oxlint sub-export', () => {
  it('declares the ./oxlint sub-export in package.json', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
    );
    expect(pkgJson.exports['./oxlint']).toEqual({
      types: './src/oxlint.d.ts',
      default: './src/oxlint.js',
    });
  });

  it('re-exports the plugin object (meta + rules at top level)', async () => {
    const oxlintModule = await import('./oxlint.js');
    const oxlintPlugin = (oxlintModule as unknown as { default: Plugin }).default;
    expect(oxlintPlugin).toBeDefined();
    expect(oxlintPlugin.meta?.name).toBe('eslint-plugin-jwt');
    expect(oxlintPlugin.rules).toBeDefined();
  });

  it('exposes the same rule names as the main entry (no rules dropped)', async () => {
    const oxlintModule = await import('./oxlint.js');
    const oxlintPlugin = (oxlintModule as unknown as { default: Plugin }).default;
    expect(Object.keys(oxlintPlugin.rules || {}).toSorted()).toEqual(
      Object.keys(mainPlugin.rules || {}).toSorted(),
    );
  });

  it('exposes the same rule references (pass-through, not a copy)', async () => {
    const oxlintModule = await import('./oxlint.js');
    const oxlintPlugin = (oxlintModule as unknown as { default: Plugin }).default;
    for (const ruleName of Object.keys(mainPlugin.rules || {})) {
      expect(oxlintPlugin.rules?.[ruleName]).toBe(
        (mainPlugin.rules as Record<string, unknown>)[ruleName],
      );
    }
  });
});
