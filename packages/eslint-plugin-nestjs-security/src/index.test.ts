import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-nestjs-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-nestjs-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all nestjs-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'require-guards',
      'no-missing-validation-pipe',
      'require-throttler',
      'require-class-validator',
      'no-exposed-private-fields',
      'no-exposed-debug-endpoints',
    ]);
    expect(ruleKeys.length).toBe(6);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['nestjs-security']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^nestjs-security\//);
      });
      
      expect(recommendedRules['nestjs-security/require-guards']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['nestjs-security']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^nestjs-security\//);
      });
      
      expect(strictRules['nestjs-security/require-guards']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should provide specialty configurations', () => {
      expect(configs.guards).toBeDefined();
      expect(configs.validation).toBeDefined();
    });
  });
});
