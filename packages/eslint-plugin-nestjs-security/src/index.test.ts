import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-nestjs-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-nestjs-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  /**
   * `plugin.meta.version` is a second copy of the version, and copies drift:
   * 1.3.0 shipped to npm declaring itself 1.2.4, and nothing caught it because
   * nothing compared them.
   *
   * The release tooling does rewrite this string alongside package.json, so
   * this is not routine friction — it is the check that fires when that sync
   * misses a package, which is exactly how the 1.2.4 drift happened.
   */
  it('reports the same version as package.json', async () => {
    const pkg = await import('../package.json', { with: { type: 'json' } });
    expect(plugin.meta?.version).toBe(pkg.default.version);
  });

  it('should export all nestjs-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'require-guards',
      'no-missing-validation-pipe',
      'require-throttler',
      'require-validation-pipe-whitelist',
      'no-permissive-cors',
      'no-exposed-private-fields',
      'no-res-bypass-serialization',
      'no-unguarded-swagger',
      'no-hybrid-app-config-loss',
      'no-unsafe-multer-filename',
    ]);
    expect(ruleKeys.length).toBe(10);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['nestjs-security']).toBeDefined();

      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^nestjs-security\//);
      });

      expect(recommendedRules['nestjs-security/require-guards']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['nestjs-security']).toBeDefined();

      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^nestjs-security\//);
      });

      expect(strictRules['nestjs-security/require-guards']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should provide specialty configurations', () => {
      expect(configs.guards).toBeDefined();
      expect(configs.validation).toBeDefined();
    });
  });
});
