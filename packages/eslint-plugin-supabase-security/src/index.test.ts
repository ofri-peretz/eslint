/**
 * @fileoverview Plugin surface lock for eslint-plugin-supabase-security.
 *
 * Guards the contract consumers actually wire up: the rule map, the plugin
 * object oxlint loads, and the three shipped configs.
 */

import { describe, it, expect } from 'vitest';

import plugin, {
  configs,
  noDynamicRpcName,
  noPublicStorageBucket,
  noServiceRoleKeyInClient,
  plugin as namedPlugin,
  requireAuthErrorCheck,
  rules,
} from './index';

describe('eslint-plugin-supabase-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual([
      'no-dynamic-rpc-name',
      'no-public-storage-bucket',
      'no-service-role-key-in-client',
      'require-auth-error-check',
    ]);
    // Reference equality, not just presence: a rule id can be wired to the
    // wrong module and every id-based assertion still passes.
    expect(rules['no-service-role-key-in-client']).toBe(
      noServiceRoleKeyInClient,
    );
    expect(rules['no-dynamic-rpc-name']).toBe(noDynamicRpcName);
    expect(rules['require-auth-error-check']).toBe(requireAuthErrorCheck);
    expect(rules['no-public-storage-bucket']).toBe(noPublicStorageBucket);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-supabase-security');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('ships minimal, recommended and strict configs', () => {
    expect(Object.keys(configs).sort()).toEqual([
      'minimal',
      'recommended',
      'strict',
    ]);
  });

  it('enables the flagship rule under the supabase-security namespace in every config', () => {
    // The service_role rule is the one every preset must carry — a config that
    // omits it is not a Supabase security config, whatever else it turns on.
    for (const config of Object.values(configs)) {
      expect(config.plugins).toHaveProperty('supabase-security');
      expect(
        config.rules?.['supabase-security/no-service-role-key-in-client'],
      ).toBe('error');
    }
  });

  it('turns every rule on in strict, by name', () => {
    // Derived from `rules`, so this fails the moment a rule is added to the
    // plugin and not to the preset. A count comparison would not: it passes if
    // strict drops one rule and picks up any other supabase-security key.
    const strictRules = configs.strict.rules ?? {};
    for (const ruleName of Object.keys(rules)) {
      expect(strictRules[`supabase-security/${ruleName}`]).toBe('error');
    }
    expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
  });

  it('keeps the new rule out of minimal and recommended until its FP profile is measured', () => {
    // Plan §1.6: promotion is a deliberate act, not a side effect of adding a
    // rule. This lock is what makes "not yet promoted" a decision on the record
    // rather than an oversight.
    for (const preset of ['minimal', 'recommended'] as const) {
      expect(
        configs[preset].rules?.[
          'supabase-security/no-tool-description-injection'
        ],
      ).toBeUndefined();
      expect(
        configs[preset].rules?.['supabase-security/no-unvalidated-tool-args'],
      ).toBeUndefined();
    }
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });
});
