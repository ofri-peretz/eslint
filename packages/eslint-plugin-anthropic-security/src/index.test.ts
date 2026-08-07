/**
 * @fileoverview Plugin surface lock for eslint-plugin-anthropic-security.
 */

import { describe, it, expect } from 'vitest';

import plugin, { rules, configs, plugin as namedPlugin, noHardcodedApiKey, noBrowserApiKeyExposure , noUntrustedContentInPrompt } from './index';

describe('eslint-plugin-anthropic-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'no-browser-api-key-exposure',
      'no-hardcoded-api-key',
      'no-untrusted-content-in-prompt',
    ]);
    expect(rules['no-hardcoded-api-key']).toBe(noHardcodedApiKey);
    // Reference equality, not just presence: a rule id can be wired to the
    // wrong module and every id-based assertion still passes.
    expect(rules['no-browser-api-key-exposure']).toBe(noBrowserApiKeyExposure);
    expect(rules['no-untrusted-content-in-prompt']).toBe(noUntrustedContentInPrompt);
  });

  it('keeps no-untrusted-content-in-prompt out of minimal and recommended', () => {
    // Plan §1.6: promotion is a deliberate act. Unlike the credential rules,
    // this one has a real FP shape — a prompt interpolating today's date is not
    // an injection and the rule cannot tell — so it stays in `strict` until the
    // corpus run measures it.
    for (const preset of ['minimal', 'recommended'] as const) {
      expect(configs[preset].rules?.['anthropic-security/no-untrusted-content-in-prompt']).toBeUndefined();
    }
    expect(configs.strict.rules?.['anthropic-security/no-untrusted-content-in-prompt']).toBe('error');
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
      // Same severity as the identical rule in eslint-plugin-openai-security.
      expect(config.rules?.['anthropic-security/no-browser-api-key-exposure']).toBe('error');
    }
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });
});
