import { describe, it, expect } from 'vitest';
import plugin, { configs } from './index';

describe('eslint-plugin-conventions plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@interlace/eslint-plugin-conventions');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all conventions rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Flat names
    expect(ruleKeys).toContain('no-commented-code');
    expect(ruleKeys).toContain('expiring-todo-comments');
    expect(ruleKeys).toContain('prefer-code-point');
    expect(ruleKeys).toContain('prefer-dom-node-text-content');
    expect(ruleKeys).toContain('no-console-spaces');
    expect(ruleKeys).toContain('no-deprecated-api');
    expect(ruleKeys).toContain('prefer-dependency-version-strategy');
    expect(ruleKeys).toContain('filename-case');
    expect(ruleKeys).toContain('consistent-existence-index-check');

    // Categorized names
    expect(ruleKeys).toContain('conventions/no-commented-code');
    expect(ruleKeys).toContain('conventions/expiring-todo-comments');
    expect(ruleKeys).toContain('conventions/prefer-code-point');
    expect(ruleKeys).toContain('conventions/prefer-dom-node-text-content');
    expect(ruleKeys).toContain('conventions/no-console-spaces');
    expect(ruleKeys).toContain('deprecation/no-deprecated-api');
    expect(ruleKeys).toContain('conventions/prefer-dependency-version-strategy');
    expect(ruleKeys).toContain('conventions/filename-case');
    expect(ruleKeys).toContain('conventions/consistent-existence-index-check');

    expect(ruleKeys.length).toBe(18);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['@interlace/conventions']).toBeDefined();
    });
  });
});
