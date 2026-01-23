import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-jwt plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-jwt');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all JWT security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleNames = Object.keys(plugin.rules || {});
    expect(ruleNames).toContain('no-algorithm-none');
    expect(ruleNames).toContain('no-algorithm-confusion');
    expect(ruleNames).toContain('no-timestamp-manipulation');
    expect(ruleNames.length).toBe(13);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.jwt).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^jwt\//);
      });
      
      expect(recommendedRules['jwt/no-algorithm-none']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.jwt).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^jwt\//);
      });
      
      expect(strictRules['jwt/no-algorithm-none']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
