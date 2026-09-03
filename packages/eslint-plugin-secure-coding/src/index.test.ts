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
      'no-template-injection', // added in #185
      'no-sql-injection', // driver-agnostic CWE-89 (corpus FN sweep)
      'no-log-injection', // CWE-117 (corpus FN sweep)
      'no-fail-open-auth', // CWE-636 (corpus FN sweep)
      'no-homoglyph-identifiers', // CWE-1007 (corpus FN sweep)
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
      'no-bidi-characters', // CWE-1007 Trojan Source
    ]);
    // 32 on main + `no-bidi-characters`, added here for CWE-1007 parity.
    expect(ruleKeys.length).toBe(33);
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

    /**
     * Regression lock — `no-sql-injection` ships ON in `recommended`.
     *
     * It exists to close the CWE-089 corpus false negatives that #478 opened:
     * requiring the driver's own import made `db.query('SELECT … ' + userId)`
     * correctly silent in every driver-scoped rule, and nothing owned it.
     * This rule is the complement of that gate — it reports only in files
     * importing NO SQL driver — so exactly one rule owns any query site.
     *
     * Promotion was measured first, on the 8-repo published-code corpus that
     * demoted `detect-object-injection`: 0 findings against 23 candidate
     * `.query(` / `.execute(` sites. Dropping it from the preset would
     * silently reopen the false negatives, and every test would stay green.
     */
    it('ships no-sql-injection at error in recommended', () => {
      expect(configs.recommended.rules?.['secure-coding/no-sql-injection']).toBe('error');
      expect(rules['no-sql-injection']).toBeDefined();
    });


    /**
     * Regression lock — `no-insecure-comparison` must stay OUT of the presets
     * that ship as "turn this on and go".
     *
     * It is `deprecated` in favour of `node-security/no-timing-unsafe-compare`,
     * and on a 1,470-file corpus (webpack, lodash, eslint-plugin-import, two
     * NestJS boilerplates) 100% of its 876 findings were plain `==` / `!=`
     * reports already produced by core `eqeqeq`. It remains exported and
     * reachable via `strict` / explicit opt-in.
     */
    it('keeps no-insecure-comparison out of recommended and owasp-top-10', () => {
      expect(configs.recommended.rules?.['secure-coding/no-insecure-comparison']).toBeUndefined();
      expect(configs['recommended-strict'].rules?.['secure-coding/no-insecure-comparison']).toBeUndefined();
      expect(configs['owasp-top-10'].rules?.['secure-coding/no-insecure-comparison']).toBeUndefined();
      // Still shipped, still opt-in-able.
      expect(rules['no-insecure-comparison']).toBeDefined();
      expect(configs.strict.rules?.['secure-coding/no-insecure-comparison']).toBe('error');
    });

    /**
     * Regression lock — same contract for `no-unchecked-loop-condition`.
     *
     * Without this, re-adding the rule to `recommended` leaves every test
     * green, which is the failure mode CLAUDE.md's "a fix is not done until a
     * test would have caught it" rule exists to prevent.
     *
     * Measured over express + axios + sequelize the rule fired 39 times, 38 of
     * them on bounded loops (`for…of`, `for (i = 0; i < len; i++)`, `for…in`).
     * Iterating a collection is not CWE-400, and the rule cannot tell a bounded
     * loop from an unbounded one — which is the whole job it exists to do.
     *
     * All three assertions matter: the rule is removed from `recommendedRules`,
     * and `recommended-strict` and `owasp-top-10` are *derived* from that same
     * object, so a single removal changes all three presets at once.
     */
    it('keeps no-unchecked-loop-condition out of recommended, recommended-strict and owasp-top-10', () => {
      expect(configs.recommended.rules?.['secure-coding/no-unchecked-loop-condition']).toBeUndefined();
      expect(configs['recommended-strict'].rules?.['secure-coding/no-unchecked-loop-condition']).toBeUndefined();
      expect(configs['owasp-top-10'].rules?.['secure-coding/no-unchecked-loop-condition']).toBeUndefined();
      // Still shipped, still opt-in-able.
      expect(rules['no-unchecked-loop-condition']).toBeDefined();
      expect(configs.strict.rules?.['secure-coding/no-unchecked-loop-condition']).toBe('error');
    });

    it('keeps detect-object-injection out of recommended and owasp-top-10', () => {
      expect(configs.recommended.rules?.['secure-coding/detect-object-injection']).toBeUndefined();
      expect(configs['recommended-strict'].rules?.['secure-coding/detect-object-injection']).toBeUndefined();
      expect(configs['owasp-top-10'].rules?.['secure-coding/detect-object-injection']).toBeUndefined();
      // Still shipped, still opt-in-able.
      expect(rules['detect-object-injection']).toBeDefined();
      expect(configs.strict.rules?.['secure-coding/detect-object-injection']).toBe('error');
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

/**
 * `no-redos-vulnerable-regex` is OPT-IN, and stays that way until it is measured
 * above a preset tier's bar.
 *
 * It shipped at `error` — where a finding FAILS YOUR BUILD and the published bar
 * is ≥95% sampled precision — until 2026-08-18, when it was measured against
 * that bar for the first time. 22 of its 123 findings over the 20-repo corpus
 * were classified by TIMING with `scripts/redos-classify.mts`:
 *
 *   exponential (catastrophic)              0
 *   polynomial (143-197 ms at n=20,000)     6
 *   unreproduced                           15
 *
 * ~28.6%. Not one finding on real code was catastrophic. `warn` was not an
 * option either — its bar is 70%.
 *
 * The classifier is validated in both directions: it reproduces every corpus
 * `vulnerable` pattern as exponential and leaves the genuinely linear `safe`
 * ones unreproduced. A verdict from it is evidence, and `unreproduced` is
 * explicitly NOT proof of safety.
 *
 * This test exists because the rule has drifted back into a preset before. Do
 * not restore it without a fresh measurement that clears the tier's bar.
 */
/**
 * These four assertions were the inverse until 2026-08-20 — they pinned the
 * rule OUT of both presets, under the heading "opt-in until measured".
 *
 * It has now been measured, and the measurement that removed it was the
 * instrument. The 28.6% came from a hand-rolled attack generator that pumped
 * inputs and timed them, counting 15 "unreproduced" patterns against the rule;
 * failing to guess an attack string is not evidence a pattern is safe. The rule
 * now consults `recheck`, and over the same 20-repository corpus 100 of the 103
 * cleanly-extractable patterns it reports are confirmed vulnerable by that
 * independent analysis.
 *
 * A lock test that pins a defect is worse than no lock at all, and this one
 * pinned a rule out of the presets on a number its own author later disproved.
 */
describe('no-redos-vulnerable-regex ships in the presets', () => {
  it('is in recommended', () => {
    expect(configs.recommended.rules?.['secure-coding/no-redos-vulnerable-regex']).toBe('error');
  });

  it('is in flagship', () => {
    expect(configs.flagship.rules?.['secure-coding/no-redos-vulnerable-regex']).toBe('error');
  });

  it('is what makes the ecosystem detect CWE-1333 at all', () => {
    // benchmarks/corpus/CWE-1333/manifest.json names eslint-plugin-secure-coding
    // as the owner. With the rule out of the preset the ecosystem scored 0/3 on
    // that corpus while eslint-plugin-sonarjs scored 3/3, and the recall gate
    // had been red since the removal.
    expect(configs.recommended.rules?.['secure-coding/no-redos-vulnerable-regex']).toBeDefined();
  });

  it('is still exported, so a team that wants it can turn it on', () => {
    expect(rules['no-redos-vulnerable-regex']).toBeDefined();
  });

  it('is still in strict, which is the opt-in-everything preset', () => {
    expect(configs.strict.rules?.['secure-coding/no-redos-vulnerable-regex']).toBe('error');
  });
});
