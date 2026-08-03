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
   * `plugin.meta.version` is a hand-maintained string; changesets only rewrites
   * package.json. It had already drifted — 1.3.0 shipped to npm declaring
   * itself 1.2.4 — and nothing caught it, because nothing compared them.
   *
   * When this fails during a release, that is the point: bump the string in
   * src/index.ts to match, in the same commit that bumps the package.
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
      'require-class-validator',
      'no-exposed-private-fields',
      'no-exposed-debug-endpoints',
      'no-res-bypass-serialization',
    ]);
    expect(ruleKeys.length).toBe(9);
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
