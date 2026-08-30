/**
 * Tests for rule creator utilities
 * Tests the rule creator factory functions
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createRuleCreator,
  createRule,
  docsUrlFor,
  withCanonicalDocsUrls,
} from './rule-creator';

describe('createRuleCreator', () => {
  it('should return a function', () => {
    const urlCreator = (name: string) => `https://example.com/${name}`;
    const result = createRuleCreator(urlCreator);
    expect(typeof result).toBe('function');
  });

  it('should use the provided URL creator', () => {
    const urlCreator = vi.fn((name: string) => `https://example.com/${name}`);
    const ruleCreator = createRuleCreator(urlCreator);

    // The rule creator should be callable (it's ESLintUtils.RuleCreator)
    expect(ruleCreator).toBeDefined();
    expect(typeof ruleCreator).toBe('function');
  });
});

describe('createRule', () => {
  it('should be defined', () => {
    expect(createRule).toBeDefined();
    expect(typeof createRule).toBe('function');
  });

  it('should be a function that can create rules', () => {
    // createRule is ESLintUtils.RuleCreator with a default URL creator
    // We can't easily test the full rule creation without setting up a full ESLint context,
    // but we can verify it's a function
    expect(typeof createRule).toBe('function');
  });

  it('should create a rule with default URL creator', () => {
    // Create a minimal rule to test that createRule works and the default URL creator is called
    const testRule = createRule({
      name: 'test-rule',
      meta: {
        type: 'problem',
        docs: {
          description: 'Test rule',
        },
        schema: [],
        messages: {
          test: 'Test message',
        },
      },
      defaultOptions: [],
      create() {
        return {};
      },
    });

    // Verify the rule was created
    expect(testRule).toBeDefined();
    expect(testRule.meta).toBeDefined();
    // No docs URL: this factory does not know the plugin, so it must not guess one.
    // It used to mint `packages/eslint-plugin/docs/rules/<name>.md`, a dead path that
    // shipped as a 404 for any plugin missing from PLUGIN_DOCS_CATEGORY.
    expect(testRule.meta.docs?.url).toBeUndefined();
  });
});

describe('canonical documentation URLs', () => {
  it('builds the documented site URL for a plugin slug', () => {
    expect(docsUrlFor('plugin-node-security', 'detect-child-process')).toBe(
      'https://eslint.interlace.tools/docs/security/plugin-node-security/rules/detect-child-process',
    );
  });

  it('rewrites every rule in a plugin export map', () => {
    const rules = {
      'no-thing': {
        meta: { docs: { url: 'https://example.invalid/placeholder.md' } },
        create: () => ({}),
      },
      'no-other': { meta: { docs: { url: undefined } }, create: () => ({}) },
    } as never;

    const result = withCanonicalDocsUrls(
      'plugin-secure-coding',
      rules,
    ) as unknown as Record<string, { meta: { docs: { url: string } } }>;

    expect(result['no-thing'].meta.docs.url).toBe(
      'https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-thing',
    );
    expect(result['no-other'].meta.docs.url).toBe(
      'https://eslint.interlace.tools/docs/security/plugin-secure-coding/rules/no-other',
    );
  });

  it('leaves a rule without a docs block untouched rather than throwing', () => {
    const rules = { 'no-docs': { meta: {}, create: () => ({}) } } as never;
    expect(() =>
      withCanonicalDocsUrls('plugin-browser-security', rules),
    ).not.toThrow();
  });

  it('routes quality plugins under /docs/quality/, not /docs/security/', () => {
    expect(docsUrlFor('plugin-import-next', 'no-cycle')).toBe(
      'https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-cycle',
    );
  });

  it('returns null for a plugin with no docs pages instead of minting a dead link', () => {
    expect(docsUrlFor('plugin-not-a-real-plugin', 'no-thing')).toBeNull();
  });

  it('keeps the existing url when the plugin has no docs pages', () => {
    const placeholder = 'https://example.invalid/placeholder.md';
    const rules = {
      'no-thing': { meta: { docs: { url: placeholder } }, create: () => ({}) },
    } as never;
    const result = withCanonicalDocsUrls(
      'plugin-not-a-real-plugin',
      rules,
    ) as unknown as Record<string, { meta: { docs: { url: string } } }>;
    expect(result['no-thing'].meta.docs.url).toBe(placeholder);
  });
});

/**
 * Regression lock — the docs-url pass must not read the properties it stamps.
 *
 * A plugin barrel's rules are getters: the build defers each rule module behind one so
 * `require('the-plugin')` does not load rules the consumer never enables. This function
 * used `Object.entries`, which reads every property — so the build printed "deferred 42
 * rules behind getters" while all 42 still loaded at require time. The saving was
 * reported and not delivered.
 */
describe('withCanonicalDocsUrls does not invoke getters', () => {
  it('leaves a lazy property unread until it is accessed', () => {
    let reads = 0;
    const rules = {} as Record<
      string,
      TSESLint.RuleModule<string, readonly unknown[]>
    >;
    Object.defineProperty(rules, 'my-rule', {
      configurable: true,
      enumerable: true,
      get() {
        reads++;
        return { meta: { docs: {} } } as unknown as TSESLint.RuleModule<
          string,
          readonly unknown[]
        >;
      },
    });

    withCanonicalDocsUrls('plugin-node-security', rules);
    expect(reads).toBe(0);

    const rule = rules['my-rule'];
    expect(reads).toBe(1);
    expect((rule.meta.docs as { url?: string }).url).toContain(
      'plugin-node-security/rules/my-rule',
    );
  });

  it('still stamps a plain-value property, which cannot be deferred', () => {
    const rules = {
      'my-rule': { meta: { docs: {} } },
    } as unknown as Record<
      string,
      TSESLint.RuleModule<string, readonly unknown[]>
    >;

    withCanonicalDocsUrls('plugin-node-security', rules);
    expect((rules['my-rule'].meta.docs as { url?: string }).url).toContain(
      'rules/my-rule',
    );
  });

  it('tolerates a property with no docs block', () => {
    const rules = {
      'my-rule': { meta: {} },
    } as unknown as Record<
      string,
      TSESLint.RuleModule<string, readonly unknown[]>
    >;
    expect(() =>
      withCanonicalDocsUrls('plugin-node-security', rules),
    ).not.toThrow();
  });
});
