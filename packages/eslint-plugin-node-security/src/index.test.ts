import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-node-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-node-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all security rules', () => {
    expect(plugin.rules).toBeDefined();
    expect(Object.keys(plugin.rules || {})).toEqual([
      'detect-child-process',
      'detect-eval-with-expression',
      'detect-non-literal-fs-filename',
      'no-unsafe-dynamic-require',
      'no-buffer-overread',
      'no-toctou-vulnerability',
      'no-zip-slip',
      'no-arbitrary-file-access',
      'no-data-in-temp-storage',
    ]);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['node-security']).toBeDefined();
      
      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^node-security\//);
      });
      
      expect(recommendedRules['node-security/detect-child-process']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs['strict']).toBeDefined();
      expect(configs['strict'].plugins?.['node-security']).toBeDefined();
      
      const strictRules = configs['strict'].rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^node-security\//);
      });
      
      expect(strictRules['node-security/detect-child-process']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
