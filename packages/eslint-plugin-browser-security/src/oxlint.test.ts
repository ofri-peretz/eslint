/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Coverage for the generated oxlint shim (`export = plugin`).
 */
import { describe, it, expect } from 'vitest';
import { plugin } from './index';

describe('oxlint shim', () => {
  it('re-exports the plugin object as a CJS default export', async () => {
    const mod = (await import('./oxlint')) as unknown as {
      default?: typeof plugin;
    };
    const shim = mod.default ?? (mod as unknown as typeof plugin);
    expect(shim).toBe(plugin);
    expect(shim.rules).toBeDefined();
  });
});
