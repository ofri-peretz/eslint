import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-mongodb-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-mongodb-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all mongodb-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'no-unsafe-query',
      'no-operator-injection',
      'no-unsafe-where',
      'no-unsafe-regex-query',
      'no-hardcoded-connection-string',
      'no-hardcoded-credentials',
      'require-tls-connection',
      'require-auth-mechanism',
      'require-schema-validation',
      'no-select-sensitive-fields',
      'no-bypass-middleware',
      'no-unsafe-populate',
      'no-unbounded-find',
      'require-projection',
      'require-lean-queries',
      'no-debug-mode-production',
    ]);
    expect(ruleKeys.length).toBe(16);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['mongodb-security']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^mongodb-security\//);
      });
      
      expect(recommendedRules['mongodb-security/no-unsafe-query']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['mongodb-security']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^mongodb-security\//);
      });
      
      expect(strictRules['mongodb-security/no-unsafe-query']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should provide mongoose configuration', () => {
      expect(configs.mongoose).toBeDefined();
      expect(configs.mongoose.plugins?.['mongodb-security']).toBeDefined();
      
      const mongooseRules = configs.mongoose.rules || {};
      expect(mongooseRules['mongodb-security/require-schema-validation']).toBe('error');
    });
  });
});
