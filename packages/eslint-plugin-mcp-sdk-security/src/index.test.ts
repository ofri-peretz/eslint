/**
 * @fileoverview Plugin surface lock for eslint-plugin-mcp-sdk-security.
 *
 * Guards the contract consumers actually wire up: the rule map, the plugin
 * object oxlint loads, and the three shipped configs.
 */

import { describe, it, expect } from 'vitest';

import plugin, {
  rules,
  configs,
  plugin as namedPlugin,
  noCommandInjectionInTool,
  noToolDescriptionInjection,
  noUnvalidatedToolArgs,
  requireToolInputSchema,
} from './index';

describe('eslint-plugin-mcp-sdk-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'no-command-injection-in-tool',
      'no-tool-description-injection',
      'no-unvalidated-tool-args',
      'require-tool-input-schema',
    ]);
    // Reference equality, not just presence: a rule id can be wired to the
    // wrong module and every id-based assertion still passes.
    expect(rules['require-tool-input-schema']).toBe(requireToolInputSchema);
    expect(rules['no-unvalidated-tool-args']).toBe(noUnvalidatedToolArgs);
    expect(rules['no-tool-description-injection']).toBe(noToolDescriptionInjection);
    expect(rules['no-command-injection-in-tool']).toBe(noCommandInjectionInTool);
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

  it('turns every rule on in strict, by name', () => {
    // Derived from `rules`, so this fails the moment a rule is added to the
    // plugin and not to the preset. A count comparison would not: it passes if
    // strict drops one rule and picks up any other mcp-sdk-security key.
    const strictRules = configs.strict.rules ?? {};
    for (const ruleName of Object.keys(rules)) {
      expect(strictRules[`mcp-sdk-security/${ruleName}`]).toBe('error');
    }
    expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
  });

  it('keeps the new rule out of minimal and recommended until its FP profile is measured', () => {
    // Plan §1.6: promotion is a deliberate act, not a side effect of adding a
    // rule. This lock is what makes "not yet promoted" a decision on the record
    // rather than an oversight.
    for (const preset of ['minimal', 'recommended'] as const) {
      expect(configs[preset].rules?.['mcp-sdk-security/no-tool-description-injection']).toBeUndefined();
      expect(configs[preset].rules?.['mcp-sdk-security/no-unvalidated-tool-args']).toBeUndefined();
    }
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });
});
