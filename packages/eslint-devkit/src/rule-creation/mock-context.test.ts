/**
 * Tests for createWithMockContext — the Layer-2 mock-context helper.
 */
import { describe, it, expect } from 'vitest';
import type { TSESTree } from '@typescript-eslint/utils';
import { createWithMockContext, type RuleLike } from './mock-context';

/** A tiny rule that reports every Identifier named `evil`. */
const identifierRule: RuleLike = {
  defaultOptions: [{ banned: 'evil' }],
  create(context) {
    const ctx = context as unknown as {
      options: readonly [{ banned: string }];
      settings: Record<string, unknown>;
      sourceCode: { getText(): string };
      report(d: unknown): void;
    };
    const banned = ctx.options[0]?.banned ?? 'evil';
    return {
      Identifier(node: TSESTree.Identifier) {
        if (node.name === banned) {
          ctx.report({
            node,
            messageId: 'banned',
            data: { name: node.name, text: ctx.sourceCode.getText() },
          });
        }
      },
    };
  },
};

function makeIdentifier(name: string): TSESTree.Identifier {
  return {
    type: 'Identifier',
    name,
    parent: null,
    range: [0, name.length],
    loc: {
      start: { line: 1, column: 0 },
      end: { line: 1, column: name.length },
    },
  } as unknown as TSESTree.Identifier;
}

describe('createWithMockContext', () => {
  it('returns the listeners produced by rule.create', () => {
    const { listeners } = createWithMockContext(identifierRule);
    expect(Object.keys(listeners)).toEqual(['Identifier']);
    expect(typeof listeners['Identifier']).toBe('function');
  });

  it('records report descriptors when listeners fire on synthetic nodes', () => {
    const { listeners, reports } = createWithMockContext(identifierRule, {
      sourceText: 'const evil = 1;',
    });
    const visit = listeners['Identifier'] as (n: TSESTree.Identifier) => void;

    visit(makeIdentifier('good'));
    expect(reports).toHaveLength(0);

    visit(makeIdentifier('evil'));
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'banned',
      data: { name: 'evil', text: 'const evil = 1;' },
    });
  });

  it('falls back to rule.defaultOptions when no options are given', () => {
    const { context } = createWithMockContext(identifierRule);
    expect(context.options).toEqual([{ banned: 'evil' }]);
  });

  it('passes explicit options and settings through to the context', () => {
    const { listeners, reports, context } = createWithMockContext(
      identifierRule,
      {
        options: [{ banned: 'worse' }],
        settings: { 'interlace/ai-mode': 'CLI' },
        filename: 'custom.tsx',
      },
    );
    expect(context.options).toEqual([{ banned: 'worse' }]);
    expect(context.settings).toEqual({ 'interlace/ai-mode': 'CLI' });
    expect(context.filename).toBe('custom.tsx');
    expect(context.getFilename()).toBe('custom.tsx');

    (listeners['Identifier'] as (n: TSESTree.Identifier) => void)(
      makeIdentifier('worse'),
    );
    expect(reports).toHaveLength(1);
  });

  it('provides working no-op sourceCode stubs', () => {
    const rule: RuleLike = {
      create(context) {
        const ctx = context as unknown as {
          sourceCode: {
            getText(): string;
            getScope(n?: unknown): { variables: unknown[] };
            getCommentsBefore(n?: unknown): unknown[];
            getAncestors(n?: unknown): unknown[];
          };
        };
        return {
          Program() {
            return {
              text: ctx.sourceCode.getText(),
              scopeVars: ctx.sourceCode.getScope().variables,
              comments: ctx.sourceCode.getCommentsBefore(),
              ancestors: ctx.sourceCode.getAncestors(),
            };
          },
        };
      },
    };
    const { listeners, context } = createWithMockContext(rule);
    const result = (listeners['Program'] as () => Record<string, unknown>)();
    expect(result).toEqual({
      text: '',
      scopeVars: [],
      comments: [],
      ancestors: [],
    });
    // Defaults when no overrides are provided
    expect(context.options).toEqual([]);
    expect(context.settings).toEqual({});
    expect(context.filename).toBe('mock.ts');
    expect(context.getPhysicalFilename()).toBe('mock.ts');
    expect(context.getCwd()).toBe('/');
    expect(context.getAncestors()).toEqual([]);
    expect(context.getSourceCode().getDeclaredVariables(undefined as never)).toEqual([]);
    expect(
      (context.getScope() as unknown as { variables: unknown[] }).variables,
    ).toEqual([]);
  });
});
