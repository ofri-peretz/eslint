import { describe, it, expect } from 'vitest';
import plugin, { configs } from './index';

describe('eslint-plugin-operability plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@interlace/eslint-plugin-operability');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all operability rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Flat names
    expect(ruleKeys).toContain('no-console-log');
    expect(ruleKeys).toContain('no-process-exit');
    expect(ruleKeys).toContain('no-debug-code-in-production');
    expect(ruleKeys).toContain('no-verbose-error-messages');
    expect(ruleKeys).toContain('require-code-minification');
    expect(ruleKeys).toContain('require-data-minimization');

    // Categorized names
    expect(ruleKeys).toContain('operability/no-console-log');
    expect(ruleKeys).toContain('operability/no-process-exit');
    expect(ruleKeys).toContain('operability/no-debug-code-in-production');
    expect(ruleKeys).toContain('operability/no-verbose-error-messages');
    expect(ruleKeys).toContain('operability/require-code-minification');
    expect(ruleKeys).toContain('operability/require-data-minimization');

    expect(ruleKeys.length).toBe(12);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['@interlace/operability']).toBeDefined();
    });
  });
});
