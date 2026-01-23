import { describe, it, expect } from 'vitest';
import plugin from './index';
import { configs } from './index';

describe('eslint-plugin-react-features plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@eslint/eslint-plugin-react-features');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all react-features rules (both flat and categorized)', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Flat names
    expect(ruleKeys).toContain('jsx-key');
    expect(ruleKeys).toContain('no-unnecessary-rerenders');
    
    // Categorized names
    expect(ruleKeys).toContain('react/jsx-key');
    expect(ruleKeys).toContain('performance/no-unnecessary-rerenders');

    expect(ruleKeys.length).toBe(90);
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
    });
  });
});
