import { describe, it, expect } from 'vitest';
import plugin, { rules, configs } from './index';

describe('eslint-plugin-maintainability plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@interlace/eslint-plugin-maintainability');
    expect(plugin.meta?.version).toBeDefined();
    expect(typeof plugin.meta?.version).toBe('string');
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

    // Error-handling rules wired 2026-05-09 — implementations + docs both
    // existed but the plugin index didn't register them. Dual-exported
    // also by `eslint-plugin-reliability` under the same names; the dual
    // export is intentional (concerns overlap maintainability + reliability).
    expect(ruleKeys).toContain('error-message');
    expect(ruleKeys).toContain('no-missing-error-context');
    expect(ruleKeys).toContain('no-silent-errors');
    expect(ruleKeys).toContain('no-unhandled-promise');
    expect(ruleKeys).toContain('maintainability/error-message');
    expect(ruleKeys).toContain('maintainability/no-missing-error-context');
    expect(ruleKeys).toContain('maintainability/no-silent-errors');
    expect(ruleKeys).toContain('maintainability/no-unhandled-promise');

    expect(ruleKeys.length).toBe(24); // 12 flat + 12 categorized
  });

  it('should export rules matching plugin.rules', () => {
    expect(rules).toBeDefined();
    expect(Object.keys(rules).length).toBeGreaterThan(0);
    // rules export should contain flat names only
    expect(Object.keys(rules)).toContain('cognitive-complexity');
    expect(Object.keys(rules)).toContain('identical-functions');
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
      
      // Verify at least one rule is configured
      expect(Object.keys(recommendedRules).length).toBeGreaterThan(0);
    });

    it('should have all recommended rules reference existing rules', () => {
      const recommendedRules = Object.keys(configs['recommended'].rules || {});
      const pluginRules = Object.keys(plugin.rules || {});
      
      recommendedRules.forEach(ruleName => {
        const shortName = ruleName.replace('@interlace/maintainability/', '');
        expect(pluginRules).toContain(shortName);
      });
    });
  });
});
