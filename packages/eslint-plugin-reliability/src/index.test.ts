import { describe, it, expect } from 'vitest';
import plugin, { rules, configs } from './index';

describe('eslint-plugin-reliability plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-reliability');
    expect(plugin.meta?.version).toBeDefined();
    expect(typeof plugin.meta?.version).toBe('string');
  });

  it('should export all reliability rules (both flat and categorized)', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Flat names
    expect(ruleKeys).toContain('no-unhandled-promise');
    expect(ruleKeys).toContain('no-silent-errors');
    expect(ruleKeys).toContain('no-missing-error-context');
    expect(ruleKeys).toContain('error-message');
    expect(ruleKeys).toContain('no-missing-null-checks');
    expect(ruleKeys).toContain('no-unsafe-type-narrowing');
    expect(ruleKeys).toContain('require-network-timeout');
    expect(ruleKeys).toContain('no-await-in-loop');

    // Categorized names
    expect(ruleKeys).toContain('error-handling/no-unhandled-promise');
    expect(ruleKeys).toContain('error-handling/no-silent-errors');
    expect(ruleKeys).toContain('error-handling/no-missing-error-context');
    expect(ruleKeys).toContain('error-handling/error-message');
    expect(ruleKeys).toContain('reliability/no-missing-null-checks');
    expect(ruleKeys).toContain('reliability/no-unsafe-type-narrowing');
    expect(ruleKeys).toContain('reliability/require-network-timeout');
    expect(ruleKeys).toContain('reliability/no-await-in-loop');

    expect(ruleKeys.length).toBe(16); // 8 flat + 8 categorized
  });

  it('should export rules matching plugin.rules', () => {
    expect(rules).toBeDefined();
    expect(Object.keys(rules).length).toBeGreaterThan(0);
    // rules export should contain flat names only
    expect(Object.keys(rules)).toContain('no-unhandled-promise');
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['@interlace/reliability']).toBeDefined();
      
      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^@interlace\/reliability\//);
      });
      
      // Verify at least one rule is configured
      expect(Object.keys(recommendedRules).length).toBeGreaterThan(0);
    });

    it('should have all recommended rules reference existing rules', () => {
      const recommendedRules = Object.keys(configs['recommended'].rules || {});
      const pluginRules = Object.keys(plugin.rules || {});
      
      recommendedRules.forEach(ruleName => {
        const shortName = ruleName.replace('@interlace/reliability/', '');
        expect(pluginRules).toContain(shortName);
      });
    });
  });
});
