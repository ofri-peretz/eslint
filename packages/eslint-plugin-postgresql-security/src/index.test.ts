import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-postgresql-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-postgresql-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all pg rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'no-unsafe-query',
      'no-insecure-ssl',
      'no-hardcoded-credentials',
      'check-query-params',
      'no-missing-client-release',
      'no-transaction-on-pool',
      'no-floating-query',
      'no-select-all',
      'prefer-pool-query',
      'no-batch-insert-loop',
      'no-unsafe-search-path',
      'no-unsafe-copy-from',
      'prevent-double-release',
    ]);
    expect(ruleKeys.length).toBe(13);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['postgresql-security']).toBeDefined();
      // Deprecated alias, kept registered for a deprecation window.
      expect(configs.recommended.plugins?.['pg']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^postgresql-security\//);
      });
      
      expect(recommendedRules['postgresql-security/no-unsafe-query']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['postgresql-security']).toBeDefined();
      expect(configs.strict.plugins?.['pg']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^postgresql-security\//);
      });
      
      expect(strictRules['postgresql-security/no-unsafe-query']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
