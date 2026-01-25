import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-modularity plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-modularity');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all modularity rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    expect(ruleKeys).toEqual([
      'ddd-anemic-domain-model',
      'ddd-value-object-immutability',
      'enforce-naming',
      'enforce-rest-conventions',
      'no-external-api-calls-in-utils',
    ]);
    expect(ruleKeys.length).toBe(5);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['modularity']).toBeDefined();
      
      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^modularity\//);
      });
    });

    it('should provide strict configuration', () => {
      expect(configs['strict']).toBeDefined();
      expect(configs['strict'].plugins?.['modularity']).toBeDefined();
      
      const strictRules = configs['strict'].rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^modularity\//);
      });
      
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
