import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-mysql-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-mysql-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all sequelize-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'no-hardcoded-credentials',
      'no-unsafe-query',
      'require-tls',
    ]);
    expect(ruleKeys.length).toBe(3);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['mysql-security']).toBeDefined();

      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^mysql-security\//);
      });

      expect(recommendedRules['mysql-security/no-unsafe-query']).toBe('error');
    });

    it('should provide flagship configuration', () => {
      expect(configs.flagship).toBeDefined();
      expect(configs.flagship.rules?.['mysql-security/no-unsafe-query']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['mysql-security']).toBeDefined();

      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^mysql-security\//);
      });

      expect(strictRules['mysql-security/no-unsafe-query']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
