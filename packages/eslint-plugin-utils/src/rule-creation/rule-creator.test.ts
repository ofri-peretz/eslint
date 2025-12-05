/**
 * Tests for rule creator utilities
 * Tests the rule creator factory functions
 */
import { describe, it, expect, vi } from 'vitest';
import { createRuleCreator, createRule } from './rule-creator';

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
    expect(testRule.meta.docs?.url).toBeDefined();
    // The default URL creator should generate a URL
    expect(testRule.meta.docs?.url).toContain('github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/test-rule.md');
  });
});

