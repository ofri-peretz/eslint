import { describe, it, expect } from 'vitest';
import plugin, { configs } from './index';

describe('eslint-plugin-import-next plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-import-next');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all import-next rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Check some core rules
    expect(ruleKeys).toContain('no-unresolved');
    expect(ruleKeys).toContain('no-cycle');
    expect(ruleKeys).toContain('order'); // check alias
    
    expect(ruleKeys.length).toBe(56);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['import-next']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^import-next\//);
      });
      
      expect(recommendedRules['import-next/no-unresolved']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['import-next']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^import-next\//);
      });
      
      expect(strictRules['import-next/no-unresolved']).toBe('error');
    });

    it('should provide specialty configurations', () => {
      expect(configs.typescript).toBeDefined();
      expect(configs.esm).toBeDefined();
      expect(configs.performance).toBeDefined();
      expect(configs.enterprise).toBeDefined();
    });
  });
});
