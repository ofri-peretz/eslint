import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-knex-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-knex-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all knex-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'no-hardcoded-credentials',
      'no-mass-assignment',
      'no-unsafe-query',
      'no-unscoped-mutation',
      'require-tls',
    ]);
    expect(ruleKeys.length).toBe(5);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['knex-security']).toBeDefined();

      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^knex-security\//);
      });

      expect(recommendedRules['knex-security/no-unsafe-query']).toBe('error');
    });

    it('should provide flagship configuration', () => {
      expect(configs.flagship).toBeDefined();
      expect(configs.flagship.rules?.['knex-security/no-unsafe-query']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['knex-security']).toBeDefined();

      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^knex-security\//);
      });

      expect(strictRules['knex-security/no-unsafe-query']).toBe('error');
      expect(strictRules['knex-security/no-unscoped-mutation']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
