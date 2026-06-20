import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import plugin, { rules, configs } from './index';

describe('eslint-plugin-lambda-security plugin interface', () => {
  it('should export correct meta information', () => {
    expect(plugin.meta).toBeDefined();
    expect(plugin.meta?.name).toBe('eslint-plugin-lambda-security');
    expect(plugin.meta?.version).toBeDefined();
    expect(typeof plugin.meta?.version).toBe('string');
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

  it('should export rules matching plugin.rules', () => {
    expect(rules).toBeDefined();
    expect(Object.keys(rules).length).toBe(14);
    expect(Object.keys(rules)).toContain('no-hardcoded-credentials-sdk');
    expect(Object.keys(rules)).toContain('no-env-logging');
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
      
      // Verify recommended rules are configured
      expect(Object.keys(recommendedRules).length).toBeGreaterThan(0);
    });

    it('should provide strict configuration', () => {
      expect(configs.strict).toBeDefined();
      expect(configs.strict.plugins?.['lambda-security']).toBeDefined();
      
      const strictRules = configs.strict.rules || {};
      Object.keys(strictRules).forEach(ruleName => {
        expect(ruleName).toMatch(/^lambda-security\//);
      });
      
      expect(strictRules['lambda-security/no-hardcoded-credentials-sdk']).toBe('error');
      
      // Strict should include all rules
      expect(Object.keys(strictRules).length).toBe(Object.keys(rules).length);
    });

    it('should have all strict rules reference existing rules', () => {
      const strictRules = Object.keys(configs.strict.rules || {});
      const pluginRules = Object.keys(plugin.rules || {});

      strictRules.forEach(ruleName => {
        const shortName = ruleName.replace('lambda-security/', '');
        expect(pluginRules).toContain(shortName);
      });
    });
  });
});

/**
 * Regression lock — esquery ":exit" selector crash.
 *
 * eslint-plugin-lambda-security@1.2.3 shipped three rules whose function-exit
 * listener was registered as a SINGLE comma-joined key:
 *
 *   'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'
 *
 * ESLint only strips a *trailing* ":exit" before handing the selector to
 * esquery (`rawSelector.replace(/:exit$/, '')`), so the earlier ":exit" tokens
 * survived into esquery and hard-crashed the entire lint run on ANY file with:
 *
 *   Error: Unknown class name: exit
 *
 * The fix (commit bfd00169) split that listener into three separate keys.
 * These tests boot the real ESLint engine — the exact path that crashed when
 * the plugin was dogfooded in the serverless repo — so any future
 * reintroduction of a comma-joined ":exit" (or any other unparseable selector)
 * in ANY rule fails here instead of in a consumer's editor.
 *
 * Why the unit RuleTester suites didn't catch the original bug: selector
 * parsing happens once per file when the engine wires up listeners, so the
 * crash is independent of rule logic and test fixtures. A config-level lint is
 * the smallest test that exercises it for every rule at once. It would fail on
 * the pre-fix source and passes on the fixed source.
 */
describe('regression: shipped configs lint without an esquery selector crash', () => {
  const TRIVIAL_HANDLER = `export const handler = async (event, context) => {
  const id = event?.pathParameters?.id;
  return { statusCode: 200, body: JSON.stringify({ id }) };
};
`;

  const lint = (overrideConfig: unknown[]) =>
    new ESLint({ overrideConfigFile: true, overrideConfig }).lintText(
      TRIVIAL_HANDLER,
      { filePath: 'handler.mjs' },
    );

  for (const configName of ['recommended', 'strict'] as const) {
    it(`'${configName}' config lints a trivial handler without throwing`, async () => {
      // Pre-fix this REJECTED with "Error: Unknown class name: exit".
      const results = await lint([configs[configName]]);
      expect(results).toHaveLength(1);
      // A fatal esquery/parse error surfaces as a message with no ruleId.
      const fatal = results[0].messages.filter(m => m.fatal);
      expect(fatal).toEqual([]);
    });
  }

  it('every rule registers selectors ESLint can parse (no comma-joined :exit)', async () => {
    // Belt-and-braces: enable each rule alone so a regression names the rule.
    for (const ruleName of Object.keys(rules)) {
      const ruleId = `lambda-security/${ruleName}`;
      await expect(
        lint([
          { plugins: { 'lambda-security': plugin } },
          { rules: { [ruleId]: 'error' } },
        ]),
        // message shown by vitest if this rule's selectors fail to parse
      ).resolves.toBeDefined();
    }
  }, 30_000);
});
