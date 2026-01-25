import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-crypto plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-crypto');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all local crypto rules (11 rules after deprecation)', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    // Only 11 rules remain in this deprecated plugin
    expect(ruleKeys).toEqual([
      'no-hardcoded-crypto-key',
      'no-key-reuse',
      'no-math-random-crypto',
      'no-numeric-only-tokens',
      'no-predictable-salt',
      'no-web-crypto-export',
      'require-authenticated-encryption',
      'require-key-length',
      'require-random-iv',
      'require-secure-pbkdf2-digest',
      'require-sufficient-length',
    ]);
    expect(ruleKeys.length).toBe(11);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['crypto']).toBeDefined();
      
      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^crypto\//);
      });
      
      expect(recommendedRules['crypto/no-hardcoded-crypto-key']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs['strict']).toBeDefined();
      expect(configs['strict'].plugins?.['crypto']).toBeDefined();
      
      const strictRules = configs?.['strict']?.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^crypto\//);
      });
      
      expect(strictRules['crypto/no-hardcoded-crypto-key']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
