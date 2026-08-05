/**
 * @fileoverview Plugin surface lock for eslint-plugin-anthropic-security.
 */

import { describe, it, expect } from 'vitest';

import plugin, { rules, configs, plugin as namedPlugin, noHardcodedApiKey } from './index';

describe('eslint-plugin-anthropic-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual(['no-hardcoded-api-key']);
    expect(rules['no-hardcoded-api-key']).toBe(noHardcodedApiKey);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-anthropic-security');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('ships minimal, recommended and strict configs', () => {
    expect(Object.keys(configs).sort()).toEqual(['minimal', 'recommended', 'strict']);
    for (const config of Object.values(configs)) {
      expect(config.plugins).toHaveProperty('anthropic-security');
      expect(config.rules?.['anthropic-security/no-hardcoded-api-key']).toBe('error');
    }
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });
});
