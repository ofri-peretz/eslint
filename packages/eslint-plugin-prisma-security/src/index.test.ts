import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-prisma-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-prisma-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all prisma-security rules', () => {
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
      expect(configs.recommended.plugins?.['prisma-security']).toBeDefined();

      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^prisma-security\//);
      });

      expect(recommendedRules['prisma-security/no-unsafe-query']).toBe('error');
    });

    it('should provide flagship configuration', () => {
      expect(configs.flagship).toBeDefined();
      expect(configs.flagship.rules?.['prisma-security/no-unsafe-query']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['prisma-security']).toBeDefined();

      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^prisma-security\//);
      });

      // Every rule by name, not just a matching count — see the drizzle suite.
      for (const ruleName of Object.keys(rules)) {
        expect(strictRules[`prisma-security/${ruleName}`]).toBe('error');
      }
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
