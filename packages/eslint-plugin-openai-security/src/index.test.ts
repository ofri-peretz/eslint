/**
 * @fileoverview Plugin surface lock for eslint-plugin-openai-security.
 */

import { describe, it, expect } from 'vitest';

import plugin, { rules, configs, plugin as namedPlugin, noBrowserApiKeyExposure, noHardcodedApiKey , noUntrustedContentInPrompt } from './index';

describe('eslint-plugin-openai-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'no-browser-api-key-exposure',
      'no-hardcoded-api-key',
      'no-untrusted-content-in-prompt',
    ]);
    expect(rules['no-browser-api-key-exposure']).toBe(noBrowserApiKeyExposure);
    // Reference equality, not just presence: a rule id can be wired to the
    // wrong module and every id-based assertion still passes.
    expect(rules['no-hardcoded-api-key']).toBe(noHardcodedApiKey);
    expect(rules['no-untrusted-content-in-prompt']).toBe(noUntrustedContentInPrompt);
  });

  it('keeps no-untrusted-content-in-prompt out of minimal and recommended', () => {
    // Plan §1.6: promotion is a deliberate act. Unlike the credential rules,
    // this one has a real FP shape — a prompt interpolating today's date is not
    // an injection and the rule cannot tell — so it stays in `strict` until the
    // corpus run measures it.
    for (const preset of ['minimal', 'recommended'] as const) {
      expect(configs[preset].rules?.['openai-security/no-untrusted-content-in-prompt']).toBeUndefined();
    }
    expect(configs.strict.rules?.['openai-security/no-untrusted-content-in-prompt']).toBe('error');
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
