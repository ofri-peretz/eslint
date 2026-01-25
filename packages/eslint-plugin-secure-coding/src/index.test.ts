import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-secure-coding plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-secure-coding');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all secure-coding rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    expect(ruleKeys).toEqual([
      'no-graphql-injection',
      'no-xxe-injection',
      'no-xpath-injection',
      'no-ldap-injection',
      'no-directive-injection',
      'no-format-string-injection',
      'detect-non-literal-regexp',
      'no-redos-vulnerable-regex',
      'no-unsafe-regex-construction',
      'detect-object-injection',
      'no-unsafe-deserialization',
      'no-insecure-comparison',
      'no-improper-sanitization',
      'no-improper-type-validation',
      'no-missing-authentication',
      'no-privilege-escalation',
      'no-weak-password-recovery',
      'require-backend-authorization',
      'no-hardcoded-credentials',
      'no-sensitive-data-exposure',
      'no-pii-in-logs', // Migrated from node-security
      'no-unlimited-resource-allocation',
      'no-unchecked-loop-condition',
    ]);
    expect(ruleKeys.length).toBe(23);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['secure-coding']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^secure-coding\//);
      });
      
      expect(recommendedRules['secure-coding/no-unsafe-deserialization']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['secure-coding']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^secure-coding\//);
      });
      
      expect(strictRules['secure-coding/no-graphql-injection']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should provide owasp-top-10 configuration', () => {
      expect(configs['owasp-top-10']).toBeDefined();
      expect(configs['owasp-top-10'].plugins?.['secure-coding']).toBeDefined();
      
      const owaspRules = configs['owasp-top-10'].rules || {};
      expect(owaspRules['secure-coding/no-missing-authentication']).toBe('error');
    });
  });
});
