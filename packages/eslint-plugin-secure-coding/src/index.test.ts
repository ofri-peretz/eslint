import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-secure-coding plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-secure-coding');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all secure-coding rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    expect(ruleKeys).toEqual([
      'no-graphql-injection',
      'no-xxe-injection',
      'no-xpath-injection',
      'no-ldap-injection',
      'no-directive-injection',
      'no-format-string-injection',
      'detect-non-literal-regexp',
      'no-redos-vulnerable-regex',
      'no-unsafe-regex-construction',
      'detect-object-injection',
      'no-unsafe-deserialization',
      'no-hardcoded-credentials',
      'no-insecure-comparison',
      'no-unvalidated-user-input',
      'no-unescaped-url-parameter',
      'no-improper-sanitization',
      'no-improper-type-validation',
      'no-missing-authentication',
      'no-privilege-escalation',
      'no-weak-password-recovery',
      'no-missing-csrf-protection',
      'no-missing-cors-check',
      'no-missing-security-headers',
      'no-insecure-redirects',
      'no-unencrypted-transmission',
      'no-clickjacking',
      'no-sensitive-data-exposure',
      'no-unlimited-resource-allocation',
      'no-unchecked-loop-condition',
      'no-electron-security-issues',
      'no-credentials-in-query-params',
      'require-secure-credential-storage',
      'require-dependency-integrity',
      'detect-suspicious-dependencies',
      'no-dynamic-dependency-loading',
      'lock-file',
      'no-client-side-auth-logic',
      'require-backend-authorization',
      'no-hardcoded-session-tokens',
      'detect-weak-password-validation',
      'no-password-in-url',
      'no-unvalidated-deeplinks',
      'require-url-validation',
      'require-mime-type-validation',
      'require-csp-headers',
      'no-http-urls',
      'no-disabled-certificate-validation',
      'require-https-only',
      'no-insecure-websocket',
      'detect-mixed-content',
      'no-allow-arbitrary-loads',
      'require-network-timeout',
      'no-pii-in-logs',
      'no-tracking-without-consent',
      'require-data-minimization',
      'no-sensitive-data-in-analytics',
      'no-debug-code-in-production',
      'require-code-minification',
      'no-verbose-error-messages',
      'require-secure-defaults',
      'no-permissive-cors',
      'no-sensitive-data-in-cache',
      'require-storage-encryption',
      'require-secure-deletion',
    ]);
    expect(ruleKeys.length).toBe(64);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['secure-coding']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^secure-coding\//);
      });
      
      expect(recommendedRules['secure-coding/no-unsafe-deserialization']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['secure-coding']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^secure-coding\//);
      });
      
      expect(strictRules['secure-coding/no-graphql-injection']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should provide owasp-top-10 configuration', () => {
      expect(configs['owasp-top-10']).toBeDefined();
      expect(configs['owasp-top-10'].plugins?.['secure-coding']).toBeDefined();
      
      const owaspRules = configs['owasp-top-10'].rules || {};
      expect(owaspRules['secure-coding/no-missing-authentication']).toBe('error');
    });

    it('should provide owasp-mobile-top-10 configuration', () => {
      expect(configs['owasp-mobile-top-10']).toBeDefined();
      expect(configs['owasp-mobile-top-10'].plugins?.['secure-coding']).toBeDefined();
      
      const mobileRules = configs['owasp-mobile-top-10'].rules || {};
      expect(mobileRules['secure-coding/no-credentials-in-query-params']).toBe('error');
    });
  });
});
