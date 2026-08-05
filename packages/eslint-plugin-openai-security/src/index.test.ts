/**
 * @fileoverview Plugin surface lock for eslint-plugin-openai-security.
 */

import { describe, it, expect } from 'vitest';

import plugin, { rules, configs, plugin as namedPlugin, noBrowserApiKeyExposure, noHardcodedApiKey } from './index';

describe('eslint-plugin-openai-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual(['no-browser-api-key-exposure', 'no-hardcoded-api-key']);
    expect(rules['no-browser-api-key-exposure']).toBe(noBrowserApiKeyExposure);
    // Reference equality, not just presence: a rule id can be wired to the
    // wrong module and every id-based assertion still passes.
    expect(rules['no-hardcoded-api-key']).toBe(noHardcodedApiKey);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-openai-security');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('ships minimal, recommended and strict configs', () => {
    expect(Object.keys(configs).sort()).toEqual(['minimal', 'recommended', 'strict']);
    for (const config of Object.values(configs)) {
      expect(config.plugins).toHaveProperty('openai-security');
      expect(config.rules?.['openai-security/no-browser-api-key-exposure']).toBe('error');
      // Same severity as the identical rule in eslint-plugin-anthropic-security,
      // which has shipped it in `recommended` since 0.1.0.
      expect(config.rules?.['openai-security/no-hardcoded-api-key']).toBe('error');
    }
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });
});
