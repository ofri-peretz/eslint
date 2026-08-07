import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-node-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-node-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all security rules', () => {
    expect(plugin.rules).toBeDefined();
    expect(Object.keys(plugin.rules || {})).toEqual([
      'detect-child-process',
      'detect-eval-with-expression',
      'detect-non-literal-fs-filename',
      'no-unsafe-dynamic-require',
      'no-buffer-overread',
      'no-deprecated-buffer',
      'no-unsafe-buffer-alloc',
      'no-toctou-vulnerability',
      'no-zip-slip',
      'no-arbitrary-file-access',
      'no-data-in-temp-storage',
      // no-pii-in-logs removed 2026-05-31: duplicate of secure-coding/no-pii-in-logs
      'no-ssrf',
      'no-shell-injection',
      'no-dynamic-command-string',
      'no-dynamic-algorithm-selection',
      'detect-suspicious-dependencies',
      'lock-file',
      'no-dynamic-dependency-loading',
      'require-dependency-integrity',
      'require-secure-credential-storage',
      'require-secure-deletion',
      'require-storage-encryption',
      'no-dynamic-require',
      // Migrated crypto rules
      'no-cryptojs',
      'no-cryptojs-weak-random',
      'no-deprecated-cipher-method',
      'no-ecb-mode',
      'no-insecure-key-derivation',
      'no-insecure-rsa-padding',
      'no-math-random-crypto',
      'no-self-signed-certs',
      'no-sha1-hash',
      'no-static-iv',
      'no-timing-unsafe-compare',
      'no-weak-cipher-algorithm',
      'no-weak-hash-algorithm',
      'prefer-native-crypto',
    ]);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs['recommended']).toBeDefined();
      expect(configs['recommended'].plugins?.['node-security']).toBeDefined();

      const recommendedRules = configs['recommended'].rules || {};
      Object.keys(recommendedRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^node-security\//);
      });

      expect(recommendedRules['node-security/detect-child-process']).toBe(
        'error',
      );
    });

    // Regression lock. `secure-coding/no-insecure-comparison` was removed from
    // every secure-coding preset in favour of this rule, but this rule was not
    // in any `recommended` preset — so CWE-697 timing-unsafe comparison briefly
    // had no preset coverage anywhere in the ecosystem while the migration note
    // told users it lived here. If this rule leaves `recommended` again, the
    // migration note in
    // `packages/eslint-plugin-secure-coding/src/index.ts` becomes false.
    it('keeps no-timing-unsafe-compare in recommended (CWE-697 preset coverage)', () => {
      const recommendedRules = configs['recommended'].rules || {};
      expect(
        recommendedRules['node-security/no-timing-unsafe-compare'],
        'no-timing-unsafe-compare must stay in recommended: it is the documented ' +
          'replacement for secure-coding/no-insecure-comparison, which was removed ' +
          'from every secure-coding preset.',
      ).toBeDefined();
    });

    // Demoted 2026-08-05 alongside the binding-resolution fix, which widened
    // detection from the single `fs.x` spelling to every way the module can be
    // bound. Measured 854 findings on this repo (555 outside test files); the
    // rule has no trust-boundary notion, so a build script reading its own repo
    // reports like a handler reading user input. Re-promoting to 'error' is a
    // deliberate act gated on W6's corpus FP measurement, not something a later
    // refactor should do by accident.
    it('keeps detect-non-literal-fs-filename at warn in recommended', () => {
      const recommendedRules = configs['recommended'].rules || {};
      expect(
        recommendedRules['node-security/detect-non-literal-fs-filename'],
        'the widened binding resolution multiplies findings; promote to error ' +
          'only after the corpus run measures its FP profile',
      ).toBe('warn');
    });

    it('should provide strict configuration', () => {
      expect(configs['strict']).toBeDefined();
      expect(configs['strict'].plugins?.['node-security']).toBeDefined();

      const strictRules = configs['strict'].rules || {};
      Object.keys(strictRules).forEach((ruleName) => {
        expect(ruleName).toMatch(/^node-security\//);
      });

      expect(strictRules['node-security/detect-child-process']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
