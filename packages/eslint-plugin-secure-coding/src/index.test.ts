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
      'no-template-injection',
      'detect-non-literal-regexp',
      'no-redos-vulnerable-regex',
      'no-unsafe-regex-construction',
      'detect-object-injection',
      'no-unsafe-deserialization',
      'no-insecure-comparison',
      'no-improper-sanitization',
      'no-improper-type-validation',
      'no-missing-authentication',
      'no-privilege-escalation',
      'no-weak-password-recovery',
      'require-backend-authorization',
      'no-hardcoded-credentials',
      'no-sensitive-data-exposure',
      'no-pii-in-logs', // Migrated from node-security
      'no-unlimited-resource-allocation',
      'no-unchecked-loop-condition',
      // Auth & runtime hardening (wired 2026-05-09 — implementations
      // existed but the plugin index didn't register them, leaving the
      // doc-harvest stress test reporting them as orphans).
      'detect-weak-password-validation',
      'no-electron-security-issues',
      'no-hardcoded-session-tokens',
      'require-secure-defaults',
    ]);
    expect(ruleKeys.length).toBe(28);
  });

  describe('configurations', () => {
    it('should provide recommended configuration', () => {
      expect(configs.recommended).toBeDefined();
      expect(configs.recommended.plugins?.['secure-coding']).toBeDefined();
      
      const recommendedRules = configs.recommended.rules || {};
      Object.keys(recommendedRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^secure-coding\//);
      });
      
      // Demoted to 'warn' 2026-05-09 — `npm run ilb:severity-audit` showed
      // 76% Wild hits on adversarial Edge corpus, failing the README §1
      // ≥ 95% precision floor for `error`-tier severity. The rule is still
      // in `recommended` (just at lower severity) and remains 'error' in
      // the `strict` config — see the test below.
      expect(recommendedRules['secure-coding/no-unsafe-deserialization']).toBe('warn');
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
      // no-missing-authentication was removed from owasp-top-10 by the scope
      // reorg (Express-specific → use eslint-plugin-express-security). Assert a
      // rule that genuinely ships in this config instead.
      expect(owaspRules['secure-coding/no-hardcoded-credentials']).toBe('error');
    });
  });
});
