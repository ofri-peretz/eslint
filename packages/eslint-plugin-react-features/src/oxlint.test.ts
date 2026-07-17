/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Tests for the oxlint sub-export shim: `export = plugin` must hand oxlint
 * the plugin object directly ({ meta, rules }) with no wrapper indirection.
 */
import { describe, it, expect } from 'vitest';
import { plugin } from './index';
// `export =` surfaces as the module's default export under ESM interop.
import oxlintExport from './oxlint';

describe('oxlint sub-export', () => {
  it('exposes the plugin object itself', () => {
    // oxlint's JS plugin loader reads `.rules` off the required module.
    expect(oxlintExport.rules).toBe(plugin.rules);
    expect(oxlintExport.meta).toBe(plugin.meta);
    expect(Object.keys(oxlintExport.rules ?? {}).length).toBeGreaterThan(0);
  });
});
