import { describe, it, expect } from 'vitest';
import plugin, { rules, configs } from './index';

describe('eslint-plugin-react-features plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-react-features');
    expect(plugin.meta?.version).toBeDefined();
    expect(typeof plugin.meta?.version).toBe('string');
  });

  it('should export all react-features rules (both flat and categorized)', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Flat names - core rules
    expect(ruleKeys).toContain('jsx-key');
    expect(ruleKeys).toContain('no-unnecessary-rerenders');
    expect(ruleKeys).toContain('no-direct-mutation-state');
    expect(ruleKeys).toContain('require-optimization');
    
    // Categorized names
    expect(ruleKeys).toContain('react/jsx-key');
    expect(ruleKeys).toContain('performance/no-unnecessary-rerenders');
    expect(ruleKeys).toContain('react/no-direct-mutation-state');

    expect(ruleKeys.length).toBe(106);
  });

  it('should export rules matching plugin.rules', () => {
    expect(rules).toBeDefined();
    expect(Object.keys(rules).length).toBeGreaterThan(0);
    // rules export should contain flat names only
    expect(Object.keys(rules)).toContain('jsx-key');
    expect(Object.keys(rules)).toContain('no-direct-mutation-state');
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['@eslint/react-features']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^@eslint\/react-features\//);
      });
      
      expect(recommendedRules['@eslint/react-features/react/jsx-key']).toBe('error');
      
      // Verify at least one rule is configured
      expect(Object.keys(recommendedRules).length).toBeGreaterThan(0);
    });

    it('should have all recommended rules reference existing rules', () => {
      const recommendedRules = Object.keys(configs.recommended.rules || {});
      const pluginRules = Object.keys(plugin.rules || {});
      
      recommendedRules.forEach(ruleName => {
        const shortName = ruleName.replace('@eslint/react-features/', '');
        expect(pluginRules).toContain(shortName);
      });
    });
  });
});
