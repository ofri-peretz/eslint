import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-browser-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-browser-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all browser-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'no-innerhtml',
      'no-eval',
      'require-postmessage-origin-check',
      'no-postmessage-wildcard-origin',
      'no-postmessage-innerhtml',
      'no-sensitive-localstorage',
      'no-jwt-in-storage',
      'no-sensitive-sessionstorage',
      'no-sensitive-indexeddb',
      'no-sensitive-cookie-js',
      'no-cookie-auth-tokens',
      'require-cookie-secure-attrs',
      'require-websocket-wss',
      'no-websocket-innerhtml',
      'no-websocket-eval',
      'no-filereader-innerhtml',
      'require-blob-url-revocation',
      'no-dynamic-service-worker-url',
      'no-worker-message-innerhtml',
      'no-unsafe-inline-csp',
      'no-unsafe-eval-csp',
      'detect-mixed-content',
      'no-allow-arbitrary-loads',
      'no-clickjacking',
      'no-credentials-in-query-params',
      'no-http-urls',
      'no-insecure-redirects',
      'no-insecure-websocket',
      'no-missing-cors-check',
      'no-missing-csrf-protection',
      'no-missing-security-headers',
      'no-password-in-url',
      'no-permissive-cors',
      'no-sensitive-data-in-analytics',
      'no-sensitive-data-in-cache',
      'no-tracking-without-consent',
      'no-unencrypted-transmission',
      'no-unescaped-url-parameter',
      'no-unvalidated-deeplinks',
      'require-csp-headers',
      'require-https-only',
      'require-url-validation',
      'require-mime-type-validation',
      'no-disabled-certificate-validation',
      'no-client-side-auth-logic', // Migrated from secure-coding
    ]);
    expect(ruleKeys.length).toBe(45);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['browser-security']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^browser-security\//);
      });
      
      expect(recommendedRules['browser-security/no-innerhtml']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['browser-security']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^browser-security\//);
      });
      
      expect(strictRules['browser-security/no-innerhtml']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should provide specialty configurations', () => {
      expect(configs.xss).toBeDefined();
      expect(configs.storage).toBeDefined();
      expect(configs.postmessage).toBeDefined();
      expect(configs.websocket).toBeDefined();
      expect(configs.cookies).toBeDefined();
    });
  });
});
