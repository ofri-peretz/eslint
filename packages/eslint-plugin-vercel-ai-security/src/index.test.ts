import { describe, it, expect } from 'vitest';
import plugin from './index';
import { rules, configs } from './index';

describe('eslint-plugin-vercel-ai-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-vercel-ai-security');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all vercel-ai-security rules', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    expect(ruleKeys).toEqual([
      'require-validated-prompt',
      'no-sensitive-in-prompt',
      'no-training-data-exposure',
      'require-request-timeout',
      'no-unsafe-output-handling',
      'require-tool-confirmation',
      'no-system-prompt-leak',
      'require-embedding-validation',
      'require-output-validation',
      'require-max-tokens',
      'require-max-steps',
      'require-abort-signal',
      'no-dynamic-system-prompt',
      'require-tool-schema',
      'no-hardcoded-api-keys',
      'require-output-filtering',
      'require-rag-content-validation',
      'require-error-handling',
      'require-audit-logging',
    ]);
    expect(ruleKeys.length).toBe(19);
  });

  describe('configurations', () => {
    it('should provide minimal configuration', () => {
      expect(configs.minimal).toBeDefined();
      expect(configs.minimal.plugins?.['vercel-ai-security']).toBeDefined();
      
      const minimalRules = configs.minimal.rules || {};
      expect(minimalRules['vercel-ai-security/require-validated-prompt']).toBe('error');
      expect(Object.keys(minimalRules).length).toBe(2);
    });

    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['vercel-ai-security']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^vercel-ai-security\//);
      });
      
      expect(recommendedRules['vercel-ai-security/require-validated-prompt']).toBe('error');
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['vercel-ai-security']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^vercel-ai-security\//);
      });
      
      expect(strictRules['vercel-ai-security/require-validated-prompt']).toBe('error');
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });
  });
});
