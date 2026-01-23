import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-express-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-express-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all express-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'require-helmet',
      'no-permissive-cors',
      'require-csrf-protection',
      'no-insecure-cookie-options',
      'require-rate-limiting',
      'no-graphql-introspection-production',
      'no-cors-credentials-wildcard',
      'require-express-body-parser-limits',
      'no-express-unsafe-regex-route',
      'no-exposed-debug-endpoints',
    ]);
    expect(ruleKeys.length).toBe(10);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['express-security']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^express-security\//);
      });
      
      expect(recommendedRules['express-security/require-helmet']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['express-security']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^express-security\//);
      });
      
      expect(strictRules['express-security/require-helmet']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should provide api configuration', () => {
      expect(configs.api).toBeDefined();
      expect(configs.api.plugins?.['express-security']).toBeDefined();
      
      const apiRules = configs.api.rules || {};
      expect(apiRules['express-security/require-helmet']).toBe('error');
    });

    it('should provide graphql configuration', () => {
      expect(configs.graphql).toBeDefined();
      expect(configs.graphql.plugins?.['express-security']).toBeDefined();
      
      const graphqlRules = configs.graphql.rules || {};
      expect(graphqlRules['express-security/no-graphql-introspection-production']).toBe('error');
    });
  });
});
