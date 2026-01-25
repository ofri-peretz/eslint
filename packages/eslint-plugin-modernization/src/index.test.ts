import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-modernization plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-modernization');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all modernization rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    expect(ruleKeys).toEqual([
      'no-instanceof-array',
      'prefer-at',
      'prefer-event-target',
    ]);
    expect(ruleKeys.length).toBe(3);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['modernization']).toBeDefined();
      
      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^modernization\//);
      });
    });

    it('should provide strict configuration', () => {
      expect(configs['strict']).toBeDefined();
      expect(configs['strict'].plugins?.['modernization']).toBeDefined();
      
      const strictRules = configs['strict'].rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^modernization\//);
      });
      
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
