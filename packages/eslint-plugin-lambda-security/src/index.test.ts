import { describe, it, expect } from 'vitest';
import plugin, { configs } from './index';

describe('eslint-plugin-lambda-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-lambda-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all lambda-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'no-hardcoded-credentials-sdk',
      'no-permissive-cors-response',
      'no-permissive-cors-middy',
      'no-secrets-in-env',
      'no-env-logging',
      'no-unvalidated-event-body',
      'no-missing-authorization-check',
      'no-overly-permissive-iam-policy',
      'no-error-swallowing',
      'require-timeout-handling',
      'no-unbounded-batch-processing',
      'no-user-controlled-requests',
      'no-exposed-error-details',
      'no-exposed-debug-endpoints',
    ]);
    expect(ruleKeys.length).toBe(14);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['lambda-security']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^lambda-security\//);
      });
      
      expect(recommendedRules['lambda-security/no-hardcoded-credentials-sdk']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['lambda-security']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^lambda-security\//);
      });
      
      expect(strictRules['lambda-security/no-hardcoded-credentials-sdk']).toBe('error');
    });
  });
});
