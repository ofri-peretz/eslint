/**
 * @fileoverview Branch-coverage tests for require-output-filtering.
 *
 * Layer 1: parser-reachable tool-name resolution shapes through RuleTester.
 * Layer 2: parser-unreachable orphan-node guards via devkit's
 * createWithMockContext with synthetic AST objects.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { requireOutputFiltering } from './index';

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

ruleTester.run('require-output-filtering (branch coverage)', requireOutputFiltering, {
  valid: xai([
    // String-literal 'execute' key — keyName resolves to null, arrow skipped.
    {
      code: `const w = { 'execute': () => db.queryAll() };`,
    },
    // Arrow not attached to a Property at all.
    {
      code: `const cb = () => db.queryAll();`,
    },
  ]),
  invalid: xai([
    // Full tools nesting: tool name resolved from the tools object property.
    {
      code: `generateText({ tools: { fetchUser: { execute: () => db.queryUsers(id) } } });`,
      errors: [
        {
          messageId: 'missingOutputFilter',
          data: { toolName: 'fetchUser', source: 'db.queryUsers' },
        },
      ],
    },
    // String-literal tool name inside tools — key is not an Identifier, the
    // walk keeps going and falls back to 'unknown'.
    {
      code: `generateText({ tools: { 'fetch-user': { execute: () => db.queryUsers(id) } } });`,
      errors: [
        {
          messageId: 'missingOutputFilter',
          data: { toolName: 'unknown', source: 'db.queryUsers' },
        },
      ],
    },
    // execute outside any tools object — grandparent is never a 'tools'
    // Property, so the name falls back to 'unknown'.
    {
      code: `const worker = { execute: () => db.queryAll() };`,
      errors: [
        {
          messageId: 'missingOutputFilter',
          data: { toolName: 'unknown', source: 'db.queryAll' },
        },
      ],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: synthetic AST for parser-unreachable guards.
// ─────────────────────────────────────────────────────────────────────────────

type Listener = (node: unknown) => void;

describe('require-output-filtering — synthetic AST', () => {
  it('does not report for an orphan arrow function (parent undefined)', () => {
    const { listeners, reports } = createWithMockContext(requireOutputFiltering, {
      ast: AI_PROGRAM,
      options: [{}],
      sourceText: 'db.queryAll',
    });
    const orphanArrow = {
      type: 'ArrowFunctionExpression',
      parent: undefined,
      body: { type: 'CallExpression', callee: { type: 'Identifier', name: 'q' } },
    };
    (listeners.ArrowFunctionExpression as Listener)(orphanArrow);
    expect(reports).toEqual([]);
  });

  it('falls back to "unknown" when the object chain detaches above execute', () => {
    const { listeners, reports } = createWithMockContext(requireOutputFiltering, {
      ast: AI_PROGRAM,
      options: [{}],
      sourceText: 'db.queryAll',
    });
    // execute Property whose ObjectExpression has no parent — the getToolName
    // walk hits the detached top and returns 'unknown'.
    const detachedObject: Record<string, unknown> = { type: 'ObjectExpression', parent: undefined };
    const executeProp: Record<string, unknown> = {
      type: 'Property',
      key: { type: 'Identifier', name: 'execute' },
      parent: detachedObject,
    };
    const arrow = {
      type: 'ArrowFunctionExpression',
      parent: executeProp,
      body: { type: 'CallExpression', callee: { type: 'Identifier', name: 'q' } },
    };
    (listeners.ArrowFunctionExpression as Listener)(arrow);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'missingOutputFilter',
      data: { toolName: 'unknown', source: 'db.queryAll' },
    });
  });
});
