/**
 * @fileoverview Plugin surface lock for eslint-plugin-grpc-security.
 */

import { describe, it, expect } from 'vitest';

import plugin, {
  configs,
  noUnguardedReflection,
  plugin as namedPlugin,
  rules,
} from './index';

describe('eslint-plugin-grpc-security', () => {
  it('exposes every rule under its documented id', () => {
    expect(Object.keys(rules).sort()).toEqual(['no-unguarded-reflection']);
    expect(rules['no-unguarded-reflection']).toBe(noUnguardedReflection);
  });

  it('names itself for the oxlint loader', () => {
    expect(namedPlugin.meta?.name).toBe('eslint-plugin-grpc-security');
    expect(namedPlugin.rules).toBe(rules);
  });

  it('enables the reflection rule under the grpc-security namespace in every config', () => {
    expect(Object.keys(configs).sort()).toEqual([
      'minimal',
      'recommended',
      'strict',
    ]);
    for (const config of Object.values(configs)) {
      expect(config.plugins).toHaveProperty('grpc-security');
      expect(config.rules?.['grpc-security/no-unguarded-reflection']).toBe(
        'error',
      );
    }
  });

  it('turns every rule on in strict, by name', () => {
    const strictRules = configs.strict.rules ?? {};
    for (const ruleName of Object.keys(rules)) {
      expect(strictRules[`grpc-security/${ruleName}`]).toBe('error');
    }
    expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
  });

  it('default-exports the plugin with its configs attached', () => {
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });
});
