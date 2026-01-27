import { describe, it, expect } from 'vitest';
import plugin, { rules, configs } from './index';

describe('eslint-plugin-import-next plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-import-next');
    expect(plugin.meta?.version).toBeDefined();
    expect(typeof plugin.meta?.version).toBe('string');
  });

  it('should export all import-next rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Check core rules
    expect(ruleKeys).toContain('no-unresolved');
    expect(ruleKeys).toContain('no-cycle');
    expect(ruleKeys).toContain('order');
    expect(ruleKeys).toContain('no-duplicates');
    expect(ruleKeys).toContain('no-self-import');
    
    expect(ruleKeys.length).toBe(56);
  });

  it('should export rules matching plugin.rules', () => {
    expect(rules).toBeDefined();
    expect(Object.keys(rules).length).toBe(56);
    expect(Object.keys(rules)).toContain('no-unresolved');
    expect(Object.keys(rules)).toContain('no-cycle');
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
      
      // Verify recommended has rules configured
      expect(Object.keys(recommendedRules).length).toBeGreaterThan(0);
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['import-next']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^import-next\//);
      });
      
      expect(strictRules['import-next/no-unresolved']).toBe('error');
      
      // Strict should have more or equal rules than recommended
      const recommendedRules = configs.recommended.rules || {};
      expect(Object.keys(strictRules).length).toBeGreaterThanOrEqual(Object.keys(recommendedRules).length);
    });

    it('should provide specialty configurations', () => {
      expect(configs.typescript).toBeDefined();
      expect(configs.typescript.plugins?.['import-next']).toBeDefined();
      
      expect(configs.esm).toBeDefined();
      expect(configs.esm.plugins?.['import-next']).toBeDefined();
      
      expect(configs.performance).toBeDefined();
      expect(configs.performance.plugins?.['import-next']).toBeDefined();
      
      expect(configs.enterprise).toBeDefined();
      expect(configs.enterprise.plugins?.['import-next']).toBeDefined();
    });

    it('should have all strict rules reference existing rules', () => {
      const strictRules = Object.keys(configs.strict.rules || {});
      const pluginRules = Object.keys(plugin.rules || {});
      
      strictRules.forEach(ruleName => {
        const shortName = ruleName.replace('import-next/', '');
        expect(pluginRules).toContain(shortName);
      });
    });
  });
});
