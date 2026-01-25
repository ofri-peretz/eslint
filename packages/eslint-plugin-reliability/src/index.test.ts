import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-reliability plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@interlace/eslint-plugin-reliability');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all reliability rules', () => {
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

    expect(ruleKeys.length).toBe(16);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['@interlace/reliability']).toBeDefined();
    });
  });
});
