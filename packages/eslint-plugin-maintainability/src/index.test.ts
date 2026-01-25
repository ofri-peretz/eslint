import { describe, it, expect } from 'vitest';
import plugin from './index';
import { configs } from './index';

describe('eslint-plugin-maintainability plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@interlace/eslint-plugin-maintainability');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all maintainability rules (both flat and categorized)', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});

    // Flat names
    expect(ruleKeys).toContain('cognitive-complexity');
    expect(ruleKeys).toContain('nested-complexity-hotspots');
    expect(ruleKeys).toContain('identical-functions');
    expect(ruleKeys).toContain('max-parameters');
    expect(ruleKeys).toContain('no-lonely-if');
    expect(ruleKeys).toContain('no-nested-ternary');
    expect(ruleKeys).toContain('consistent-function-scoping');
    expect(ruleKeys).toContain('no-unreadable-iife');

    // Categorized names
    expect(ruleKeys).toContain('maintainability/cognitive-complexity');
    expect(ruleKeys).toContain('maintainability/nested-complexity-hotspots');
    expect(ruleKeys).toContain('maintainability/identical-functions');
    expect(ruleKeys).toContain('maintainability/max-parameters');
    expect(ruleKeys).toContain('maintainability/no-lonely-if');
    expect(ruleKeys).toContain('maintainability/no-nested-ternary');
    expect(ruleKeys).toContain('maintainability/consistent-function-scoping');
    expect(ruleKeys).toContain('maintainability/no-unreadable-iife');

    expect(ruleKeys.length).toBe(16); // 8 flat + 8 categorized
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['@interlace/maintainability']).toBeDefined();

      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^@interlace\/maintainability\//);
      });

      expect(
        recommendedRules['@interlace/maintainability/maintainability/cognitive-complexity'],
      ).toBe('warn');
    });
  });
});
