import { describe, it, expect } from 'vitest';
import plugin, { rules, configs } from './index';

describe('eslint-plugin-conventions plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-conventions');
    expect(plugin.meta?.version).toBeDefined();
    expect(typeof plugin.meta?.version).toBe('string');
  });

  it('should export all conventions rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    expect(ruleKeys).toContain('no-commented-code');
    expect(ruleKeys).toContain('expiring-todo-comments');
    expect(ruleKeys).toContain('prefer-code-point');
    expect(ruleKeys).toContain('prefer-dom-node-text-content');
    expect(ruleKeys).toContain('no-console-spaces');
    expect(ruleKeys).toContain('no-deprecated-api');
    expect(ruleKeys).toContain('prefer-dependency-version-strategy');
    expect(ruleKeys).toContain('filename-case');
    expect(ruleKeys).toContain('consistent-existence-index-check');
    expect(ruleKeys).toContain('no-json-schema-tags');

    expect(ruleKeys.length).toBe(10);
  });

  it('should export rules matching plugin.rules', () => {
    expect(rules).toBeDefined();
    expect(Object.keys(rules).length).toBeGreaterThan(0);
    // rules export should contain flat names only
    expect(Object.keys(rules)).toContain('no-commented-code');
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['conventions']).toBeDefined();
      
      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^conventions\//);
      });
      
      // Verify at least one rule is configured
      expect(Object.keys(recommendedRules).length).toBeGreaterThan(0);
    });

    it('should have all recommended rules reference existing rules', () => {
      const recommendedRules = Object.keys(configs['recommended'].rules || {});
      const pluginRules = Object.keys(plugin.rules || {});
      
      recommendedRules.forEach(ruleName => {
        const shortName = ruleName.replace('conventions/', '');
        expect(pluginRules).toContain(shortName);
      });
    });
  });
});
