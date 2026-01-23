import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-crypto plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-crypto');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all crypto rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'no-weak-hash-algorithm',
      'no-weak-cipher-algorithm',
      'no-deprecated-cipher-method',
      'no-static-iv',
      'no-ecb-mode',
      'no-insecure-key-derivation',
      'no-hardcoded-crypto-key',
      'require-random-iv',
      'no-sha1-hash',
      'require-sufficient-length',
      'no-numeric-only-tokens',
      'no-cryptojs',
      'no-cryptojs-weak-random',
      'prefer-native-crypto',
      'no-math-random-crypto',
      'no-insecure-rsa-padding',
      'require-secure-pbkdf2-digest',
      'no-predictable-salt',
      'require-authenticated-encryption',
      'no-key-reuse',
      'no-self-signed-certs',
      'no-timing-unsafe-compare',
      'require-key-length',
      'no-web-crypto-export',
    ]);
    expect(ruleKeys.length).toBe(24);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.crypto).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^crypto\//);
      });
      
      expect(recommendedRules['crypto/no-weak-hash-algorithm']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.crypto).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^crypto\//);
      });
      
      expect(strictRules['crypto/no-weak-hash-algorithm']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should provide cryptojs-migration configuration', () => {
      expect(configs['cryptojs-migration']).toBeDefined();
      expect(configs['cryptojs-migration'].plugins?.crypto).toBeDefined();
      
      const migrationRules = configs['cryptojs-migration'].rules || {};
      expect(migrationRules['crypto/no-cryptojs']).toBe('error');
    });

    it('should provide nodejs-only configuration', () => {
      expect(configs['nodejs-only']).toBeDefined();
      expect(configs['nodejs-only'].plugins?.crypto).toBeDefined();
      
      const nodejsRules = configs['nodejs-only'].rules || {};
      expect(nodejsRules['crypto/no-weak-hash-algorithm']).toBe('error');
    });

    it('should provide cve-focused configuration', () => {
      expect(configs['cve-focused']).toBeDefined();
      expect(configs['cve-focused'].plugins?.crypto).toBeDefined();
      
      const cveRules = configs['cve-focused'].rules || {};
      expect(cveRules['crypto/no-insecure-rsa-padding']).toBe('error');
    });
  });
});
