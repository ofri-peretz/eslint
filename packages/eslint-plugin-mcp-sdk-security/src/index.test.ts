/**
 * @fileoverview Plugin surface lock for eslint-plugin-mcp-sdk-security.
 *
 * Guards the contract consumers actually wire up: the rule map, the plugin
 * object oxlint loads, and the three shipped configs.
 */

import { describe, it, expect } from 'vitest';

import plugin, { rules, configs, plugin as namedPlugin, requireToolInputSchema } from './index';

describe('eslint-plugin-mcp-sdk-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual(['require-tool-input-schema']);
    expect(rules['require-tool-input-schema']).toBe(requireToolInputSchema);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-mcp-sdk-security');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('ships minimal, recommended and strict configs', () => {
    expect(Object.keys(configs).sort()).toEqual(['minimal', 'recommended', 'strict']);
  });

  it('enables the rule under the mcp-sdk-security namespace in every config', () => {
    for (const config of Object.values(configs)) {
      expect(config.plugins).toHaveProperty('mcp-sdk-security');
      expect(config.rules?.['mcp-sdk-security/require-tool-input-schema']).toBe('error');
    }
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });
});
