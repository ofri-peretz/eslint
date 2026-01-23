import { describe, it, expect } from 'vitest';
import plugin from './index';
import { configs } from './index';

describe('eslint-plugin-architecture plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('@eslint/eslint-plugin-architecture');
    expect(plugin.meta?.version).toBeDefined();
  });

  it('should export all architecture rules (both flat and categorized)', () => {
    expect(plugin.rules).toBeDefined();
    const ruleKeys = Object.keys(plugin.rules || {});
    
    // Flat names
    expect(ruleKeys).toContain('consistent-existence-index-check');
    expect(ruleKeys).toContain('ddd-anemic-domain-model');
    expect(ruleKeys).toContain('enforce-naming');
    
    // Categorized names
    expect(ruleKeys).toContain('architecture/consistent-existence-index-check');
    expect(ruleKeys).toContain('ddd/ddd-anemic-domain-model');
    expect(ruleKeys).toContain('domain/enforce-naming');
    expect(ruleKeys).toContain('api/enforce-rest-conventions');

    expect(ruleKeys.length).toBe(26);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['@eslint/architecture']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^@eslint\/architecture\//);
      });
      
      expect(recommendedRules['@eslint/architecture/architecture/no-external-api-calls-in-utils']).toBe('warn');
    });
  });
});
