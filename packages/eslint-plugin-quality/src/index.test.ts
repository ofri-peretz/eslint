import { describe, it, expect } from 'vitest';
import plugin from './index';
import { configs } from './index';

describe('eslint-plugin-quality plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@eslint/eslint-plugin-quality');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all quality rules (both flat and categorized)', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Flat names
    expect(ruleKeys).toContain('no-commented-code');
    expect(ruleKeys).toContain('cognitive-complexity');
    expect(ruleKeys).toContain('identical-functions');
    
    // Categorized names
    expect(ruleKeys).toContain('quality/no-commented-code');
    expect(ruleKeys).toContain('complexity/cognitive-complexity');
    expect(ruleKeys).toContain('duplication/identical-functions');
    expect(ruleKeys).toContain('development/no-console-log');

    expect(ruleKeys.length).toBe(42);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['@eslint/quality']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^@eslint\/quality\//);
      });
      
      expect(recommendedRules['@eslint/quality/quality/no-commented-code']).toBe('warn');
    });
  });
});
