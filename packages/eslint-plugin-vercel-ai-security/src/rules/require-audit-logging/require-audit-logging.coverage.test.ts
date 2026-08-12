/**
 * @fileoverview Branch-coverage tests for require-audit-logging.
 *
 * Layer 1: parser-reachable statement/block shapes through RuleTester.
 * Layer 2: parser-unreachable guards (orphan nodes, detached statements)
 * via devkit's createWithMockContext with synthetic AST objects.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { requireAuditLogging } from './index';

/**
 * The module gate reads `sourceCode.ast`, so a synthetic context needs a
 * Program that actually contains the SDK — otherwise the rule correctly
 * abstains and registers no listeners, and these branch tests would be
 * asserting against a handler that no longer exists.
 */
const AI_PROGRAM = {
  type: 'Program',
  body: [
    {
      type: 'ImportDeclaration',
      specifiers: [],
      source: { type: 'Literal', value: 'ai' },
    },
  ],
  tokens: [],
  comments: [],
};


/**
 * Every fixture imports the AI SDK, because the rules now abstain in files with
 * no `ai` / `@ai-sdk` in them. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving any binding,
// so fixtures that already declare `generateText`/`openai` do not redeclare.
const asAi = (code: string): string => `import 'ai';\n${code}`;
type AiSuggestion = { output?: string | null };
type AiCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly AiSuggestion[] } | string>;
};
const xai = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asAi(c) as T;
    const test = c as AiCase;
    return {
      ...c,
      code: asAi(test.code),
      ...(typeof test.output === 'string' ? { output: asAi(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asAi(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-audit-logging (branch coverage)', requireAuditLogging, {
  valid: xai([
    // Logging two statements before the AI call (within the 3-statement window).
    {
      code: `
        function handler() {
          logger.info('about to call AI');
          prepare();
          generateText({ prompt: p });
        }
      `,
      options: [{ allowInTests: false }],
    },
  ]),
  invalid: xai([
    // AI call as an if-test: the parent walk exhausts at Program (statement
    // resolves to null) — still reported.
    {
      code: `if (generateText({ prompt: p })) {}`,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
    // Unbraced if-consequent: containing "block" is the IfStatement, not a
    // BlockStatement/Program — hasNearbyLogging returns false.
    {
      code: `if (ready) generateText({ prompt: p });`,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
    // Preceding statement is a VariableDeclaration — not a logging statement.
    {
      code: `
        const a = 1;
        generateText({ prompt: p });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
    // Preceding ExpressionStatement that is not a call — not a logging statement.
    {
      code: `
        a++;
        generateText({ prompt: p });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
    // Three non-logging calls before — window scanned, nothing matches.
    {
      code: `
        doWork();
        doMore();
        doThird();
        generateText({ prompt: p });
      `,
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingAuditLogging', data: { function: 'generateText' } }],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: synthetic AST for parser-unreachable guards in hasNearbyLogging.
// The mock sourceCode.getText stub returns 'generateText' so the callee always
// matches; each synthetic shape isolates one unreachable guard.
// ─────────────────────────────────────────────────────────────────────────────

type Listener = (node: unknown) => void;

function runCallListener(node: unknown) {
  const { listeners, reports } = createWithMockContext(requireAuditLogging, {
      ast: AI_PROGRAM,
    options: [{ allowInTests: false }],
    sourceText: 'generateText',
  });
  (listeners.CallExpression as Listener)(node);
  return reports;
}

describe('require-audit-logging — synthetic AST', () => {
  it('reports when the call node has no parent at all', () => {
    const node = { type: 'CallExpression', callee: { type: 'Identifier', name: 'generateText' }, parent: null };
    const reports = runCallListener(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingAuditLogging',
      data: { function: 'generateText' },
    });
  });

  it('reports when the containing statement is detached from any block', () => {
    const stmt: Record<string, unknown> = { type: 'ExpressionStatement', parent: undefined };
    const node = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'generateText' },
      parent: stmt,
    };
    const reports = runCallListener(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingAuditLogging',
      data: { function: 'generateText' },
    });
  });

  it('reports when the statement is not found in its own block body (idx === -1)', () => {
    const block = { type: 'BlockStatement', body: [{ type: 'EmptyStatement' }] };
    const stmt = { type: 'ExpressionStatement', parent: block };
    const node = {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'generateText' },
      parent: stmt,
    };
    const reports = runCallListener(node);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingAuditLogging',
      data: { function: 'generateText' },
    });
  });
});
