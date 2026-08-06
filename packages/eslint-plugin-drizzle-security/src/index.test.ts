import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-drizzle-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-drizzle-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all drizzle-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'no-mass-assignment',
      'no-raw-identifier-interpolation',
      'no-unsafe-query',
      'no-unscoped-mutation',
    ]);
    expect(ruleKeys.length).toBe(4);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['drizzle-security']).toBeDefined();

      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^drizzle-security\//);
      });

      expect(recommendedRules['drizzle-security/no-unsafe-query']).toBe('error');
    });

    it('should provide flagship configuration', () => {
      expect(configs.flagship).toBeDefined();
      expect(configs.flagship.rules?.['drizzle-security/no-unsafe-query']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['drizzle-security']).toBeDefined();

      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^drizzle-security\//);
      });

      // Every rule by name, not just a matching count. A count alone passes if
      // strict omits one rule and includes some other drizzle-security key —
      // which is exactly how a new rule gets silently left out of the preset it
      // is supposed to join.
      for (const ruleName of Object.keys(rules)) {
        expect(strictRules[`drizzle-security/${ruleName}`]).toBe('error');
      }
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
