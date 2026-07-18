/**
 * @fileoverview Tests for the oxlint sub-export
 *
 * The compiled output of `export = plugin` is `module.exports = plugin`,
 * so oxlint's loader receives the plugin object directly.
 */

import { describe, it, expect } from 'vitest';
import { plugin } from './index';

describe('oxlint sub-export', () => {
  it('exposes the plugin object directly (meta + all 19 rules)', async () => {
    const mod = (await import('./oxlint')) as unknown as {
      default?: typeof plugin;
    } & typeof plugin;
    // `export =` interop: the plugin surfaces either as the module itself
    // or as its `default` — both must point at the same plugin object.
    const oxlintPlugin = mod.default ?? mod;
    expect(oxlintPlugin).toBe(plugin);
    expect(oxlintPlugin.meta?.name).toBe('eslint-plugin-vercel-ai-security');
    expect(Object.keys(oxlintPlugin.rules ?? {})).toHaveLength(19);
  });
});
